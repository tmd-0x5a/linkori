# リファクタリング報告書 — フェーズ3（大規模ファイル分割評価）

**実施日**: 2026-04-17
**原則**: パフォーマンスファースト（コンポーネント分割で再レンダリング増加があれば却下）
**フェーズ方針**: **評価のみ。コード変更なし。** 分割案と perf 影響を提示し、実施可否判断を仰ぐ。

---

## 評価基準

| 記号 | 意味 |
|---|---|
| 🟢 | 分割推奨（perf 中立以上 + 可読性大幅改善） |
| 🟡 | 条件付き推奨（要注意事項あり） |
| 🔴 | 分割非推奨（perf 悪化リスク） |

---

## 1. `src/components/playlist/PlaylistPanel.tsx`（1147 行）

### 1.1 内部構造

| 要素 | 行数 | 役割 |
|---|---|---|
| `SortablePlaylistItem`（外部関数） | 37-63 | プレイリスト行ドラッグラッパー |
| `PlaylistPanel` メイン | 69-1046 | **978 行** — ほぼ全ロジック |
| `StatusDot`（外部関数） | 1048-1062 | 読了状態インジケータ |
| `TagEditor`（外部関数） | 1064-1147 | タグ編集 UI |

メイン関数内部の主要セクション:
- プレイリスト CRUD (`handleCreatePlaylist`, `handleStartRename`, `handleRename`)
- 分割アンドゥ系 (`getUndoSplitHandler`, `handleSplitChunk`, `handleUndoBannerSplit`, `getAllDescendants`, `getAllRelatedGids`)
- 選択系 (`handleSingleSelect`, `handleToggleSelect`, `handleRangeSelect`, `handleDragSelect`)
- 一括削除＆アンドゥ (`handleBatchDelete`, `handleUndoDelete`, `deleteUndoStack`)
- ソート (`handleSort` + 8種類の sortField)
- ドラッグエンド (`handleChunkDragEnd`, `handlePlaylistDragEnd`)
- JSX（約 500 行）

### 1.2 分割候補と評価

#### 🟢 A. `SortablePlaylistItem`, `StatusDot`, `TagEditor` を別ファイル化
- **perf 影響**: 中立。React はトップレベルのコンポーネントも React.memo 以外では再レンダリング境界が同じ。外出し＝ファイル分割のみでレンダリングツリー不変。
- **見積削減**: -140 行
- **リスク**: なし

#### 🟡 B. 分割アンドゥ系を `useSplitUndo` カスタム hook 化
- 状態: `splitUndoEntries`, `lastSplitGid`, `showUndoBanner`
- 関数: `getUndoSplitHandler`, `handleSplitChunk`, `handleUndoBannerSplit`, `getAllDescendants`, `getAllRelatedGids`
- **perf 影響**: **要注意**。hook 化で状態は同じ場所（React 内部）に残るが、hook から返す **関数参照と state オブジェクト** の useCallback / useMemo が必須。ラップコストは微増するが、hook 側で `useCallback` を正しく付ければ中立化可能。
- **見積削減**: -90 行（PlaylistPanel 側）
- **リスク**: hook 境界越しに store アクション参照を渡す必要があり、useRef 経由 or 再購読でどちらも perf 中立化可能だが実装ミスで悪化する可能性。

#### 🟡 C. 削除アンドゥ系を `useDeleteUndo` カスタム hook 化
- 状態: `deleteUndoStack`, `showDeleteUndoBanner`
- **perf 影響**: B と同様。より小規模なので安全度高い。
- **見積削減**: -40 行

#### 🔴 D. ChunkList / PlaylistList 領域を 2 コンポーネントに分割
- **perf 影響**: **悪化リスク大**。現状 `handleChunkDragEnd` など最新 state を参照するため `selectedChunkIdsRef` / `activePlaylistRef` で ref 連携済み。分割すると `selectedChunkIds`, `anchorIdx`, `activePlaylist`, 14 アクションなど 20 個以上の props 伝搬が発生し、親コンポーネントの再レンダリング時に子の参照比較コストが膨大。React.memo 化を併用しても props 個数が多すぎる。
- **結論**: **非推奨**。

