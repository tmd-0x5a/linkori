import { useEffect, useRef } from "react";
import { Store } from "@tauri-apps/plugin-store";
import { usePlaylistStore } from "@/stores/playlistStore";
import type { Playlist, ViewerSettings } from "@/types";
import { useViewerStore } from "@/stores/viewerStore";

const STORE_FILE = "playlists.json";
const PLAYLISTS_KEY = "playlists";
const VIEWER_SETTINGS_KEY = "viewerSettings";

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
 */
export function usePersistence() {
  const playlists = usePlaylistStore((s) => s.playlists);
  const hydrate = usePlaylistStore((s) => s.hydrate);
  const settings = useViewerStore((s) => s.settings);
  const updateSettings = useViewerStore((s) => s.updateSettings);
  const isHydrated = useRef(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // --- 起動時のハイドレーション ---
  useEffect(() => {
    let mounted = true;

    async function loadFromStore() {
      try {
        const store = await getStore();

        // プレイリスト読み込み
        const savedPlaylists = await store.get<Playlist[]>(PLAYLISTS_KEY);
        if (savedPlaylists && mounted) {
          hydrate(savedPlaylists);
        }

        // ビューア設定読み込み
        const savedSettings =
          await store.get<ViewerSettings>(VIEWER_SETTINGS_KEY);
        if (savedSettings && mounted) {
          updateSettings(savedSettings);
        }

        if (mounted) {
          isHydrated.current = true;
        }
      } catch (error) {
        console.error("ストアからの読み込みに失敗:", error);
        if (mounted) {
          isHydrated.current = true;
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
    if (!isHydrated.current) return;

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
    if (!isHydrated.current) return;

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
}
