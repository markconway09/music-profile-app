"use client";

import { useState, useTransition } from "react";
import { enrichGroupMembers } from "@/app/dashboard/actions";

export function EnrichMembersButton({ groupId }: { groupId: string }) {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<string | null>(null);

  return (
    <div className="mt-3 flex items-center gap-2">
      <button
        type="button"
        disabled={isPending}
        onClick={() => {
          setResult(null);
          startTransition(async () => {
            const { checked, updated } = await enrichGroupMembers(groupId);
            setResult(
              checked === 0
                ? "Nothing left to fill in."
                : `Updated ${updated} of ${checked} member${checked === 1 ? "" : "s"}.`
            );
          });
        }}
        className="text-xs text-black/50 underline disabled:opacity-50 dark:text-white/50"
      >
        {isPending ? "Fetching romanized names & photos…" : "Fill in missing names / photos"}
      </button>
      {result && <span className="text-xs text-black/40 dark:text-white/40">{result}</span>}
    </div>
  );
}