### 1.3 推奨実施項目（次回作業）

| 優先度 | 項目 | 削減 | リスク |
|---|---|---|---|
| 高 | A. 3 コンポーネント外出し | -140 | なし |
| 中 | B + C. アンドゥ系 hook 化 | -130 | useCallback 実装ミス時に悪化 |

**合計で約 -270 行（1147 → 約 880 行）**。150 行ルールには未達だが perf を犠牲にしない範囲で最大削減可能。

---

## 2. `src/components/playlist/FileBrowserDialog.tsx`（1128 行）

### 2.1 内部構造

| 要素 | 行数 | 役割 |
|---|---|---|
| **モジュールスコープ可変変数** | - | `_savedSortField`, `_savedSortDir`, `_savedViewMode`（ダイアログ再オープン時の復元用） |
| `extractZipFilePath` / `pathToLocation` / `buildLocationStack` | 61-103 | パス変換 helper（純粋関数） |
| `FileBrowserDialog` メイン | 105-876 | **772 行** |
| `SortIcon`, `formatDate` | 878-906 | 表示 helper |
| `FileRow` | 915-994 | リスト表示行 |
| `GridCard` | 1002-1057 | グリッドカード |
| `PdfIcon`, `SidebarFolderIcon` | 1059-1128 | アイコン |

### 2.2 分割候補と評価

#### 🟢 A. アイコン類（`SortIcon`, `PdfIcon`, `SidebarFolderIcon`）を `icons.tsx` へ
- **perf 影響**: 中立。すべてステートレス。
- **見積削減**: -50 行

#### 🟢 B. パス helper（`extractZipFilePath`, `pathToLocation`, `buildLocationStack`）を `lib/fileBrowserPaths.ts` へ
- **perf 影響**: 中立。純粋関数。
- **見積削減**: -45 行

#### 🟢 C. `formatDate` を `lib/format.ts` へ（共通化の余地）
- **perf 影響**: 中立。
- **見積削減**: -12 行（将来の共通利用も可）

#### 🟡 D. `FileRow` / `GridCard` を別ファイル化
- **perf 影響**: **要検証**。両コンポーネント内で `readImageAsDataUrl` を呼ぶサムネイル読み込みロジックが共通で、useEffect + useRef のパターンが重複している。まず **サムネイル hook (`useFileThumbnail`)** を作ってから分離するほうが安全。
- hook 化で重複削減 + 別ファイル化で最終 -200 行程度。
- **リスク**: React.memo 適用時に props 参照比較が増加。現状は親の render 内で row をループ生成しているので、memo が効くようには親側 handler の useCallback 化が必須（該当箇所が parent にある）。

#### 🟡 E. モジュールスコープ可変変数を Zustand 化 or useRef 化
- 現状: `let _savedSortField = ...` でモジュール内可変状態を保持。HMR / テスト環境で状態が不確定。
- 提案: `useSettingsStore` に `fileBrowser: { sortField, sortDir, viewMode }` を追加し、永続化も兼ねる。
- **perf 影響**: **中立以上**。モジュール可変は GC 対象外 + 型安全性欠如、Zustand 化で型安全 & persistence も獲得。
- **リスク**: 永続化対象が増える（起動時ロードで +1 プロパティ）。

### 2.3 推奨実施項目

| 優先度 | 項目 | 削減 | リスク |
|---|---|---|---|
| 高 | A. アイコン外出し | -50 | なし |
| 高 | B. パス helper 外出し | -45 | なし |
| 中 | C. formatDate 共通化 | -12 | なし |
| 中 | E. 可変変数 → Zustand | ±0 | 設計変更 |
| 低 | D. Row/Card + hook 化 | -200 | useCallback 実装次第で perf 悪化 |

**安全圏の合計: -100 行程度（1128 → 1028）**。D を含めれば -300 行だが慎重な検証が必要。

---

## 3. `src/components/viewer/ViewerCanvas.tsx`（782 行）

### 3.1 内部構造

| 要素 | 行数 | 役割 |
|---|---|---|
| `ViewerCanvas` メイン | 16-756 | **740 行** |
| `HomeIcon` / `FullscreenIcon` / `ExitFullscreenIcon` | 757-782 | SVG アイコン |

