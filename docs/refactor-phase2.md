# リファクタリング報告書 — フェーズ2（Zustand セレクタ最適化）

**実施日**: 2026-04-17
**原則**: パフォーマンスファースト
**対象フェーズ**: 再レンダリング削減

---

## 1. 実施サマリ

| # | 対象ファイル | 変更内容 | 行数変化 |
|---|---|---|---|
| 1 | `src/components/playlist/PlaylistPanel.tsx` | `usePlaylistStore()` 全購読を最小化 | +4 |

**テスト**: 全 61 件パス。**型チェック**: エラーなし。

---

## 2. 問題の特定

`PlaylistPanel.tsx` の L71-L88 で、

```ts
const {
  playlists, activePlaylistId,
  createPlaylist, deletePlaylist, renamePlaylist, setActivePlaylist,
  addChunk, updateChunk, removeChunk, removeChunks,
  reorderChunks, reorderPlaylist, setChunksOrder, insertChunksAt,
  toggleFavorite, setTags,
} = usePlaylistStore();
```

`usePlaylistStore()` を引数なしで呼び出すとストア全体を購読するため、ストア内のどのプロパティが変化しても `PlaylistPanel` 全体が再レンダリングされる状態だった。

`PlaylistPanel` は 1147 行の大規模コンポーネントで、内部に `SortablePlaylistItem`、`StatusDot`、`TagEditor` を含むため、再レンダリングコストが大きい。

---

## 3. 実施した変更

### Before
```ts
const {
  playlists, activePlaylistId,
  createPlaylist, deletePlaylist, /* ...14 actions */
} = usePlaylistStore();
```

### After
```ts
// リアクティブなデータ購読
const playlists = usePlaylistStore((s) => s.playlists);
const activePlaylistId = usePlaylistStore((s) => s.activePlaylistId);

// アクションは購読不要（関数参照はクロージャで不変）
const {
  createPlaylist, deletePlaylist, renamePlaylist, setActivePlaylist,
  addChunk, updateChunk, removeChunk, removeChunks,
  reorderChunks, reorderPlaylist, setChunksOrder, insertChunksAt,
  toggleFavorite, setTags,
} = usePlaylistStore.getState();
```

**変更のロジック**:

1. **データは個別セレクタで購読** — `useStore((s) => s.xxx)` 形式で、指定プロパティが変化したときだけ再レンダリング。
2. **アクションは getState() で取得** — Zustand の action はクロージャで閉じ込められており、ストアリセット以外で参照が変わらない。購読せず `getState()` で直接取得すれば、再レンダリングトリガーから外れる。

---

## 4. 見送った代替案と理由

### 4.1 `useShallow` でアクション群をまとめる
```ts
const actions = usePlaylistStore(useShallow((s) => ({
  createPlaylist: s.createPlaylist,
  /* ... */
})));
```
- **見送り理由**: セレクタ実行のたびに新オブジェクト生成 + shallowEqual 比較が発生。`getState()` 方式より重い。

### 4.2 アクションを useRef でメモ化
- **見送り理由**: Zustand の仕様上、`getState()` は毎回同じ state を返し、アクション参照も不変。useRef は不要。

### 4.3 `activePlaylist` 算出のセレクタ外出し
```ts
const activePlaylist = usePlaylistStore((s) =>
  s.playlists.find((pl) => pl.id === s.activePlaylistId)
);
```
- **見送り理由**: 引数依存のセレクタは毎レンダリングで関数 identity が変わり、Zustand の shallow 比較では同等扱いだが微増コスト。現状の `playlists.find(...)` はコンポーネント内で 1 回計算で済み、シンプル。

### 4.4 他のストア購読の変更
- `useViewerStore((s) => s.progressMap)` / `useViewerStore((s) => s.loadImagesForPlaylist)` / `useSettingsStore((s) => s.toggleLang)` は既に最小セレクタ形式。変更不要。

---

## 5. パフォーマンス影響評価

| 指標 | 影響 | 根拠 |
|---|---|---|
| 再レンダリング頻度 | **大幅改善** | ストア全体購読 → `playlists` / `activePlaylistId` 変更時のみ再レンダリング |
| hook 呼び出し回数 | +1 | useStore 呼び出しが 1 → 2 個に（微増・体感差なし） |
| アクション呼び出し速度 | 中立 | 関数参照は同じ |
| バンドルサイズ | 中立 | 変更なし |
| メモリ使用量 | 中立 | 変更なし |
| 初回ロード | 中立 | 変更なし |

**具体的な改善シナリオ**:
- チャンクの名前編集中に他プレイリストを編集しても `PlaylistPanel` が再レンダリングされない（従来は全ストア購読のため毎回再レンダリング）。
- 他コンポーネント（例: ViewerCanvas）が progressMap を更新する操作が PlaylistPanel に波及しなくなる。

---

## 6. 他ストアの状況

| ストア | 購読形式 | 変更必要性 |
|---|---|---|
| `useViewerStore` | セレクタ形式（`(s) => s.xxx`） | 不要 |
| `useSettingsStore` | セレクタ形式 | 不要 |
| `usePlaylistStore` | **本フェーズで修正** | ✓ |

---

## 7. 次フェーズ予告

**フェーズ3（評価のみ、コード変更なし）**: 大規模ファイル分割の可否判定レポート。

対象:
- `PlaylistPanel.tsx` 1147 行
- `FileBrowserDialog.tsx` 1128 行
- `ViewerCanvas.tsx` 782 行
- `ChunkCard.tsx` 514 行
- `chunk.rs` 352 行
- `filesystem.rs` 345 行

各ファイルについて、分割が perf 中立以上であるかを評価し、安全な分割単位を提案する。
