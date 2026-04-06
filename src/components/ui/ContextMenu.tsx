"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/cn";

export interface ContextMenuItem {
  label: string;
  onClick: () => void;
  danger?: boolean;
  separator?: never;
}

export interface ContextMenuSeparator {
  separator: true;
  label?: never;
  onClick?: never;
  danger?: never;
}

export type ContextMenuEntry = ContextMenuItem | ContextMenuSeparator;

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

  // 画面端からはみ出さないよう位置を補正
  useEffect(() => {
    if (!menuRef.current) return;
    const rect = menuRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    if (rect.right > vw) menuRef.current.style.left = `${vw - rect.width - 8}px`;
    if (rect.bottom > vh) menuRef.current.style.top = `${vh - rect.height - 8}px`;
  }, [x, y]);

  return (
    <div
      ref={menuRef}
      style={{ left: x, top: y }}
      className="fixed z-[200] min-w-[140px] overflow-hidden rounded-lg border border-zinc-700 bg-zinc-800 py-1 shadow-xl shadow-black/40"
      onContextMenu={(e) => e.preventDefault()}
    >
      {items.map((item, i) =>
        "separator" in item && item.separator ? (
          <div key={i} className="my-1 border-t border-zinc-700" />
        ) : (
          <button
            key={i}
            onClick={() => {
              (item as ContextMenuItem).onClick();
              onClose();
            }}
            className={cn(
              "flex w-full items-center px-3 py-1.5 text-left text-sm transition-colors hover:bg-zinc-700",
              (item as ContextMenuItem).danger
                ? "text-red-400 hover:text-red-300"
                : "text-zinc-200"
            )}
          >
            {(item as ContextMenuItem).label}
          </button>
        )
      )}
    </div>
  );
}
