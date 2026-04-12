import { create } from "zustand";
import type { ViewerSettings } from "@/types";
import { resolveChunkImages } from "@/lib/tauri";
import { usePlaylistStore } from "./playlistStore";
import { useSettingsStore } from "./settingsStore";
import { translations } from "@/lib/i18n";

/** チャンク境界情報（ビューア内でのチャンク可視化用） */
export interface ChunkBoundary {
  chunkIndex: number;  // プレイリスト内の順番（0始まり）
  name?: string;       // チャンク名（未設定の場合は undefined）
  startPage: number;   // flatImageList 上の開始インデックス
}

/** プレイリストごとの閲覧位置 */
export interface PlaylistProgress {
  pageIndex: number;
  settings: ViewerSettings;
}

interface ViewerState {
  // --- 表示状態 ---
  flatImageList: string[];
  currentPageIndex: number;
  totalPages: number;
  isLoading: boolean;
  loadError: string | null;
  /** 一部チャンクの読み込みに失敗したが残りは開けた場合の警告メッセージ */
  chunkWarning: string | null;

  // --- チャンク境界 ---
  chunkBoundaries: ChunkBoundary[];

  // --- 設定 ---
  settings: ViewerSettings;

  // --- 閲覧位置記憶 ---
  /** 現在表示中のプレイリストID */
  activePlaylistId: string | null;
  /** プレイリストIDごとの閲覧位置 */
  progressMap: Record<string, PlaylistProgress>;

  // --- アクション ---
  loadImagesForPlaylist: (playlistId: string) => Promise<void>;
  goToPage: (index: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  nextSpread: () => void;
  prevSpread: () => void;
  goToFirst: () => void;
  goToLast: () => void;
  goToChunk: (chunkIndex: number) => void;
  nextChunk: () => void;
  prevChunk: () => void;
  updateSettings: (settings: Partial<ViewerSettings>) => void;
  /** 現在の閲覧位置を progressMap に保存 */
  saveProgress: () => void;
  /** 永続化ストアから progressMap を復元 */
  hydrateProgress: (map: Record<string, PlaylistProgress>) => void;
  dismissWarning: () => void;
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
  chunkWarning: null,
  chunkBoundaries: [],

  settings: DEFAULT_SETTINGS,
  activePlaylistId: null,
  progressMap: {},

  loadImagesForPlaylist: async (playlistId: string) => {
    set({ isLoading: true, loadError: null, flatImageList: [], totalPages: 0, activePlaylistId: playlistId });

    // 現在の言語設定に応じた翻訳を取得
    const t = translations[useSettingsStore.getState().lang];

    try {
      const playlist = usePlaylistStore
        .getState()
        .playlists.find((pl) => pl.id === playlistId);

      if (!playlist) {
        set({ isLoading: false, loadError: t.playlistNotFound });
        return;
      }

      // 全チャンクの画像パスを順番に取得して結合（未検証チャンクも試みる）
      const allImagePaths: string[] = [];
      const boundaries: ChunkBoundary[] = [];
      const chunkErrors: string[] = [];
      for (let ci = 0; ci < playlist.chunks.length; ci++) {
        const chunk = playlist.chunks[ci];
        try {
          const paths = await resolveChunkImages(chunk.startPath, chunk.endPath);
          boundaries.push({
            chunkIndex: ci,
            name: chunk.name?.trim() || undefined,
            startPage: allImagePaths.length,
          });
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
            ? t.chunkLoadErrors(chunkErrors.join("\n"))
            : t.noImagesInPlaylist,
        });
        return;
      }

      // 前回の閲覧位置と設定を復元
      const saved = get().progressMap[playlistId];
      const restoredPage = saved
        ? Math.min(saved.pageIndex, allImagePaths.length - 1)
        : 0;
      const restoredSettings = saved ? saved.settings : get().settings;

      // パスリストをそのまま保存（遅延読み込みのため事前変換しない）
      set({
        flatImageList: allImagePaths,
        totalPages: allImagePaths.length,
        currentPageIndex: restoredPage,
        isLoading: false,
        loadError: null,
        chunkWarning: chunkErrors.length > 0
          ? t.chunkPartialErrors(chunkErrors.join("\n"))
          : null,
        chunkBoundaries: boundaries,
        settings: restoredSettings,
      });
    } catch (error) {
      set({
        isLoading: false,
        loadError: error instanceof Error ? error.message : t.viewerLoadFailed,
      });
    }
  },

