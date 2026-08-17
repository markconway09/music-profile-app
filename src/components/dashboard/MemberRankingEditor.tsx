"use client";

import { SortableList, type SortableItem } from "./SortableList";
import { setMemberRanking } from "@/app/dashboard/actions";

export function MemberRankingEditor({
  groupId,
  members,
}: {
  groupId: string;
  members: SortableItem[];
}) {
  return (
    <SortableList
      items={members}
      onReorder={(orderedIds) => setMemberRanking(groupId, orderedIds)}
    />
  );
}
