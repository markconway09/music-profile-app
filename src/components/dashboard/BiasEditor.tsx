"use client";

import { useTransition } from "react";
import { setBias, removeBias } from "@/app/dashboard/actions";
import type { BiasCategory } from "@prisma/client";

const CATEGORIES: BiasCategory[] = ["VOCAL", "DANCE", "VISUAL", "RAP", "OVERALL"];

export function BiasEditor({
  groupId,
  members,
  biases,
}: {
  groupId: string;
  members: { id: string; name: string }[];
  biases: Partial<Record<BiasCategory, string>>;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className={`flex flex-wrap gap-3 ${isPending ? "opacity-60" : ""}`}>
      {CATEGORIES.map((category) => (
        <label key={category} className="flex flex-col gap-1 text-sm">
          <span className="text-black/50 dark:text-white/50">{category.toLowerCase()}</span>
          <select
            value={biases[category] ?? ""}
            onChange={(e) => {
              const memberId = e.target.value;
              startTransition(async () => {
                if (memberId) {
                  await setBias(groupId, category, memberId);
                } else {
                  await removeBias(groupId, category);
                }
              });
            }}
            className="rounded-md border border-black/10 px-2 py-1 dark:border-white/20 dark:bg-transparent"
          >
            <option value="">—</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </label>
      ))}
    </div>
  );
}
