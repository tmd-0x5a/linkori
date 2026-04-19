"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/cn";

// ---------------------------------------------------------------------------
// SortablePlaylistItem: プレイリスト一覧の各行をドラッグ可能にするラッパー
// render-prop でドラッグリスナーを子（コンテンツ div）に直接渡す
// ---------------------------------------------------------------------------
export function SortablePlaylistItem({
  id,
  disabled,
  children,
}: {
  id: string;
  disabled?: boolean;
  children: (dragProps: React.HTMLAttributes<HTMLElement>) => React.ReactNode;
}) {
  const { listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled,
  });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const dragProps = (!disabled && listeners)
    ? (listeners as React.HTMLAttributes<HTMLElement>)
    : ({} as React.HTMLAttributes<HTMLElement>);
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(isDragging && "opacity-70 relative z-10")}
    >
      {children(dragProps)}
    </div>
  );
}
