"use client";

import { useTransition } from "react";
import { toggleBias, toggleUltBias } from "@/app/dashboard/actions";

type Member = {
  id: string;
  name: string;
  imageUrl: string | null;
  isBias: boolean;
  isUlt: boolean;
};

export function MemberBiasTicker({ groupId, members }: { groupId: string; members: Member[] }) {
  const [isPending, startTransition] = useTransition();

  if (members.length === 0) {
    return <p className="text-sm text-black/40 dark:text-white/40">No members yet.</p>;
  }

  return (
    <div className={`flex flex-col gap-1.5 ${isPending ? "opacity-60" : ""}`}>
      <div className="flex items-center gap-3 px-1 text-xs text-black/40 dark:text-white/40">
        <span className="flex-1" />
        <span className="w-12 text-center">Bias</span>
        <span className="w-12 text-center">Ult</span>
      </div>
      {members.map((m) => (
        <div
          key={m.id}
          className="flex items-center gap-3 rounded-lg border border-black/10 px-3 py-2 dark:border-white/15"
        >
          {m.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={m.imageUrl} alt="" className="h-8 w-8 shrink-0 rounded object-cover" />
          ) : (
            <span className="h-8 w-8 shrink-0 rounded bg-black/10 dark:bg-white/10" />
          )}
          <span className="flex-1 text-sm">{m.name}</span>
          <span className="flex w-12 justify-center">
            <input
              type="checkbox"
              checked={m.isBias}
              onChange={(e) => {
                const checked = e.target.checked;
                startTransition(async () => {
                  await toggleBias(m.id, groupId, checked);
                });
              }}
              className="h-4 w-4"
              aria-label={`Mark ${m.name} as a bias`}
            />
          </span>
          <span className="flex w-12 justify-center">
            <input
              type="checkbox"
              checked={m.isUlt}
              onChange={(e) => {
                const checked = e.target.checked;
                startTransition(async () => {
                  await toggleUltBias(m.id, groupId, checked);
                });
              }}
              className="h-4 w-4"
              aria-label={`Mark ${m.name} as ultimate bias`}
            />
          </span>
        </div>
      ))}
    </div>
  );
}
