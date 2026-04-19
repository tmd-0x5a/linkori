/**
 * パス操作ユーティリティ
 * ChunkCard.tsx / ChunkForm.tsx / FileBrowserDialog.tsx などで重複していた
 * helper を集約。純粋関数なのでコンポーネントから hook 化せず直接 import 可。
 */

import { IMAGE_EXTENSIONS } from "./constants";

/** PDF ファイルかどうか（拡張子のみ判定） */
export function isPdfFile(path: string): boolean {
  return path.trim().toLowerCase().endsWith(".pdf");
}

/** 親ディレクトリパスを返す。ルート直下または空文字なら undefined */
export function getParentPath(path: string): string | undefined {
  if (!path.trim()) return undefined;
  const normalized = path.replace(/\\/g, "/").replace(/\/+$/, "");
  const lastSlash = normalized.lastIndexOf("/");
  if (lastSlash <= 0) return undefined;
  return normalized.slice(0, lastSlash);
}

/**
 * 終了パス選択を制限するディレクトリを開始パスから算出する。
 * .zip / .cbz の中にあるファイルなら ZIP ルートを返し、それ以外は親ディレクトリ。
 */
export function getRestrictDir(startPath: string): string | undefined {
  if (!startPath.trim()) return undefined;
  const norm = startPath.replace(/\\/g, "/");
  const lower = norm.toLowerCase();
  // ホットループ内で配列を毎回生成しないようローカル定数として展開
  const zipIdx = lower.indexOf(".zip/");
  if (zipIdx !== -1) return norm.slice(0, zipIdx + 4);
  const cbzIdx = lower.indexOf(".cbz/");
  if (cbzIdx !== -1) return norm.slice(0, cbzIdx + 4);
  return getParentPath(norm);
}

/**
 * ディレクトリに相当するパスかどうか（末尾が画像拡張子でなければ true）。
 * PDF も複数ページ扱いで true を返す（拡張子 "pdf" は画像リストに含まれないため自動で true）。
 */
export function isDirectoryLike(path: string): boolean {
  if (!path.trim()) return false;
  const normalized = path.replace(/\\/g, "/").replace(/\/+$/, "");
  const lastSegment = normalized.split("/").pop() ?? "";
  const dotIdx = lastSegment.lastIndexOf(".");
  if (dotIdx < 0) return true;
  const ext = lastSegment.slice(dotIdx + 1).toLowerCase();
  return !(IMAGE_EXTENSIONS as readonly string[]).includes(ext);
}
