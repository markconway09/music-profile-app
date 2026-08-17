"use client";

import { SortableList, type SortableItem } from "./SortableList";
import { CatalogSearchBox } from "./CatalogSearchBox";
import { addFavoriteArtist, removeFavoriteArtist, reorderFavoriteArtists } from "@/app/dashboard/actions";
import type { SpotifyArtistResult } from "@/lib/spotify";

export function FavoriteArtistsEditor({ favorites }: { favorites: SortableItem[] }) {
  return (
    <div>
      <SortableList
        items={favorites}
        onReorder={reorderFavoriteArtists}
        onRemove={removeFavoriteArtist}
      />
      <div className="mt-3">
        <CatalogSearchBox<SpotifyArtistResult>
          placeholder="Search Spotify for an artist…"
          searchUrl={(q) => `/api/search/artists?q=${encodeURIComponent(q)}`}
          getKey={(a) => a.spotifyId}
          renderResult={(a) => ({ label: a.name, imageUrl: a.imageUrl })}
          onSelect={addFavoriteArtist}
        />
      </div>
    </div>
  );
}
