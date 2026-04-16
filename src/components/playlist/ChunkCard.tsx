"use client";

import { useState, useEffect, useRef } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Chunk } from "@/types";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ContextMenu } from "@/components/ui/ContextMenu";
import { ImageFilePicker } from "@/components/ImageFilePicker";
import { useT } from "@/hooks/useT";
import { resolveChunkImages, readImageThumbnail, validateChunk as validateChunkTauri, listSplitCandidates } from "@/lib/tauri";
import { getPdfPageCount, makePdfPagePath, isPdfPagePath, renderPdfThumbnail } from "@/lib/pdf";

const IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "gif", "webp", "bmp", "tiff", "tif"];

function isPdfFile(path: string): boolean {
  return path.trim().toLowerCase().endsWith(".pdf");
}

function getParentPath(path: string): string | undefined {
  if (!path.trim()) return undefined;
  const normalized = path.replace(/\\/g, "/").replace(/\/+$/, "");
  const lastSlash = normalized.lastIndexOf("/");
  if (lastSlash <= 0) return undefined;
  return normalized.slice(0, lastSlash);
}

/** 終了パス選択を制限するディレクトリを開始パスから算出する */
function getRestrictDir(startPath: string): string | undefined {
  if (!startPath.trim()) return undefined;
  const norm = startPath.replace(/\\/g, "/");
  const lower = norm.toLowerCase();
  for (const ext of [".zip/", ".cbz/"]) {
    const idx = lower.indexOf(ext);
    if (idx !== -1) return norm.slice(0, idx + ext.length - 1);
  }
  return getParentPath(norm);
}

function isDirectoryLike(path: string): boolean {
  if (!path.trim()) return false;
  // PDF はページ数が可変なのでディレクトリ扱い（終了パス不要）
  if (isPdfFile(path)) return true;
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
  /** フォルダ型チャンクのサブフォルダ分割 */
  onSplit?: (chunkId: string) => void;
  /** このチャンクが分割操作で生成されたものなら呼び出せる */
  onUndoSplit?: () => void;
  /** 選択状態 */
  selected?: boolean;
  /** 選択中チャンク数（右クリックメニューの一括削除に使用） */
  selectedCount?: number;
  /** 選択中チャンクを一括削除するコールバック */
  onBatchDeleteSelected?: () => void;
  /** 複数選択ドラッグ中（自分は動いていないが選択グループの一員） */
  isDraggingGroup?: boolean;
  /** クリック選択（背景クリック） */
  onCardClick?: (chunkId: string, index: number, e: React.MouseEvent) => void;
  /** ドラッグ選択開始 */
  onCardMouseDown?: (index: number, e: React.MouseEvent) => void;
  /** ドラッグ選択中の通過 */
  onCardMouseEnter?: (index: number) => void;
}

