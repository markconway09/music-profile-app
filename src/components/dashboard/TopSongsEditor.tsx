"use client";

import { SortableList, type SortableItem } from "./SortableList";
import { CatalogSearchBox } from "./CatalogSearchBox";
import { addTopSong, removeTopSong, reorderTopSongs } from "@/app/dashboard/actions";
import type { SpotifyTrackResult } from "@/lib/spotify";

export function TopSongsEditor({ topSongs }: { topSongs: SortableItem[] }) {
  return (
    <div>
      <SortableList items={topSongs} onReorder={reorderTopSongs} onRemove={removeTopSong} />
      <div className="mt-3">
        <CatalogSearchBox<SpotifyTrackResult>
          placeholder="Search Spotify for a song…"
          searchUrl={(q) => `/api/search/songs?q=${encodeURIComponent(q)}`}
          getKey={(t) => t.spotifyId}
          renderResult={(t) => ({ label: t.title, sublabel: t.artistName, imageUrl: t.imageUrl })}
          onSelect={addTopSong}
        />
      </div>
    </div>
  );
}