メイン関数内の特徴:
- **ref だけで 10 個以上**: `isFullscreenRef`, `containerRef`, `prevIndexRef`, `imageCacheRef`, `failedPathsRef`, `loadingPathsRef`, `pdfRetryCountRef`, `thumbCacheRef`, `thumbLoadingRef`, `prevListIdRef`, `thumbPrefetchPageRef`, `lastWheelTime`
- **画像キャッシュロジック**: `imageCacheRef` を介した LRU 的挙動（`CACHE_BEHIND = 6`, `CACHE_AHEAD = 10`）
- **キーボード/ホイール/クリック** 操作
- **PDF レンダリング**と `generateThumbFromCache`

### 3.2 分割候補と評価

#### 🟢 A. アイコン 3 個を `icons.tsx` へ
- **見積削減**: -26 行
- **リスク**: なし

#### 🔴 B. 画像キャッシュロジックを `useImageCache` hook 化
- **perf 影響**: **悪化リスク大**。ref が 5 個以上絡み合い、キャッシュヒット判定が画像表示処理と密結合。hook に切り出すと、slot 判定 / プリフェッチ / LRU エビクションで毎回 hook 境界を跨いだ関数呼び出しコストが発生。画像表示は **1フレーム内で数十回参照される**ホットパスなので関数呼び出しのインライン化が効かなくなる可能性。
- **結論**: **非推奨**。ref が同一スコープにある現状のほうが確実に速い。

#### 🔴 C. キーボードショートカットハンドラを `useViewerKeyboard` hook 化
- **perf 影響**: 中立の可能性はあるが、`settings`, `currentPageIndex`, `goToNextPage`, `toggleFullscreen` など多数依存を hook 引数で渡すと useCallback の依存配列が膨らみ、ハンドラ再生成が増える可能性。
- **結論**: 実装難度に対するメリット限定的。

#### 🟡 D. PDF レンダリング系だけ抽出（`pdfRetryCountRef` + `generateThumbFromCache`）
- **perf 影響**: 画像キャッシュと独立している部分は切り離し可能。ただし `imageCacheRef` と `thumbCacheRef` を共有するので完全分離は困難。
- **結論**: 中途半端になるので分離してもメリット小。

### 3.3 推奨実施項目

| 優先度 | 項目 | 削減 | リスク |
|---|---|---|---|
| 高 | A. アイコン外出し | -26 | なし |

**ViewerCanvas は分割せず現状維持が最適。** 大きいが、内容の結合度が高く、分割で perf 悪化のリスクが高い典型例。パフォーマンスファーストの原則に従い「綺麗だが遅い」を避けるべき。

---

## 4. `src/components/playlist/ChunkCard.tsx`（514 行）

### 4.1 内部構造

| 要素 | 行数 | 役割 |
|---|---|---|
| `ChunkCard` メイン | 45-418 | **374 行** |
| `ThumbItem`（外部関数） | 420-514 | サムネイル表示 |

メイン関数内の特徴:
- サムネイル生成ロジック（画像 / PDF 両対応）
- 編集フォーム UI（`ImageFilePicker` × 2）
- ContextMenu
- 分割/削除/お気に入り ハンドラ

### 4.2 分割候補と評価

#### 🟡 A. 編集フォーム部分を `ChunkCardEditForm` に切り出し
- **perf 影響**: **要注意**。編集モードと表示モードは同じコンポーネント内で切り替わっている。分離すると props 伝搬が発生（`editStart`, `editEnd`, `editName`, `onUpdate`, `onCancel`, 検証状態など10個以上）。React.memo を適用しないと再レンダリング頻度は変わらず、親の props 参照比較コストだけが増える。
- **結論**: 要 React.memo + useCallback 化、しかも parent 側の最適化が前提。

#### 🔴 B. ContextMenu セクションを分離
- **perf 影響**: すでに ContextMenu は別コンポーネント。これ以上の分離はポジション計算 ref を parent に置きつつ子に渡す形になり、props 伝搬コストが増える。

#### 🟢 C. `ThumbItem` は既に外部関数になっているので何もしない
- **結論**: 現状が最適。

### 4.3 推奨実施項目

