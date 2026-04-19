import { useEffect, useRef } from "react";
import { Store } from "@tauri-apps/plugin-store";
import { usePlaylistStore } from "@/stores/playlistStore";
import type { AccentKey, Playlist, ViewerSettings } from "@/types";
import { useViewerStore } from "@/stores/viewerStore";
import type { PlaylistProgress } from "@/stores/viewerStore";
import { useSettingsStore } from "@/stores/settingsStore";
import type { Lang } from "@/lib/i18n";
import type { ThemeMode } from "@/stores/settingsStore";

const STORE_FILE = "playlists.json";
const PLAYLISTS_KEY = "playlists";
const VIEWER_SETTINGS_KEY = "viewerSettings";
const PROGRESS_KEY = "viewerProgress";
const LANG_KEY = "lang";
const THEME_KEY = "theme";
const BROWSER_SETTINGS_KEY = "browserSettings";
const PLAYLIST_SETTINGS_KEY = "playlistSettings";
const TAG_COLORS_KEY = "tagColors";

interface SavedPlaylistSettings {
  showChunkThumbnails?: boolean;
}

interface SavedBrowserSettings {
  sortField?: "name" | "date";
  sortDir?: "asc" | "desc";
  viewMode?: "list" | "grid";
}

let storeInstance: Store | null = null;

async function getStore(): Promise<Store> {
  if (!storeInstance) {
    storeInstance = await Store.load(STORE_FILE);
  }
  return storeInstance;
}

/**
 * tauri-plugin-store を使ってプレイリストとビューア設定を永続化するフック
 * - アプリ起動時にストアからロード（ハイドレーション）
 * - プレイリストの変更を自動的にストアへ保存
 *
 * isHydrated は Zustand ストアの _hydrated から取得し、レンダー時に ref へ同期する。
 * これにより HMR でストアがリセットされると ref も false に戻り、ロード前の上書き保存を防ぐ。
 * deps 配列のサイズは変わらないため "changed size between renders" エラーも発生しない。
 */
