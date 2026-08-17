// Upsert-on-demand catalog: search results from Spotify are only written
// to our DB the moment a user actually picks one, keyed by spotifyId so
// repeated picks across users reuse the same local row. Group members are
// best-effort filled in from MusicBrainz at that same moment.

import { prisma } from "@/lib/prisma";
import {
  getArtist as getSpotifyArtist,
  inferOriginFromGenres,
  type SpotifyArtistResult,
  type SpotifyTrackResult,
} from "@/lib/spotify";
import { classifyArtist, getCurrentMembers } from "@/lib/musicbrainz";
import type { Artist, Song } from "@prisma/client";

export async function upsertArtistFromSpotify(spotifyArtist: SpotifyArtistResult): Promise<Artist> {
  const existing = await prisma.artist.findUnique({ where: { spotifyId: spotifyArtist.spotifyId } });
  if (existing) return existing;

  const origin = inferOriginFromGenres(spotifyArtist.genres);
  const classification = await classifyArtist(spotifyArtist.name, spotifyArtist.spotifyId);

  const artist = await prisma.artist.create({
    data: {
      name: spotifyArtist.name,
      imageUrl: spotifyArtist.imageUrl,
      spotifyId: spotifyArtist.spotifyId,
      origin,
      type: classification?.type ?? "SOLO",
      musicbrainzId: classification?.musicbrainzId ?? null,
    },
  });

  if (classification?.type === "GROUP") {
    const members = await getCurrentMembers(classification.musicbrainzId);
    if (members.length > 0) {
      await prisma.groupMember.createMany({
        data: members.map((m) => ({
          name: m.name,
          artistId: artist.id,
          musicbrainzId: m.musicbrainzId,
          source: "MUSICBRAINZ" as const,
        })),
        skipDuplicates: true,
      });
    }
  }

  return artist;
}

export async function upsertSongFromSpotify(spotifyTrack: SpotifyTrackResult): Promise<Song> {
  const existing = await prisma.song.findUnique({ where: { spotifyId: spotifyTrack.spotifyId } });
  if (existing) return existing;

  let artist = spotifyTrack.artistSpotifyId
    ? await prisma.artist.findUnique({ where: { spotifyId: spotifyTrack.artistSpotifyId } })
    : null;

  if (!artist && spotifyTrack.artistSpotifyId) {
    const spotifyArtist = await getSpotifyArtist(spotifyTrack.artistSpotifyId);
    artist = await upsertArtistFromSpotify(spotifyArtist);
  }

  if (!artist) {
    // Extremely unlikely (Spotify tracks always have an artist), but keep
    // the type-checker honest and fail loudly rather than write orphan data.
    throw new Error(`Could not resolve artist for track "${spotifyTrack.title}"`);
  }

  return prisma.song.create({
    data: {
      title: spotifyTrack.title,
      artistId: artist.id,
      imageUrl: spotifyTrack.imageUrl,
      previewUrl: spotifyTrack.previewUrl,
      spotifyId: spotifyTrack.spotifyId,
    },
  });
}
