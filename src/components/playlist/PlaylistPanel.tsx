"use client";

import { useState, useEffect } from "react";
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
    reorderChunks,
  } = usePlaylistStore();

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

  async function handleStartViewer() {
    if (!activePlaylistId) return;
    await loadImagesForPlaylist(activePlaylistId);
    onStartViewer();
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

        {/* プレイリスト一覧 */}
        <nav className="flex-1 overflow-y-auto p-2">
          {playlists.length === 0 && !isCreating && (
            <p className="px-2 py-8 text-center text-xs text-[#84e7a5]/60 text-pretty">
              {t.noPlaylists}
            </p>
          )}
          {playlists.map((pl) => (
            <div key={pl.id}>
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
                <button
                  onClick={() => setActivePlaylist(pl.id)}
                  onDoubleClick={() => handleStartRename(pl.id, pl.name)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setActivePlaylist(pl.id);
                    setContextMenu({ x: e.clientX, y: e.clientY, id: pl.id });
                  }}
                  className={cn(
                    "flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition-colors",
                    activePlaylistId === pl.id
                      ? "bg-[#078a52] text-[#84e7a5]"
                      : "text-[#84e7a5]/70 hover:bg-[#078a52]/50 hover:text-white"
                  )}
                >
                  <span className="truncate font-medium">{pl.name}</span>
                  <span className="shrink-0 tabular-nums text-xs opacity-60">
                    {pl.chunks.length}
                  </span>
                </button>
              )}
            </div>
          ))}
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
              <Button
                variant="primary"
                size="md"
                onClick={handleStartViewer}
                disabled={chunkCount === 0}
              >
                {t.openInViewer}
              </Button>
            </header>

            <div className="flex-1 overflow-y-auto p-6">
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
                  {activePlaylist.chunks.length > 0 && (
                    <SortableChunkList
                      chunks={activePlaylist.chunks}
                      onReorder={(from, to) => reorderChunks(activePlaylist.id, from, to)}
                      onUpdate={(chunkId, updates) => updateChunk(activePlaylist.id, chunkId, updates)}
                      onRemove={(chunkId) => removeChunk(activePlaylist.id, chunkId)}
                    />
                  )}
                  <div className={activePlaylist.chunks.length > 0 ? "mt-4" : ""}>
                    <ChunkForm
                      addTrigger={addTrigger + (showEmptyForm ? 1 : 0)}
                      onAdd={(start, end, name) => {
                        addChunk(activePlaylist.id, start, end, name);
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
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          items={[
            {
              label: t.rename,
              onClick: () => {
                const pl = playlists.find((p) => p.id === contextMenu.id);
                if (pl) handleStartRename(pl.id, pl.name);
              },
            },
            { separator: true },
            {
              label: t.delete,
              danger: true,
              onClick: () => setDeleteTarget(contextMenu.id),
            },
          ]}
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
    </div>
  );
}
