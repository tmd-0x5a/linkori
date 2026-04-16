"use client";

import { useEffect, useRef, useState } from "react";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import type { Chunk } from "@/types";
import { ChunkCard } from "./ChunkCard";

interface SortableChunkListProps {
  chunks: Chunk[];
  /** ドラッグ完了時に activeId と overId を親へ通知（移動ロジックは PlaylistPanel 側で実装） */
  onChunkDragEnd: (activeId: string, overId: string) => void;
  onUpdate: (
    chunkId: string,
    updates: Partial<Pick<Chunk, "name" | "startPath" | "endPath">>
  ) => void;
  onRemove: (chunkId: string) => void;
  onSplit?: (chunkId: string) => void;
  /** チャンクIDから分割アンドゥハンドラを返す（なければ undefined） */
  getUndoSplitHandler?: (chunkId: string) => (() => void) | undefined;
  /** 選択済みチャンクID（PlaylistPanel から制御） */
  selectedChunkIds: Set<string>;
  /** 選択中チャンクを一括削除するコールバック */
  onBatchDeleteSelected?: () => void;
  onSingleSelect: (chunkId: string, index: number) => void;
  onToggleSelect: (chunkId: string, index: number) => void;
  /** Shift+クリック：アンカーから toIndex までの範囲を選択 */
  onRangeSelect: (toIndex: number) => void;
  /** ドラッグ選択が確定したとき */
  onDragSelect: (fromIndex: number, toIndex: number) => void;
  onClearSelection: () => void;
}

