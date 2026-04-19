"use client";

import { memo } from "react";
import { cn } from "@/lib/cn";
import { useFileThumbnail } from "@/hooks/useFileThumbnail";
import type { FileEntry } from "@/types";
import { PdfIcon } from "./FileBrowserIcons";

interface FileGridCardProps {
  entry: FileEntry;
  /** (entry) => void 形式で親の useCallback と合わせて memo を効かせる */
  onNavigateEntry: (entry: FileEntry) => void;
  onSelectEntry: (entry: FileEntry) => void;
}

// グリッド表示カード。親の onNavigateEntry/onSelectEntry が安定参照で渡る想定で memo 化。
function FileGridCardInner({ entry, onNavigateEntry, onSelectEntry }: FileGridCardProps) {
  const isNavigable = entry.is_dir || entry.is_zip;
  const imgSrc = useFileThumbnail(entry.path, entry.is_image);

  return (
    <div
      className={cn(
        "group flex cursor-pointer flex-col items-center gap-1.5 rounded-xl border border-[var(--oat-border)] bg-[var(--panel-bg)] p-2 transition-colors hover:border-[#2f8fd1] hover:bg-[var(--oat-light)]",
        entry.is_hidden && "opacity-50"
      )}
      onClick={isNavigable ? () => onNavigateEntry(entry) : () => onSelectEntry(entry)}
      title={entry.path}
    >
      <div className="flex h-24 w-full items-center justify-center overflow-hidden rounded bg-[var(--cream)]">
        {imgSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imgSrc} alt={entry.name} className="h-full w-full object-contain" />
        ) : entry.is_dir ? (
          <svg className="text-amber-500" width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
            <path d="M10.59 4.59A2 2 0 0 0 9.17 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-8l-1.41-1.41z" />
          </svg>
        ) : entry.is_zip ? (
          <svg className="text-[#4dc8d9]" width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
            <polyline points="14 2 14 8 20 8" />
            <rect x="10" y="9" width="4" height="3" rx="0.5" />
            <line x1="12" y1="13" x2="12" y2="18" />
          </svg>
        ) : entry.is_pdf ? (
          <PdfIcon size={42} />
        ) : (
          <svg className="text-[#2f8fd1]" width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
        )}
      </div>
      <span className="w-full truncate text-center text-[11px] leading-tight text-[var(--warm-silver)] group-hover:text-[var(--panel-text)]">
        {entry.name}
      </span>
    </div>
  );
}

export const FileGridCard = memo(FileGridCardInner);
