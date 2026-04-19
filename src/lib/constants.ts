/**
 * プロジェクト全体で共有する定数
 * ここに集約することで重複定義を避け、tree-shake 可能にする
 */

/**
 * サポート対象の画像拡張子（小文字・ドットなし）
 * ファイル種別判定は拡張子のみで行うため、Rust 側 is_image_file と同期させる
 */
export const IMAGE_EXTENSIONS = [
  "jpg",
  "jpeg",
  "png",
  "gif",
  "webp",
  "bmp",
  "tiff",
  "tif",
] as const;

/**
 * IMAGE_EXTENSIONS と同内容のドット付き配列
 * FileBrowserDialog のように ".jpg" 形式で比較する箇所用
 */
export const IMAGE_EXTENSIONS_DOTTED = [
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".webp",
  ".bmp",
  ".tiff",
  ".tif",
] as const;

/**
 * ブラウザで開けるフォルダ型コンテナ拡張子
 * （ZIP / CBZ / PDF もディレクトリのように扱う）
 */
export const CONTAINER_EXTENSIONS_DOTTED = [".zip", ".cbz", ".pdf"] as const;