**現状維持。** ChunkCard は編集状態と表示状態を切り替える設計で、状態分割が perf 悪化に直結する。514 行は 150 行ルールを超えるが、分割で失うものが多すぎる。

---

## 5. `src-tauri/src/commands/chunk.rs`（352 行）

### 5.1 内部構造

- `PathType` enum
- `classify_path`（30-64）: パス種別判定
- `validate_chunk`（#[tauri::command], 68-304）: **237 行の巨大 match 式**。8 パターンで `ChunkValidationResult` を構築。
- `resolve_from_start_only`（307-333）
- `resolve_chunk_images`（#[tauri::command], 337-352）

### 5.2 分割候補と評価

#### 🟢 A. `ChunkValidationResult` 構築ヘルパーの導入
```rust
fn ok_result(paths: Vec<String>) -> ChunkValidationResult { ... }
fn err_result(msg: &str) -> ChunkValidationResult { ... }
```
- **perf 影響**: 中立。インライン化される。`#[inline]` 付与で強制可能。
- **見積削減**: `validate_chunk` 内の重複 struct リテラル 8 箇所 × ~6 行 = **約 -48 行**
- **リスク**: なし

#### 🟢 B. 巨大 match 式を「種別ペア判定」関数に切り出し
```rust
fn validate_dir_pair(dir1: &str, dir2: &str) -> ChunkValidationResult { ... }
fn validate_file_pair(dir1: &str, file1: &str, dir2: &str, file2: &str) -> ChunkValidationResult { ... }
fn validate_zip_whole_pair(zip1: &str, zip2: &str) -> ChunkValidationResult { ... }
fn validate_zip_entry_pair(zip1: &str, entry1: &str, zip2: &str, entry2: &str) -> ChunkValidationResult { ... }
```
- **perf 影響**: 中立。Rust の LLVM 最適化で小さな関数はインライン化される。
- **見積削減**: `validate_chunk` が 237 行 → 約 60 行
- **リスク**: なし。サービス層分離も兼ねる（#[tauri::command] は薄いラッパーに）

#### 🟢 C. 「薄いラッパー」原則に従い `commands/chunk.rs` と `services/chunk.rs` に分離
- `commands/chunk.rs`: `#[tauri::command]` 宣言 + 引数バリデーション
- `services/chunk.rs`: ビジネスロジック（classify, validate, resolve）
- **perf 影響**: 中立。関数呼び出しは extern "Rust" であり LLVM インライン化可能。
- **リスク**: ビルド時ファイル数 +1。

### 5.3 推奨実施項目

| 優先度 | 項目 | 削減 | リスク |
|---|---|---|---|
| 高 | A. 構築ヘルパー | -48 | なし |
| 高 | B. match 式を関数化 | さらに -100 相当を整理 | なし |
| 中 | C. services/ 分離 | ±0（整理効果） | なし |

**合計で 352 → 約 200 行に圧縮可能（サービス層分離なしで 250 行）。** Rust 側は LLVM の最適化が強力なので関数分割で perf 悪化はほぼ発生しない。フェーズ4 候補筆頭。

---

## 6. `src-tauri/src/commands/filesystem.rs`（345 行）

### 6.1 内部構造

| コマンド | 行数 | 役割 |
|---|---|---|
| helpers（`is_zip_like`, `detect_is_dir`, `detect_is_hidden`） | 30-60 | 判定関数 |
| `browse_directory`（62-128） | 67 | ディレクトリ走査 |
| `list_drives`（131-151） | 21 | ドライブ列挙 |
| `browse_zip`（158-265） | **108** | ZIP 走査（最大） |
| `get_path_meta`（277-288） | 12 | メタデータ取得 |
| `list_split_candidates`（300-333） | 34 | 分割候補抽出 |
| `read_file_as_base64`（333-345） | 13 | base64 変換 |

### 6.2 分割候補と評価

