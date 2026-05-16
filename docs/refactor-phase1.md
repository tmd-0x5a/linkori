# リファクタリング報告書 — フェーズ1（重複削減）

**実施日**: 2026-04-17
**原則**: パフォーマンスファースト（実行速度・バンドルサイズ・再レンダリング・IPC コストのいずれも悪化させない）
**対象フェーズ**: 重複コード削減とデッドコード削除

---

## 1. 実施サマリ

| # | 対象ファイル | 変更内容 | 行数変化 |
|---|---|---|---|
| 1 | `src/lib/constants.ts` | **新規作成** — `IMAGE_EXTENSIONS` 3 重複を統合 | +42 |
| 2 | `src/lib/paths.ts` | **新規作成** — path helpers 4 本を統合 | +52 |
| 3 | `src/lib/tauri.ts` | デッドコード削除 + `mangaUrl.ts` re-export 化 | **-73** |
| 4 | `src/lib/mangaUrl.ts` | `imagePathToMangaThumbUrl` を移管 | +11 |
| 5 | `src/components/ImageFilePicker.tsx` | 重複定数を import | -1 |
| 6 | `src/components/playlist/ChunkForm.tsx` | 重複 helper を import | **-40** |
| 7 | `src/components/playlist/ChunkCard.tsx` | 重複 helper を import | **-38** |
| 8 | `src/components/playlist/FileBrowserDialog.tsx` | 拡張子配列を定数化 | +5 |

**正味**：約 **-42 行**、バンドル重複消去でバンドルサイズ微減。
**テスト**：全 61 件パス（4 test file）。
**型チェック**：`npx tsc --noEmit` エラーなし。

---

## 2. ファイル別詳細

### 2.1 新規 `src/lib/constants.ts`

**目的**: `IMAGE_EXTENSIONS` が 3 ファイルで重複定義されていた問題を解消。

**実施した変更**:
- `IMAGE_EXTENSIONS`（ドットなし配列）
- `IMAGE_EXTENSIONS_DOTTED`（ドット付き）
- `CONTAINER_EXTENSIONS_DOTTED`（.zip/.cbz/.pdf）
- すべて `as const` で readonly 化。

**見送った変更**:
- `Set<string>` への変換 → 見送り。要素数 8 の `.includes` は V8 の JIT で最適化されておりハッシュ化より速い。

### 2.2 新規 `src/lib/paths.ts`

**目的**: `ChunkCard.tsx` / `ChunkForm.tsx` で重複していた helper を集約。

**実施した変更**:
- `isPdfFile` / `getParentPath` / `getRestrictDir` / `isDirectoryLike` を統合。
- `getRestrictDir` 内の `for...of [".zip/", ".cbz/"]` ループを展開し、配列生成コストを削除（ホットパス微最適化）。
- ChunkCard 版の「PDF 短絡」は `IMAGE_EXTENSIONS` 経由判定と挙動一致のため削除。

**見送った変更**:
- 正規表現リテラルのモジュール定数化 → V8 が自動キャッシュするため不要。

### 2.3 `src/lib/tauri.ts`（-73 行）

**重要発見**: 以下 5 関数がどこからも呼ばれていないデッドコードだった。
- `imagePathToMangaUrl`（純粋 JS 版）
- `imagePathToMangaThumbUrl`（純粋 JS 版）
- `urlSafeBase64`（private）
- `findZipBoundary`（private）
- `convertToMangaUrls` / `convertToMangaThumbUrls`（IPC wrapper）

**実施した変更**:
- 上記の純粋 JS 実装と IPC wrapper を削除。
- `@/lib/mangaUrl` からの named re-export に置換。
- 行数 169 → 96（-43%）。

**見送った変更**:
- **Rust 側 `convert_to_manga_urls` / `convert_to_manga_thumb_urls` コマンド削除** → 要確認事項。フロントから呼び出しゼロのため削除するとハンドラ登録数が減り起動コストが微減するが、影響範囲が大きいのでユーザー判断を仰ぐ。

