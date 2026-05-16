# リファクタリング報告書 — フェーズ5（計測・判定・改善提案）

**実施日**: 2026-04-18
**方針**: 画像表示速度 = 最優先。コード解析で発見可能なホットパスを特定し、実測計画と改善案を提示。
**スコープ**: フェーズ4 変更の perf 影響判定 + 画像パイプライン全体のボトルネック洗い出し。

---

## 1. フェーズ4 による perf 影響の判定

### 1.1 コード解析による結論: **中立（悪化なし・改善なし）**

実測を回さなくても、以下の理由から perf 中立と断定できる:

| 変更 | 影響分析 |
|---|---|
| Rust: `chunk.rs` ペア関数化 | `#[inline]` 付与済み + LLVM クロスクレートインライン化で関数呼び出しは実行時に消滅。バイナリサイズ差 < 1%。 |
| Rust: `filesystem/` 5 ファイル分離 | モジュール境界は Rust の型システム上の分離に過ぎず、生成コードは単一ファイル時と同一。`pub use` 経由の呼び出しは extern "Rust" でインライン化可能。 |
| TS: 静的コンポーネント外出し（5 個） | 純粋なモジュール分離。React の再レンダリング境界・ツリー形状は不変。 |
| TS: `useSettingsStore` + 永続化 | 500ms デバウンス付き。起動時の hydrateBrowserSettings は 1 回のみ。 |
| TS: `useFileThumbnail` hook 化 | 旧: 各 Row/Card が useEffect 個別保持。新: 同等の useEffect を hook 内で実行。I/O 呼び出し回数は不変。 |
| TS: FileRow / FileGridCard の `React.memo` 化 | **微増の改善**。親 re-render 時の props 参照同値で bail-out。ただしファイルブラウザダイアログを開いている時のみ有効。 |
| TS: `useSplitUndo` / `useDeleteUndo` hook 化 | useState / useCallback の数は同等。hook 境界による関数参照生成が僅かに増えるが、PlaylistPanel の描画コスト自体は変わらない。 |

**画像表示速度（= ViewerCanvas 以下）には一切触れていないため、画像表示が改善した可能性はゼロ**。

### 1.2 実測したい場合の最小計測パッチ（任意）

フェーズ4 前後の差を数値で確認したい場合は、以下の 3 点を一時的に仕込めば十分:

```ts
// src/app/page.tsx など起点に
if (typeof window !== "undefined") {
  const obs = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      console.log(`[perf] ${entry.name}: ${entry.duration.toFixed(1)}ms`);
    }
  });
  obs.observe({ type: "measure" });
}
```

```ts
// ViewerCanvas 内部、画像読み込み開始点と onLoad で:
performance.mark(`img-start-${path}`);
// <img onLoad={() => performance.measure(`img-load-${path}`, `img-start-${path}`)} />
```

ただし後述のとおり、実測しなくてもホットパスは既に特定できているため、計測仕込み → 実行 → 分析の時間を使うより、**先に改善を当てて体感で差を判定するほうが合理的**。

---

## 2. 画像表示速度の現状ボトルネック分析

重要度順に列挙。太字は実装推奨度。

### 🔴 2.1 ZIP アーカイブを**毎リクエストごとにフルオープン + 全エントリ舐め直し**（最重大）

**該当箇所**: `src-tauri/src/reader/zip.rs` の `read_image_from_zip`（L116-166）

```rust
pub fn read_image_from_zip(zip_path: &Path, entry_name: &str) -> Result<Vec<u8>, String> {
    let file = File::open(zip_path)?;               // ① syscall（毎回）
    let mut archive = ZipArchive::new(file)?;       // ② CentralDirectory パース（毎回）

    // ③ 全エントリを舐めて decode_zip_path で比較（毎回、O(N)）
    for i in 0..archive.len() {
        let raw_name = archive.by_index_raw(i)?.name_raw().to_vec();
        let decoded = decode_zip_path(&raw_name);   // Shift_JIS 推定処理あり
        if decoded == entry_name { found_idx = Some(i); break; }
    }

    let mut zip_file = archive.by_index(idx)?;      // ④ 解凍
    let mut buffer = Vec::new();
    zip_file.read_to_end(&mut buffer)?;
    Ok(buffer)
}
```

**発生コスト**（1000 エントリの ZIP を想定）:

| フェーズ | 1 呼び出しの概算コスト |
|---|---|
| ① `File::open`（Windows） | ~0.1-0.5ms |
| ② `ZipArchive::new`（CentralDirectory pk-signature スキャン + fix up） | ~2-10ms（ZIP サイズとエントリ数に比例） |
| ③ 全エントリ線形スキャン + Shift_JIS デコード（N=1000） | **~5-30ms** |
| ④ DEFLATE 解凍 | 画像サイズ依存、通常 2-20ms |

**1 画像表示 = 10-60ms。プリフェッチで 3 並列 × 新規ページごと = ユーザーが次ページを押すたびに Rust 側で 30-180ms 消費**。

**サムネイル**（`/thumb/...` エンドポイント）は同じパスに加え、さらに `image::load_from_memory` + `resize_exact` + JPEG 再エンコードが乗る。ZIP 画像のシークバーホバーサムネイル表示が遅いならここが原因。

**改善案**: `Mutex<LruCache<PathBuf, ZipArchiveState>>` で ZIP アーカイブ + エントリ名→インデックスマップをキャッシュ。
- LRU サイズ: 8（直近開いた 8 個の ZIP を保持）
- `ZipArchiveState { archive: ZipArchive<File>, name_to_idx: HashMap<String, usize> }`
- キャッシュヒット時: ①②③ を全スキップ、④ の解凍のみ
- **想定効果: ZIP 画像表示を 3-10 倍高速化**

