"use client";

import { memo } from "react";
import { cn } from "@/lib/cn";
import { useT } from "@/hooks/useT";
import { useFileThumbnail } from "@/hooks/useFileThumbnail";
import type { FileEntry } from "@/types";
import { PdfIcon } from "./FileBrowserIcons";

interface FileRowProps {
  entry: FileEntry;
  modifiedLabel: string;
  /** (entry) => void 形式で親の useCallback と合わせて memo を効かせる */
  onNavigateEntry: (entry: FileEntry) => void;
  onSelectEntry: (entry: FileEntry) => void;
}

// エクスプローラー風の行。親の onNavigateEntry/onSelectEntry が安定参照で渡る想定で memo 化。
function FileRowInner({ entry, modifiedLabel, onNavigateEntry, onSelectEntry }: FileRowProps) {
  const t = useT();
  const isNavigable = entry.is_dir || entry.is_zip;
  const imgSrc = useFileThumbnail(entry.path, entry.is_image);

  const typeLabel = entry.is_dir
    ? t.folderType
    : entry.is_zip
    ? t.zipType
    : entry.is_pdf
    ? "PDF"
    : entry.is_image
    ? (entry.name.split(".").pop()?.toUpperCase() ?? t.imageType)
    : "";

  return (
    <div
      className={cn(
        "group flex cursor-pointer items-center gap-3 border-b border-[var(--oat-light)] px-3 py-1.5 transition-colors hover:bg-[var(--oat-light)]",
        entry.is_hidden && "opacity-50"
      )}
      onClick={isNavigable ? () => onNavigateEntry(entry) : () => onSelectEntry(entry)}
      title={entry.path}
    >
      {/* アイコン or サムネイル */}
      <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded">
        {imgSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imgSrc} alt={entry.name} className="h-full w-full object-contain" />
        ) : entry.is_dir ? (
          <svg className="text-amber-500" width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
            <path d="M10.59 4.59A2 2 0 0 0 9.17 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-8l-1.41-1.41z" />
          </svg>
        ) : entry.is_zip ? (
          <svg className="text-[#4dc8d9]" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
            <polyline points="14 2 14 8 20 8" />
            <rect x="10" y="9" width="4" height="3" rx="0.5" />
            <line x1="12" y1="13" x2="12" y2="18" />
          </svg>
        ) : entry.is_pdf ? (
          <PdfIcon size={20} />
        ) : (
          <svg className="text-[#2f8fd1]" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
        )}
      </div>

      {/* ファイル名 */}
      <span className="flex-1 truncate text-sm text-[var(--panel-text)] group-hover:text-[var(--panel-text)]">
        {entry.name}
      </span>

      {/* 更新日時 */}
      <span className="w-36 shrink-0 text-right text-xs text-[var(--warm-silver)]">
        {modifiedLabel}
      </span>

      {/* 種類 */}
      <span className="w-20 shrink-0 text-right text-xs text-[var(--warm-silver)]">
        {typeLabel}
      </span>
    </div>
  );
}

export const FileRow = memo(FileRowInner);