export function ChunkCard({ chunk, index, onUpdate, onRemove, onSplit, onUndoSplit, selected, selectedCount, onBatchDeleteSelected, isDraggingGroup, onCardClick, onCardMouseDown, onCardMouseEnter }: ChunkCardProps) {
  const t = useT();
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(chunk.name ?? "");
  const [editStart, setEditStart] = useState(chunk.startPath);
  const [editEnd, setEditEnd] = useState(chunk.endPath);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  // 「サブフォルダで分割」の有効状態: idle=未確認, checking=確認中, ok=可能, none=不可
  const [splitState, setSplitState] = useState<"idle" | "checking" | "ok" | "none">("idle");

  // 画像枚数バッジ（バックグラウンドで検証）
  const [imageCount, setImageCount] = useState<number | null>(null);
  const [countInvalid, setCountInvalid] = useState(false);
  useEffect(() => {
    if (!chunk.startPath) { setImageCount(null); setCountInvalid(false); return; }
    let cancelled = false;
    // 500ms デバウンス（編集中の高速変化を避ける）
    const timer = setTimeout(async () => {
      try {
        if (isPdfFile(chunk.startPath)) {
          // PDF は pdf.js でページ数を取得
          const count = await getPdfPageCount(chunk.startPath);
          if (!cancelled) { setImageCount(count); setCountInvalid(false); }
        } else {
          const result = await validateChunkTauri(chunk.startPath, chunk.endPath);
          if (cancelled) return;
          if (result.is_valid) { setImageCount(result.image_count); setCountInvalid(false); }
          else { setImageCount(null); setCountInvalid(true); }
        }
      } catch {
        if (!cancelled) { setImageCount(null); setCountInvalid(true); }
      }
    }, 500);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [chunk.startPath, chunk.endPath]);

  // プレビュー
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewPaths, setPreviewPaths] = useState<string[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  async function openPreview() {
    setPreviewOpen(true);
    setPreviewLoading(true);
    setPreviewError(null);
    setPreviewPaths([]);
    try {
      let paths: string[];
      if (isPdfFile(chunk.startPath)) {
        // PDF: pdf.js でページ数を取得して仮想パスに展開
        const count = await getPdfPageCount(chunk.startPath);
        paths = Array.from({ length: count }, (_, i) => makePdfPagePath(chunk.startPath, i + 1));
      } else {
        paths = await resolveChunkImages(chunk.startPath, chunk.endPath);
      }
      setPreviewPaths(paths);
    } catch (e) {
      setPreviewError(String(e));
    } finally {
      setPreviewLoading(false);
    }
  }

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
  const isDir = isDirectoryLike(chunk.startPath) && !isPdfFile(chunk.startPath);

  /** コンテキストメニューを開き、フォルダなら分割可能か非同期チェック */
  function handleContextMenu(e: React.MouseEvent) {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
    if (onSplit && isDir && splitState === "idle") {
      setSplitState("checking");
      listSplitCandidates(chunk.startPath)
        .then((c) => setSplitState(c.length > 0 ? "ok" : "none"))
        .catch(() => setSplitState("none"));
    }
  }

  /** Delete キーでチャンク削除確認ダイアログを開く */
  function handleKeyDown(e: React.KeyboardEvent) {
    if (isEditing) return;
    if (e.key === "Delete" || e.key === "Backspace") {
      e.preventDefault();
      setShowDeleteDialog(true);
    }
  }

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        tabIndex={0}
        className={cn(
          "relative rounded-2xl border p-4 outline-none transition-colors",
          "shadow-[rgba(0,0,0,0.1)_0px_1px_1px,rgba(0,0,0,0.04)_0px_-1px_1px_inset,rgba(0,0,0,0.05)_0px_-0.5px_1px]",
          "focus-visible:ring-2 focus-visible:ring-[#078a52]/50",
          selected
            ? "border-[#078a52] bg-[#e8faf1]"
            : "border-[#dad4c8] bg-white",
          // ドラッグ中は本体を非表示（DragOverlay が視覚を担う）
          isDragging && "opacity-0",
          // グループドラッグ中の選択済みチャンクも非表示
          isDraggingGroup && "opacity-0"
        )}
        onContextMenu={handleContextMenu}
        onKeyDown={handleKeyDown}
        onClick={(e) => {
          if ((e.target as HTMLElement).closest("button, input, textarea")) return;
          onCardClick?.(chunk.id, index, e);
        }}
        onMouseDown={(e) => {
          if ((e.target as HTMLElement).closest("button, input, textarea")) return;
          onCardMouseDown?.(index, e);
        }}
        onMouseEnter={() => onCardMouseEnter?.(index)}
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
            "flex-1 truncate",
            chunk.name?.trim()
              ? "heading-clay text-base text-black"
              : "tabular-nums text-sm text-[#9f9b93]"
          )}>
            {displayName}
          </span>

          {/* プレビューボタン（表示モード時のみ） */}
          {!isEditing && chunk.startPath && (
            <button
              type="button"
              onClick={openPreview}
              title={t.previewChunk}
              className="flex size-7 shrink-0 items-center justify-center rounded-lg text-[#9f9b93] hover:bg-[#eee9df] hover:text-[#078a52] transition-colors"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </button>
          )}
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
              initialBrowsePath={editStart.trim() ? (isDirectoryLike(editStart) ? editStart : getParentPath(editStart)) : undefined}
            />
            <ImageFilePicker
              label={editStartIsDir ? t.endPathDir : t.endPathFile}
              value={editStartIsDir ? "" : editEnd}
              onChange={setEditEnd}
              placeholder={editStartIsDir ? t.endPathDirPlaceholder : t.endPathFilePlaceholder}
              disabled={editStartIsDir}
              initialBrowsePath={getParentPath(editStart)}
              restrictToDir={editStart.trim() && !editStartIsDir ? getRestrictDir(editStart) : undefined}
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
            {/* 画像枚数バッジ */}
            <div className="flex items-center gap-1.5 pt-0.5">
              {imageCount !== null ? (
                <span className="inline-flex items-center rounded-full bg-[#84e7a5] px-2 py-0.5 text-[10px] font-semibold text-[#02492a]">
                  {t.chunkImageCount(imageCount)}
                </span>
              ) : countInvalid ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-[#fc7981]/20 px-2 py-0.5 text-[10px] font-semibold text-[#e05560]">
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                  </svg>
                  NG
                </span>
              ) : chunk.startPath ? (
                <span className="text-[10px] text-[#dad4c8]">…</span>
              ) : null}
            </div>
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
            // アンドゥ（このチャンクが分割結果のとき）
            ...(onUndoSplit
              ? [{ separator: true as true }, { label: t.undoSplit, onClick: () => { onUndoSplit(); setContextMenu(null); } }]
              : []
            ),
            // サブフォルダ分割（フォルダ型かつ未チェック/確認中/可能な場合）
            ...(onSplit && isDir && splitState !== "none"
              ? [
                  { separator: true as true },
                  {
                    label: splitState === "checking" ? `${t.splitChunk}…` : t.splitChunk,
                    disabled: splitState !== "ok",
                    onClick: () => { onSplit(chunk.id); setContextMenu(null); },
                  },
                ]
              : []
            ),
            { separator: true },
            // 複数選択中 → 一括削除のみ表示。単体選択/未選択 → 単体削除を表示
            ...(selectedCount && selectedCount > 1
              ? [
                  {
                    label: `選択中の ${selectedCount} 件を削除`,
                    danger: true,
                    onClick: () => { onBatchDeleteSelected?.(); setContextMenu(null); },
                  },
                ]
              : [
                  { label: t.delete, danger: true, onClick: () => setShowDeleteDialog(true) },
                ]
            ),
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

      {/* ── プレビューモーダル ── */}
      {previewOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) setPreviewOpen(false); }}
        >
          <div className="flex h-[85vh] w-[90vw] max-w-4xl flex-col rounded-2xl border border-[#dad4c8] bg-white shadow-[rgba(0,0,0,0.15)_0px_8px_32px] overflow-hidden">
            {/* ヘッダー */}
            <div className="flex shrink-0 items-center justify-between border-b border-[#dad4c8] bg-[#faf9f7] px-4 py-3">
              <div>
                <p className="heading-clay text-base text-black">{t.previewChunk}</p>
                {!previewLoading && previewPaths.length > 0 && (
                  <p className="text-xs text-[#9f9b93]">{t.imagesCount(previewPaths.length)}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setPreviewOpen(false)}
                className="flex h-7 w-7 items-center justify-center rounded text-[#9f9b93] hover:bg-[#eee9df] hover:text-black transition-colors"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* コンテンツ */}
            <div className="flex-1 overflow-y-auto p-4">
              {previewLoading && (
                <div className="flex h-40 items-center justify-center gap-3">
                  <div className="size-5 rounded-full border-2 border-[#dad4c8] border-t-[#078a52]" style={{ animation: "spin 0.8s linear infinite" }} />
                  <p className="text-sm text-[#9f9b93]">{t.loading}</p>
                </div>
              )}
              {!previewLoading && previewError && (
                <div className="rounded-xl border border-[#fc7981]/30 bg-[#fc7981]/10 p-3 text-sm text-[#e05560]">
                  {previewError}
                </div>
              )}
              {!previewLoading && !previewError && previewPaths.length > 0 && (
                <div className="grid grid-cols-[repeat(auto-fill,minmax(100px,1fr))] gap-2">
                  {previewPaths.map((path, i) => (
                    <ThumbItem key={path} path={path} index={i} />
                  ))}
                </div>
              )}
            </div>

            {/* フッター */}
            <div className="flex shrink-0 justify-end border-t border-[#dad4c8] bg-[#faf9f7] px-4 py-2.5">
              <Button variant="ghost" size="sm" onClick={() => setPreviewOpen(false)}>
                {t.previewClose}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// ThumbItem: IntersectionObserver で遅延読み込みするサムネイル
