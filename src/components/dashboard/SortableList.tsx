"use client";

import { useId, useState, useTransition } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

export type SortableItem = {
  id: string;
  label: string;
  sublabel?: string;
  imageUrl?: string | null;
};

export function SortableList({
  items,
  onReorder,
  onRemove,
}: {
  items: SortableItem[];
  onReorder: (orderedIds: string[]) => Promise<void>;
  onRemove?: (id: string) => Promise<void>;
}) {
  const [localItems, setLocalItems] = useState(items);
  const [isPending, startTransition] = useTransition();

  // Re-sync from server-provided props when the set of items changes
  // (e.g. an add/remove elsewhere triggered a server component refresh).
  // Adjusting state during render (rather than in an effect) avoids an
  // extra render pass — see https://react.dev/learn/you-might-not-need-an-effect
  const itemIdsKey = items
    .map((i) => i.id)
    .slice()
    .sort()
    .join(",");
  const [syncedKey, setSyncedKey] = useState(itemIdsKey);
  if (itemIdsKey !== syncedKey) {
    setSyncedKey(itemIdsKey);
    setLocalItems(items);
  }

  // dnd-kit auto-generates ids like `DndDescribedBy-N` from a module-level
  // counter, which drifts between server render and client hydration when
  // multiple DndContexts exist on one page. React's useId() is stable across
  // both, so pass it through explicitly to avoid a hydration mismatch.
  const dndId = useId();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = localItems.findIndex((i) => i.id === active.id);
    const newIndex = localItems.findIndex((i) => i.id === over.id);
    const reordered = arrayMove(localItems, oldIndex, newIndex);
    setLocalItems(reordered);
    startTransition(async () => {
      await onReorder(reordered.map((i) => i.id));
    });
  }

  if (localItems.length === 0) {
    return <p className="text-sm text-black/40 dark:text-white/40">Nothing here yet.</p>;
  }

  return (
    <DndContext
      id={dndId}
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={localItems.map((i) => i.id)} strategy={verticalListSortingStrategy}>
        <ol className={`flex flex-col gap-2 ${isPending ? "opacity-60" : ""}`}>
          {localItems.map((item, idx) => (
            <SortableRow
              key={item.id}
              item={item}
              rank={idx + 1}
              onRemove={
                onRemove
                  ? () => {
                      setLocalItems((prev) => prev.filter((i) => i.id !== item.id));
                      startTransition(async () => {
                        await onRemove(item.id);
                      });
                    }
                  : undefined
              }
            />
          ))}
        </ol>
      </SortableContext>
    </DndContext>
  );
}

function SortableRow({
  item,
  rank,
  onRemove,
}: {
  item: SortableItem;
  rank: number;
  onRemove?: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 rounded-lg border border-black/10 bg-background px-3 py-2 dark:border-white/15 ${
        isDragging ? "shadow-lg" : ""
      }`}
    >
      <button
        type="button"
        aria-label="Drag to reorder"
        className="cursor-grab touch-none text-black/30 active:cursor-grabbing dark:text-white/30"
        {...attributes}
        {...listeners}
      >
        ⠿
      </button>
      <span className="w-6 shrink-0 text-right text-sm font-semibold text-black/40 dark:text-white/40">
        {rank}
      </span>
      {item.imageUrl ? (
        // Arbitrary external hosts (Spotify CDN, user-pasted URLs) rule out
        // next/image's static remotePatterns allowlist, so a plain <img> it is.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.imageUrl}
          alt=""
          className="h-8 w-8 shrink-0 rounded object-cover"
        />
      ) : (
        <span className="h-8 w-8 shrink-0 rounded bg-black/10 dark:bg-white/10" />
      )}
      <span className="flex-1">
        {item.label}
        {item.sublabel && (
          <span className="ml-2 text-sm text-black/50 dark:text-white/50">{item.sublabel}</span>
        )}
      </span>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="text-sm text-black/40 hover:text-red-600 dark:text-white/40"
        >
          Remove
        </button>
      )}
    </li>
  );
}