#### 🟢 A. 機能別ファイル分離
```
commands/
├── filesystem/
│   ├── mod.rs          # 再エクスポート
│   ├── directory.rs    # browse_directory, list_drives
│   ├── zip.rs          # browse_zip（100行）
│   ├── meta.rs         # get_path_meta, list_split_candidates, read_file_as_base64
│   └── helpers.rs      # is_zip_like, detect_is_dir, detect_is_hidden
```
- **perf 影響**: 中立。IPC 登録は `lib.rs` の `invoke_handler![]` マクロで個別指定なので、ファイル配置変更の影響なし。
- **見積削減**: 345 → 約 110 行（最大）／90 行（zip.rs 単独）
- **リスク**: ビルド時ファイル数 +4。

#### 🟢 B. `browse_zip` を「エントリ走査」と「FileEntry 構築」に分解
- `browse_zip` 内の「サブディレクトリ / 画像分別」ロジックと「FileEntry 構築」ロジックを関数に分離。
- **perf 影響**: 中立。
- **見積削減**: 関数長 107 → 約 50 行

### 6.3 推奨実施項目

| 優先度 | 項目 | 削減 | リスク |
|---|---|---|---|
| 高 | A. ファイル分離 | 345 → 最大ファイル 110 | なし |
| 中 | B. browse_zip 内部分解 | 107 → 50 | なし |

---

## 総合サマリ

### 🟢 実施すべき分割（低リスク・高効果）

| ファイル | 項目 | 削減 |
|---|---|---|
| PlaylistPanel.tsx | SortablePlaylistItem / StatusDot / TagEditor 外出し | -140 |
| FileBrowserDialog.tsx | アイコン + パス helper + formatDate 外出し | -107 |
| ViewerCanvas.tsx | アイコン 3 個外出し | -26 |
| chunk.rs | 構築ヘルパー + match 式関数化 | -148 |
| filesystem.rs | 機能別 4 ファイル分離 | -235 |
| **合計** | **-656 行** | |

### 🟡 慎重に実施すべき分割（要検証）

| ファイル | 項目 | 注意点 |
|---|---|---|
| PlaylistPanel.tsx | splitUndo / deleteUndo hook 化 | useCallback 徹底 |
| FileBrowserDialog.tsx | FileRow / GridCard + useFileThumbnail | parent 側 useCallback が前提 |
| FileBrowserDialog.tsx | 可変変数 → Zustand 化 | 永続化設計の影響 |

### 🔴 分割非推奨（perf 悪化リスク）

| ファイル | 却下項目 |
|---|---|
| PlaylistPanel.tsx | ChunkList / PlaylistList 2 分割（props 20+ 伝搬） |
| ViewerCanvas.tsx | 画像キャッシュ hook 化（ref 10+ の絡み） |
| ViewerCanvas.tsx | キーボードハンドラ hook 化（依存爆発） |
| ChunkCard.tsx | 編集フォーム分離（状態遷移が親子境界をまたぐ） |

### 結論

- **150 行ルールは一部ファイル（ViewerCanvas, ChunkCard）で守れない**。無理に守ると perf 悪化する構造。
- **Rust 側は積極的に分割推奨**。LLVM 最適化が強く関数分割で speed ペナルティなし。
- **TypeScript 側は「静的コンポーネント・純粋関数の外出し」のみ安全**。状態や ref を伴う分割は React の再レンダリング境界を壊す。

### 次フェーズ提案

**フェーズ4（実行）** として 🟢 分類のみ実施する。フェーズ4 後の合計削減見込み：

```
変更前合計: 1147 + 1128 + 782 + 514 + 352 + 345 = 4268 行
変更後合計: 約 3612 行（-656 行、-15%）
```

🟡 分類は各項目ごとに個別レポート付きで別フェーズとする。

---

## 要確認事項（ユーザー判断）

1. **フェーズ4 を実施するか**: 上記 🟢 のみ実施する場合、どこまで着手するか。
   - 最小安全案: Rust 側のみ（chunk.rs + filesystem.rs 分離）
   - 標準案: 上記 🟢 全項目
   - 最大案: 🟢 + 🟡 の一部（要個別評価）

2. **FileBrowserDialog の可変モジュール変数**（Zustand 化）は設計変更を伴うため、明示的承認が必要。

3. **150 行ルール未達のファイルの扱い**: ViewerCanvas、ChunkCard は分割すると perf が悪化するため**ルールから除外**する提案をします（CLAUDE.md への明記）。
