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

  /* 画面端からはみ出さないよう位置を補正 */
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
      className="fixed z-[200] min-w-[140px] overflow-hidden rounded-xl border border-[#dad4c8] bg-white py-1 shadow-[rgba(0,0,0,0.1)_0px_1px_1px,rgba(0,0,0,0.04)_0px_-1px_1px_inset,rgba(0,0,0,0.05)_0px_-0.5px_1px]"
      onContextMenu={(e) => e.preventDefault()}
    >
      {items.map((item, i) =>
        "separator" in item && item.separator ? (
          <div key={i} className="my-1 border-t border-[#eee9df]" />
        ) : (
          <button
            key={i}
            onClick={() => {
              (item as ContextMenuItem).onClick();
              onClose();
            }}
            className={cn(
              "flex w-full items-center px-3 py-1.5 text-left text-sm transition-colors hover:bg-[#eee9df]",
              (item as ContextMenuItem).danger
                ? "text-[#e05560] font-medium"
                : "text-black"
            )}
          >
            {(item as ContextMenuItem).label}
          </button>
        )
      )}
    </div>
  );
}