### 2.4 `src/lib/mangaUrl.ts`（+11 行）

**実施した変更**:
- `imagePathToMangaThumbUrl` を tauri.ts から移管し、manga URL 関連実装を本ファイルに集約。

### 2.5 `src/components/ImageFilePicker.tsx`

**実施した変更**:
- ローカル `IMAGE_EXTENSIONS` 削除、`@/lib/constants` から import。
- `isImage` 内の型を `readonly string[]` としてアサート。

**見送った変更**:
- `FORMAT_LABEL` / `getExt` / `getFilename` / `isImage` の paths.ts 統合 → 本ファイル専用で用途も異なるため YAGNI。

### 2.6 `src/components/playlist/ChunkForm.tsx`（-40 行）

**実施した変更**:
- ローカルの `IMAGE_EXTENSIONS`、`isPdfFile`、`getParentPath`、`getRestrictDir`、`isDirectoryLike` を全削除。
- `@/lib/paths` から 4 関数を import。

**見送った変更**:
- ファイル分割 → フェーズ3 対象。

### 2.7 `src/components/playlist/ChunkCard.tsx`（-38 行）

**実施した変更**:
- 同上の重複 helper 削除と import。

**見送った変更**:
- 514 行の分割 → 内部コンポーネント間の React 再レンダリング境界共有により props 参照比較増の懸念があるため、フェーズ3 で慎重に検証。

### 2.8 `src/components/playlist/FileBrowserDialog.tsx`（+5 行）

**実施した変更**:
- ドロップ判定の 11 要素インライン配列を削除。
- `DROPPABLE_FILE_EXTENSIONS` モジュール定数に置換（`onDrop` 呼び出しごとの配列再生成を回避）。

**見送った変更**:
- 1128 行の分割 → フェーズ3 対象。モジュールレベルに可変変数 `_savedSortField` などを保持しており、単純分割で状態復元が壊れる可能性あり。

---

## 3. パフォーマンス影響まとめ

| 指標 | 影響 | 根拠 |
|---|---|---|
| バンドルサイズ | **微減** | 重複関数体 5 本 + 定数配列 3 組の除去 |
| 初回ロード | 中立 | import 経路は変化なし（re-export） |
| ランタイム速度 | **微改善** | FileBrowserDialog の配列再生成を除去、getRestrictDir の配列生成除去 |
| 再レンダリング | 中立 | コンポーネントの props / state 構造は一切変更なし |
| IPC 回数 | 中立 | Tauri コマンドの呼び出しパターン変更なし |
| メモリ | 中立 | 実装の場所が移っただけ |

**結論**: すべて中立以上の影響。悪化要素なし。

---

## 4. 要確認事項（ユーザー判断待ち）

### 4.1 Rust 側デッドコマンド削除

`convert_to_manga_urls` / `convert_to_manga_thumb_urls`（`src-tauri/src/protocol/manga.rs:261-275`）はフロントから呼ばれていない。削除で：
- 起動時の IPC ハンドラ登録コスト微減
- バイナリサイズ微減

リスク: 将来 IPC ベースのバッチ変換に戻す場合は再実装が必要。

### 4.2 mangaUrl.test.ts のテスト対象

`imagePathToMangaUrl` / `imagePathsToMangaUrls` はテストからのみ使用されている状態。純粋関数としての正当性検証は価値があるが、呼び出し元ゼロなので将来呼び出しを追加する前提のテストであるべきか確認したい。

---

## 5. 次フェーズ予告

- **フェーズ2**: `PlaylistPanel.tsx` の `usePlaylistStore()` 全購読を最小セレクタに分割 → 再レンダリング削減。
- **フェーズ3（評価のみ）**: 大規模ファイル分割の可否判定レポート。
  - `PlaylistPanel.tsx` 1147 行
  - `FileBrowserDialog.tsx` 1128 行
  - `ViewerCanvas.tsx` 782 行
  - `ChunkCard.tsx` 514 行
  - `chunk.rs` 352 行
  - `filesystem.rs` 345 行
