"use client";

import { useState } from "react";
import { SortableList, type SortableItem } from "./SortableList";
import { addTopSong, removeTopSong, reorderTopSongs } from "@/app/dashboard/actions";

type SongOption = { id: string; title: string; artistName: string };

export function TopSongsEditor({
  topSongs,
  availableSongs,
}: {
  topSongs: SortableItem[];
  availableSongs: SongOption[];
}) {
  const [selected, setSelected] = useState("");

  return (
    <div>
      <SortableList items={topSongs} onReorder={reorderTopSongs} onRemove={removeTopSong} />
      {availableSongs.length > 0 && (
        <form
          className="mt-3 flex gap-2"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!selected) return;
            await addTopSong(selected);
            setSelected("");
          }}
        >
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            className="flex-1 rounded-md border border-black/10 px-3 py-2 text-sm dark:border-white/20 dark:bg-transparent"
          >
            <option value="">Add a song…</option>
            {availableSongs.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title} — {s.artistName}
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
