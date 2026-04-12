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
 * 画像パスのリストを manga:// プロトコル URL に変換する（IPC版）。
 */
export async function convertToMangaUrls(imagePaths: string[]): Promise<string[]> {
  return invoke<string[]>("convert_to_manga_urls", { imagePaths });
}

/**
 * 画像パスのリストを縮小サムネイル用の manga:// URL に変換する（IPC版）。
 */
export async function convertToMangaThumbUrls(imagePaths: string[], maxSize: number): Promise<string[]> {
  return invoke<string[]>("convert_to_manga_thumb_urls", { imagePaths, maxSize });
}

// ---------------------------------------------------------------------------
// 純粋 JS 版 manga URL 変換（IPC 不要、同期、即座に呼べる）
// ---------------------------------------------------------------------------

/** UTF-8 文字列を URL-safe Base64（パディングなし）にエンコード */
function urlSafeBase64(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/** パス内の .zip/.cbz 境界を検出 */
function findZipBoundary(path: string): [string, string | null] | null {
  const parts = path.split("/");
  const zipParts: string[] = [];
  for (let i = 0; i < parts.length; i++) {
    zipParts.push(parts[i]);
    const lower = parts[i].toLowerCase();
    if (lower.endsWith(".zip") || lower.endsWith(".cbz")) {
      const zipPath = zipParts.join("/");
      const innerPath = i + 1 < parts.length ? parts.slice(i + 1).join("/") : null;
      return [zipPath, innerPath];
    }
  }
  return null;
}

/** 画像パスを manga プロトコル URL に同期変換（IPC 不要） */
export function imagePathToMangaUrl(imagePath: string): string {
  const normalized = imagePath.replace(/\\/g, "/");

  if (normalized.startsWith("zip://")) {
    const rest = normalized.slice(6);
    const sep = rest.indexOf("///");
    if (sep !== -1) {
      const zipPath = rest.slice(0, sep);
      const entry = rest.slice(sep + 3);
      return `https://manga.localhost/zip/${urlSafeBase64(zipPath)}/${urlSafeBase64(entry)}`;
    }
    return "https://manga.localhost/error/invalid-zip-path";
  }

  const boundary = findZipBoundary(normalized);
  if (boundary) {
    const [zipPath, entryPath] = boundary;
    if (entryPath) {
      return `https://manga.localhost/zip/${urlSafeBase64(zipPath)}/${urlSafeBase64(entryPath)}`;
    }
  }

  return `https://manga.localhost/dir/${urlSafeBase64(normalized)}`;
}

/** 画像パスをサムネイル用 manga URL に同期変換（IPC 不要） */
export function imagePathToMangaThumbUrl(imagePath: string, maxSize: number): string {
  const fullUrl = imagePathToMangaUrl(imagePath);
  const prefix = "https://manga.localhost/";
  if (fullUrl.startsWith(prefix)) {
    const rest = fullUrl.slice(prefix.length);
    return `${prefix}thumb/${maxSize}/${rest}`;
  }
  return fullUrl;
}
