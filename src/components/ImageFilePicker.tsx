"use client";

import { useState, useEffect, useRef, useId } from "react";
import { readImageAsDataUrl } from "@/lib/tauri";
import { FileBrowserDialog } from "@/components/playlist/FileBrowserDialog";
import { useT } from "@/hooks/useT";
import { initDragDropListener, registerDropZone, unregisterDropZone } from "@/lib/dragDrop";
import { IMAGE_EXTENSIONS } from "@/lib/constants";

const FORMAT_LABEL: Record<string, string> = {
  jpg: "JPEG", jpeg: "JPEG", png: "PNG", gif: "GIF",
  webp: "WebP", bmp: "BMP", tiff: "TIFF", tif: "TIFF",
};

function getExt(path: string): string {
  return path.replace(/\\/g, "/").split(".").pop()?.toLowerCase() ?? "";
}

function getFilename(path: string): string {
  return path.replace(/\\/g, "/").split("/").pop() ?? path;
}

function isImage(path: string): boolean {
  return (IMAGE_EXTENSIONS as readonly string[]).includes(getExt(path));
}

export interface ImageFilePickerProps {
  label: string;
  value: string;
  onChange: (path: string) => void;
  placeholder?: string;
  disabled?: boolean;
  initialBrowsePath?: string;
  /** このパス内のみ選択を許可する（終了パス選択時など） */
  restrictToDir?: string;
}

export function ImageFilePicker({ label, value, onChange, placeholder, disabled, initialBrowsePath, restrictToDir }: ImageFilePickerProps) {
  const t = useT();
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [browserOpen, setBrowserOpen] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const onChangeRef = useRef(onChange);
  const id = useId();

  // onChange の最新参照を常に保持
  useEffect(() => { onChangeRef.current = onChange; });

  // Tauri ドラッグ&ドロップリスナーを初期化（アプリ全体で一度だけ）
  useEffect(() => {
    initDragDropListener();
  }, []);

  // ドロップゾーンの登録・解除
  useEffect(() => {
    if (disabled) return;
    registerDropZone({
      id,
      getRect: () => containerRef.current?.getBoundingClientRect() ?? null,
      onDrop: (paths) => {
        setIsDragOver(false);
        onChangeRef.current(paths[0]);
      },
      setActive: (active) => setIsDragOver(active),
    });
    return () => unregisterDropZone(id);
  }, [id, disabled]);

  useEffect(() => {
    setThumbnailUrl(null);
    if (!value.trim() || !isImage(value)) return;
    readImageAsDataUrl(value)
      .then((url) => setThumbnailUrl(url))
      .catch(() => setThumbnailUrl(null));
  }, [value]);

  const ext = value ? getExt(value) : "";
  const formatLabel = ext ? FORMAT_LABEL[ext] : null;
  const filename = value ? getFilename(value) : null;
  const hasValue = value.trim().length > 0;

  return (
    <div className="flex flex-col gap-1.5">
      <label className="label-clay text-[var(--warm-charcoal)]">{label}</label>

      {/* ドロップゾーン全体 */}
      <div
        ref={containerRef}
        className={`relative flex gap-2 rounded-lg transition-all duration-150 ${
          isDragOver
            ? "outline outline-2 outline-[#2f8fd1] bg-[#e6f4fd] shadow-[0_0_0_4px_rgba(47,143,209,0.18)]"
            : ""
        }`}
      >
        {/* ドラッグオーバー時のオーバーレイ */}
        {isDragOver && (
          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-lg">
            <span className="rounded-full bg-[#2f8fd1] px-3 py-1 text-xs font-semibold text-white shadow-md">
              {t.dropHere}
            </span>
          </div>
        )}

        {/* サムネイル */}
        {thumbnailUrl && !disabled && !isDragOver && (
          <div className="shrink-0 h-9 w-9 overflow-hidden rounded-lg border border-[var(--oat-border)] bg-[var(--cream)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={thumbnailUrl} alt={filename ?? ""} className="h-full w-full object-contain" />
          </div>
        )}

        {/* パス入力 */}
        <div className="relative flex-1 min-w-0">
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            disabled={disabled}
            className="h-9 w-full rounded-[4px] border border-[#717989] bg-[var(--panel-bg)] px-3 text-sm text-[var(--panel-text)] placeholder:text-[var(--warm-silver)] focus:outline-[rgb(20,110,245)_solid_2px] transition-colors disabled:cursor-not-allowed disabled:opacity-40"
          />
          {hasValue && formatLabel && !disabled && (
            <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-[#9fd8e8] px-1.5 py-0.5 text-[9.6px] font-semibold uppercase tracking-wide text-[#0f1d4a]">
              {formatLabel}
            </span>
          )}
        </div>

        {/* 参照ボタン */}
        <button
          type="button"
          onClick={() => setBrowserOpen(true)}
          disabled={disabled}
          title={t.browseTitle}
          className="btn-clay flex shrink-0 items-center justify-center h-9 w-9 rounded-lg border border-[var(--oat-border)] bg-[var(--panel-bg)] text-[var(--warm-silver)] hover:border-[#2f8fd1] hover:bg-[#9fd8e8] hover:text-[#0f1d4a] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <BrowseIcon />
        </button>
      </div>

      {/* ファイル名補助表示 */}
      {hasValue && !disabled && filename && filename !== value && (
        <p className="truncate text-[11px] text-[var(--warm-silver)]" title={value}>
          {filename}
        </p>
      )}

      <FileBrowserDialog
        isOpen={browserOpen}
        onClose={() => setBrowserOpen(false)}
        onSelect={(path) => { onChange(path); setBrowserOpen(false); }}
        initialPath={initialBrowsePath}
        restrictToDir={restrictToDir}
      />
    </div>
  );
}

function BrowseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z" />
    </svg>
  );
}
