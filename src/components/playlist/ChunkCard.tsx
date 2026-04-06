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

const IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "gif", "webp", "bmp", "tiff", "tif"];

/** パスの親ディレクトリを返す（ファイル選択後に終了パスを同フォルダから開くため） */
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

export function ChunkCard({
  chunk,
  index,
  onUpdate,
  onRemove,
}: ChunkCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(chunk.name ?? "");
  const [editStart, setEditStart] = useState(chunk.startPath);
  const [editEnd, setEditEnd] = useState(chunk.endPath);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: chunk.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

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

  // 表示名: name があればそれ、なければ #n
  const displayName = chunk.name?.trim() || `#${index + 1}`;

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        className={cn(
          "relative rounded-lg border border-zinc-700 bg-zinc-800/50 p-4",
          isDragging && "z-10 opacity-80 shadow-xl shadow-black/30"
        )}
        onContextMenu={(e) => {
          e.preventDefault();
          setContextMenu({ x: e.clientX, y: e.clientY });
        }}
      >
        {/* ヘッダー: ドラッグハンドル + 表示名 */}
        <div className="mb-3 flex items-center gap-3">
          <button
            className="flex size-8 shrink-0 cursor-grab items-center justify-center rounded text-zinc-500 hover:bg-zinc-700 hover:text-zinc-300 active:cursor-grabbing"
            aria-label="ドラッグして並び替え"
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
            "truncate text-sm font-medium",
            chunk.name?.trim() ? "text-zinc-200" : "tabular-nums text-zinc-500"
          )}>
            {displayName}
          </span>
        </div>

        {/* パス表示 / 編集フォーム */}
        {isEditing ? (
          <div className="space-y-3">
            {/* チャンク名 */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-zinc-400">チャンク名（省略可）</label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder={`チャンク #${index + 1}`}
                className="h-9 w-full rounded border border-zinc-700 bg-zinc-800 px-3 text-sm text-zinc-100 placeholder-zinc-600 focus:border-blue-500 focus:outline-none transition-colors"
              />
            </div>

            <ImageFilePicker
              label="開始パス"
              value={editStart}
              onChange={(v) => {
                setEditStart(v);
                if (isDirectoryLike(v)) setEditEnd("");
              }}
              placeholder="D:/manga/vol1/001.jpg  または  D:/manga/vol1/"
            />
            <ImageFilePicker
              label={editStartIsDir ? "終了パス（フォルダ選択時は不要）" : "終了パス（省略するとフォルダ全体）"}
              value={editStartIsDir ? "" : editEnd}
              onChange={setEditEnd}
              placeholder={editStartIsDir ? "（フォルダ全体が対象）" : "D:/manga/vol1/050.jpg  （省略可）"}
              disabled={editStartIsDir}
              initialBrowsePath={getParentPath(editStart)}
            />
            <div className="flex justify-end gap-2">
              <Button variant="secondary" size="sm" onClick={handleCancel}>
                キャンセル
              </Button>
              <Button variant="primary" size="sm" onClick={handleSave}>
                保存
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-1.5">
            <div className="flex items-baseline gap-2">
              <span className="shrink-0 text-xs text-zinc-500">開始:</span>
              <span className="truncate text-sm text-zinc-300">
                {chunk.startPath || "(未設定)"}
              </span>
            </div>
            {!isDirectoryLike(chunk.startPath) && (
              <div className="flex items-baseline gap-2">
                <span className="shrink-0 text-xs text-zinc-500">終了:</span>
                <span className="truncate text-sm text-zinc-300">
                  {chunk.endPath || <span className="text-zinc-500">(フォルダ全体)</span>}
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
            {
              label: "編集",
              onClick: openEdit,
            },
            { separator: true },
            {
              label: "削除",
              danger: true,
              onClick: () => setShowDeleteDialog(true),
            },
          ]}
        />
      )}

      <ConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title="チャンクを削除"
        description={`「${displayName}」を削除しますか？この操作は元に戻せません。`}
        confirmLabel="削除する"
        onConfirm={() => onRemove(chunk.id)}
      />
    </>
  );
}
