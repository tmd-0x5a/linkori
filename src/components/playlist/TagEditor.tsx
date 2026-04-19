"use client";

import { useEffect, useRef, useState } from "react";
import { useT } from "@/hooks/useT";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { usePlaylistStore } from "@/stores/playlistStore";
import { ACCENT_PALETTE, type AccentKey, type Playlist } from "@/types";

// プレイリストのタグ編集モーダル
// タグ色はグローバル（tagColors）に即時反映。タグ所属の保存は onSave で確定。
export function TagEditor({
  playlist,
  onSave,
  onClose,
}: {
  playlist: Playlist;
  onSave: (tags: string[]) => void;
  onClose: () => void;
}) {
  const t = useT();
  const tagColors = usePlaylistStore((s) => s.tagColors);
  const setTagColor = usePlaylistStore((s) => s.setTagColor);

  const [tags, setTagsLocal] = useState<string[]>(playlist.tags ?? []);
  const [input, setInput] = useState("");
  const [pendingColor, setPendingColor] = useState<AccentKey | null>(null);
  const [colorPickerTag, setColorPickerTag] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  function addTag() {
    const val = input.trim().replace(/^#+/, "");
    if (!val || tags.includes(val)) { setInput(""); return; }
    setTagsLocal([...tags, val]);
    if (pendingColor) setTagColor(val, pendingColor);
    setInput("");
    setPendingColor(null);
  }

  function removeTag(tag: string) {
    setTagsLocal(tags.filter((x) => x !== tag));
    if (colorPickerTag === tag) setColorPickerTag(null);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-96 rounded-2xl border border-[var(--oat-border)] bg-[var(--panel-bg)] p-5 shadow-[rgba(0,0,0,0.15)_0px_8px_32px]">
        <p className="heading-clay mb-3 text-base text-[var(--panel-text)]">{t.editTags}</p>
        <p className="mb-3 text-xs text-[var(--warm-silver)]">{playlist.name}</p>

        {/* タグ入力＋色選択 */}
        <div className="mb-3 rounded-lg border border-[var(--oat-border)] bg-[var(--oat-light)] p-2.5">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
              placeholder={t.addTag}
              className="h-8 flex-1 rounded-[4px] border border-[var(--oat-border)] bg-[var(--panel-bg)] px-2.5 text-sm text-[var(--panel-text)] placeholder:text-[var(--warm-silver)] focus:outline-[rgb(20,110,245)_solid_2px]"
            />
            <button
              type="button"
              onClick={addTag}
              disabled={!input.trim()}
              className="btn-clay h-8 rounded-lg bg-[#2f8fd1] px-3 text-xs font-semibold text-white hover:bg-[#0f1d4a] hover:text-[#9fd8e8] disabled:opacity-40 disabled:transform-none"
            >
              {t.save}
            </button>
          </div>
          {/* 次に追加されるタグの色 */}
          <p className="mt-2 mb-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--warm-silver)]">
            {t.accentColor}
          </p>
          <div className="flex flex-wrap items-center gap-1.5">
            {/* なし */}
            <button
              type="button"
              onClick={() => setPendingColor(null)}
              title={t.noTag}
              className={cn(
                "flex size-5 items-center justify-center rounded-full border-2 transition-transform hover:scale-110",
                pendingColor === null
                  ? "border-[var(--panel-text)] bg-[var(--panel-bg)]"
                  : "border-[var(--oat-border)] bg-[var(--panel-bg)]"
              )}
            >
              <svg width="10" height="10" viewBox="0 0 10 10">
                <line x1="1.5" y1="1.5" x2="8.5" y2="8.5" stroke="var(--warm-silver)" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
            {(Object.keys(ACCENT_PALETTE) as AccentKey[]).map((key) => {
              const p = ACCENT_PALETTE[key];
              const selected = pendingColor === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setPendingColor(key)}
                  title={p.label}
                  className={cn(
                    "size-5 rounded-full border-2 transition-transform hover:scale-110",
                    selected ? "border-[var(--panel-text)]" : "border-white/60"
                  )}
                  style={{ background: p.hex, boxShadow: selected ? "0 0 0 1px var(--panel-text)" : "0 0 0 1px var(--oat-border)" }}
                />
              );
            })}
          </div>
        </div>

        {/* タグ一覧（色付きは色で塗られる。クリックで色編集パネル開閉） */}
        <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--warm-silver)]">
          {playlist.name} — {tags.length}件
        </p>
        <div className="mb-3 flex min-h-8 flex-wrap gap-1.5">
          {tags.length === 0 && (
            <span className="text-xs text-[var(--warm-silver)]">{t.noTag}</span>
          )}
          {tags.map((tag) => {
            const colorKey = tagColors[tag];
            const palette = colorKey ? ACCENT_PALETTE[colorKey] : null;
            const picking = colorPickerTag === tag;
            return (
              <span
                key={tag}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium transition-shadow",
                  !palette && "bg-[var(--oat-light)] text-[var(--panel-text)] border border-[var(--oat-border)]",
                  picking && "ring-2 ring-[#2f8fd1] ring-offset-1 ring-offset-[var(--panel-bg)]"
                )}
                style={palette ? {
                  backgroundColor: palette.hex,
                  color: palette.darkText ? "#0a1628" : "#ffffff",
                } : undefined}
              >
                <button
                  type="button"
                  onClick={() => setColorPickerTag(picking ? null : tag)}
                  className="cursor-pointer"
                  title={t.accentColor}
                >
                  {tag}
                </button>
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  className={palette
                    ? (palette.darkText ? "text-[#0a1628]/70 hover:text-[#0a1628]" : "text-white/70 hover:text-white")
                    : "text-[var(--warm-silver)] hover:text-[var(--panel-text)]"}
                >
                  ×
                </button>
              </span>
            );
          })}
        </div>

        {/* 既存タグの色編集パネル */}
        {colorPickerTag && (
          <div className="mb-3 rounded-lg border border-[var(--oat-border)] bg-[var(--oat-light)] p-2.5">
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--warm-silver)]">
              {colorPickerTag} — {t.accentColor}
            </p>
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setTagColor(colorPickerTag, null)}
                title={t.noTag}
                className={cn(
                  "flex size-5 items-center justify-center rounded-full border-2 transition-transform hover:scale-110",
                  !tagColors[colorPickerTag]
                    ? "border-[var(--panel-text)] bg-[var(--panel-bg)]"
                    : "border-[var(--oat-border)] bg-[var(--panel-bg)]"
                )}
              >
                <svg width="10" height="10" viewBox="0 0 10 10">
                  <line x1="1.5" y1="1.5" x2="8.5" y2="8.5" stroke="var(--warm-silver)" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
              {(Object.keys(ACCENT_PALETTE) as AccentKey[]).map((key) => {
                const p = ACCENT_PALETTE[key];
                const selected = tagColors[colorPickerTag] === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setTagColor(colorPickerTag, key)}
                    title={p.label}
                    className={cn(
                      "size-5 rounded-full border-2 transition-transform hover:scale-110",
                      selected ? "border-[var(--panel-text)]" : "border-white/60"
                    )}
                    style={{ background: p.hex, boxShadow: selected ? "0 0 0 1px var(--panel-text)" : "0 0 0 1px var(--oat-border)" }}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* ボタン */}
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose}>{t.cancel}</Button>
          <Button variant="primary" size="sm" onClick={() => onSave(tags)}>{t.save}</Button>
        </div>
      </div>
    </div>
  );
}
