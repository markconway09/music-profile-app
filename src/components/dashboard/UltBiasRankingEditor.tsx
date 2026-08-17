"use client";

import { SortableList, type SortableItem } from "./SortableList";
import { reorderUltBiases } from "@/app/dashboard/actions";

export function UltBiasRankingEditor({ items }: { items: SortableItem[] }) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-black/40 dark:text-white/40">
        Tick a member as your ult bias in a group above to rank them here.
      </p>
    );
  }

  return <SortableList items={items} onReorder={reorderUltBiases} />;
}
