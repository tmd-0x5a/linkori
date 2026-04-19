import { invoke } from "@tauri-apps/api/core";
import type { FileEntry, ChunkValidationResult } from "@/types";

/**
 * チャンクのパスを検証し、画像枚数を返す
 */
export async function validateChunk(
  startPath: string,
  endPath: string
): Promise<ChunkValidationResult> {
  return invoke<ChunkValidationResult>("validate_chunk", { startPath, endPath });
}

/**
 * チャンク内の画像パスリストを解決
 */
export async function resolveChunkImages(
  startPath: string,
  endPath: string
): Promise<string[]> {
  return invoke<string[]>("resolve_chunk_images", {
    startPath,
    endPath,
  });
}

/**
 * ディレクトリの内容をリスト表示
 */
export async function browseDirectory(path: string): Promise<FileEntry[]> {
  return invoke<FileEntry[]>("browse_directory", { path });
}

/**
 * ZIPファイルの内容をリスト表示
 */
export async function browseZip(zipPath: string): Promise<FileEntry[]> {
  return invoke<FileEntry[]>("browse_zip", { zipPath });
}

/**
 * 利用可能なドライブ一覧を取得
 */
export async function listDrives(): Promise<string[]> {
  return invoke<string[]>("list_drives");
}

/**
 * 画像パスを base64 data URL として読み込む
 * 通常ファイルおよびZIPエントリに対応（サムネイル等の単体読み込み用）
 */
export async function readImageAsDataUrl(path: string): Promise<string> {
  return invoke<string>("read_image_as_data_url", { path });
}

/**
 * 縮小サムネイルを base64 data URL として返す（シークバーホバー用）
 * maxSize の長辺に収まるよう縮小して JPEG として返す
 */
export async function readImageThumbnail(path: string, maxSize: number = 120): Promise<string> {
  return invoke<string>("read_image_thumbnail", { path, maxSize });
}

/**
 * ファイルを base64 文字列として読み込む（PDF など、フロントで処理するファイル用）
 */
export async function readFileAsBase64(path: string): Promise<string> {
  return invoke<string>("read_file_as_base64", { path });
}

/**
 * パスのファイルシステムメタデータ（更新日時・作成日時）を取得する。
 * チャンクの日時ソートに使用する。
 */
export async function getPathMeta(path: string): Promise<{ modified_at: number | null; created_at: number | null }> {
  return invoke<{ modified_at: number | null; created_at: number | null }>("get_path_meta", { path });
}

/**
 * フォルダのチャンク分割候補を返す。
 * 画像を直接含む最も深い子フォルダを再帰的に収集する。
 */
export async function listSplitCandidates(path: string): Promise<Array<{ name: string; path: string }>> {
  return invoke<Array<{ name: string; path: string }>>("list_split_candidates", { path });
}

// ---------------------------------------------------------------------------
// 同期版 manga URL 変換の再エクスポート（呼び出し元が @/lib/tauri を期待する場合用）
// 実装は @/lib/mangaUrl に一本化
// ---------------------------------------------------------------------------
export {
  imagePathToMangaUrl,
  imagePathsToMangaUrls,
  imagePathToMangaThumbUrl,
} from "./mangaUrl";
