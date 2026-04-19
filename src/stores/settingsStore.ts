import { create } from "zustand";
import type { Lang } from "@/lib/i18n";

export type BrowserSortField = "name" | "date";
export type BrowserSortDir = "asc" | "desc";
export type BrowserViewMode = "list" | "grid";
export type ThemeMode = "light" | "dark";

interface SettingsState {
  lang: Lang;
  setLang: (lang: Lang) => void;
  toggleLang: () => void;

  theme: ThemeMode;
  setTheme: (t: ThemeMode) => void;
  toggleTheme: () => void;

  // FileBrowserDialog の UI 状態（ダイアログ再マウント後も維持し、アプリ再起動でも永続化）
  browserSortField: BrowserSortField;
  browserSortDir: BrowserSortDir;
  browserViewMode: BrowserViewMode;
  setBrowserSort: (field: BrowserSortField, dir: BrowserSortDir) => void;
  setBrowserViewMode: (mode: BrowserViewMode) => void;
  /** 永続化層からのハイドレーション専用 */
  hydrateBrowserSettings: (s: Partial<Pick<SettingsState,
    "browserSortField" | "browserSortDir" | "browserViewMode">>) => void;

  // プレイリストパネルのチャンクサムネ表示
  showChunkThumbnails: boolean;
  setShowChunkThumbnails: (v: boolean) => void;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  lang: "ja",
  setLang: (lang) => set({ lang }),
  toggleLang: () => set({ lang: get().lang === "ja" ? "en" : "ja" }),

  theme: "light",
  setTheme: (t) => set({ theme: t }),
  toggleTheme: () => set({ theme: get().theme === "light" ? "dark" : "light" }),

  browserSortField: "name",
  browserSortDir: "asc",
  browserViewMode: "list",
  setBrowserSort: (field, dir) => set({ browserSortField: field, browserSortDir: dir }),
  setBrowserViewMode: (mode) => set({ browserViewMode: mode }),
  hydrateBrowserSettings: (s) => set(s),

  showChunkThumbnails: false,
  setShowChunkThumbnails: (v) => set({ showChunkThumbnails: v }),
}));