// ---------------------------------------------------------------------------
// グループドラッグ中にカーソルに追従するオーバーレイ
// ---------------------------------------------------------------------------
function GroupDragOverlay({
  activeChunk,
  groupCount,
}: {
  activeChunk: Chunk;
  groupCount: number;
}) {
  const displayName =
    activeChunk.name?.trim() ||
    activeChunk.startPath.replace(/\\/g, "/").replace(/\/+$/, "").split("/").pop() ||
    "";

  return (
    <div className="relative cursor-grabbing select-none">
      {/* 奥行き表現（3件以上） */}
      {groupCount > 2 && (
        <div className="absolute top-3 left-3 right-[-3px] bottom-[-3px] rounded-2xl border border-[#078a52]/30 bg-[#e8faf1]/80" />
      )}
      {/* 背面カード（2件以上） */}
      {groupCount > 1 && (
        <div className="absolute top-1.5 left-1.5 right-[-1.5px] bottom-[-1.5px] rounded-2xl border border-[#078a52]/50 bg-[#e8faf1]/90" />
      )}
      {/* 前面カード */}
      <div className="relative rounded-2xl border-2 border-[#078a52] bg-[#e8faf1] px-4 py-3 shadow-[rgba(0,0,0,0.22)_0px_10px_28px]">
        <div className="flex items-center gap-2">
          <span className="flex-1 truncate text-sm font-medium text-black">{displayName}</span>
          {groupCount > 1 && (
            <span className="shrink-0 rounded-full bg-[#078a52] px-2.5 py-0.5 text-xs font-bold text-white">
              {groupCount}件
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export function SortableChunkList({
  chunks,
  onChunkDragEnd,
  onUpdate,
  onRemove,
  onSplit,
  getUndoSplitHandler,
  selectedChunkIds,
  onSingleSelect,
  onToggleSelect,
  onRangeSelect,
  onDragSelect,
  onClearSelection,
  onBatchDeleteSelected,
}: SortableChunkListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // ドラッグ中のアイテムID
  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  // stale closure 対策
  const onChunkDragEndRef = useRef(onChunkDragEnd);
  onChunkDragEndRef.current = onChunkDragEnd;

  function handleDragEnd(event: DragEndEvent) {
    setActiveDragId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    onChunkDragEndRef.current(active.id as string, over.id as string);
  }

  // ── マウスドラッグ範囲選択 ────────────────────────────────────────
  const isDragging = useRef(false);
  const dragAnchorIdx = useRef<number | null>(null);
  const dragCurIdx = useRef<number | null>(null);
  const hasMoved = useRef(false);
  const wasADrag = useRef(false);
  const [dragPreview, setDragPreview] = useState<{ from: number; to: number } | null>(null);

  // 修飾キーの押下状態を追跡（Shift+クリック時のテキスト選択防止用）
  const modifierHeldRef = useRef(false);
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      modifierHeldRef.current = e.shiftKey || e.ctrlKey || e.metaKey;
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("keyup", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("keyup", onKey);
    };
  }, []);

  // ドラッグ選択中 or 修飾キー押下中のテキスト選択を防止
  useEffect(() => {
    function preventSelect(e: Event) {
      if (isDragging.current || modifierHeldRef.current) e.preventDefault();
    }
    document.addEventListener("selectstart", preventSelect);
    return () => document.removeEventListener("selectstart", preventSelect);
  }, []);

  function handleCardMouseDown(index: number, e: React.MouseEvent) {
    if (e.button !== 0) return;
    isDragging.current = true;
    dragAnchorIdx.current = index;
    dragCurIdx.current = index;
    hasMoved.current = false;
    wasADrag.current = false;
  }

  function handleCardMouseEnter(index: number) {
    if (!isDragging.current) return;
    dragCurIdx.current = index;
    if (index !== dragAnchorIdx.current) {
      hasMoved.current = true;
      const from = Math.min(dragAnchorIdx.current!, index);
      const to   = Math.max(dragAnchorIdx.current!, index);
      setDragPreview({ from, to });
    }
  }

  useEffect(() => {
    function handleGlobalMouseUp() {
      if (!isDragging.current) return;
      if (hasMoved.current && dragAnchorIdx.current !== null && dragCurIdx.current !== null) {
        onDragSelect(dragAnchorIdx.current, dragCurIdx.current);
        wasADrag.current = true;
        setTimeout(() => { wasADrag.current = false; }, 50);
      }
      isDragging.current = false;
      hasMoved.current = false;
      dragAnchorIdx.current = null;
      dragCurIdx.current = null;
      setDragPreview(null);
    }
    document.addEventListener("mouseup", handleGlobalMouseUp);
    return () => document.removeEventListener("mouseup", handleGlobalMouseUp);
  }, [onDragSelect]);

  /** ドラッグ中はプレビュー範囲を優先、それ以外は selectedChunkIds で判定 */
  function isSelected(index: number, chunkId: string): boolean {
    if (dragPreview) {
      return index >= dragPreview.from && index <= dragPreview.to;
    }
    return selectedChunkIds.has(chunkId);
  }

  // グループドラッグ中か（選択済みのチャンクをドラッグしている）
  const isGroupDrag =
    activeDragId !== null &&
    selectedChunkIds.has(activeDragId) &&
    selectedChunkIds.size > 1;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[restrictToVerticalAxis]}
      onDragStart={(e) => setActiveDragId(e.active.id as string)}
      onDragCancel={() => setActiveDragId(null)}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={chunks.map((c) => c.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-3">
          {chunks.map((chunk, index) => (
            <ChunkCard
              key={chunk.id}
              chunk={chunk}
              index={index}
              onUpdate={onUpdate}
              onRemove={onRemove}
              onSplit={onSplit}
              onUndoSplit={getUndoSplitHandler?.(chunk.id)}
              selected={isSelected(index, chunk.id)}
              selectedCount={selectedChunkIds.size}
              onBatchDeleteSelected={onBatchDeleteSelected}
              // グループドラッグ中は選択済み全チャンクを非表示（DragOverlay が視覚を担う）
              isDraggingGroup={isGroupDrag && selectedChunkIds.has(chunk.id)}
              onCardClick={(chunkId, idx, e) => {
                if (wasADrag.current) return;
                if (e.shiftKey) {
                  onRangeSelect(idx);
                } else if (e.ctrlKey || e.metaKey) {
                  onToggleSelect(chunkId, idx);
                } else {
                  onSingleSelect(chunkId, idx);
                }
              }}
              onCardMouseDown={handleCardMouseDown}
              onCardMouseEnter={handleCardMouseEnter}
            />
          ))}
        </div>
      </SortableContext>

      {/* グループ移動オーバーレイ：カーソルに追従する統合カード */}
      <DragOverlay dropAnimation={null}>
        {activeDragId ? (() => {
          const activeChunk = chunks.find((c) => c.id === activeDragId);
          if (!activeChunk) return null;
          return (
            <GroupDragOverlay
              activeChunk={activeChunk}
              groupCount={isGroupDrag ? selectedChunkIds.size : 1}
            />
          );
        })() : null}
      </DragOverlay>
    </DndContext>
  );
}
