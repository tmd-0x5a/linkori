"use client";

import { useState, useEffect } from "react";
import { readImageAsDataUrl } from "@/lib/tauri";
import { FileBrowserDialog } from "@/components/playlist/FileBrowserDialog";

const IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "gif", "webp", "bmp", "tiff", "tif"];

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
  return IMAGE_EXTENSIONS.includes(getExt(path));
}

export interface ImageFilePickerProps {
  label: string;
  value: string;
  onChange: (path: string) => void;
  placeholder?: string;
  disabled?: boolean;
  /** ブラウザを開いたとき最初に表示するパス（省略時は前回の場所） */
  initialBrowsePath?: string;
}

export function ImageFilePicker({ label, value, onChange, placeholder, disabled, initialBrowsePath }: ImageFilePickerProps) {
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [browserOpen, setBrowserOpen] = useState(false);

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
      <label className="text-xs font-medium text-zinc-400">{label}</label>

      <div className="flex gap-2">
        {/* サムネイル */}
        {thumbnailUrl && !disabled && (
          <div className="shrink-0 h-9 w-9 overflow-hidden rounded border border-zinc-700 bg-zinc-900">
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
            className="h-9 w-full rounded border border-zinc-700 bg-zinc-800 px-3 text-sm text-zinc-100 placeholder-zinc-600 focus:border-blue-500 focus:outline-none transition-colors disabled:cursor-not-allowed disabled:opacity-40"
          />
          {hasValue && formatLabel && !disabled && (
            <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 rounded bg-blue-500/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-blue-400">
              {formatLabel}
            </span>
          )}
        </div>

        {/* 参照ボタン */}
        <button
          type="button"
          onClick={() => setBrowserOpen(true)}
          disabled={disabled}
          title="ファイル・フォルダを選択"
          className="flex shrink-0 items-center justify-center h-9 w-9 rounded border border-zinc-700 bg-zinc-800 text-zinc-400 transition-colors hover:border-zinc-500 hover:bg-zinc-700 hover:text-zinc-200 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <BrowseIcon />
        </button>
      </div>

      {/* ファイル名補助表示 */}
      {hasValue && !disabled && filename && filename !== value && (
        <p className="truncate text-[11px] text-zinc-500" title={value}>
          {filename}
        </p>
      )}

      {/* ファイルブラウザ */}
      <FileBrowserDialog
        isOpen={browserOpen}
        onClose={() => setBrowserOpen(false)}
        onSelect={(path) => {
          onChange(path);
          setBrowserOpen(false);
        }}
        initialPath={initialBrowsePath}
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
