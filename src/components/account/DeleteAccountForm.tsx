"use client";

import { useState, useTransition } from "react";
import { signOut } from "next-auth/react";
import { deleteAccount } from "@/app/dashboard/account/actions";

export function DeleteAccountForm() {
  const [confirming, setConfirming] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!confirming) {
    return (
      <div>
        <p className="mb-3 text-sm text-black/60 dark:text-white/60">
          Permanently deletes your account and all your favorites, rankings, and biases.
          This can&apos;t be undone.
        </p>
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="rounded-md border border-red-600 px-4 py-2 text-sm text-red-600 hover:bg-red-600/10"
        >
          Delete my account
        </button>
      </div>
    );
  }

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        startTransition(async () => {
          const result = await deleteAccount(password);
          if (!result.success) {
            setError(result.error);
            return;
          }
          await signOut({ callbackUrl: "/" });
        });
      }}
    >
      <p className="text-sm font-medium text-red-600">
        This is permanent. Enter your password to confirm.
      </p>
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Current password"
        className="rounded-md border border-red-600/40 px-3 py-2 text-sm dark:bg-transparent"
        autoFocus
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isPending || !password}
          className="rounded-md bg-red-600 px-4 py-2 text-sm text-white disabled:opacity-50"
        >
          {isPending ? "Deleting…" : "Permanently delete my account"}
        </button>
        <button
          type="button"
          onClick={() => {
            setConfirming(false);
            setPassword("");
            setError(null);
          }}
          className="rounded-md border border-black/10 px-4 py-2 text-sm dark:border-white/20"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