// ---------------------------------------------------------------------------

function ThumbItem({ path, index }: { path: string; index: number }) {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          observer.disconnect();
          if (isPdfPagePath(path)) {
            // PDF ページは pdf.js でサムネイルを生成（パスをパースして pdfPath + pageNum に分解）
            const hashIdx = path.lastIndexOf("#");
            const pdfPath = path.slice("pdf:".length, hashIdx);
            const pageNum = parseInt(path.slice(hashIdx + 1), 10) || 1;
            renderPdfThumbnail(pdfPath, pageNum, 200)
              .then(setUrl)
              .catch(() => setFailed(true));
          } else {
            readImageThumbnail(path, 200)
              .then(setUrl)
              .catch(() => setFailed(true));
          }
        }
      },
      { rootMargin: "120px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [path]);

  // PDF 仮想パス（pdf:D:/book.pdf#3）の場合はページ番号をファイル名として表示
  const filename = isPdfPagePath(path)
    ? `p.${path.split("#").pop()}`
    : path.replace(/\\/g, "/").split("/").pop() ?? "";

  return (
    <div ref={ref} className="flex flex-col gap-1">
      <div className="aspect-[3/4] overflow-hidden rounded-lg border border-[#dad4c8] bg-[#faf9f7]">
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={filename} className="h-full w-full object-contain" />
        ) : failed ? (
          <div className="flex h-full items-center justify-center text-xs text-[#fc7981]">!</div>
        ) : (
          <div className="flex h-full items-center justify-center text-[10px] text-[#9f9b93]">
            {index + 1}
          </div>
        )}
      </div>
      <p className="truncate text-center text-[9px] text-[#9f9b93]" title={filename}>
        {filename}
      </p>
    </div>
  );
}
