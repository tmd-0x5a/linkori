/**
 * PDF レンダリングユーティリティ（pdf.js を使用）
 *
 * PDFページは "pdf:${pdfFilePath}#${pageNum}" の形式で識別する（pageNum は 1 始まり）。
 * 例: pdf:D:/manga/book.pdf#1
 *
 * ブラウザ専用モジュール。SSR 時には実行されない。
 */

import type { PDFDocumentProxy } from "pdfjs-dist";

let pdfjsLib: typeof import("pdfjs-dist") | null = null;

/** pdf.js をブラウザ側でのみ動的にロードする */
async function getPdfjs() {
  if (pdfjsLib) return pdfjsLib;
  // SSR環境（Node.js）では実行しない
  if (typeof window === "undefined") {
    throw new Error("PDF レンダリングはブラウザ専用です");
  }
  const lib = await import("pdfjs-dist");
  // ワーカーの設定（webpack/Next.js がビルド時にファイルを解決する）
  lib.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url
  ).toString();
  pdfjsLib = lib;
  return lib;
}

// ロード済み PDF ドキュメントのキャッシュ（同一ファイルの重複読み込みを防ぐ）
const pdfDocCache = new Map<string, PDFDocumentProxy>();
const pdfLoadingCache = new Map<string, Promise<PDFDocumentProxy>>();

/** パスが PDF ページパスかどうか判定 */
export function isPdfPagePath(path: string): boolean {
  return path.startsWith("pdf:");
}

/** PDF ページパスを解析する */
export function parsePdfPagePath(path: string): { pdfPath: string; pageNum: number } | null {
  if (!path.startsWith("pdf:")) return null;
  const rest = path.slice(4);
  const hashIdx = rest.lastIndexOf("#");
  if (hashIdx === -1) return null;
  const pageNum = parseInt(rest.slice(hashIdx + 1), 10);
  if (isNaN(pageNum) || pageNum < 1) return null;
  return { pdfPath: rest.slice(0, hashIdx), pageNum };
}

/** PDF ページパスを生成する */
export function makePdfPagePath(pdfPath: string, pageNum: number): string {
  return `pdf:${pdfPath}#${pageNum}`;
}

/**
 * PDF ドキュメントを読み込む（キャッシュ付き）。
 * Rust の read_file_as_base64 コマンドでバイト列を取得して pdf.js に渡す。
 */
async function loadPdfDocument(pdfPath: string): Promise<PDFDocumentProxy> {
  const cached = pdfDocCache.get(pdfPath);
  if (cached) return cached;

  const loading = pdfLoadingCache.get(pdfPath);
  if (loading) return loading;

  const promise = (async () => {
    const pdfjs = await getPdfjs();

    // Rust 経由でファイルを base64 として読み込む
    const { invoke } = await import("@tauri-apps/api/core");
    const base64: string = await invoke("read_file_as_base64", { path: pdfPath });

    // base64 → Uint8Array に変換
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    const doc = await pdfjs.getDocument({ data: bytes }).promise;
    pdfDocCache.set(pdfPath, doc);
    pdfLoadingCache.delete(pdfPath);
    return doc;
  })();

  pdfLoadingCache.set(pdfPath, promise);
  return promise;
}

/** PDF のページ数を取得する */
export async function getPdfPageCount(pdfPath: string): Promise<number> {
  const doc = await loadPdfDocument(pdfPath);
  return doc.numPages;
}

/**
 * PDF の指定ページを canvas にレンダリングして data URL を返す。
 * @param pdfPath PDF ファイルの絶対パス
 * @param pageNum ページ番号（1 始まり）
 * @param scale  レンダリングスケール（デフォルト 1.5 = 約 108dpi 相当）
 */
export async function renderPdfPage(
  pdfPath: string,
  pageNum: number,
  scale = 1.5
): Promise<string> {
  const doc = await loadPdfDocument(pdfPath);
  const page = await doc.getPage(pageNum);

  const viewport = page.getViewport({ scale });
  const canvas = document.createElement("canvas");
  canvas.width = viewport.width;
  canvas.height = viewport.height;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas context の取得に失敗しました");

  await page.render({ canvasContext: ctx, viewport, canvas }).promise;
  return canvas.toDataURL("image/jpeg", 0.92);
}

/**
 * PDF の指定ページをサムネイルとしてレンダリングして data URL を返す。
 * メイン表示より低品質・低解像度で高速。
 */
export async function renderPdfThumbnail(
  pdfPath: string,
  pageNum: number,
  maxSize: number
): Promise<string> {
  const doc = await loadPdfDocument(pdfPath);
  const page = await doc.getPage(pageNum);

  // scale=1 の viewport でサイズを取得してから最適スケールを計算
  const baseViewport = page.getViewport({ scale: 1 });
  const scale = maxSize / Math.max(baseViewport.width, baseViewport.height);
  const viewport = page.getViewport({ scale });

  const canvas = document.createElement("canvas");
  canvas.width = viewport.width;
  canvas.height = viewport.height;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas context の取得に失敗しました");

  await page.render({ canvasContext: ctx, viewport, canvas }).promise;
  return canvas.toDataURL("image/jpeg", 0.4);
}

/** キャッシュを全クリアする（ビューア終了時などに使用） */
export function clearPdfCache(): void {
  for (const doc of pdfDocCache.values()) {
    doc.destroy();
  }
  pdfDocCache.clear();
  pdfLoadingCache.clear();
}
