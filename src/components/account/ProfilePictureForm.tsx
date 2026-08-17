"use client";

import { useState, useTransition } from "react";
import { useSession } from "next-auth/react";
import { updateProfileImage } from "@/app/dashboard/account/actions";

export function ProfilePictureForm({ currentImage }: { currentImage: string | null }) {
  const { update } = useSession();
  const [imageUrl, setImageUrl] = useState(currentImage ?? "");
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
          const result = await updateProfileImage(imageUrl);
          if (!result.success) {
            setError(result.error);
            return;
          }
          await update({ image: result.image ?? "" });
          setSuccess(true);
        });
      }}
    >
      <div className="flex items-center gap-4">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt="" className="h-16 w-16 shrink-0 rounded-full object-cover" />
        ) : (
          <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-black/5 text-xl font-semibold dark:bg-white/10">
            ?
          </span>
        )}
        <input
          type="url"
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          placeholder="https://example.com/photo.jpg"
          className="flex-1 rounded-md border border-black/10 px-3 py-2 text-sm dark:border-white/20 dark:bg-transparent"
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {success && <p className="text-sm text-green-600">Saved.</p>}
      <button
        type="submit"
        disabled={isPending}
        className="self-start rounded-md bg-foreground px-4 py-2 text-sm text-background disabled:opacity-50"
      >
        {isPending ? "Saving…" : "Save"}
      </button>
    </form>
  );
}
