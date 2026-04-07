"use client";

import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Chunk } from "@/types";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ContextMenu } from "@/components/ui/ContextMenu";
import { ImageFilePicker } from "@/components/ImageFilePicker";
import { useT } from "@/hooks/useT";

const IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "gif", "webp", "bmp", "tiff", "tif"];

function getParentPath(path: string): string | undefined {
  if (!path.trim()) return undefined;
  const normalized = path.replace(/\\/g, "/").replace(/\/+$/, "");
  const lastSlash = normalized.lastIndexOf("/");
  if (lastSlash <= 0) return undefined;
  return normalized.slice(0, lastSlash);
}

function isDirectoryLike(path: string): boolean {
  if (!path.trim()) return false;
  const normalized = path.replace(/\\/g, "/").replace(/\/+$/, "");
  const lastSegment = normalized.split("/").pop() ?? "";
  const dotIdx = lastSegment.lastIndexOf(".");
  if (dotIdx < 0) return true;
  const ext = lastSegment.slice(dotIdx + 1).toLowerCase();
  return !IMAGE_EXTENSIONS.includes(ext);
}

interface ChunkCardProps {
  chunk: Chunk;
  index: number;
  onUpdate: (
    chunkId: string,
    updates: Partial<Pick<Chunk, "name" | "startPath" | "endPath">>
  ) => void;
  onRemove: (chunkId: string) => void;
}

export function ChunkCard({ chunk, index, onUpdate, onRemove }: ChunkCardProps) {
  const t = useT();
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(chunk.name ?? "");
  const [editStart, setEditStart] = useState(chunk.startPath);
  const [editEnd, setEditEnd] = useState(chunk.endPath);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: chunk.id });

  const style = { transform: CSS.Transform.toString(transform), transition };
  const editStartIsDir = isDirectoryLike(editStart);

  function handleSave() {
    onUpdate(chunk.id, {
      name: editName.trim() || undefined,
      startPath: editStart,
      endPath: editStartIsDir ? "" : editEnd,
    });
    setIsEditing(false);
  }

  function handleCancel() {
    setEditName(chunk.name ?? "");
    setEditStart(chunk.startPath);
    setEditEnd(chunk.endPath);
    setIsEditing(false);
  }

  function openEdit() {
    setEditName(chunk.name ?? "");
    setEditStart(chunk.startPath);
    setEditEnd(chunk.endPath);
    setIsEditing(true);
  }

  const displayName = chunk.name?.trim() || `#${index + 1}`;

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        className={cn(
          "relative rounded-2xl border border-[#dad4c8] bg-white p-4",
          "shadow-[rgba(0,0,0,0.1)_0px_1px_1px,rgba(0,0,0,0.04)_0px_-1px_1px_inset,rgba(0,0,0,0.05)_0px_-0.5px_1px]",
          isDragging && "z-10 opacity-80 shadow-[rgb(0,0,0)_-4px_4px]"
        )}
        onContextMenu={(e) => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY }); }}
      >
        {/* ヘッダー */}
        <div className="mb-3 flex items-center gap-3">
          <button
            className="flex size-8 shrink-0 cursor-grab items-center justify-center rounded-lg text-[#dad4c8] hover:bg-[#eee9df] hover:text-[#9f9b93] active:cursor-grabbing transition-colors"
            aria-label={t.dragToReorder}
            {...attributes}
            {...listeners}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <circle cx="5" cy="3" r="1.5" />
              <circle cx="11" cy="3" r="1.5" />
              <circle cx="5" cy="8" r="1.5" />
              <circle cx="11" cy="8" r="1.5" />
              <circle cx="5" cy="13" r="1.5" />
              <circle cx="11" cy="13" r="1.5" />
            </svg>
          </button>

          <span className={cn(
            "truncate",
            chunk.name?.trim()
              ? "heading-clay text-base text-black"
              : "tabular-nums text-sm text-[#9f9b93]"
          )}>
            {displayName}
          </span>
        </div>

        {/* パス表示 / 編集 */}
        {isEditing ? (
          <div className="space-y-3">
            <div className="flex flex-col gap-1.5">
              <label className="label-clay text-[#55534e]">{t.chunkNameLabel}</label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder={`#${index + 1}`}
                className="h-9 w-full rounded-[4px] border border-[#717989] bg-white px-3 text-sm text-black placeholder:text-[#9f9b93] focus:outline-[rgb(20,110,245)_solid_2px] transition-colors"
              />
            </div>
            <ImageFilePicker
              label={t.startPath}
              value={editStart}
              onChange={(v) => { setEditStart(v); if (isDirectoryLike(v)) setEditEnd(""); }}
              placeholder={t.startPathPlaceholder}
            />
            <ImageFilePicker
              label={editStartIsDir ? t.endPathDir : t.endPathFile}
              value={editStartIsDir ? "" : editEnd}
              onChange={setEditEnd}
              placeholder={editStartIsDir ? t.endPathDirPlaceholder : t.endPathFilePlaceholder}
              disabled={editStartIsDir}
              initialBrowsePath={getParentPath(editStart)}
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={handleCancel}>{t.cancel}</Button>
              <Button variant="primary" size="sm" onClick={handleSave}>{t.save}</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-1.5">
            <div className="flex items-baseline gap-2">
              <span className="label-clay shrink-0 text-[#9f9b93]">{t.startLabel}</span>
              <span className="truncate text-sm text-[#333333]">{chunk.startPath || t.notSet}</span>
            </div>
            {!isDirectoryLike(chunk.startPath) && (
              <div className="flex items-baseline gap-2">
                <span className="label-clay shrink-0 text-[#9f9b93]">{t.endLabel}</span>
                <span className="truncate text-sm text-[#333333]">
                  {chunk.endPath || <span className="text-[#9f9b93]">{t.wholeFolder}</span>}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          items={[
            { label: t.edit, onClick: openEdit },
            { separator: true },
            { label: t.delete, danger: true, onClick: () => setShowDeleteDialog(true) },
          ]}
        />
      )}

      <ConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title={t.deleteChunkTitle}
        description={t.deleteChunkDesc(displayName)}
        confirmLabel={t.deleteConfirm}
        onConfirm={() => onRemove(chunk.id)}
      />
    </>
  );
}
