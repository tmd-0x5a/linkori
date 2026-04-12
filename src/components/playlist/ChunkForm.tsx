"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { ImageFilePicker } from "@/components/ImageFilePicker";
import { useT } from "@/hooks/useT";

interface ChunkFormProps {
  onAdd: (startPath: string, endPath: string, name?: string) => void;
  /** 増加するたびにフォームを開く（カウンター方式） */
  addTrigger?: number;
  /** キャンセル時に親へ通知（省略可） */
  onCancel?: () => void;
  /** 前のチャンクのパスを参照してエクスプローラーの初期位置を決める */
  initialBrowsePath?: string;
}

const IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "gif", "webp", "bmp", "tiff", "tif"];

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
  const normalized = path.replace(/\\/g, "/").replace(/\/+$/, "");
  const lastSegment = normalized.split("/").pop() ?? "";
  const dotIdx = lastSegment.lastIndexOf(".");
  if (dotIdx < 0) return true;
  const ext = lastSegment.slice(dotIdx + 1).toLowerCase();
  return !IMAGE_EXTENSIONS.includes(ext);
}

export function ChunkForm({ onAdd, addTrigger, onCancel, initialBrowsePath }: ChunkFormProps) {
  const t = useT();
  const [name, setName] = useState("");
  const [startPath, setStartPath] = useState("");
  const [endPath, setEndPath] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (addTrigger && addTrigger > 0) {
      setIsOpen(true);
    }
  }, [addTrigger]);

  const startIsDir = isDirectoryLike(startPath);

  // 開始パスのエクスプローラー初期位置：
  // - startPath 入力済み → その親ディレクトリ
  // - 未入力 + initialBrowsePath あり → 前のチャンクのパスから推定
  const startInitialPath = startPath.trim()
    ? (isDirectoryLike(startPath) ? startPath : getParentPath(startPath))
    : initialBrowsePath
    ? (isDirectoryLike(initialBrowsePath) ? initialBrowsePath : getParentPath(initialBrowsePath))
    : undefined;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!startPath.trim()) return;
    onAdd(startPath.trim(), startIsDir ? "" : endPath.trim(), name.trim() || undefined);
    setName("");
    setStartPath("");
    setEndPath("");
    setIsOpen(false);
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-[#dad4c8] bg-transparent px-4 py-2 text-sm font-medium text-[#9f9b93] transition-colors hover:border-[#078a52] hover:bg-white hover:text-[#078a52]"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d="M8 2a1 1 0 011 1v4h4a1 1 0 110 2H9v4a1 1 0 11-2 0V9H3a1 1 0 010-2h4V3a1 1 0 011-1z" />
        </svg>
        {t.addChunk}
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-[#dad4c8] bg-white p-5 space-y-4 shadow-[rgba(0,0,0,0.1)_0px_1px_1px,rgba(0,0,0,0.04)_0px_-1px_1px_inset,rgba(0,0,0,0.05)_0px_-0.5px_1px]"
    >
      <p className="heading-clay text-lg text-black">{t.addNewChunk}</p>

      <div className="flex flex-col gap-1.5">
        <label className="label-clay text-[#55534e]">{t.chunkNameLabel}</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t.chunkNamePlaceholder}
          className="h-9 w-full rounded-[4px] border border-[#717989] bg-white px-3 text-sm text-black placeholder:text-[#9f9b93] focus:outline-[rgb(20,110,245)_solid_2px] transition-colors"
        />
      </div>

      <ImageFilePicker
        label={t.startPath}
        value={startPath}
        onChange={(v) => { setStartPath(v); if (isDirectoryLike(v)) setEndPath(""); }}
        placeholder={t.startPathPlaceholder}
        initialBrowsePath={startInitialPath}
      />

      <ImageFilePicker
        label={startIsDir ? t.endPathDir : t.endPathFile}
        value={startIsDir ? "" : endPath}
        onChange={setEndPath}
        placeholder={startIsDir ? t.endPathDirPlaceholder : t.endPathFilePlaceholder}
        disabled={startIsDir}
        initialBrowsePath={getParentPath(startPath)}
        restrictToDir={startPath.trim() && !startIsDir ? getRestrictDir(startPath) : undefined}
      />

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            setIsOpen(false);
            setName("");
            setStartPath("");
            setEndPath("");
            onCancel?.();
          }}
        >
          {t.cancel}
        </Button>
        <Button type="submit" variant="primary" size="sm" disabled={!startPath.trim()}>
          {t.add}
        </Button>
      </div>
    </form>
  );
}
