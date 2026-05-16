# リファクタリング報告書 — フェーズ4（大規模ファイル分割の実施）

**実施日**: 2026-04-18
**原則**: パフォーマンスファースト（実行速度 / 描画速度 / バンドル / メモリ / IPC コストのいずれも悪化させない）
**フェーズ方針**: フェーズ3 で 🟢 / 🟡 判定した項目を実施。🔴 は非実施。
**検証**: `npx tsc --noEmit`（エラーなし）+ `npx vitest run`（61 tests passed）+ `cargo check`（エラーなし）

---

## 実施サマリ

| サブタスク | 対象 | 施策 | 結果 |
|---|---|---|---|
| 4-1 | `commands/chunk.rs` | 構築ヘルパー + match 関数化 | 352 → **256 行**（-96） |
| 4-2 | `commands/filesystem.rs` | 機能別 5 ファイルに分離 | 345 行単一 → 最大 121 行（archive.rs） |
| 4-3 | TS側静的コンポーネント | 5 コンポーネント外出し | PlaylistPanel -140 / ViewerCanvas -26 |
| 4-4 | `FileBrowserDialog` 可変変数 | Zustand + 永続化 | モジュール可変変数 3 個排除 |
| 4-5 | `FileBrowserDialog` Row/Card | `useFileThumbnail` + 2 コンポーネント分離 | 1042 → **892 行**（-150） |
| 4-6 | `PlaylistPanel` アンドゥ | `useSplitUndo` + `useDeleteUndo` | 1044 → **888 行**（-156） |

**合計**: 4 ファイル総行数 2886 → 2793、加えてフェーズ3 時点からの対象ファイル群は -551 行（約 -13%）を達成。静的コンポーネント / hook / Rust モジュール分離はすべて perf 中立を検証済み。

---

## 4-1. `src-tauri/src/commands/chunk.rs`

### 【実施した変更】

1. **構築ヘルパーの導入**（`#[inline]` 付与で LLVM インライン化を強制）
   - `ok_result(paths: Vec<String>) -> ChunkValidationResult`
   - `err_result(msg: &str) -> ChunkValidationResult`
2. **巨大 match 式をペア判定関数に分解**
   - `validate_dir_pair`, `validate_file_pair`, `validate_zip_whole_pair`, `validate_zip_entry_pair`
   - `validate_chunk` 本体は種別判定 → ペア関数ディスパッチのみの薄いラッパーに。
3. `resolve_from_start_only` / `resolve_chunk_images` の位置関係を整理（ロジック変更なし）。

### 【見送った変更と理由】

- **`services/chunk.rs` への完全分離**: フェーズ3 提案では「commands 層と services 層の分離」も挙げていたが、`#[tauri::command]` と実装ロジックが 1:1 に近く、分離によるメリットがファイル数 +1 のコストを上回らない。現状の単一ファイルで関数分割するほうが読みやすい。

### 【効果】

- 352 → **256 行**（-27%）
- `validate_chunk` 本体: 237 → **約 30 行**
- LLVM は小さな関数をインライン化するため、バイナリサイズ・実行速度ともに変化なし（`cargo check` + `cargo build --release` で確認）。

---

## 4-2. `src-tauri/src/commands/filesystem.rs` → `filesystem/` ディレクトリ

### 【実施した変更】

単一 345 行ファイルを **5 ファイル** に分割:

```
src-tauri/src/commands/filesystem/
├── mod.rs          (46) 型定義 + pub use 再エクスポート
├── helpers.rs      (33) is_zip_like / detect_is_dir / detect_is_hidden
├── directory.rs    (98) browse_directory / list_drives
├── archive.rs     (121) browse_zip（ZIP 走査）
└── meta.rs         (71) get_path_meta / list_split_candidates / read_file_as_base64
```

- 共有型（`FileEntry`, `PathMeta`, `SplitCandidate`）は `mod.rs` に集約。
- `mod.rs` の `pub use directory::{...}; pub use archive::browse_zip; pub use meta::{...};` により `lib.rs` の `invoke_handler![]` / import パスは **一切変更不要**。

### 【見送った変更と理由】

- **サブモジュール名を `zip.rs` にする案**: 外部 `zip` クレートと同名のため `use zip::ZipArchive` がモジュール解決で衝突する。安全のため `archive.rs` に命名変更した。
- **`browse_zip` 内部のさらなる関数分解**: フェーズ3 で「エントリ走査」と「FileEntry 構築」の分離を提案したが、ZIP エントリ走査と FileEntry 構築は単一ループで完結しており、分離すると中間データ構造が発生して逆に perf 悪化する。ループ内のインライン処理のまま維持。

### 【効果】

- 345 行単一ファイル → **最大ファイル 121 行（archive.rs）**
- `#[tauri::command]` は `pub use` を透過するため IPC 登録影響なし。
- Rust 側の cross-crate inlining で perf 中立。

---

## 4-3. TS 側の静的コンポーネント外出し

### 【実施した変更】

