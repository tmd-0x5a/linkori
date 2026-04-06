"use client";

import { useState } from "react";
import { usePlaylistStore } from "@/stores/playlistStore";
import { useViewerStore } from "@/stores/viewerStore";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ContextMenu } from "@/components/ui/ContextMenu";
import { SortableChunkList } from "./SortableChunkList";
import { ChunkForm } from "./ChunkForm";

interface PlaylistPanelProps {
  onStartViewer: () => void;
}

export function PlaylistPanel({ onStartViewer }: PlaylistPanelProps) {
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
    reorderChunks,
  } = usePlaylistStore();

  const loadImagesForPlaylist = useViewerStore(
    (s) => s.loadImagesForPlaylist
  );

  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; id: string } | null>(null);

  const activePlaylist = playlists.find((pl) => pl.id === activePlaylistId);

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

  async function handleStartViewer() {
    if (!activePlaylistId) return;
    await loadImagesForPlaylist(activePlaylistId);
    onStartViewer();
  }

  const chunkCount = activePlaylist?.chunks.length ?? 0;

  return (
    <div className="flex h-dvh">
      {/* サイドバー: プレイリスト一覧 */}
      <aside className="flex w-64 shrink-0 flex-col border-r border-zinc-800 bg-zinc-950">
        <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
          <h2 className="text-sm font-semibold text-zinc-200 text-balance">
            プレイリスト
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsCreating(true)}
            aria-label="新規プレイリスト作成"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 16 16"
              fill="currentColor"
            >
              <path d="M8 2a1 1 0 011 1v4h4a1 1 0 110 2H9v4a1 1 0 11-2 0V9H3a1 1 0 010-2h4V3a1 1 0 011-1z" />
            </svg>
          </Button>
        </div>

        {/* 新規作成フォーム */}
        {isCreating && (
          <form onSubmit={handleCreatePlaylist} className="border-b border-zinc-800 p-3">
            <Input
              value={newPlaylistName}
              onChange={(e) => setNewPlaylistName(e.target.value)}
              placeholder="プレイリスト名"
              autoFocus
            />
            <div className="mt-2 flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setIsCreating(false);
                  setNewPlaylistName("");
                }}
              >
                中止
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={!newPlaylistName.trim()}
              >
                作成
              </Button>
            </div>
          </form>
        )}

        {/* プレイリスト一覧 */}
        <nav className="flex-1 overflow-y-auto p-2">
          {playlists.length === 0 && !isCreating && (
            <p className="px-2 py-8 text-center text-xs text-zinc-600 text-pretty">
              プレイリストを作成しましょう
            </p>
          )}
          {playlists.map((pl) => (
            <div key={pl.id}>
              {renamingId === pl.id ? (
                <form onSubmit={handleRename} className="p-1">
                  <Input
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    autoFocus
                    onBlur={handleRename}
                  />
                </form>
              ) : (
                <button
                  onClick={() => setActivePlaylist(pl.id)}
                  onDoubleClick={() => handleStartRename(pl.id, pl.name)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setActivePlaylist(pl.id);
                    setContextMenu({ x: e.clientX, y: e.clientY, id: pl.id });
                  }}
                  className={cn(
                    "flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm",
                    activePlaylistId === pl.id
                      ? "bg-blue-600/20 text-blue-300"
                      : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                  )}
                >
                  <span className="truncate">{pl.name}</span>
                  <span className="shrink-0 tabular-nums text-xs text-zinc-600">
                    {pl.chunks.length}
                  </span>
                </button>
              )}
            </div>
          ))}
        </nav>
      </aside>

      {/* メインコンテンツ: チャンク管理 */}
      <main className="flex flex-1 flex-col overflow-hidden bg-zinc-900">
        {activePlaylist ? (
          <>
            {/* ヘッダー */}
            <header className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
              <div>
                <h1 className="text-lg font-semibold text-zinc-100 text-balance">
                  {activePlaylist.name}
                </h1>
                <p className="mt-0.5 text-xs text-zinc-500">
                  <span className="tabular-nums">{chunkCount}</span> チャンク
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="primary"
                  size="md"
                  onClick={handleStartViewer}
                  disabled={chunkCount === 0}
                >
                  ビューアで開く
                </Button>
              </div>
            </header>

            {/* チャンクリスト */}
            <div className="flex-1 overflow-y-auto p-6">
              <SortableChunkList
                chunks={activePlaylist.chunks}
                onReorder={(from, to) =>
                  reorderChunks(activePlaylist.id, from, to)
                }
                onUpdate={(chunkId, updates) =>
                  updateChunk(activePlaylist.id, chunkId, updates)
                }
                onRemove={(chunkId) => removeChunk(activePlaylist.id, chunkId)}
              />
              <div className="mt-4">
                <ChunkForm
                  onAdd={(start, end, name) => addChunk(activePlaylist.id, start, end, name)}
                />
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center text-center">
            <svg
              width="64"
              height="64"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1"
              className="mb-6 text-zinc-700"
            >
              <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
            </svg>
            <p className="text-sm text-zinc-500 text-pretty">
              左のサイドバーからプレイリストを選択、
              <br />
              または新規作成してください。
            </p>
          </div>
        )}
      </main>

      {/* 右クリックコンテキストメニュー */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          items={[
            {
              label: "名前変更",
              onClick: () => {
                const pl = playlists.find((p) => p.id === contextMenu.id);
                if (pl) handleStartRename(pl.id, pl.name);
              },
            },
            { separator: true },
            {
              label: "削除",
              danger: true,
              onClick: () => setDeleteTarget(contextMenu.id),
            },
          ]}
        />
      )}

      {/* 削除確認ダイアログ */}
      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="プレイリストを削除"
        description="このプレイリストとすべてのチャンクが削除されます。この操作は元に戻せません。"
        confirmLabel="削除する"
        onConfirm={() => {
          if (deleteTarget) {
            deletePlaylist(deleteTarget);
            setDeleteTarget(null);
          }
        }}
      />
    </div>
  );
}
