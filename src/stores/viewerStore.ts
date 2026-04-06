import { create } from "zustand";
import type { ViewerSettings } from "@/types";
import { resolveChunkImages, readImageAsDataUrl } from "@/lib/tauri";
import { usePlaylistStore } from "./playlistStore";

interface ViewerState {
  // --- 表示状態 ---
  flatImageList: string[];
  currentPageIndex: number;
  totalPages: number;
  isLoading: boolean;
  loadError: string | null;

  // --- 設定 ---
  settings: ViewerSettings;

  // --- アクション ---
  loadImagesForPlaylist: (playlistId: string) => Promise<void>;
  goToPage: (index: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  nextSpread: () => void;
  prevSpread: () => void;
  goToFirst: () => void;
  goToLast: () => void;
  updateSettings: (settings: Partial<ViewerSettings>) => void;
  reset: () => void;
}

const DEFAULT_SETTINGS: ViewerSettings = {
  spreadMode: true,
  rightToLeft: true,
  pageTransition: true,
};

export const useViewerStore = create<ViewerState>((set, get) => ({
  flatImageList: [],
  currentPageIndex: 0,
  totalPages: 0,
  isLoading: false,
  loadError: null,

  settings: DEFAULT_SETTINGS,

  loadImagesForPlaylist: async (playlistId: string) => {
    set({ isLoading: true, loadError: null, flatImageList: [], totalPages: 0 });

    try {
      const playlist = usePlaylistStore
        .getState()
        .playlists.find((pl) => pl.id === playlistId);

      if (!playlist) {
        set({ isLoading: false, loadError: "プレイリストが見つかりません" });
        return;
      }

      // 全チャンクの画像パスを順番に取得して結合（未検証チャンクも試みる）
      const allImagePaths: string[] = [];
      const chunkErrors: string[] = [];
      for (const chunk of playlist.chunks) {
        try {
          const paths = await resolveChunkImages(
            chunk.startPath,
            chunk.endPath
          );
          allImagePaths.push(...paths);
        } catch (error) {
          const msg = error instanceof Error ? error.message : String(error);
          chunkErrors.push(`[${chunk.startPath}]: ${msg}`);
        }
      }

      if (allImagePaths.length === 0) {
        set({
          isLoading: false,
          loadError: chunkErrors.length > 0
            ? `画像を読み込めませんでした:\n${chunkErrors.join("\n")}`
            : "表示可能な画像がありません",
        });
        return;
      }

      // 各画像パスを base64 data URL に変換（manga:// プロトコルを使わない）
      const dataUrls = await Promise.all(
        allImagePaths.map(async (path) => {
          try {
            return await readImageAsDataUrl(path);
          } catch (e) {
            console.warn(`[Viewer] 画像読み込み失敗: ${path}`, e);
            return "";
          }
        })
      );

      // 読み込みに失敗した画像（空文字）を除外
      const validUrls = dataUrls.filter((url) => url !== "");

      if (validUrls.length === 0) {
        set({
          isLoading: false,
          loadError: "画像の読み込みに失敗しました",
        });
        return;
      }

      set({
        flatImageList: validUrls,
        totalPages: validUrls.length,
        currentPageIndex: 0,
        isLoading: false,
        loadError: null,
      });
    } catch (error) {
      set({
        isLoading: false,
        loadError:
          error instanceof Error ? error.message : "画像の読み込みに失敗しました",
      });
    }
  },

  goToPage: (index: number) => {
    const { totalPages } = get();
    if (totalPages === 0) return;
    const clamped = Math.max(0, Math.min(index, totalPages - 1));
    set({ currentPageIndex: clamped });
  },

  nextPage: () => {
    const { currentPageIndex, totalPages } = get();
    if (currentPageIndex < totalPages - 1) {
      set({ currentPageIndex: currentPageIndex + 1 });
    }
  },

  prevPage: () => {
    const { currentPageIndex } = get();
    if (currentPageIndex > 0) {
      set({ currentPageIndex: currentPageIndex - 1 });
    }
  },

  nextSpread: () => {
    const { currentPageIndex, totalPages, settings } = get();
    const step = settings.spreadMode ? 2 : 1;
    const nextIdx = Math.min(currentPageIndex + step, totalPages - 1);
    set({ currentPageIndex: nextIdx });
  },

  prevSpread: () => {
    const { currentPageIndex, settings } = get();
    const step = settings.spreadMode ? 2 : 1;
    const prevIdx = Math.max(currentPageIndex - step, 0);
    set({ currentPageIndex: prevIdx });
  },

  goToFirst: () => {
    set({ currentPageIndex: 0 });
  },

  goToLast: () => {
    const { totalPages } = get();
    if (totalPages > 0) {
      set({ currentPageIndex: totalPages - 1 });
    }
  },

  updateSettings: (newSettings: Partial<ViewerSettings>) => {
    set((state) => ({
      settings: { ...state.settings, ...newSettings },
    }));
  },

  reset: () => {
    set({
      flatImageList: [],
      currentPageIndex: 0,
      totalPages: 0,
      isLoading: false,
      loadError: null,
    });
  },
}));
