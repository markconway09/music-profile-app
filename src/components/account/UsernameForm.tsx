"use client";

import { useState, useTransition } from "react";
import { useSession } from "next-auth/react";
import { updateUsername } from "@/app/dashboard/account/actions";

export function UsernameForm({ currentUsername }: { currentUsername: string }) {
  const { update } = useSession();
  const [username, setUsername] = useState(currentUsername);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        setSuccess(false);
        startTransition(async () => {
          const result = await updateUsername(username);
          if (!result.success) {
            setError(result.error);
            return;
          }
          await update({ name: result.username });
          setUsername(result.username);
          setSuccess(true);
        });
      }}
    >
      <label className="flex flex-col gap-1 text-sm">
        Username
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="rounded-md border border-black/10 px-3 py-2 dark:border-white/20 dark:bg-transparent"
        />
      </label>
      <p className="text-xs text-black/40 dark:text-white/40">
        Your profile URL is /u/{username || "…"}. Changing it moves your old link.
      </p>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {success && <p className="text-sm text-green-600">Saved.</p>}
      <button
        type="submit"
        disabled={isPending || username === currentUsername}
        className="self-start rounded-md bg-foreground px-4 py-2 text-sm text-background disabled:opacity-50"
      >
        {isPending ? "Saving…" : "Save"}
      </button>
    </form>
  );
}
