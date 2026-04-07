/**
 * 画像パスを manga:// プロトコル URL に変換するユーティリティ
 * Rust 側の image_path_to_manga_url と同等のロジックを TypeScript で実装
 *
 * Tauri v2 / Windows WebView2 では manga:// は
 * https://manga.localhost/ として仮想ホストにマップされる
 */

/** 文字列を UTF-8 バイト列として URL-safe base64 (パディングなし) にエンコード */
function encodeBase64Url(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

/**
 * パス内の ZIP ファイル境界を検出する
 * Rust 側の find_zip_boundary と同等
 */
function findZipBoundary(
  path: string
): { zipPath: string; entryPath: string | null } | null {
  const parts = path.split("/");
  const acc: string[] = [];
  for (let i = 0; i < parts.length; i++) {
    acc.push(parts[i]);
    const lower = parts[i].toLowerCase();
    if (lower.endsWith(".zip") || lower.endsWith(".cbz")) {
      const zipPath = acc.join("/");
      const entryPath =
        i + 1 < parts.length ? parts.slice(i + 1).join("/") : null;
      return { zipPath, entryPath };
    }
  }
  return null;
}

/**
 * 画像パスを manga:// プロトコル URL に変換する
 * - 通常ファイル: "D:\manga\001.jpg" → "https://manga.localhost/dir/{base64}"
 * - zip:// スキーム: "zip://D:/a.zip///001.jpg" → "https://manga.localhost/zip/{base64_zip}/{base64_entry}"
 * - パス形式 ZIP: "D:/a.zip/001.jpg" → "https://manga.localhost/zip/{base64_zip}/{base64_entry}"
 */
export function imagePathToMangaUrl(imagePath: string): string {
  // Windows バックスラッシュを正規化
  const normalized = imagePath.replace(/\\/g, "/");

  // zip:// スキーム形式（Rust の chunk.rs が生成する内部表現）
  if (normalized.startsWith("zip://")) {
    const rest = normalized.slice(6);
    const sepIdx = rest.indexOf("///");
    if (sepIdx !== -1) {
      const zipPath = rest.slice(0, sepIdx);
      const entry = rest.slice(sepIdx + 3);
      return `https://manga.localhost/zip/${encodeBase64Url(zipPath)}/${encodeBase64Url(entry)}`;
    }
    return "https://manga.localhost/error/invalid-zip-path";
  }

  // パス形式の ZIP エントリ: D:/manga.zip/ch01/001.jpg
  const boundary = findZipBoundary(normalized);
  if (boundary?.entryPath != null) {
    return `https://manga.localhost/zip/${encodeBase64Url(boundary.zipPath)}/${encodeBase64Url(boundary.entryPath)}`;
  }

  // 通常ファイルパス
  return `https://manga.localhost/dir/${encodeBase64Url(normalized)}`;
}

/** パスの配列を一括変換（同期処理） */
export function imagePathsToMangaUrls(imagePaths: string[]): string[] {
  return imagePaths.map(imagePathToMangaUrl);
}
