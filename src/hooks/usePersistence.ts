import { useEffect, useRef } from "react";
import { Store } from "@tauri-apps/plugin-store";
import { usePlaylistStore } from "@/stores/playlistStore";
import type { Playlist, ViewerSettings } from "@/types";
import { useViewerStore } from "@/stores/viewerStore";
import type { PlaylistProgress } from "@/stores/viewerStore";
import { useSettingsStore } from "@/stores/settingsStore";
import type { Lang } from "@/lib/i18n";

const STORE_FILE = "playlists.json";
const PLAYLISTS_KEY = "playlists";
const VIEWER_SETTINGS_KEY = "viewerSettings";
const PROGRESS_KEY = "viewerProgress";
const LANG_KEY = "lang";

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
  const hydrate = usePlaylistStore((s) => s.hydrate);
  const markHydrated = usePlaylistStore((s) => s.markHydrated);
  const settings = useViewerStore((s) => s.settings);
  const updateSettings = useViewerStore((s) => s.updateSettings);
  const progressMap = useViewerStore((s) => s.progressMap);
  const hydrateProgress = useViewerStore((s) => s.hydrateProgress);
  const lang = useSettingsStore((s) => s.lang);
  const setLang = useSettingsStore((s) => s.setLang);

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
}
