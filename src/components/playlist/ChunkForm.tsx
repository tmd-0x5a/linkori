"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { ImageFilePicker } from "@/components/ImageFilePicker";
import { useT } from "@/hooks/useT";
import { listSplitCandidates } from "@/lib/tauri";
import { isPdfFile, getParentPath, getRestrictDir, isDirectoryLike } from "@/lib/paths";

interface ChunkFormProps {
  onAdd: (startPath: string, endPath: string, name?: string) => void;
  /** サブフォルダ分割時に複数チャンクを一括追加 */
  onAddMultiple?: (chunks: Array<{ startPath: string; endPath: string; name?: string }>) => void;
  /** 増加するたびにフォームを開く（カウンター方式） */
  addTrigger?: number;
  /** キャンセル時に親へ通知（省略可） */
  onCancel?: () => void;
  /** 前のチャンクのパスを参照してエクスプローラーの初期位置を決める */
  initialBrowsePath?: string;
}

export function ChunkForm({ onAdd, onAddMultiple, addTrigger, onCancel, initialBrowsePath }: ChunkFormProps) {
  const t = useT();
  const [name, setName] = useState("");
  const [startPath, setStartPath] = useState("");
  const [endPath, setEndPath] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [isSplitting, setIsSplitting] = useState(false);
  const [splitError, setSplitError] = useState<string | null>(null);

  async function handleSplitBySubfolders() {
    if (!startPath.trim()) return;
    setIsSplitting(true);
    setSplitError(null);
    try {
      const candidates = await listSplitCandidates(startPath.trim());
      if (candidates.length === 0) {
        setSplitError(t.noSubfoldersFound);
        return;
      }
      const chunks = candidates.map((c) => ({ startPath: c.path, endPath: "", name: c.name }));
      if (onAddMultiple) {
        onAddMultiple(chunks);
      } else {
        for (const c of chunks) onAdd(c.startPath, c.endPath, c.name);
      }
      setName("");
      setStartPath("");
      setEndPath("");
      setIsOpen(false);
    } catch (e) {
      setSplitError(e instanceof Error ? e.message : String(e));
    } finally {
      setIsSplitting(false);
    }
  }

  useEffect(() => {
    if (addTrigger && addTrigger > 0) {
      setIsOpen(true);
    }
  }, [addTrigger]);

  // PDF またはディレクトリの場合は endPath 不要
  const startIsDir = isDirectoryLike(startPath) || isPdfFile(startPath);

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
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-[var(--oat-border)] bg-transparent px-4 py-2 text-sm font-medium text-[var(--warm-silver)] transition-colors hover:border-[#2f8fd1] hover:bg-[var(--panel-bg)] hover:text-[#2f8fd1]"
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
      className="rounded-2xl border border-[var(--oat-border)] bg-[var(--panel-bg)] p-5 space-y-4 shadow-[rgba(0,0,0,0.1)_0px_1px_1px,rgba(0,0,0,0.04)_0px_-1px_1px_inset,rgba(0,0,0,0.05)_0px_-0.5px_1px]"
    >
      <p className="heading-clay text-lg text-[var(--panel-text)]">{t.addNewChunk}</p>

      <div className="flex flex-col gap-1.5">
        <label className="label-clay text-[var(--warm-charcoal)]">{t.chunkNameLabel}</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t.chunkNamePlaceholder}
          className="h-9 w-full rounded-[4px] border border-[#717989] bg-[var(--panel-bg)] px-3 text-sm text-[var(--panel-text)] placeholder:text-[var(--warm-silver)] focus:outline-[rgb(20,110,245)_solid_2px] transition-colors"
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

      {splitError && (
        <p className="text-xs text-red-500">{splitError}</p>
      )}

      <div className="flex justify-end gap-2 flex-wrap">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            setIsOpen(false);
            setName("");
            setStartPath("");
            setEndPath("");
            setSplitError(null);
            onCancel?.();
          }}
        >
          {t.cancel}
        </Button>
        {/* フォルダ選択時のみ「サブフォルダで分割」を表示 */}
        {startIsDir && !isPdfFile(startPath) && startPath.trim() && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            title={t.splitBySubfoldersTitle}
            disabled={isSplitting}
            onClick={handleSplitBySubfolders}
          >
            {isSplitting ? "..." : t.splitBySubfolders}
          </Button>
        )}
        <Button type="submit" variant="primary" size="sm" disabled={!startPath.trim()}>
          {t.add}
        </Button>
      </div>
    </form>
  );
}
