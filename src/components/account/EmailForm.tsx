"use client";

import { useState, useTransition } from "react";
import { useSession } from "next-auth/react";
import { updateEmail } from "@/app/dashboard/account/actions";

export function EmailForm({ currentEmail }: { currentEmail: string }) {
  const { update } = useSession();
  const [email, setEmail] = useState(currentEmail);
  const [currentPassword, setCurrentPassword] = useState("");
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
          const result = await updateEmail(email, currentPassword);
          if (!result.success) {
            setError(result.error);
            return;
          }
          await update({ email: result.email });
          setEmail(result.email);
          setCurrentPassword("");
          setSuccess(true);
        });
      }}
    >
      <label className="flex flex-col gap-1 text-sm">
        Email
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded-md border border-black/10 px-3 py-2 dark:border-white/20 dark:bg-transparent"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Current password (to confirm)
        <input
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          className="rounded-md border border-black/10 px-3 py-2 dark:border-white/20 dark:bg-transparent"
        />
      </label>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {success && <p className="text-sm text-green-600">Saved.</p>}
      <button
        type="submit"
        disabled={isPending || !currentPassword}
        className="self-start rounded-md bg-foreground px-4 py-2 text-sm text-background disabled:opacity-50"
      >
        {isPending ? "Saving…" : "Save"}
      </button>
    </form>
  );
}
