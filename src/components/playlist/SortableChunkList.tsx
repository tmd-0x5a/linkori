"use client";

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import type { Chunk } from "@/types";
import { ChunkCard } from "./ChunkCard";

interface SortableChunkListProps {
  chunks: Chunk[];
  onReorder: (fromIndex: number, toIndex: number) => void;
  onUpdate: (
    chunkId: string,
    updates: Partial<Pick<Chunk, "name" | "startPath" | "endPath">>
  ) => void;
  onRemove: (chunkId: string) => void;
}

export function SortableChunkList({
  chunks,
  onReorder,
  onUpdate,
  onRemove,
}: SortableChunkListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = chunks.findIndex((c) => c.id === active.id);
    const newIndex = chunks.findIndex((c) => c.id === over.id);
    if (oldIndex !== -1 && newIndex !== -1) {
      onReorder(oldIndex, newIndex);
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[restrictToVerticalAxis]}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={chunks.map((c) => c.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-3">
          {chunks.map((chunk, index) => (
            <ChunkCard
              key={chunk.id}
              chunk={chunk}
              index={index}
              onUpdate={onUpdate}
              onRemove={onRemove}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
