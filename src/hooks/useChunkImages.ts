import { useState, useCallback } from "react";
import { resolveChunkImages, readImageAsDataUrl } from "@/lib/tauri";

interface UseChunkImagesReturn {
  images: string[];
  isLoading: boolean;
  error: string | null;
  loadImages: (startPath: string, endPath: string) => Promise<void>;
  clear: () => void;
}

/**
 * チャンクの画像リストを取得するフック（プレビュー用）
 */
export function useChunkImages(): UseChunkImagesReturn {
  const [images, setImages] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadImages = useCallback(
    async (startPath: string, endPath: string) => {
      setIsLoading(true);
      setError(null);

      try {
        const paths = await resolveChunkImages(startPath, endPath);
        const urls = await Promise.all(paths.map((p) => readImageAsDataUrl(p)));
        setImages(urls);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "画像の取得に失敗しました"
        );
        setImages([]);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const clear = useCallback(() => {
    setImages([]);
    setError(null);
  }, []);

  return { images, isLoading, error, loadImages, clear };
}
