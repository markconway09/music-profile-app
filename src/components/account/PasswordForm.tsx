"use client";

import { useState, useTransition } from "react";
import { updatePassword } from "@/app/dashboard/account/actions";

export function PasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
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

        if (newPassword !== confirmPassword) {
          setError("New passwords don't match.");
          return;
        }

        startTransition(async () => {
          const result = await updatePassword(currentPassword, newPassword);
          if (!result.success) {
            setError(result.error);
            return;
          }
          setCurrentPassword("");
          setNewPassword("");
          setConfirmPassword("");
          setSuccess(true);
        });
      }}
    >
      <label className="flex flex-col gap-1 text-sm">
        Current password
        <input
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          className="rounded-md border border-black/10 px-3 py-2 dark:border-white/20 dark:bg-transparent"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        New password
        <input
          type="password"
          minLength={8}
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className="rounded-md border border-black/10 px-3 py-2 dark:border-white/20 dark:bg-transparent"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Confirm new password
        <input
          type="password"
          minLength={8}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="rounded-md border border-black/10 px-3 py-2 dark:border-white/20 dark:bg-transparent"
        />
      </label>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {success && <p className="text-sm text-green-600">Password updated.</p>}
      <button
        type="submit"
        disabled={isPending || !currentPassword || !newPassword || !confirmPassword}
        className="self-start rounded-md bg-foreground px-4 py-2 text-sm text-background disabled:opacity-50"
      >
        {isPending ? "Saving…" : "Update password"}
      </button>
    </form>
  );
}
