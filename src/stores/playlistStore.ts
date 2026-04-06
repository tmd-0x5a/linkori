import { create } from "zustand";
import type { Chunk, Playlist } from "@/types";

function generateId(): string {
  return crypto.randomUUID();
}

interface PlaylistState {
  // --- データ ---
  playlists: Playlist[];
  activePlaylistId: string | null;

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
  removeAllChunks: (playlistId: string) => void;
  reorderChunks: (
    playlistId: string,
    fromIndex: number,
    toIndex: number
  ) => void;

  // --- 永続化 ---
  hydrate: (playlists: Playlist[]) => void;
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

  hydrate: (playlists: Playlist[]) => {
    set({ playlists });
  },
}));
