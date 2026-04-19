import { useCallback, useState } from "react";
import { usePlaylistStore } from "@/stores/playlistStore";
import type { Chunk } from "@/types";

export interface SplitUndoEntry {
  gid: string;
  playlistId: string;
  insertIndex: number;
  originalChunk: Chunk;
  addedIds: string[];
}

interface SplitUndoHandle {
  entries: SplitUndoEntry[];
  lastSplitGid: string | null;
  showUndoBanner: boolean;
  recordSplit: (entry: SplitUndoEntry) => void;
  /** チャンクIDから該当アンドゥハンドラを取得（子孫分割も一括で戻す） */
  getUndoHandler: (chunkId: string) => (() => void) | undefined;
  /** バナーのアンドゥ: 最後の分割を戻す */
  undoLast: () => void;
  /** 一括削除などで関連エントリを削除する（ids に含まれる entry は除去） */
  pruneRelated: (ids: string[]) => void;
  hideBanner: () => void;
}

/** addedIds の全子孫 ID を再帰収集（さらに分割されたチャンクも含む） */
function collectDescendants(addedIds: string[], entries: SplitUndoEntry[]): string[] {
  const result: string[] = [];
  for (const id of addedIds) {
    result.push(id);
    const child = entries.find((e) => e.originalChunk.id === id);
    if (child) result.push(...collectDescendants(child.addedIds, entries));
  }
  return result;
}

/** gid に関連する全 gid（子孫エントリも含む）を収集 */
function collectRelatedGids(gid: string, entries: SplitUndoEntry[]): string[] {
  const entry = entries.find((e) => e.gid === gid);
  if (!entry) return [];
  const result = [gid];
  for (const id of entry.addedIds) {
    const child = entries.find((e) => e.originalChunk.id === id);
    if (child) result.push(...collectRelatedGids(child.gid, entries));
  }
  return result;
}

/**
 * チャンク分割のアンドゥ機構。
 * 分割を複数段階に重ねた場合も、再帰的に子孫まで辿って一括で戻す。
 * Zustand の removeChunks / insertChunksAt を getState() で取得し、購読しない。
 */
export function useSplitUndo(
  onAfterUndo?: () => void,
): SplitUndoHandle {
  const [entries, setEntries] = useState<SplitUndoEntry[]>([]);
  const [lastSplitGid, setLastSplitGid] = useState<string | null>(null);
  const [showUndoBanner, setShowUndoBanner] = useState(false);

  const recordSplit = useCallback((entry: SplitUndoEntry) => {
    setEntries((prev) => [...prev, entry]);
    setLastSplitGid(entry.gid);
    setShowUndoBanner(true);
  }, []);

  const getUndoHandler = useCallback((chunkId: string): (() => void) | undefined => {
    const entry = entries.find((e) => e.addedIds.includes(chunkId));
    if (!entry) return undefined;
    return () => {
      const gids = collectRelatedGids(entry.gid, entries);
      const descendants = collectDescendants(entry.addedIds, entries);
      const { removeChunks, insertChunksAt } = usePlaylistStore.getState();
      removeChunks(entry.playlistId, descendants);
      insertChunksAt(entry.playlistId, entry.insertIndex, [entry.originalChunk]);
      setEntries((prev) => prev.filter((e) => !gids.includes(e.gid)));
      if (lastSplitGid && gids.includes(lastSplitGid)) {
        setLastSplitGid(null);
        setShowUndoBanner(false);
      }
      onAfterUndo?.();
    };
  }, [entries, lastSplitGid, onAfterUndo]);

  const undoLast = useCallback(() => {
    if (!lastSplitGid) return;
    const entry = entries.find((e) => e.gid === lastSplitGid);
    if (!entry) return;
    const gids = collectRelatedGids(lastSplitGid, entries);
    const descendants = collectDescendants(entry.addedIds, entries);
    const { removeChunks, insertChunksAt } = usePlaylistStore.getState();
    removeChunks(entry.playlistId, descendants);
    insertChunksAt(entry.playlistId, entry.insertIndex, [entry.originalChunk]);
    setEntries((prev) => prev.filter((e) => !gids.includes(e.gid)));
    setLastSplitGid(null);
    setShowUndoBanner(false);
    onAfterUndo?.();
  }, [entries, lastSplitGid, onAfterUndo]);

  const pruneRelated = useCallback((ids: string[]) => {
    setEntries((prev) =>
      prev.filter((e) =>
        !e.addedIds.some((id) => ids.includes(id)) && !ids.includes(e.originalChunk.id)
      )
    );
  }, []);

  const hideBanner = useCallback(() => setShowUndoBanner(false), []);

  return {
    entries,
    lastSplitGid,
    showUndoBanner,
    recordSplit,
    getUndoHandler,
    undoLast,
    pruneRelated,
    hideBanner,
  };
}