  goToPage: (index: number) => {
    const { totalPages, activePlaylistId, settings, progressMap } = get();
    if (totalPages === 0) return;
    const clamped = Math.max(0, Math.min(index, totalPages - 1));
    const updates: Partial<ViewerState> = { currentPageIndex: clamped };
    if (activePlaylistId) {
      updates.progressMap = {
        ...progressMap,
        [activePlaylistId]: { pageIndex: clamped, settings },
      };
    }
    set(updates);
  },

  nextPage: () => {
    const { currentPageIndex, totalPages } = get();
    if (currentPageIndex < totalPages - 1) {
      get().goToPage(currentPageIndex + 1);
    }
  },

  prevPage: () => {
    const { currentPageIndex } = get();
    if (currentPageIndex > 0) {
      get().goToPage(currentPageIndex - 1);
    }
  },

  nextSpread: () => {
    const { currentPageIndex, totalPages, settings } = get();
    const step = settings.spreadMode ? 2 : 1;
    get().goToPage(Math.min(currentPageIndex + step, totalPages - 1));
  },

  prevSpread: () => {
    const { currentPageIndex, settings } = get();
    const step = settings.spreadMode ? 2 : 1;
    get().goToPage(Math.max(currentPageIndex - step, 0));
  },

  goToFirst: () => {
    get().goToPage(0);
  },

  goToLast: () => {
    const { totalPages } = get();
    if (totalPages > 0) {
      get().goToPage(totalPages - 1);
    }
  },

  goToChunk: (chunkIndex: number) => {
    const { chunkBoundaries, totalPages } = get();
    const b = chunkBoundaries.find((b) => b.chunkIndex === chunkIndex);
    if (!b) return;
    get().goToPage(Math.max(0, Math.min(b.startPage, totalPages - 1)));
  },

  nextChunk: () => {
    const { currentPageIndex, chunkBoundaries, totalPages } = get();
    const next = chunkBoundaries.find((b) => b.startPage > currentPageIndex);
    if (!next) return;
    get().goToPage(Math.max(0, Math.min(next.startPage, totalPages - 1)));
  },

  prevChunk: () => {
    const { currentPageIndex, chunkBoundaries } = get();
    const current = [...chunkBoundaries].reverse().find((b) => b.startPage <= currentPageIndex);
    if (!current) return;
    if (currentPageIndex > current.startPage) {
      get().goToPage(current.startPage);
    } else {
      const prev = [...chunkBoundaries].reverse().find((b) => b.startPage < current.startPage);
      if (prev) get().goToPage(prev.startPage);
    }
  },

  updateSettings: (newSettings: Partial<ViewerSettings>) => {
    const { activePlaylistId, currentPageIndex, progressMap } = get();
    const merged = { ...get().settings, ...newSettings };
    const updates: Partial<ViewerState> = { settings: merged };
    if (activePlaylistId) {
      updates.progressMap = {
        ...progressMap,
        [activePlaylistId]: { pageIndex: currentPageIndex, settings: merged },
      };
    }
    set(updates);
  },

  saveProgress: () => {
    const { activePlaylistId, currentPageIndex, settings, progressMap } = get();
    if (!activePlaylistId) return;
    set({
      progressMap: {
        ...progressMap,
        [activePlaylistId]: { pageIndex: currentPageIndex, settings },
      },
    });
  },

  hydrateProgress: (map: Record<string, PlaylistProgress>) => {
    set({ progressMap: map });
  },

  dismissWarning: () => set({ chunkWarning: null }),

  reset: () => {
    // ホームに戻る前に現在の閲覧位置を保存
    const { activePlaylistId, currentPageIndex, settings, progressMap } = get();
    const newProgressMap = activePlaylistId
      ? { ...progressMap, [activePlaylistId]: { pageIndex: currentPageIndex, settings } }
      : progressMap;
    set({
      flatImageList: [],
      currentPageIndex: 0,
      totalPages: 0,
      isLoading: false,
      loadError: null,
      chunkWarning: null,
      chunkBoundaries: [],
      activePlaylistId: null,
      progressMap: newProgressMap,
    });
  },
}));