export function usePersistence() {
  const playlists = usePlaylistStore((s) => s.playlists);
  const tagColors = usePlaylistStore((s) => s.tagColors);
  const hydrate = usePlaylistStore((s) => s.hydrate);
  const hydrateTagColors = usePlaylistStore((s) => s.hydrateTagColors);
  const markHydrated = usePlaylistStore((s) => s.markHydrated);
  const settings = useViewerStore((s) => s.settings);
  const updateSettings = useViewerStore((s) => s.updateSettings);
  const progressMap = useViewerStore((s) => s.progressMap);
  const hydrateProgress = useViewerStore((s) => s.hydrateProgress);
  const lang = useSettingsStore((s) => s.lang);
  const setLang = useSettingsStore((s) => s.setLang);
  const theme = useSettingsStore((s) => s.theme);
  const setTheme = useSettingsStore((s) => s.setTheme);
  const browserSortField = useSettingsStore((s) => s.browserSortField);
  const browserSortDir = useSettingsStore((s) => s.browserSortDir);
  const browserViewMode = useSettingsStore((s) => s.browserViewMode);
  const hydrateBrowserSettings = useSettingsStore((s) => s.hydrateBrowserSettings);
  const showChunkThumbnails = useSettingsStore((s) => s.showChunkThumbnails);
  const setShowChunkThumbnails = useSettingsStore((s) => s.setShowChunkThumbnails);

  // HMR でストアがリセットされると _hydrated も false に戻る。
  // レンダー時に ref へ同期することで、エフェクト内では常に最新の値を参照できる。
  const _hydrated = usePlaylistStore((s) => s._hydrated);
  const isHydratedRef = useRef(false);
  isHydratedRef.current = _hydrated;

  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // --- 起動時のハイドレーション ---
  useEffect(() => {
    let mounted = true;

    async function loadFromStore() {
      try {
        const store = await getStore();

        // プレイリスト読み込み（_hydrated = true もここで設定される）
        const savedPlaylists = await store.get<Playlist[]>(PLAYLISTS_KEY);
        if (mounted) {
          hydrate(savedPlaylists ?? []);
        }

        // ビューア設定読み込み
        const savedSettings =
          await store.get<ViewerSettings>(VIEWER_SETTINGS_KEY);
        if (savedSettings && mounted) {
          updateSettings(savedSettings);
        }

        // 閲覧位置読み込み
        const savedProgress = await store.get<Record<string, PlaylistProgress>>(PROGRESS_KEY);
        if (savedProgress && mounted) {
          hydrateProgress(savedProgress);
        }

        // 言語設定読み込み
        const savedLang = await store.get<Lang>(LANG_KEY);
        if (savedLang && mounted) {
          setLang(savedLang);
        }

        // テーマ設定読み込み
        const savedTheme = await store.get<ThemeMode>(THEME_KEY);
        if (savedTheme && mounted) {
          setTheme(savedTheme);
        }

        // ファイルブラウザ UI 設定読み込み
        const savedBrowser = await store.get<SavedBrowserSettings>(BROWSER_SETTINGS_KEY);
        if (savedBrowser && mounted) {
          hydrateBrowserSettings({
            ...(savedBrowser.sortField ? { browserSortField: savedBrowser.sortField } : {}),
            ...(savedBrowser.sortDir ? { browserSortDir: savedBrowser.sortDir } : {}),
            ...(savedBrowser.viewMode ? { browserViewMode: savedBrowser.viewMode } : {}),
          });
        }

        // プレイリストパネル UI 設定読み込み
        const savedPlaylist = await store.get<SavedPlaylistSettings>(PLAYLIST_SETTINGS_KEY);
        if (savedPlaylist && mounted && typeof savedPlaylist.showChunkThumbnails === "boolean") {
          setShowChunkThumbnails(savedPlaylist.showChunkThumbnails);
        }

        // タグ色マッピング読み込み
        const savedTagColors = await store.get<Record<string, AccentKey>>(TAG_COLORS_KEY);
        if (savedTagColors && mounted) {
          hydrateTagColors(savedTagColors);
        }
      } catch (error) {
        console.error("ストアからの読み込みに失敗:", error);
        if (mounted) {
          markHydrated();
        }
      }
    }

    loadFromStore();

    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- プレイリスト変更時の自動保存（デバウンス） ---
  useEffect(() => {
    if (!isHydratedRef.current) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      try {
        const store = await getStore();
        await store.set(PLAYLISTS_KEY, playlists);
        await store.save();
      } catch (error) {
        console.error("プレイリストの保存に失敗:", error);
      }
    }, 500);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [playlists]);

  // --- ビューア設定変更時の自動保存 ---
  useEffect(() => {
    if (!isHydratedRef.current) return;

    async function saveSettings() {
      try {
        const store = await getStore();
        await store.set(VIEWER_SETTINGS_KEY, settings);
        await store.save();
      } catch (error) {
        console.error("設定の保存に失敗:", error);
      }
    }

    saveSettings();
  }, [settings]);

  // --- 閲覧位置変更時の自動保存（デバウンス） ---
  const progressSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!isHydratedRef.current) return;

    if (progressSaveRef.current) {
      clearTimeout(progressSaveRef.current);
    }

    progressSaveRef.current = setTimeout(async () => {
      try {
        const store = await getStore();
        await store.set(PROGRESS_KEY, progressMap);
        await store.save();
      } catch (error) {
        console.error("閲覧位置の保存に失敗:", error);
      }
    }, 1000);

    return () => {
      if (progressSaveRef.current) {
        clearTimeout(progressSaveRef.current);
      }
    };
  }, [progressMap]);

  // --- 言語設定変更時の自動保存 ---
  useEffect(() => {
    if (!isHydratedRef.current) return;

    async function saveLang() {
      try {
        const store = await getStore();
        await store.set(LANG_KEY, lang);
        await store.save();
      } catch (error) {
        console.error("言語設定の保存に失敗:", error);
      }
    }

    saveLang();
  }, [lang]);

  // --- テーマ変更時：html[data-theme] 反映 + 永続化 ---
  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.setAttribute("data-theme", theme);
    }
    if (!isHydratedRef.current) return;
    async function saveTheme() {
      try {
        const store = await getStore();
        await store.set(THEME_KEY, theme);
        await store.save();
      } catch (error) {
        console.error("テーマ設定の保存に失敗:", error);
      }
    }
    saveTheme();
  }, [theme]);

  // --- ファイルブラウザ UI 設定変更時の自動保存（デバウンス） ---
  // ソート切替を連打しても IPC を抑える
  const browserSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!isHydratedRef.current) return;

    if (browserSaveRef.current) {
      clearTimeout(browserSaveRef.current);
    }

    browserSaveRef.current = setTimeout(async () => {
      try {
        const store = await getStore();
        const payload: SavedBrowserSettings = {
          sortField: browserSortField,
          sortDir: browserSortDir,
          viewMode: browserViewMode,
        };
        await store.set(BROWSER_SETTINGS_KEY, payload);
        await store.save();
      } catch (error) {
        console.error("ファイルブラウザ設定の保存に失敗:", error);
      }
    }, 500);

    return () => {
      if (browserSaveRef.current) {
        clearTimeout(browserSaveRef.current);
      }
    };
  }, [browserSortField, browserSortDir, browserViewMode]);

  // --- プレイリスト UI 設定変更時の自動保存 ---
  useEffect(() => {
    if (!isHydratedRef.current) return;

    async function savePlaylistSettings() {
      try {
        const store = await getStore();
        const payload: SavedPlaylistSettings = { showChunkThumbnails };
        await store.set(PLAYLIST_SETTINGS_KEY, payload);
        await store.save();
      } catch (error) {
        console.error("プレイリスト設定の保存に失敗:", error);
      }
    }

    savePlaylistSettings();
  }, [showChunkThumbnails]);

  // --- タグ色マッピング変更時の自動保存 ---
  useEffect(() => {
    if (!isHydratedRef.current) return;

    async function saveTagColors() {
      try {
        const store = await getStore();
        await store.set(TAG_COLORS_KEY, tagColors);
        await store.save();
      } catch (error) {
        console.error("タグ色の保存に失敗:", error);
      }
    }

    saveTagColors();
  }, [tagColors]);
}
