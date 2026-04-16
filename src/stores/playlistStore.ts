import { create } from "zustand";
import type { Chunk, Playlist } from "@/types";

function generateId(): string {
  return crypto.randomUUID();
}

interface PlaylistState {
  // --- データ ---
  playlists: Playlist[];
  activePlaylistId: string | null;
  /** ディスクからのロード完了フラグ（HMR でストアがリセットされると false に戻る） */
  _hydrated: boolean;

  // --- 算出プロパティ ---
  activePlaylist: () => Playlist | undefined;

  // --- プレイリスト CRUD ---
  createPlaylist: (name: string) => Playlist;
  deletePlaylist: (id: string) => void;
  renamePlaylist: (id: string, name: string) => void;
  setActivePlaylist: (id: string | null) => void;

  // --- チャンク CRUD ---
  addChunk: (playlistId: string, startPath: string, endPath: string, name?: string) => void;
  updateChunk: (
    playlistId: string,
    chunkId: string,
    updates: Partial<Pick<Chunk, "name" | "startPath" | "endPath">>
  ) => void;
  removeChunk: (playlistId: string, chunkId: string) => void;
  removeChunks: (playlistId: string, chunkIds: string[]) => void;
  removeAllChunks: (playlistId: string) => void;
  reorderChunks: (
    playlistId: string,
    fromIndex: number,
    toIndex: number
  ) => void;
  /** チャンクをIDの配列順に並び替える（ソート機能用） */
  setChunksOrder: (playlistId: string, orderedIds: string[]) => void;
  /** プレイリスト自体を並び替える */
  reorderPlaylist: (fromIndex: number, toIndex: number) => void;
  /** 指定インデックスに複数チャンクを挿入（分割・アンドゥ用） */
  insertChunksAt: (playlistId: string, index: number, chunks: Chunk[]) => void;

  // --- お気に入り / タグ ---
  toggleFavorite: (id: string) => void;
  setTags: (id: string, tags: string[]) => void;

  // --- 永続化 ---
  hydrate: (playlists: Playlist[]) => void;
  markHydrated: () => void;
}

/**
 * プレイリスト内のチャンクを更新するヘルパー
 */
function updatePlaylistChunks(
  playlists: Playlist[],
  playlistId: string,
  updater: (chunks: Chunk[]) => Chunk[]
): Playlist[] {
  return playlists.map((pl) => {
    if (pl.id !== playlistId) return pl;
    return {
      ...pl,
      chunks: updater(pl.chunks),
      updatedAt: Date.now(),
    };
  });
}

export const usePlaylistStore = create<PlaylistState>((set, get) => ({
  playlists: [],
  activePlaylistId: null,
  _hydrated: false,

  activePlaylist: () => {
    const { playlists, activePlaylistId } = get();
    return playlists.find((pl) => pl.id === activePlaylistId);
  },

  createPlaylist: (name: string) => {
    const newPlaylist: Playlist = {
      id: generateId(),
      name,
      chunks: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    set((state) => ({
      playlists: [...state.playlists, newPlaylist],
      activePlaylistId: newPlaylist.id,
    }));
    return newPlaylist;
  },

  deletePlaylist: (id: string) => {
    set((state) => ({
      playlists: state.playlists.filter((pl) => pl.id !== id),
      activePlaylistId:
        state.activePlaylistId === id ? null : state.activePlaylistId,
    }));
  },

  renamePlaylist: (id: string, name: string) => {
    set((state) => ({
      playlists: state.playlists.map((pl) =>
        pl.id === id ? { ...pl, name, updatedAt: Date.now() } : pl
      ),
    }));
  },

  setActivePlaylist: (id: string | null) => {
    set({ activePlaylistId: id });
  },

  addChunk: (playlistId: string, startPath: string, endPath: string, name?: string) => {
    const newChunk: Chunk = {
      id: generateId(),
      ...(name?.trim() ? { name: name.trim() } : {}),
      startPath,
      endPath,
    };
    set((state) => ({
      playlists: updatePlaylistChunks(state.playlists, playlistId, (chunks) => [
        ...chunks,
        newChunk,
      ]),
    }));
  },

  updateChunk: (
    playlistId: string,
    chunkId: string,
    updates: Partial<Pick<Chunk, "name" | "startPath" | "endPath">>
  ) => {
    set((state) => ({
      playlists: updatePlaylistChunks(state.playlists, playlistId, (chunks) =>
        chunks.map((chunk) => {
          if (chunk.id !== chunkId) return chunk;
          return { ...chunk, ...updates };
        })
      ),
    }));
  },

  removeChunk: (playlistId: string, chunkId: string) => {
    set((state) => ({
      playlists: updatePlaylistChunks(state.playlists, playlistId, (chunks) =>
        chunks.filter((chunk) => chunk.id !== chunkId)
      ),
    }));
  },

  removeChunks: (playlistId: string, chunkIds: string[]) => {
    const idSet = new Set(chunkIds);
    set((state) => ({
      playlists: updatePlaylistChunks(state.playlists, playlistId, (chunks) =>
        chunks.filter((chunk) => !idSet.has(chunk.id))
      ),
    }));
  },

  removeAllChunks: (playlistId: string) => {
    set((state) => ({
      playlists: updatePlaylistChunks(state.playlists, playlistId, () => []),
    }));
  },

  reorderChunks: (playlistId: string, fromIndex: number, toIndex: number) => {
    set((state) => ({
      playlists: updatePlaylistChunks(state.playlists, playlistId, (chunks) => {
        const newChunks = [...chunks];
        const [moved] = newChunks.splice(fromIndex, 1);
        newChunks.splice(toIndex, 0, moved);
        return newChunks;
      }),
    }));
  },

  reorderPlaylist: (fromIndex: number, toIndex: number) => {
    set((state) => {
      const newPlaylists = [...state.playlists];
      const [moved] = newPlaylists.splice(fromIndex, 1);
      newPlaylists.splice(toIndex, 0, moved);
      return { playlists: newPlaylists };
    });
  },

  setChunksOrder: (playlistId: string, orderedIds: string[]) => {
    set((state) => ({
      playlists: updatePlaylistChunks(state.playlists, playlistId, (chunks) => {
        const map = new Map(chunks.map((c) => [c.id, c]));
        return orderedIds.flatMap((id) => (map.has(id) ? [map.get(id)!] : []));
      }),
    }));
  },

  insertChunksAt: (playlistId: string, index: number, chunks: Chunk[]) => {
    set((state) => ({
      playlists: updatePlaylistChunks(state.playlists, playlistId, (existing) => {
        const result = [...existing];
        result.splice(index, 0, ...chunks);
        return result;
      }),
    }));
  },

  toggleFavorite: (id: string) => {
    set((state) => ({
      playlists: state.playlists.map((pl) =>
        pl.id === id ? { ...pl, isFavorite: !pl.isFavorite, updatedAt: Date.now() } : pl
      ),
    }));
  },

  setTags: (id: string, tags: string[]) => {
    set((state) => ({
      playlists: state.playlists.map((pl) =>
        pl.id === id ? { ...pl, tags, updatedAt: Date.now() } : pl
      ),
    }));
  },

  hydrate: (playlists: Playlist[]) => {
    set({ playlists, _hydrated: true });
  },

  markHydrated: () => {
    set({ _hydrated: true });
  },
}));
