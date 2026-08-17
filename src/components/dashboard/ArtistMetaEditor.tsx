"use client";

import { useTransition } from "react";
import { setArtistType, setArtistOrigin } from "@/app/dashboard/actions";
import type { ArtistType, ArtistOrigin } from "@prisma/client";

type ArtistMeta = { id: string; name: string; type: ArtistType; origin: ArtistOrigin };

const ORIGINS: ArtistOrigin[] = ["KPOP", "JPOP", "OTHER"];

/**
 * Auto-detection (Spotify genres + MusicBrainz) gets most artists right but
 * not all — this lets a user correct type (solo/group) and origin inline.
 */
export function ArtistMetaEditor({ artists }: { artists: ArtistMeta[] }) {
  const [isPending, startTransition] = useTransition();

  if (artists.length === 0) return null;

  return (
    <div className={`mt-3 flex flex-col gap-1.5 ${isPending ? "opacity-60" : ""}`}>
      <p className="text-xs text-black/40 dark:text-white/40">
        Auto-detected type/origin wrong for someone? Fix it here:
      </p>
      {artists.map((a) => (
        <div key={a.id} className="flex items-center gap-2 text-xs">
          <span className="w-32 truncate text-black/60 dark:text-white/60">{a.name}</span>
          <button
            type="button"
            onClick={() =>
              startTransition(async () => {
                await setArtistType(a.id, a.type === "GROUP" ? "SOLO" : "GROUP");
              })
            }
            className="rounded-full border border-black/10 px-2 py-0.5 dark:border-white/20"
          >
            {a.type === "GROUP" ? "Group" : "Solo"}
          </button>
          <button
            type="button"
            onClick={() => {
              const next = ORIGINS[(ORIGINS.indexOf(a.origin) + 1) % ORIGINS.length];
              startTransition(async () => {
                await setArtistOrigin(a.id, next);
              });
            }}
            className="rounded-full border border-black/10 px-2 py-0.5 dark:border-white/20"
          >
            {a.origin}
          </button>
        </div>
      ))}
    </div>
  );
}
