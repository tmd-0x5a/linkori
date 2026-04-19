"use client";

import { useEffect, useState } from "react";
import {
  DndContext,
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
  arrayMove,
} from "@dnd-kit/sortable";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { usePlaylistStore } from "@/stores/playlistStore";
import { useViewerStore } from "@/stores/viewerStore";
import { ChunkCard } from "@/components/playlist/ChunkCard";
import { ChunkForm } from "@/components/playlist/ChunkForm";
import { useT } from "@/hooks/useT";
import { cn } from "@/lib/cn";
import { listSplitCandidates } from "@/lib/tauri";
import type { Chunk } from "@/types";

interface ChunkSidebarProps {
  open: boolean;
  onClose: () => void;
}

/**
 * ビュー内チャンク編集パネル（右スライドイン）
 * - 既存の ChunkCard を流用（編集・削除・D&D 並び替えはそのまま動作）
 * - 変更後に viewerStore の位置保持リロードを呼び出し、閲覧位置を維持
 */
export function ChunkSidebar({ open, onClose }: ChunkSidebarProps) {
  const t = useT();
  const activePlaylistId = useViewerStore((s) => s.activePlaylistId);
  const playlist = usePlaylistStore((s) =>
    s.playlists.find((pl) => pl.id === activePlaylistId)
  );
  const reload = useViewerStore((s) => s.reloadChunksPreservingPosition);


  // チャンク変更をトリガーに画像リストを再構築
  // チャンク配列の参照が変わるたびに発火（add/remove/update/reorder すべてカバー）
  const chunks = playlist?.chunks ?? [];
  const chunksKey = chunks.map((c) => `${c.id}:${c.startPath}:${c.endPath}:${c.name ?? ""}`).join("|");
  useEffect(() => {
    if (!open) return;
    // 初回マウント分もまとめてリロード（ハイドレーション直後の差分を拾う）
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chunksKey, open]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id || !playlist) return;
    const fromIdx = chunks.findIndex((c) => c.id === active.id);
    const toIdx = chunks.findIndex((c) => c.id === over.id);
    if (fromIdx === -1 || toIdx === -1) return;
    const orderedIds = arrayMove(chunks, fromIdx, toIdx).map((c) => c.id);
    usePlaylistStore.getState().setChunksOrder(playlist.id, orderedIds);
  }

  /** フォルダ型チャンクをサブフォルダ単位で分割（右クリックメニューから） */
  async function handleSplit(chunkId: string) {
    if (!playlist) return;
    const idx = chunks.findIndex((c) => c.id === chunkId);
    if (idx < 0) return;
    const original = chunks[idx];
    try {
      const candidates = await listSplitCandidates(original.startPath);
      if (candidates.length === 0) return;
      const newChunks: Chunk[] = candidates.map((c) => ({
        id: crypto.randomUUID(),
        name: c.name,
        startPath: c.path,
        endPath: "",
      }));
      const store = usePlaylistStore.getState();
      store.removeChunk(playlist.id, chunkId);
      store.insertChunksAt(playlist.id, idx, newChunks);
    } catch {
      // エラー時は何もしない
    }
  }

  if (!activePlaylistId || !playlist) return null;

  return (
    <>
      {/* 背景オーバーレイ（クリックで閉じる） */}
      <div
        className={cn(
          "fixed inset-0 z-30 bg-black/40 backdrop-blur-sm transition-opacity duration-200",
          open ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={onClose}
      />

      {/* サイドパネル */}
      <aside
        className={cn(
          "fixed right-0 top-0 z-40 flex h-dvh w-[420px] max-w-[92vw] flex-col border-l border-[var(--oat-border)] bg-[var(--cream)] shadow-[rgba(0,0,0,0.25)_-8px_0_32px] transition-transform duration-200",
          open ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* ヘッダー */}
        <header className="flex shrink-0 items-center justify-between border-b border-[var(--oat-border)] bg-[var(--panel-bg)] px-5 py-4">
          <div>
            <h2 className="font-mincho text-xl text-[var(--panel-text)]">{playlist.name}</h2>
            <p className="label-clay mt-0.5 text-[var(--warm-silver)]">
              {chunks.length} {t.chunkUnit}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            title={t.closeSidebar}
            className="flex size-8 items-center justify-center rounded-lg text-[var(--warm-silver)] hover:bg-[var(--oat-light)] hover:text-[var(--panel-text)] transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </header>

        {/* コンテンツ（ホイールスクロールはビューアーに吸わせない） */}
        <div className="paper-noise flex-1 overflow-y-auto p-5" data-viewer-allow-scroll>
          {/* チャンク追加フォーム（ChunkForm 自体が開閉を持つ） */}
          <div className="mb-4">
            <ChunkForm
              onAdd={(startPath, endPath, name) =>
                usePlaylistStore.getState().addChunk(playlist.id, startPath, endPath, name)
              }
              onAddMultiple={(newChunks) => {
                for (const c of newChunks) {
                  usePlaylistStore.getState().addChunk(playlist.id, c.startPath, c.endPath, c.name);
                }
              }}
              initialBrowsePath={chunks.length > 0 ? chunks[chunks.length - 1].startPath : undefined}
            />
          </div>

          {chunks.length > 0 ? (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              modifiers={[restrictToVerticalAxis]}
              onDragEnd={handleDragEnd}
            >
              <SortableContext items={chunks.map((c) => c.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-3">
                  {chunks.map((chunk, index) => (
                    <ChunkCard
                      key={chunk.id}
                      chunk={chunk}
                      index={index}
                      onUpdate={(chunkId, updates) =>
                        usePlaylistStore.getState().updateChunk(playlist.id, chunkId, updates)
                      }
                      onRemove={(chunkId) =>
                        usePlaylistStore.getState().removeChunk(playlist.id, chunkId)
                      }
                      onSplit={handleSplit}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          ) : (
            <p className="py-8 text-center text-sm text-[var(--warm-silver)]">
              {t.noChunksLine1}
            </p>
          )}
        </div>
      </aside>
    </>
  );
}