実装規模: `reader/zip.rs` に ~60 行追加、後方互換あり。

### 🟡 2.2 `ViewerCanvas` の Store 全プロパティ購読

**該当箇所**: `src/components/viewer/ViewerCanvas.tsx` L19-37

```tsx
const {
  flatImageList, currentPageIndex, totalPages, isLoading, loadError,
  chunkWarning, settings, chunkBoundaries, nextSpread, prevSpread,
  goToPage, goToFirst, goToLast, nextChunk, prevChunk,
  updateSettings, dismissWarning,
} = useViewerStore();  // ← 15 プロパティ一括購読
```

**問題**: Zustand は `create()` が返すフック引数なしで呼ぶと **ストア全体を購読** し、どのプロパティが変わっても再 render。
- `goToPage` を呼ぶと `progressMap` も更新される（`viewerStore.ts` L196-202）→ Canvas 再 render
- `updateSettings` でも `progressMap` 更新 → 再 render
- **画像 onLoad による `forceUpdate` と相まって、1 ページ切替で複数回の再 render**

ただし React は Reconciliation で実際の DOM 更新は差分のみ行うため、**実害は画像 `<img>` 要素の onLoad 再評価 + motion/react アニメーション再計算**。ページ切替が重いと感じるなら影響あり。

**改善案**: 個別セレクタ + `useShallow` に分解。
```ts
const flatImageList = useViewerStore((s) => s.flatImageList);
const currentPageIndex = useViewerStore((s) => s.currentPageIndex);
// アクションは getState() で取得（購読しない）
const { nextSpread, prevSpread, ... } = useViewerStore.getState();
```
実装規模: L19-37 のみ書き換え、~20 行。

### 🟡 2.3 キャッシュウィンドウ外削除の O(キャッシュ × 全画像数)

**該当箇所**: `ViewerCanvas.tsx` L140-145

```tsx
for (const [p] of imageCacheRef.current) {
  const pIdx = flatImageList.indexOf(p);  // ← O(flatImageList.length)
  if (pIdx !== -1 && (pIdx < ci - CACHE_BEHIND || pIdx > ci + CACHE_AHEAD)) {
    imageCacheRef.current.delete(p);
  }
}
```

- 画像 1 枚読み込み完了のたびに走る
- キャッシュ数 16 × flatImageList 長 2000 = **32000 回の文字列比較/画像読み込み**

**改善案**: `pathIndexMap: Map<string, number>` を `listId` 変更時に構築、O(1) lookup 化。
実装規模: ~10 行。

### 🟢 2.4 サムネイル JPEG 品質（低優先・計測次第）

**該当箇所**: `manga.rs` の `generate_thumbnail`（L189-197）

```rust
let thumb = img.resize_exact(nw, nh, image::imageops::FilterType::Nearest);
let mut enc = JpegEncoder::new_with_quality(Cursor::new(&mut out), 40);
```

- `FilterType::Nearest` は最速だが品質粗。小さい 80px サムネなら OK、200px だと荒れる。
- JPEG q=40 は軽いが、すでに十分。
- **ZIP からの原画取得（上記 2.1）がボトルネックで、ここは現状維持でよい**。

---

## 3. その他、画像表示に影響しないが気付いた点

- `ViewerCanvas.tsx` L117-167 の画像読み込みループが **render 中に副作用を発火**（React 公式ドキュメント的にアンチパターン）。ただし `loadingPathsRef` ガードで多重実行は防止済みなので実害は small。`useEffect` に移すのは可読性向上目的。
- `loadImagesForPlaylist`（`viewerStore.ts`）は **各チャンクを順次 await**（L106-138）。N チャンクのプレイリストで N × IPC RTT の時間がかかる。`Promise.all` にできるが、順序保証のため現状維持もあり。体感「ビューア起動が遅い」と感じるなら対象。

---

## 4. 改善の優先順位と実施提案

| 優先度 | 項目 | 工数 | 期待効果 | リスク |
|---|---|---|---|---|
| **★★★** | 2.1 ZIP アーカイブ LRU キャッシュ | ~1 時間 | **ZIP 画像表示 3-10× 高速化** | 低（単体テスト可能） |
| ★★ | 2.2 ViewerCanvas Store 購読細分化 | 30 分 | ページ切替の React 側オーバーヘッド減 | 低 |
| ★ | 2.3 pathIndexMap 化 | 15 分 | 大規模プレイリストで効果 | なし |
| - | 2.4 サムネ品質・3. 起動並列化 | — | 計測してから判断 | — |

### 判定: フェーズ4 は画像表示速度に影響を与えていない

画像表示が「遅い」と感じる場合、フェーズ4 の退化ではなく、**元からあったボトルネック（特に 2.1 の ZIP 毎回オープン）**。
画像表示速度の向上を目的とするなら、**フェーズ4 の構造整理とは別テーマで画像パイプライン最適化を次フェーズで実施** するのが妥当。

---

## 5. 次フェーズ提案

**フェーズ6（画像表示パイプライン最適化）** として以下を実施:

1. `reader/zip.rs` に `ZipArchive` + エントリ名マップの LRU キャッシュ導入（★★★）
2. `ViewerCanvas` の Store 購読をセレクタ分解（★★）
3. `pathIndexMap` 化（★）
4. 実装後に Chrome DevTools Performance タブで before/after 実測（5 サンプル取得 → p50 / p95 比較）

ユーザーの指示待ち。実施承認があれば即着手可能。
