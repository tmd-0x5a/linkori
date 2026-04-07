import { invoke } from "@tauri-apps/api/core";
import type { FileEntry } from "@/types";

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
 * 画像パスのリストを manga:// プロトコル URL に一括変換する
 * ビューア用（遅延読み込み・オンデマンド配信）
 */
export async function convertToMangaUrls(imagePaths: string[]): Promise<string[]> {
  return invoke<string[]>("convert_to_manga_urls", { imagePaths });
}
