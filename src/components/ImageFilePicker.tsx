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
      <label className="label-clay text-[#55534e]">{label}</label>

      <div className="flex gap-2">
        {/* サムネイル */}
        {thumbnailUrl && !disabled && (
          <div className="shrink-0 h-9 w-9 overflow-hidden rounded-lg border border-[#dad4c8] bg-[#faf9f7]">
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
            className="h-9 w-full rounded-[4px] border border-[#717989] bg-white px-3 text-sm text-black placeholder:text-[#9f9b93] focus:outline-[rgb(20,110,245)_solid_2px] transition-colors disabled:cursor-not-allowed disabled:opacity-40"
          />
          {hasValue && formatLabel && !disabled && (
            <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-[#84e7a5] px-1.5 py-0.5 text-[9.6px] font-semibold uppercase tracking-wide text-[#02492a]">
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
          className="btn-clay flex shrink-0 items-center justify-center h-9 w-9 rounded-lg border border-[#dad4c8] bg-white text-[#9f9b93] hover:border-[#078a52] hover:bg-[#84e7a5] hover:text-[#02492a] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <BrowseIcon />
        </button>
      </div>

      {/* ファイル名補助表示 */}
      {hasValue && !disabled && filename && filename !== value && (
        <p className="truncate text-[11px] text-[#9f9b93]" title={value}>
          {filename}
        </p>
      )}

      <FileBrowserDialog
        isOpen={browserOpen}
        onClose={() => setBrowserOpen(false)}
        onSelect={(path) => { onChange(path); setBrowserOpen(false); }}
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
