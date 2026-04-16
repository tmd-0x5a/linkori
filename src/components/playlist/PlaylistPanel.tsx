"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { usePlaylistStore } from "@/stores/playlistStore";
import { useViewerStore } from "@/stores/viewerStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { useT } from "@/hooks/useT";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ContextMenu } from "@/components/ui/ContextMenu";
import { SortableChunkList } from "./SortableChunkList";
import { ChunkForm } from "./ChunkForm";
import { getPathMeta, listSplitCandidates } from "@/lib/tauri";
import { computeChunkMove } from "@/lib/chunkOrder";
import type { Chunk, Playlist } from "@/types";

// ---------------------------------------------------------------------------
// SortablePlaylistItem: プレイリスト一覧の各行をドラッグ可能にするラッパー
// render-prop でドラッグリスナーを子（コンテンツ div）に直接渡す
// ---------------------------------------------------------------------------
function SortablePlaylistItem({
  id,
  disabled,
  children,
}: {
  id: string;
  disabled?: boolean;
  children: (dragProps: React.HTMLAttributes<HTMLElement>) => React.ReactNode;
}) {
  const { listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled,
  });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const dragProps = (!disabled && listeners)
    ? (listeners as React.HTMLAttributes<HTMLElement>)
    : ({} as React.HTMLAttributes<HTMLElement>);
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(isDragging && "opacity-70 relative z-10")}
    >
      {children(dragProps)}
    </div>
  );
}

interface PlaylistPanelProps {
  onStartViewer: () => void;
}

