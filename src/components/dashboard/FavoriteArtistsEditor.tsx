"use client";

import { useState } from "react";
import { SortableList, type SortableItem } from "./SortableList";
import { addFavoriteArtist, removeFavoriteArtist, reorderFavoriteArtists } from "@/app/dashboard/actions";

type ArtistOption = { id: string; name: string };

export function FavoriteArtistsEditor({
  favorites,
  availableArtists,
}: {
  favorites: SortableItem[];
  availableArtists: ArtistOption[];
}) {
  const [selected, setSelected] = useState("");

  return (
    <div>
      <SortableList
        items={favorites}
        onReorder={reorderFavoriteArtists}
        onRemove={removeFavoriteArtist}
      />
      {availableArtists.length > 0 && (
        <form
          className="mt-3 flex gap-2"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!selected) return;
            await addFavoriteArtist(selected);
            setSelected("");
          }}
        >
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            className="flex-1 rounded-md border border-black/10 px-3 py-2 text-sm dark:border-white/20 dark:bg-transparent"
          >
            <option value="">Add an artist…</option>
            {availableArtists.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={!selected}
            className="rounded-md bg-foreground px-4 py-2 text-sm text-background disabled:opacity-50"
          >
            Add
          </button>
        </form>
      )}
    </div>
  );
}