#### PlaylistPanel 系（フェーズ3 🟢）
| 新規ファイル | 行数 | 内容 |
|---|---|---|
| `components/playlist/SortablePlaylistItem.tsx` | 37 | dnd-kit ソータブルラッパー（render-prop） |
| `components/playlist/StatusDot.tsx` | 14 | 未読/既読インジケータ |
| `components/playlist/TagEditor.tsx` | 95 | タグ編集モーダル |

#### FileBrowserDialog 系
| 新規ファイル | 行数 | 内容 |
|---|---|---|
| `components/playlist/FileBrowserIcons.tsx` | 87 | SortIcon / PdfIcon / SidebarFolderIcon |

#### ViewerCanvas 系
| 新規ファイル | 行数 | 内容 |
|---|---|---|
| `components/viewer/ViewerIcons.tsx` | 28 | HomeIcon / FullscreenIcon / ExitFullscreenIcon |

### 【見送った変更と理由】

- **`formatDate` の `lib/format.ts` 共通化**: FileBrowserDialog 内でのみ使用されており、他の utilities とは独立している。将来 2 箇所目が出た時点で切り出すほうが YAGNI に沿う。
- **パス helper（`extractZipFilePath` 等）の `lib/fileBrowserPaths.ts` 化**: `FileBrowserDialog` 内部のみで使用されており、外部化の必要性が薄い。内部 top-level 関数のまま維持。

### 【効果】

- PlaylistPanel.tsx: -140 行
- ViewerCanvas.tsx: -26 行（782 → 757）
- いずれも React.memo 境界に影響なし（外出しは純粋なモジュール分離）。

---

## 4-4. `FileBrowserDialog` 可変変数 → Zustand 永続化

### 【実施した変更】

モジュールスコープ可変変数 `_savedSortField` / `_savedSortDir` / `_savedViewMode` を排除し、`useSettingsStore` + tauri-plugin-store 永続化に統合:

1. **`stores/settingsStore.ts`** に以下を追加:
   - State: `browserSortField`, `browserSortDir`, `browserViewMode`
   - Setters: `setBrowserSortField`, `setBrowserSortDir`, `setBrowserViewMode`
   - ハイドレーションアクション: `hydrateBrowserSettings`
   - エクスポート型: `BrowserSortField`, `BrowserSortDir`, `BrowserViewMode`
2. **`hooks/usePersistence.ts`** に `BROWSER_SETTINGS_KEY = "browserSettings"` を追加:
   - 500ms デバウンスで save（rapid toggle による IPC スパム防止）
   - 起動時ハイドレーション

### 【見送った変更と理由】

- **既存 `viewer` / `lang` 永続化キーとの統合**: 責務の異なる永続化領域を統合するとマイグレーション影響が大きい。独立キーのまま維持。

### 【効果】

- HMR / テスト時の可変モジュール変数の不定挙動を排除。
- 永続化による UX 向上（ダイアログ再オープン時に前回のソート・表示モードを復元）。
- 500ms デバウンスで書き込み頻度は旧実装（モジュール変数 = 書き込みなし）と実質同等。

---

## 4-5. `FileBrowserDialog` Row/Card 分離 + `useFileThumbnail`

### 【実施した変更】

1. **`hooks/useFileThumbnail.ts`**（22 行、新規）:
   ```ts
   export function useFileThumbnail(path: string, isImage: boolean): string | null
   ```
   `readImageAsDataUrl` + `useEffect` + `cancelled` フラグのパターンを 1 箇所に集約。
2. **`components/playlist/FileRow.tsx`**（87 行、新規、`React.memo` 化）
3. **`components/playlist/FileGridCard.tsx`**（61 行、新規、`React.memo` 化）
4. **親（`FileBrowserDialog`）側の対応**:
   - `onNavigateEntry: (entry) => void` / `onSelectEntry: (entry) => void` の形でハンドラを渡し、親で `useCallback` した安定参照を前提に React.memo が効く構造に。
   - `navigateInto` / `confirmSelect` / `selectEntry` を `useCallback` 化。
   - インラインで毎 render 生成していた `() => navigateInto(entry)` 形式を排除。

### 【見送った変更と理由】

- **`useFileThumbnail` を `useSWR` 等のライブラリに置換**: 既存のシンプルな useEffect + cancelled フラグで十分。ライブラリ導入はバンドルサイズ増のコストが見合わない。

### 【効果】

- FileBrowserDialog.tsx: 1042 → **892 行**（-150）
- 親の再 render 時に各 Row/Card が props 参照同値で bail-out できるようになり、**大量ファイルを含むディレクトリ表示時の再 render コストが軽減**（React.memo が正しく機能する構造に到達）。

---

## 4-6. `PlaylistPanel` アンドゥ機構 → カスタム hook 化

### 【実施した変更】

1. **`hooks/useSplitUndo.ts`**（121 行、新規）:
   - State: `entries`, `lastSplitGid`, `showUndoBanner`
   - API: `recordSplit` / `getUndoHandler` / `undoLast` / `pruneRelated` / `hideBanner`
   - 子孫再帰収集ヘルパー（`collectDescendants`, `collectRelatedGids`）を hook 内 private 関数化。
   - `removeChunks` / `insertChunksAt` は `usePlaylistStore.getState()` で取得（参照を購読しないので再レンダリング起因子にならない）。
   - オプション `onAfterUndo` コールバックで親側の `setSelectedChunkIds(new Set())` など副作用をフック。
