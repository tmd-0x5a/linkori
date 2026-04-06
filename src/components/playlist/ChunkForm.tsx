"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { ImageFilePicker } from "@/components/ImageFilePicker";

interface ChunkFormProps {
  onAdd: (startPath: string, endPath: string, name?: string) => void;
}

const IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "gif", "webp", "bmp", "tiff", "tif"];

/** パスの親ディレクトリを返す（ファイル選択後に終了パスを同フォルダから開くため） */
function getParentPath(path: string): string | undefined {
  if (!path.trim()) return undefined;
  const normalized = path.replace(/\\/g, "/").replace(/\/+$/, "");
  const lastSlash = normalized.lastIndexOf("/");
  if (lastSlash <= 0) return undefined;
  return normalized.slice(0, lastSlash);
}

/** 開始パスがフォルダ・ZIP全体・ZIPサブディレクトリのいずれかか判定 */
function isDirectoryLike(path: string): boolean {
  if (!path.trim()) return false;
  const normalized = path.replace(/\\/g, "/").replace(/\/+$/, "");
  const lastSegment = normalized.split("/").pop() ?? "";
  const dotIdx = lastSegment.lastIndexOf(".");
  if (dotIdx < 0) return true; // 拡張子なし → フォルダ
  const ext = lastSegment.slice(dotIdx + 1).toLowerCase();
  return !IMAGE_EXTENSIONS.includes(ext); // 画像拡張子でなければフォルダ扱い
}

export function ChunkForm({ onAdd }: ChunkFormProps) {
  const [name, setName] = useState("");
  const [startPath, setStartPath] = useState("");
  const [endPath, setEndPath] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const startIsDir = isDirectoryLike(startPath);

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
      <Button
        variant="secondary"
        size="md"
        onClick={() => setIsOpen(true)}
        className="w-full border border-dashed border-zinc-600 bg-transparent hover:border-zinc-500 hover:bg-zinc-800/50"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d="M8 2a1 1 0 011 1v4h4a1 1 0 110 2H9v4a1 1 0 11-2 0V9H3a1 1 0 010-2h4V3a1 1 0 011-1z" />
        </svg>
        チャンクを追加
      </Button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border border-blue-500/30 bg-blue-500/5 p-4 space-y-3"
    >
      <p className="text-sm font-medium text-zinc-200">新しいチャンクを追加</p>

      {/* チャンク名（省略可） */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-zinc-400">チャンク名（省略可）</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="例: 第1巻"
          className="h-9 w-full rounded border border-zinc-700 bg-zinc-800 px-3 text-sm text-zinc-100 placeholder-zinc-600 focus:border-blue-500 focus:outline-none transition-colors"
        />
      </div>

      <ImageFilePicker
        label="開始パス"
        value={startPath}
        onChange={(v) => {
          setStartPath(v);
          if (isDirectoryLike(v)) setEndPath("");
        }}
        placeholder="D:/manga/vol1/001.jpg  または  D:/manga/vol1/"
      />

      <ImageFilePicker
        label={startIsDir ? "終了パス（フォルダ選択時は不要）" : "終了パス（省略するとフォルダ全体）"}
        value={startIsDir ? "" : endPath}
        onChange={setEndPath}
        placeholder={startIsDir ? "（フォルダ全体が対象）" : "D:/manga/vol1/050.jpg  （省略可）"}
        disabled={startIsDir}
        initialBrowsePath={getParentPath(startPath)}
      />

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => {
            setIsOpen(false);
            setName("");
            setStartPath("");
            setEndPath("");
          }}
        >
          キャンセル
        </Button>
        <Button
          type="submit"
          variant="primary"
          size="sm"
          disabled={!startPath.trim()}
        >
          追加
        </Button>
      </div>
    </form>
  );
}
