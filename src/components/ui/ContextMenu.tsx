"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";
import { ACCENT_PALETTE, type AccentKey } from "@/types";

export interface ContextMenuItem {
  label: string;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
  separator?: never;
  colorSwatch?: never;
}

export interface ContextMenuSeparator {
  separator: true;
  label?: never;
  onClick?: never;
  danger?: never;
  colorSwatch?: never;
}

export interface ContextMenuColorSwatch {
  colorSwatch: {
    label: string;
    value: AccentKey | undefined;
    onSelect: (accent: AccentKey | undefined) => void;
  };
  separator?: never;
  label?: never;
  onClick?: never;
  danger?: never;
}

export type ContextMenuEntry = ContextMenuItem | ContextMenuSeparator | ContextMenuColorSwatch;

interface ContextMenuProps {
  x: number;
  y: number;
  items: ContextMenuEntry[];
  onClose: () => void;
}

export function ContextMenu({ x, y, items, onClose }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleDown(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("mousedown", handleDown);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleDown);
      document.removeEventListener("keydown", handleKey);
    };
  }, [onClose]);

  /* 画面端からはみ出さないよう位置を補正 */
  useEffect(() => {
    if (!menuRef.current) return;
    const rect = menuRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    if (rect.right > vw) menuRef.current.style.left = `${vw - rect.width - 8}px`;
    if (rect.bottom > vh) menuRef.current.style.top = `${vh - rect.height - 8}px`;
  }, [x, y]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      ref={menuRef}
      style={{ left: x, top: y }}
      className="fixed z-[200] min-w-[140px] overflow-hidden rounded-xl border border-[var(--oat-border)] bg-[var(--panel-bg)] py-1 shadow-[rgba(0,0,0,0.1)_0px_1px_1px,rgba(0,0,0,0.04)_0px_-1px_1px_inset,rgba(0,0,0,0.05)_0px_-0.5px_1px]"
      onContextMenu={(e) => e.preventDefault()}
    >
      {items.map((item, i) => {
        if ("separator" in item && item.separator) {
          return <div key={i} className="my-1 border-t border-[var(--oat-light)]" />;
        }
        if ("colorSwatch" in item && item.colorSwatch) {
          const sw = item.colorSwatch;
          return (
            <div key={i} className="px-3 py-2">
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--warm-silver)]">
                {sw.label}
              </p>
              <div className="flex items-center gap-1.5">
                {/* 未設定（クリア） */}
                <button
                  type="button"
                  onClick={() => { sw.onSelect(undefined); onClose(); }}
                  title="なし"
                  className={cn(
                    "flex size-5 items-center justify-center rounded-full border-2 transition-transform hover:scale-110",
                    sw.value === undefined
                      ? "border-[#0a1628] bg-[var(--panel-bg)]"
                      : "border-[var(--oat-border)] bg-[var(--panel-bg)]"
                  )}
                >
                  <svg width="10" height="10" viewBox="0 0 10 10">
                    <line x1="1.5" y1="1.5" x2="8.5" y2="8.5" stroke="var(--warm-silver)" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </button>
                {(Object.keys(ACCENT_PALETTE) as AccentKey[]).map((key) => {
                  const p = ACCENT_PALETTE[key];
                  const selected = sw.value === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => { sw.onSelect(key); onClose(); }}
                      title={p.label}
                      className={cn(
                        "size-5 rounded-full border-2 transition-transform hover:scale-110",
                        selected ? "border-[#0a1628]" : "border-white"
                      )}
                      style={{ background: p.hex, boxShadow: selected ? "0 0 0 1px #0a1628" : "0 0 0 1px var(--oat-border)" }}
                    />
                  );
                })}
              </div>
            </div>
          );
        }
        const mi = item as ContextMenuItem;
        return (
          <button
            key={i}
            disabled={mi.disabled}
            onClick={() => {
              if (mi.disabled) return;
              mi.onClick();
              onClose();
            }}
            className={cn(
              "flex w-full items-center px-3 py-1.5 text-left text-sm transition-colors",
              mi.disabled
                ? "cursor-not-allowed opacity-40"
                : "hover:bg-[var(--oat-light)]",
              mi.danger ? "text-[#e05560] font-medium" : "text-[var(--panel-text)]"
            )}
          >
            {mi.label}
          </button>
        );
      })}
    </div>,
    document.body
  );
}
