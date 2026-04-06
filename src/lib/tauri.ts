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
 * 通常ファイルおよびZIPエントリに対応
 */
export async function readImageAsDataUrl(path: string): Promise<string> {
  return invoke<string>("read_image_as_data_url", { path });
}
