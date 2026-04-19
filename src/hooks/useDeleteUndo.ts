import { useCallback, useEffect, useState } from "react";
import { usePlaylistStore } from "@/stores/playlistStore";
import type { Chunk } from "@/types";

export interface DeleteUndoEntry {
  playlistId: string;
  insertIndex: number;
  chunks: Chunk[];
}

interface DeleteUndoHandle {
  stack: DeleteUndoEntry[];
  showBanner: boolean;
  recordDelete: (entry: DeleteUndoEntry) => void;
  /** 最後の削除を元に戻す（スタックが空、または activePlaylist と異なる場合は何もしない） */
  undoLast: () => void;
}

/**
 * チャンク削除のアンドゥ機構（Ctrl+Z 対応）。
 * activePlaylistId が変わったときにスタックをリセットする。
 * Ctrl+Z キーボードショートカットも内部で登録する。
 */
export function useDeleteUndo(activePlaylistId: string | null): DeleteUndoHandle {
  const [stack, setStack] = useState<DeleteUndoEntry[]>([]);
  const [showBanner, setShowBanner] = useState(false);

  // プレイリスト切替時にリセット
  useEffect(() => {
    setStack([]);
    setShowBanner(false);
  }, [activePlaylistId]);

  const recordDelete = useCallback((entry: DeleteUndoEntry) => {
    setStack((prev) => [...prev, entry]);
    setShowBanner(true);
  }, []);

  const undoLast = useCallback(() => {
    setStack((prev) => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      usePlaylistStore.getState().insertChunksAt(last.playlistId, last.insertIndex, last.chunks);
      const next = prev.slice(0, -1);
      if (next.length === 0) setShowBanner(false);
      return next;
    });
  }, []);

  // Ctrl+Z: 現在のプレイリストのみ反応
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (!((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey)) return;
      if (stack.length === 0) return;
      const last = stack[stack.length - 1];
      if (last.playlistId !== activePlaylistId) return;
      e.preventDefault();
      undoLast();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [stack, activePlaylistId, undoLast]);

  return { stack, showBanner, recordDelete, undoLast };
}