export function PlaylistPanel({ onStartViewer }: PlaylistPanelProps) {
  const t = useT();
  const {
    playlists,
    activePlaylistId,
    createPlaylist,
    deletePlaylist,
    renamePlaylist,
    setActivePlaylist,
    addChunk,
    updateChunk,
    removeChunk,
    removeChunks,
    reorderChunks,
    reorderPlaylist,
    setChunksOrder,
    insertChunksAt,
    toggleFavorite,
    setTags,
  } = usePlaylistStore();

  const progressMap = useViewerStore((s) => s.progressMap);

  const loadImagesForPlaylist = useViewerStore(
    (s) => s.loadImagesForPlaylist
  );
  const toggleLang = useSettingsStore((s) => s.toggleLang);

  const [addTrigger, setAddTrigger] = useState(0);
  const [showEmptyForm, setShowEmptyForm] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; id: string } | null>(null);
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const [isSorting, setIsSorting] = useState(false);
  const sortBtnRef = useRef<HTMLButtonElement>(null);
  // フィルタ
  const [filterStatus, setFilterStatus] = useState<"all" | "favorite">("all");
  const [filterTag, setFilterTag] = useState<string | null>(null);
  // タグエディタ
  const [tagEditorId, setTagEditorId] = useState<string | null>(null);

  // 分割アンドゥエントリ（複数保持）
  type SplitUndoEntry = {
    gid: string;
    playlistId: string;
    insertIndex: number;
    originalChunk: Chunk;
    addedIds: string[];
  };
  const [splitUndoEntries, setSplitUndoEntries] = useState<SplitUndoEntry[]>([]);
  const [lastSplitGid, setLastSplitGid] = useState<string | null>(null);
  const [showUndoBanner, setShowUndoBanner] = useState(false);

  // 複数選択
  const [selectedChunkIds, setSelectedChunkIds] = useState<Set<string>>(new Set());
  const [anchorIdx, setAnchorIdx] = useState<number | null>(null);
  const [showBatchDeleteConfirm, setShowBatchDeleteConfirm] = useState(false);
  // 一括削除ボタンの2段階確認（1回目→確認状態、2回目→実行）
  const [batchDeleteArmed, setBatchDeleteArmed] = useState(false);

  // 削除アンドゥスタック（Ctrl+Z で復元）
  type DeleteUndoEntry = {
    playlistId: string;
    insertIndex: number;
    chunks: Chunk[];
  };
  const [deleteUndoStack, setDeleteUndoStack] = useState<DeleteUndoEntry[]>([]);
  const [showDeleteUndoBanner, setShowDeleteUndoBanner] = useState(false);

  const activePlaylist = playlists.find((pl) => pl.id === activePlaylistId);

  // ドラッグエンドで最新の selectedChunkIds / activePlaylist を参照するための ref
  const selectedChunkIdsRef = useRef(selectedChunkIds);
  const activePlaylistRef = useRef(activePlaylist);
  selectedChunkIdsRef.current = selectedChunkIds;
  activePlaylistRef.current = activePlaylist;

  // プレイリスト切り替え時に選択 & 削除アンドゥをリセット
  useEffect(() => {
    setSelectedChunkIds(new Set());
    setAnchorIdx(null);
    setDeleteUndoStack([]);
    setShowDeleteUndoBanner(false);
    setBatchDeleteArmed(false);
  }, [activePlaylistId]);

  // ── 分割アンドゥ helpers ──────────────────────────────────────────

  /** addedIds の全子孫 ID を再帰収集（さらに分割されたチャンクも含む） */
  function getAllDescendants(addedIds: string[], entries: SplitUndoEntry[]): string[] {
    const result: string[] = [];
    for (const id of addedIds) {
      result.push(id);
      const child = entries.find((e) => e.originalChunk.id === id);
      if (child) result.push(...getAllDescendants(child.addedIds, entries));
    }
    return result;
  }

  /** gid に関連する全 gid（子孫エントリも含む）を収集 */
  function getAllRelatedGids(gid: string, entries: SplitUndoEntry[]): string[] {
    const entry = entries.find((e) => e.gid === gid);
    if (!entry) return [];
    const result = [gid];
    for (const id of entry.addedIds) {
      const child = entries.find((e) => e.originalChunk.id === id);
      if (child) result.push(...getAllRelatedGids(child.gid, entries));
    }
    return result;
  }

  /** チャンクIDからアンドゥハンドラを返す（子孫の分割も一括で戻す） */
  const getUndoSplitHandler = useCallback((chunkId: string): (() => void) | undefined => {
    const entry = splitUndoEntries.find((e) => e.addedIds.includes(chunkId));
    if (!entry) return undefined;
    return () => {
      const gids = getAllRelatedGids(entry.gid, splitUndoEntries);
      const descendants = getAllDescendants(entry.addedIds, splitUndoEntries);
      removeChunks(entry.playlistId, descendants);
      insertChunksAt(entry.playlistId, entry.insertIndex, [entry.originalChunk]);
      setSplitUndoEntries((prev) => prev.filter((e) => !gids.includes(e.gid)));
      if (lastSplitGid && gids.includes(lastSplitGid)) {
        setLastSplitGid(null);
        setShowUndoBanner(false);
      }
      setSelectedChunkIds(new Set());
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [splitUndoEntries, lastSplitGid, removeChunks, insertChunksAt]);

  /** チャンクをサブフォルダで分割して置き換える */
  const handleSplitChunk = useCallback(async (chunkId: string) => {
    if (!activePlaylist) return;
    const chunkIndex = activePlaylist.chunks.findIndex((c) => c.id === chunkId);
    if (chunkIndex < 0) return;
    const original = activePlaylist.chunks[chunkIndex];
    try {
      const candidates = await listSplitCandidates(original.startPath);
      if (candidates.length === 0) return;
      const newChunks: Chunk[] = candidates.map((c) => ({
        id: crypto.randomUUID(),
        name: c.name,
        startPath: c.path,
        endPath: "",
      }));
      const gid = crypto.randomUUID();
      removeChunk(activePlaylist.id, chunkId);
      insertChunksAt(activePlaylist.id, chunkIndex, newChunks);
      setSplitUndoEntries((prev) => [...prev, {
        gid,
        playlistId: activePlaylist.id,
        insertIndex: chunkIndex,
        originalChunk: original,
        addedIds: newChunks.map((c) => c.id),
      }]);
      setLastSplitGid(gid);
      setShowUndoBanner(true);
      setSelectedChunkIds(new Set());
    } catch {
      // エラーは無視
    }
  }, [activePlaylist, removeChunk, insertChunksAt]);

  /** バナーのアンドゥ（最後の分割） */
  function handleUndoBannerSplit() {
    if (!lastSplitGid) return;
    const entry = splitUndoEntries.find((e) => e.gid === lastSplitGid);
    if (!entry) return;
    const gids = getAllRelatedGids(lastSplitGid, splitUndoEntries);
    const descendants = getAllDescendants(entry.addedIds, splitUndoEntries);
    removeChunks(entry.playlistId, descendants);
    insertChunksAt(entry.playlistId, entry.insertIndex, [entry.originalChunk]);
    setSplitUndoEntries((prev) => prev.filter((e) => !gids.includes(e.gid)));
    setLastSplitGid(null);
    setShowUndoBanner(false);
    setSelectedChunkIds(new Set());
  }

  // ── 選択ハンドラ ─────────────────────────────────────────────────

  function handleSingleSelect(chunkId: string, index: number) {
    if (selectedChunkIds.size === 1 && selectedChunkIds.has(chunkId)) {
      setSelectedChunkIds(new Set()); // 単独選択済みをクリック→解除
    } else {
      setSelectedChunkIds(new Set([chunkId]));
      setAnchorIdx(index);
    }
  }

  function handleToggleSelect(chunkId: string, index: number) {
    setSelectedChunkIds((prev) => {
      const next = new Set(prev);
      if (next.has(chunkId)) next.delete(chunkId); else next.add(chunkId);
      return next;
    });
    setAnchorIdx(index);
  }

  function handleRangeSelect(toIndex: number) {
    if (!activePlaylist) return;
    const from = anchorIdx !== null ? Math.min(anchorIdx, toIndex) : toIndex;
    const to   = anchorIdx !== null ? Math.max(anchorIdx, toIndex) : toIndex;
    setSelectedChunkIds(new Set(activePlaylist.chunks.slice(from, to + 1).map((c) => c.id)));
  }

  function handleDragSelect(from: number, to: number) {
    if (!activePlaylist) return;
    const f = Math.min(from, to), t = Math.max(from, to);
    setSelectedChunkIds(new Set(activePlaylist.chunks.slice(f, t + 1).map((c) => c.id)));
    setAnchorIdx(from);
  }

  /** 選択中チャンクを一括削除（IDを引数で受け取ることでクロージャの問題を回避） */
  function handleBatchDelete(ids: string[]) {
    if (!activePlaylist || ids.length === 0) return;
    const idSet = new Set(ids);
    const deletedChunks = activePlaylist.chunks.filter((c) => idSet.has(c.id));
    const minIdx = activePlaylist.chunks.findIndex((c) => idSet.has(c.id));
    setDeleteUndoStack((prev) => [...prev, {
      playlistId: activePlaylist.id,
      insertIndex: minIdx >= 0 ? minIdx : 0,
      chunks: deletedChunks,
    }]);
    setShowDeleteUndoBanner(true);
    removeChunks(activePlaylist.id, ids);
    setSplitUndoEntries((prev) =>
      prev.filter((e) => !e.addedIds.some((id) => ids.includes(id)) && !ids.includes(e.originalChunk.id))
    );
    setSelectedChunkIds(new Set());
    setBatchDeleteArmed(false);
    setShowBatchDeleteConfirm(false);
  }

  /** 削除アンドゥ（最後の削除を元に戻す） */
  function handleUndoDelete() {
    if (deleteUndoStack.length === 0) return;
    const last = deleteUndoStack[deleteUndoStack.length - 1];
    insertChunksAt(last.playlistId, last.insertIndex, last.chunks);
    setDeleteUndoStack((prev) => {
      const next = prev.slice(0, -1);
      if (next.length === 0) setShowDeleteUndoBanner(false);
      return next;
    });
  }

  /** プレイリストIDから閲覧進捗パーセント（0〜100）を返す。未開封は null */
  function getProgress(id: string): number | null {
    const p = progressMap[id];
    if (!p || !p.totalPages) return null;
    return Math.min(100, Math.round((p.pageIndex + 1) / p.totalPages * 100));
  }

  // フィルタ済みプレイリスト
  const filteredPlaylists = playlists.filter((pl) => {
    if (filterStatus === "favorite" && !pl.isFavorite) return false;
    if (filterTag && !(pl.tags ?? []).includes(filterTag)) return false;
    return true;
  });

  // 全プレイリストで使われているタグ一覧
  const allTags = Array.from(new Set(playlists.flatMap((pl) => pl.tags ?? []))).sort();

  function handleCreatePlaylist(e: React.FormEvent) {
    e.preventDefault();
    if (!newPlaylistName.trim()) return;
    createPlaylist(newPlaylistName.trim());
    setNewPlaylistName("");
    setIsCreating(false);
  }

  function handleStartRename(id: string, currentName: string) {
    setRenamingId(id);
    setRenameValue(currentName);
  }

  function handleRename(e: React.FormEvent) {
    e.preventDefault();
    if (renamingId && renameValue.trim()) {
      renamePlaylist(renamingId, renameValue.trim());
    }
    setRenamingId(null);
  }

  // プレイリスト操作のキーボードショートカット（入力中は無視）
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (!activePlaylistId) return;
      if (e.key === "F2") {
        e.preventDefault();
        const pl = playlists.find((p) => p.id === activePlaylistId);
        if (pl) handleStartRename(pl.id, pl.name);
      } else if (e.key === "Delete") {
        e.preventDefault();
        setDeleteTarget(activePlaylistId);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activePlaylistId, playlists]);

  // Ctrl+Z で最後の削除を元に戻す
  useEffect(() => {
    function handleUndoKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        if (deleteUndoStack.length === 0) return;
        const last = deleteUndoStack[deleteUndoStack.length - 1];
        if (last.playlistId !== activePlaylistId) return;
        e.preventDefault();
        insertChunksAt(last.playlistId, last.insertIndex, last.chunks);
        setDeleteUndoStack((prev) => {
          const next = prev.slice(0, -1);
          if (next.length === 0) setShowDeleteUndoBanner(false);
          return next;
        });
      }
    }
    window.addEventListener("keydown", handleUndoKey);
    return () => window.removeEventListener("keydown", handleUndoKey);
  }, [deleteUndoStack, activePlaylistId, insertChunksAt]);

  async function handleStartViewer() {
    if (!activePlaylistId) return;
    await loadImagesForPlaylist(activePlaylistId);
    onStartViewer();
  }

  /** チャンクを指定条件で並び替えてストアに保存する */
  async function handleSort(
    by: "name-asc" | "name-desc" | "modified-asc" | "modified-desc" | "created-asc" | "created-desc"
  ) {
    if (!activePlaylist) return;
    setSortMenuOpen(false);
    const chunks = [...activePlaylist.chunks];

    if (by === "name-asc" || by === "name-desc") {
      // 名前順（チャンク名 → startPath の末尾ファイル名/フォルダ名 にフォールバック）
      const getName = (c: Chunk) =>
        c.name?.trim() ||
        c.startPath.replace(/\\/g, "/").replace(/\/+$/, "").split("/").pop() ||
        "";
      chunks.sort((a, b) => {
        const cmp = getName(a).localeCompare(getName(b), undefined, { numeric: true, sensitivity: "base" });
        return by === "name-asc" ? cmp : -cmp;
      });
    } else {
      // 日時順: 全チャンクのメタデータを並列取得
      setIsSorting(true);
      try {
        const metas = await Promise.all(
          chunks.map((c) =>
            getPathMeta(c.startPath).catch(() => ({ modified_at: null, created_at: null }))
          )
        );
        const field = by.startsWith("modified") ? "modified_at" : "created_at";
        const dir = by.endsWith("asc") ? 1 : -1;
        // メタデータ未取得（null）は末尾に回す
        const withMeta = chunks.map((c, i) => ({ c, t: metas[i][field] ?? null }));
        withMeta.sort((a, b) => {
          if (a.t === null && b.t === null) return 0;
          if (a.t === null) return 1;
          if (b.t === null) return -1;
          return (a.t - b.t) * dir;
        });
        chunks.splice(0, chunks.length, ...withMeta.map((x) => x.c));
      } finally {
        setIsSorting(false);
      }
    }

    setChunksOrder(activePlaylist.id, chunks.map((c) => c.id));
  }

  /**
   * チャンクのドラッグ完了：グループ移動と単体移動の分岐
   * useCallback + ref で安定した関数を保ちつつ、常に最新の state を参照する
   */
  const handleChunkDragEnd = useCallback((activeId: string, overId: string) => {
    const pl = activePlaylistRef.current;
    const selected = selectedChunkIdsRef.current;
    if (!pl) return;
    const allIds = pl.chunks.map((c) => c.id);
    const result = computeChunkMove(allIds, activeId, overId, selected);
    if (result.type === "group") {
      setChunksOrder(pl.id, result.newOrder);
    } else if (result.type === "single") {
      reorderChunks(pl.id, result.fromIndex, result.toIndex);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setChunksOrder, reorderChunks]);

  // プレイリスト並び替え用センサー（8px 移動で起動、クリックは通常動作）
  const playlistSensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  function handlePlaylistDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = playlists.findIndex((pl) => pl.id === active.id);
    const newIndex = playlists.findIndex((pl) => pl.id === over.id);
    if (oldIndex !== -1 && newIndex !== -1) {
      reorderPlaylist(oldIndex, newIndex);
    }
  }

  const chunkCount = activePlaylist?.chunks.length ?? 0;
  const lastChunkPath = activePlaylist?.chunks.at(-1)?.startPath;

  return (
    <div className="flex h-dvh">
      {/* サイドバー */}
      <aside className="flex w-64 shrink-0 flex-col border-r border-[#02492a] bg-[#02492a]">
        <div className="flex items-center justify-between border-b border-[#078a52]/40 px-4 py-3">
          <h2 className="heading-clay text-base text-white">Linkori</h2>
          <div className="flex items-center gap-1">
            {/* 言語切り替えボタン */}
            <button
              onClick={toggleLang}
              className="rounded px-1.5 py-0.5 text-[10px] font-semibold text-[#84e7a5]/70 hover:bg-[#078a52] hover:text-white transition-colors"
            >
              {t.langToggle}
            </button>
            {/* 新規プレイリスト作成ボタン */}
            <button
              onClick={() => setIsCreating(true)}
              aria-label={t.newPlaylistAriaLabel}
              className="btn-clay flex h-7 w-7 items-center justify-center rounded-lg text-[#84e7a5] hover:bg-[#078a52] hover:text-white"
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 2a1 1 0 011 1v4h4a1 1 0 110 2H9v4a1 1 0 11-2 0V9H3a1 1 0 010-2h4V3a1 1 0 011-1z" />
              </svg>
            </button>
          </div>
        </div>

        {/* 新規作成フォーム */}
        {isCreating && (
          <form onSubmit={handleCreatePlaylist} className="border-b border-[#078a52]/40 p-3">
            <input
              value={newPlaylistName}
              onChange={(e) => setNewPlaylistName(e.target.value)}
              placeholder={t.playlistNamePlaceholder}
              autoFocus
              className="h-8 w-full rounded-[4px] border border-[#078a52] bg-[#02492a] px-2 text-sm text-white placeholder:text-[#84e7a5]/50 focus:outline-[rgb(20,110,245)_solid_2px]"
            />
            <div className="mt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => { setIsCreating(false); setNewPlaylistName(""); }}
                className="rounded px-2 py-0.5 text-xs text-[#84e7a5] hover:text-white transition-colors"
              >
                {t.stopCreating}
              </button>
              <button
                type="submit"
                disabled={!newPlaylistName.trim()}
                className="btn-clay rounded-lg bg-[#84e7a5] px-2.5 py-0.5 text-xs font-medium text-[#02492a] hover:bg-[#fbbd41] hover:text-black disabled:opacity-50 disabled:transform-none"
              >
                {t.create}
              </button>
            </div>
          </form>
        )}

        {/* フィルタバー */}
        <div className="border-b border-[#078a52]/40 px-2 py-1.5 flex flex-wrap gap-1">
          {(["all", "favorite"] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => { setFilterStatus(f); setFilterTag(null); }}
              className={cn(
                "rounded-full px-2 py-0.5 text-[11px] font-medium transition-colors",
                filterStatus === f && filterTag === null
                  ? "bg-[#84e7a5] text-[#02492a]"
                  : "text-[#84e7a5]/60 hover:text-white"
              )}
            >
              {f === "all" ? t.filterAll : "★"}
            </button>
          ))}
          {/* タグフィルタ */}
          {allTags.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => { setFilterStatus("all"); setFilterTag(filterTag === tag ? null : tag); }}
              className={cn(
                "rounded-full px-2 py-0.5 text-[11px] font-medium transition-colors",
                filterTag === tag
                  ? "bg-[#fbbd41] text-black"
                  : "text-[#84e7a5]/60 hover:text-white"
              )}
            >
              #{tag}
            </button>
          ))}
        </div>

        {/* プレイリスト一覧 */}
        <nav className="flex-1 overflow-y-auto p-2">
          {playlists.length === 0 && !isCreating && (
            <p className="px-2 py-8 text-center text-xs text-[#84e7a5]/60 text-pretty">
              {t.noPlaylists}
            </p>
          )}
          <DndContext
            sensors={playlistSensors}
            collisionDetection={closestCenter}
            modifiers={[restrictToVerticalAxis]}
            onDragEnd={handlePlaylistDragEnd}
          >
            <SortableContext
              items={filteredPlaylists.map((pl) => pl.id)}
              strategy={verticalListSortingStrategy}
            >
          {filteredPlaylists.map((pl) => (
            <SortablePlaylistItem key={pl.id} id={pl.id} disabled={renamingId === pl.id}>
              {(dragProps) => (
              <>
              {renamingId === pl.id ? (
                <form onSubmit={handleRename} className="p-1">
                  <input
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    autoFocus
                    onBlur={handleRename}
                    className="h-8 w-full rounded-[4px] border border-[rgb(20,110,245)] bg-[#02492a] px-2 text-sm text-white focus:outline-none"
                  />
                </form>
              ) : (
                <div
                  {...dragProps}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setActivePlaylist(pl.id);
                    setContextMenu({ x: e.clientX, y: e.clientY, id: pl.id });
                  }}
                  className={cn(
                    "group flex w-full flex-col rounded-xl px-2 py-2 text-sm transition-colors cursor-grab active:cursor-grabbing",
                    activePlaylistId === pl.id
                      ? "bg-[#078a52] text-[#84e7a5]"
                      : "text-[#84e7a5]/70 hover:bg-[#078a52]/50 hover:text-white"
                  )}
                  onClick={() => setActivePlaylist(pl.id)}
                  onDoubleClick={() => handleStartRename(pl.id, pl.name)}
                >
                  {/* 1行目: 名前 + ★ボタン + 件数 */}
                  <div className="flex items-center gap-1 w-full">
                    <span className="flex-1 truncate font-medium">{pl.name}</span>
                    {/* ★お気に入りボタン */}
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); toggleFavorite(pl.id); }}
                      className={cn(
                        "shrink-0 transition-colors text-sm leading-none",
                        pl.isFavorite
                          ? "text-[#fbbd41]"
                          : "text-transparent group-hover:text-[#84e7a5]/40 hover:!text-[#fbbd41]"
                      )}
                      title={pl.isFavorite ? t.removeFromFavorites : t.addToFavorites}
                    >
                      ★
                    </button>
                    <span className="shrink-0 tabular-nums text-xs opacity-60">
                      {pl.chunks.length}
                    </span>
                  </div>
                  {/* 進捗バー */}
                  {(() => {
                    const pct = getProgress(pl.id);
                    if (pct === null) return null;
                    return (
                      <div className="mt-1.5 flex items-center gap-1.5">
                        <div className="flex-1 h-1 rounded-full bg-[#084e30] overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all",
                              pct === 100 ? "bg-[#84e7a5]" : "bg-[#60a5fa]"
                            )}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className={cn(
                          "shrink-0 tabular-nums text-[10px] font-semibold",
                          pct === 100
                            ? (activePlaylistId === pl.id ? "text-[#84e7a5]" : "text-[#84e7a5]/80")
                            : (activePlaylistId === pl.id ? "text-[#93c5fd]" : "text-[#84e7a5]/50")
                        )}>
                          {pct}%
                        </span>
                      </div>
                    );
                  })()}

                  {/* タグ */}
                  {(pl.tags ?? []).length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {(pl.tags ?? []).map((tag) => (
                        <span
                          key={tag}
                          className={cn(
                            "rounded-full px-1.5 py-0 text-[10px] font-medium",
                            activePlaylistId === pl.id
                              ? "bg-[#084e30] text-[#84e7a5]/80"
                              : "bg-[#084e30]/70 text-[#84e7a5]/60"
                          )}
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
              </>
              )}
            </SortablePlaylistItem>
          ))}
            </SortableContext>
          </DndContext>
        </nav>
      </aside>

      {/* メインコンテンツ */}
      <main className="flex flex-1 flex-col overflow-hidden bg-[#faf9f7]">
        {activePlaylist ? (
          <>
            <header className="flex items-center justify-between border-b border-[#dad4c8] bg-white px-6 py-4">
              <div>
                <h1 className="heading-clay text-2xl text-black text-balance">
                  {activePlaylist.name}
                </h1>
                <p className="label-clay mt-1 text-[#9f9b93]">
                  {chunkCount} {t.chunkUnit}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {/* ソートボタン */}
                {chunkCount > 1 && (
                  <div className="relative">
                    <button
                      ref={sortBtnRef}
                      type="button"
                      onClick={() => setSortMenuOpen((v) => !v)}
                      disabled={isSorting}
                      title={t.sortChunks}
                      className={cn(
                        "flex h-9 items-center gap-1.5 rounded-lg border border-[#dad4c8] bg-white px-3 text-sm text-[#9f9b93] transition-colors hover:border-[#078a52] hover:text-[#078a52]",
                        isSorting && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      {isSorting ? (
                        <div className="size-4 rounded-full border-2 border-[#dad4c8] border-t-[#078a52]" style={{ animation: "spin 0.8s linear infinite" }} />
                      ) : (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="15" y2="12" /><line x1="3" y1="18" x2="9" y2="18" />
                          <polyline points="17 15 21 19 17 23" />
                        </svg>
                      )}
                      <span className="hidden sm:inline">{t.sortChunks}</span>
                    </button>

                    {/* ソートドロップダウン */}
                    {sortMenuOpen && (
                      <>
                        {/* 背景クリックで閉じる */}
                        <div className="fixed inset-0 z-10" onClick={() => setSortMenuOpen(false)} />
                        <div className="absolute right-0 top-full z-20 mt-1 w-52 overflow-hidden rounded-xl border border-[#dad4c8] bg-white shadow-[rgba(0,0,0,0.12)_0px_4px_16px]">
                          <p className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-[#9f9b93]">
                            {t.sortChunks}
                          </p>
                          {(
                            [
                              ["name-asc",      t.sortNameAsc],
                              ["name-desc",     t.sortNameDesc],
                              ["modified-desc", t.sortModifiedDesc],
                              ["modified-asc",  t.sortModifiedAsc],
                              ["created-desc",  t.sortCreatedDesc],
                              ["created-asc",   t.sortCreatedAsc],
                            ] as const
                          ).map(([key, label]) => (
                            <button
                              key={key}
                              type="button"
                              onClick={() => handleSort(key)}
                              className="flex w-full items-center px-3 py-2 text-left text-sm text-[#333] hover:bg-[#f3fdf7] hover:text-[#078a52]"
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}

                <Button
                  variant="primary"
                  size="md"
                  onClick={handleStartViewer}
                  disabled={chunkCount === 0}
                >
                  {t.openInViewer}
                </Button>
              </div>
            </header>

            <div
              className="flex-1 overflow-y-auto p-6"
              onClick={(e) => { if (e.target === e.currentTarget) setSelectedChunkIds(new Set()); }}
            >
              {activePlaylist.chunks.length === 0 && !showEmptyForm ? (
                <button
                  onClick={() => setShowEmptyForm(true)}
                  className="group flex w-full flex-col items-center justify-center rounded-2xl border border-dashed border-[#dad4c8] bg-transparent px-6 py-16 text-center transition-colors hover:border-[#078a52] hover:bg-white"
                >
                  <svg
                    width="48" height="48" viewBox="0 0 24 24"
                    fill="none" stroke="currentColor" strokeWidth="1.5"
                    className="mb-4 text-[#dad4c8] transition-colors group-hover:text-[#84e7a5]"
                  >
                    <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" />
                    <polyline points="17 21 17 13 7 13 7 21" />
                    <polyline points="7 3 7 8 15 8" />
                  </svg>
                  <p className="text-sm text-[#9f9b93] text-pretty transition-colors group-hover:text-[#078a52]">
                    {t.noChunksLine1}
                    <br />
                    {t.noChunksLine2}
                  </p>
                </button>
              ) : (
                <>
                  {/* 分割アンドゥバナー（最後の分割のみ表示、✕で閉じても右クリックから戻せる） */}
                  {showUndoBanner && lastSplitGid && (
                    () => {
                      const entry = splitUndoEntries.find((e) => e.gid === lastSplitGid);
                      if (!entry || entry.playlistId !== activePlaylist.id) return null;
                      return (
                        <div className="mb-3 flex items-center gap-2 rounded-xl border border-[#078a52]/30 bg-[#e8faf1] px-3 py-2 text-xs text-[#02492a]">
                          <span className="flex-1">{entry.addedIds.length}チャンクに分割しました</span>
                          <button
                            type="button"
                            onClick={handleUndoBannerSplit}
                            className="shrink-0 rounded-lg bg-[#078a52] px-2.5 py-1 text-white font-medium hover:bg-[#055e37] transition-colors"
                          >
                            {t.undoSplit}
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowUndoBanner(false)}
                            className="shrink-0 text-[#078a52] hover:text-[#055e37]"
                            aria-label="閉じる"
                          >
                            ✕
                          </button>
                        </div>
                      );
                    }
                  )()}
                  {/* 削除アンドゥバナー */}
                  {showDeleteUndoBanner && deleteUndoStack.length > 0 && deleteUndoStack[deleteUndoStack.length - 1].playlistId === activePlaylist.id && (
                    <div className="mb-3 flex items-center gap-2 rounded-xl border border-[#3b5bdb]/30 bg-[#edf2ff] px-3 py-2 text-xs text-[#1c3399]">
                      <span className="flex-1">
                        {deleteUndoStack[deleteUndoStack.length - 1].chunks.length}件削除しました
                      </span>
                      <button
                        type="button"
                        onClick={handleUndoDelete}
                        className="shrink-0 rounded-lg bg-[#3b5bdb] px-2.5 py-1 text-white font-medium hover:bg-[#2c44c0] transition-colors"
                      >
                        元に戻す (Ctrl+Z)
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowDeleteUndoBanner(false)}
                        className="shrink-0 text-[#3b5bdb] hover:text-[#2c44c0]"
                        aria-label="閉じる"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                  {activePlaylist.chunks.length > 0 && (
                    <SortableChunkList
                      chunks={activePlaylist.chunks}
                      onChunkDragEnd={handleChunkDragEnd}
                      onUpdate={(chunkId, updates) => updateChunk(activePlaylist.id, chunkId, updates)}
                      onRemove={(chunkId) => {
                        const idx = activePlaylist.chunks.findIndex((c) => c.id === chunkId);
                        if (idx >= 0) {
                          setDeleteUndoStack((prev) => [...prev, {
                            playlistId: activePlaylist.id,
                            insertIndex: idx,
                            chunks: [activePlaylist.chunks[idx]],
                          }]);
                          setShowDeleteUndoBanner(true);
                        }
                        removeChunk(activePlaylist.id, chunkId);
                        setSplitUndoEntries((prev) => prev.filter((e) => !e.addedIds.includes(chunkId)));
                        setSelectedChunkIds((prev) => { const n = new Set(prev); n.delete(chunkId); return n; });
                      }}
                      onSplit={handleSplitChunk}
                      getUndoSplitHandler={getUndoSplitHandler}
                      selectedChunkIds={selectedChunkIds}
                      onSingleSelect={handleSingleSelect}
                      onToggleSelect={handleToggleSelect}
                      onRangeSelect={handleRangeSelect}
                      onDragSelect={handleDragSelect}
                      onClearSelection={() => setSelectedChunkIds(new Set())}
                      onBatchDeleteSelected={() => handleBatchDelete([...selectedChunkIds])}
                    />
                  )}
                  <div className={activePlaylist.chunks.length > 0 ? "mt-4" : ""}>
                    <ChunkForm
                      addTrigger={addTrigger + (showEmptyForm ? 1 : 0)}
                      onAdd={(start, end, name) => {
                        addChunk(activePlaylist.id, start, end, name);
                        setShowEmptyForm(false);
                      }}
                      onAddMultiple={(chunks) => {
                        for (const c of chunks) addChunk(activePlaylist.id, c.startPath, c.endPath, c.name);
                        setShowEmptyForm(false);
                      }}
                      onCancel={() => {
                        if (activePlaylist.chunks.length === 0) setShowEmptyForm(false);
                      }}
                      initialBrowsePath={lastChunkPath}
                    />
                  </div>
                </>
              )}
            </div>

            {/* 複数選択フローティングバー */}
            {selectedChunkIds.size > 0 && (
              <div className="sticky bottom-0 flex items-center gap-2 border-t border-[#078a52]/30 bg-[#e8faf1]/95 px-4 py-2.5 backdrop-blur-sm">
                <span className="flex-1 text-xs font-medium text-[#02492a]">
                  {t.selectedCount(selectedChunkIds.size)}
                </span>
                {/* 全選択 */}
                {activePlaylist && selectedChunkIds.size < activePlaylist.chunks.length && (
                  <button
                    type="button"
                    onClick={() => activePlaylist && setSelectedChunkIds(new Set(activePlaylist.chunks.map((c) => c.id)))}
                    className="rounded-lg px-2.5 py-1 text-xs text-[#078a52] hover:bg-[#078a52]/10 transition-colors"
                  >
                    {t.selectAll}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setSelectedChunkIds(new Set())}
                  className="rounded-lg px-2.5 py-1 text-xs text-[#9f9b93] hover:bg-[#eee9df] transition-colors"
                >
                  {t.clearSelection}
                </button>
                <button
                  type="button"
                  onClick={() => handleBatchDelete([...selectedChunkIds])}
                  className="rounded-lg bg-[#e05560] px-3 py-1 text-xs font-semibold text-white hover:bg-[#c0404a] transition-colors"
                >
                  {selectedChunkIds.size}件を削除
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center text-center">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="mb-6 text-[#dad4c8]">
              <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
            </svg>
            <p className="text-sm text-[#9f9b93] text-pretty leading-relaxed">
              {t.selectOrCreate}
              <br />
              {t.selectOrCreateSub}
            </p>
          </div>
        )}
      </main>

      {/* 右クリックコンテキストメニュー */}
      {contextMenu && (() => {
        const pl = playlists.find((p) => p.id === contextMenu.id);
        return (
          <ContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            onClose={() => setContextMenu(null)}
            items={[
              {
                label: t.rename,
                onClick: () => { if (pl) handleStartRename(pl.id, pl.name); },
              },
              { separator: true },
              // 未読に戻す（100%既読の場合のみ表示）
              ...(getProgress(contextMenu.id) === 100
                ? [{ label: t.markUnread, onClick: () => {
                    // progressMap の pageIndex を 0 にリセット
                    useViewerStore.setState((s) => ({
                      progressMap: {
                        ...s.progressMap,
                        [contextMenu.id]: { ...s.progressMap[contextMenu.id], pageIndex: 0 },
                      },
                    }));
                    setContextMenu(null);
                  }}]
                : []
              ),
              // タグ編集
              {
                label: t.editTags,
                onClick: () => { setTagEditorId(contextMenu.id); setContextMenu(null); },
              },
              { separator: true },
              {
                label: t.delete,
                danger: true,
                onClick: () => setDeleteTarget(contextMenu.id),
              },
            ]}
          />
        );
      })()}

      {/* タグエディタ */}
      {tagEditorId && (
        <TagEditor
          playlist={playlists.find((p) => p.id === tagEditorId)!}
          onSave={(tags) => { setTags(tagEditorId, tags); setTagEditorId(null); }}
          onClose={() => setTagEditorId(null)}
        />
      )}

      {/* 削除確認ダイアログ */}
      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        title={t.deletePlaylistTitle}
        description={t.deletePlaylistDesc}
        confirmLabel={t.deleteConfirm}
        onConfirm={() => {
          if (deleteTarget) {
            deletePlaylist(deleteTarget);
            setDeleteTarget(null);
          }
        }}
      />

      {/* 複数チャンク一括削除ダイアログ（フォールバック用・現在未使用） */}
      <ConfirmDialog
        open={showBatchDeleteConfirm}
        onOpenChange={(open) => { if (!open) setShowBatchDeleteConfirm(false); }}
        title={t.deleteSelectedConfirmTitle}
        description={t.deleteSelectedConfirmDesc(selectedChunkIds.size)}
        confirmLabel={t.deleteConfirm}
        onConfirm={() => handleBatchDelete([...selectedChunkIds])}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// ステータスドット
// ---------------------------------------------------------------------------

function StatusDot({ status }: { status?: "unread" | "read" }) {
  if (!status) return <span className="size-2 shrink-0" />;
  return (
    <span
      className={cn(
        "inline-block size-2 shrink-0 rounded-full",
        status === "unread" ? "bg-[#60a5fa]" : "bg-[#84e7a5]"
      )}
    />
  );
}

// ---------------------------------------------------------------------------
// タグエディタ（モーダル）
// ---------------------------------------------------------------------------

function TagEditor({
  playlist,
  onSave,
  onClose,
}: {
  playlist: Playlist;
  onSave: (tags: string[]) => void;
  onClose: () => void;
}) {
  const t = useT();
  const [tags, setTagsLocal] = useState<string[]>(playlist.tags ?? []);
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  function addTag() {
    const val = input.trim().replace(/^#+/, "");
    if (!val || tags.includes(val)) { setInput(""); return; }
    setTagsLocal([...tags, val]);
    setInput("");
  }

  function removeTag(tag: string) {
    setTagsLocal(tags.filter((t) => t !== tag));
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-80 rounded-2xl border border-[#dad4c8] bg-white p-5 shadow-[rgba(0,0,0,0.15)_0px_8px_32px]">
        <p className="heading-clay mb-3 text-base text-black">{t.editTags}</p>
        <p className="mb-2 text-xs text-[#9f9b93]">{playlist.name}</p>

        {/* タグ一覧 */}
        <div className="mb-3 flex min-h-8 flex-wrap gap-1.5">
          {tags.length === 0 && (
            <span className="text-xs text-[#9f9b93]">{t.noTag}</span>
          )}
          {tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 rounded-full bg-[#e8fdf2] px-2 py-0.5 text-xs font-medium text-[#02492a]"
            >
              #{tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="text-[#078a52] hover:text-[#02492a]"
              >
                ×
              </button>
            </span>
          ))}
        </div>

        {/* タグ入力 */}
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
            placeholder={t.addTag}
            className="h-8 flex-1 rounded-[4px] border border-[#717989] bg-white px-2.5 text-sm text-black placeholder:text-[#9f9b93] focus:outline-[rgb(20,110,245)_solid_2px]"
          />
          <button
            type="button"
            onClick={addTag}
            className="btn-clay h-8 rounded-lg bg-[#84e7a5] px-3 text-xs font-medium text-[#02492a] hover:bg-[#fbbd41] hover:text-black"
          >
            +
          </button>
        </div>

        {/* ボタン */}
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose}>{t.cancel}</Button>
          <Button variant="primary" size="sm" onClick={() => onSave(tags)}>{t.save}</Button>
        </div>
      </div>
    </div>
  );
}