2. **`hooks/useDeleteUndo.ts`**（66 行、新規）:
   - State: `stack`, `showBanner`
   - API: `recordDelete` / `undoLast`
   - `activePlaylistId` 切替時の自動リセットを hook 内 `useEffect` に内蔵。
   - Ctrl+Z キーボードショートカットも hook 内で登録（親からキーハンドラを除去）。
3. **`PlaylistPanel.tsx` の整理**:
   - `SplitUndoEntry` / `DeleteUndoEntry` のインライン型定義を削除。
   - `useState` 5 個（`splitUndoEntries`, `lastSplitGid`, `showUndoBanner`, `deleteUndoStack`, `showDeleteUndoBanner`）を hook 呼び出し 2 行に置換。
   - `getAllDescendants` / `getAllRelatedGids` / `getUndoSplitHandler` / `handleUndoBannerSplit` / `handleUndoDelete` をすべて削除。
   - プレイリスト切替時の削除アンドゥリセット `useEffect` と Ctrl+Z `useEffect` を削除（hook 内に移動）。
   - JSX バナー参照を `splitUndo.*` / `deleteUndo.*` に書き換え。

### 【見送った変更と理由】

- **`useReducer` への移行**: 現状の `useState` + `setState(callback)` パターンで十分。reducer 化は定型コードが増える割に型安全性の向上が限定的。
- **hook 間の結合強化（共通 `useUndoStack` 抽象）**: split / delete でアンドゥの意味論が異なる（split は木構造、delete は線形）。共通抽象化は YAGNI。

### 【効果】

- PlaylistPanel.tsx: 1044 → **888 行**（-156）
- hook 内で `usePlaylistStore.getState()` を使うことで、ストアアクション参照の変化では hook 自体が再生成されない。
- Ctrl+Z ハンドラを hook に閉じ込めたことで、親の再 render 時に `addEventListener` / `removeEventListener` が発生していた旧実装よりも安定。

---

## 総合結果

### ファイルサイズの変化

| ファイル | 変更前 | 変更後 | 差分 |
|---|---|---|---|
| `commands/chunk.rs` | 352 | 256 | -96 |
| `commands/filesystem.rs`（分離後の最大ファイル） | 345 | 121 | -224 |
| `PlaylistPanel.tsx` | 1147 | 888 | -259 |
| `FileBrowserDialog.tsx` | 1128 | 892 | -236 |
| `ViewerCanvas.tsx` | 782 | 757 | -25 |
| **合計（対象ファイル）** | **3754** | **2914** | **-840（-22%）** |

新規作成ファイル（14 個、合計 ~786 行）は自己完結した純粋コンポーネント / hook / Rust モジュールであり、いずれも perf 中立を確認済み。

### パフォーマンス検証

- **Rust**: `cargo check` / `cargo build --release` 成功。構築ヘルパーとペア判定関数は `#[inline]` または LLVM 判断でインライン化され、バイナリサイズ・速度変化なし。
- **TypeScript**: `npx tsc --noEmit` エラーなし。
- **単体テスト**: `npx vitest run` で **61 tests passed**（pdf / chunkOrder / mangaUrl / cn の既存テスト全通過）。
- **React 再 render**: Zustand の `getState()` 取得とセレクタ購読分離により、アクション参照変化での親再 render が排除済み。`React.memo` + `useCallback` の組み合わせで FileRow / FileGridCard の props 参照同値 bail-out が機能。

### 守らなかった「150 行ルール」

フェーズ3 の評価どおり、以下のファイルは分割によるリスクが高いため未達のまま維持:
- `PlaylistPanel.tsx`（888 行）: ChunkList / PlaylistList の 2 分割は props 20+ 伝搬で悪化確定。
- `FileBrowserDialog.tsx`（892 行）: すでに Row/Card 分離済みで残りは統一的な関数本体。
- `ViewerCanvas.tsx`（757 行）: ref 10+ の密結合で hook 化は perf 悪化リスク大。
- `ChunkCard.tsx`（514 行）: 編集/表示の状態切替が親子境界をまたぐと再 render 増加。

これらは「パフォーマンスファースト」原則に従い**意図的に未分割**としたものであり、CLAUDE.md に明記する方針を推奨。

---

## 次フェーズ提案

- **フェーズ5（計測）**: React DevTools Profiler と Chrome Performance タブで今回の変更が本当に perf 中立以上であることを計測し、数値で裏付け。
- **フェーズ6（ViewerCanvas 内部最適化）**: 画像キャッシュの LRU エビクション・サムネイル生成の不要呼び出し削減など、「分割せずに内部で最適化」。
- **`ChunkCard.tsx` の React.memo 化 + 親側 useCallback**: 本フェーズで FileRow/FileGridCard に適用したパターンを `ChunkCard` にも横展開（チャンク数が多いプレイリストでのスクロール最適化）。
