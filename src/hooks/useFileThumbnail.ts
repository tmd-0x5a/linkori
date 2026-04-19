import { useEffect, useState } from "react";
import { readImageAsDataUrl } from "@/lib/tauri";

/**
 * ファイルエントリのサムネイル取得 hook。
 * 画像エントリのみ非同期で data URL を取得する。
 * アンマウント時は fetch 結果を破棄（メモリリーク防止）。
 */
export function useFileThumbnail(path: string, isImage: boolean): string | null {
  const [imgSrc, setImgSrc] = useState<string | null>(null);

  useEffect(() => {
    if (!isImage) return;
    let cancelled = false;
    readImageAsDataUrl(path)
      .then((url) => { if (!cancelled) setImgSrc(url); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [path, isImage]);

  return imgSrc;
}
