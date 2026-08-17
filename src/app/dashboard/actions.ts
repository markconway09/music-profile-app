"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import type { ArtistType, ArtistOrigin } from "@prisma/client";
import { upsertArtistFromSpotify, upsertSongFromSpotify } from "@/lib/catalog";
import type { SpotifyArtistResult, SpotifyTrackResult } from "@/lib/spotify";
import {
  classifyArtist,
  getCurrentMembers,
  getMemberEnrichmentSource,
  pickLatinAlias,
} from "@/lib/musicbrainz";
import { getWikidataImageAndLabel } from "@/lib/wikidata";
import { algorithmicRomanize, needsRomanization, isLatinText } from "@/lib/romanize";
import { requireUserId } from "@/lib/require-user";

async function revalidateAfterEdit(userId: string, extraPath?: string) {
  if (extraPath) revalidatePath(extraPath);
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { username: true } });
  if (user) revalidatePath(`/u/${user.username}`);
}

// ---------- Favorite artists ----------

export async function addFavoriteArtist(spotifyArtist: SpotifyArtistResult) {
  const userId = await requireUserId();
  const artist = await upsertArtistFromSpotify(spotifyArtist);

  const count = await prisma.userFavoriteArtist.count({ where: { userId } });
  await prisma.userFavoriteArtist.upsert({
    where: { userId_artistId: { userId, artistId: artist.id } },
    update: {},
    create: { userId, artistId: artist.id, rank: count + 1 },
  });
  await revalidateAfterEdit(userId, "/dashboard/artists");
}

export async function removeFavoriteArtist(artistId: string) {
  const userId = await requireUserId();
  await prisma.userFavoriteArtist.delete({
    where: { userId_artistId: { userId, artistId } },
  });
  await reindexRanks(
    () => prisma.userFavoriteArtist.findMany({ where: { userId }, orderBy: { rank: "asc" } }),
    (id, rank) =>
      prisma.userFavoriteArtist.update({
        where: { userId_artistId: { userId, artistId: id } },
        data: { rank },
      }),
    (row) => row.artistId
  );
  await revalidateAfterEdit(userId, "/dashboard/artists");
}

export async function reorderFavoriteArtists(orderedArtistIds: string[]) {
  const userId = await requireUserId();
  await prisma.$transaction(
    orderedArtistIds.map((artistId, idx) =>
      prisma.userFavoriteArtist.update({
        where: { userId_artistId: { userId, artistId } },
        data: { rank: idx + 1 },
      })
    )
  );
  await revalidateAfterEdit(userId, "/dashboard/artists");
}

// ---------- Top songs ----------

export async function addTopSong(spotifyTrack: SpotifyTrackResult) {
  const userId = await requireUserId();
  const song = await upsertSongFromSpotify(spotifyTrack);

  const count = await prisma.userTopSong.count({ where: { userId } });
  await prisma.userTopSong.upsert({
    where: { userId_songId: { userId, songId: song.id } },
    update: {},
    create: { userId, songId: song.id, rank: count + 1 },
  });
  await revalidateAfterEdit(userId, "/dashboard/songs");
}

export async function removeTopSong(songId: string) {
  const userId = await requireUserId();
  await prisma.userTopSong.delete({ where: { userId_songId: { userId, songId } } });
  await reindexRanks(
    () => prisma.userTopSong.findMany({ where: { userId }, orderBy: { rank: "asc" } }),
    (id, rank) =>
      prisma.userTopSong.update({
        where: { userId_songId: { userId, songId: id } },
        data: { rank },
      }),
    (row) => row.songId
  );
  await revalidateAfterEdit(userId, "/dashboard/songs");
}

export async function reorderTopSongs(orderedSongIds: string[]) {
  const userId = await requireUserId();
  await prisma.$transaction(
    orderedSongIds.map((songId, idx) =>
      prisma.userTopSong.update({
        where: { userId_songId: { userId, songId } },
        data: { rank: idx + 1 },
      })
    )
  );
  await revalidateAfterEdit(userId, "/dashboard/songs");
}

// ---------- Biases (tick per member: bias + at most one ult bias per group) ----------

export async function toggleBias(memberId: string, groupId: string, checked: boolean) {
  const userId = await requireUserId();

  if (checked) {
    await prisma.userBias.upsert({
      where: { userId_memberId: { userId, memberId } },
      update: {},
      create: { userId, memberId, groupId },
    });
  } else {
    // Removing the bias tick removes ult status too — an ult bias is a bias.
    await prisma.userBias.deleteMany({ where: { userId, memberId } });
    await reindexUltRanks(userId);
  }
  await revalidateAfterEdit(userId, "/dashboard/artists");
}

export async function toggleUltBias(memberId: string, groupId: string, checked: boolean) {
  const userId = await requireUserId();

  if (checked) {
    await prisma.$transaction(async (tx) => {
      // Only one ult bias per group: demote any other current ult in this group.
      await tx.userBias.updateMany({
        where: { userId, groupId, isUlt: true, memberId: { not: memberId } },
        data: { isUlt: false, ultRank: null },
      });

      const ultCount = await tx.userBias.count({ where: { userId, isUlt: true } });
      await tx.userBias.upsert({
        where: { userId_memberId: { userId, memberId } },
        update: { isUlt: true, ultRank: ultCount + 1 },
        create: { userId, memberId, groupId, isUlt: true, ultRank: ultCount + 1 },
      });
    });
    await reindexUltRanks(userId);
  } else {
    await prisma.userBias.updateMany({
      where: { userId, memberId },
      data: { isUlt: false, ultRank: null },
    });
    await reindexUltRanks(userId);
  }
  await revalidateAfterEdit(userId, "/dashboard/artists");
}

export async function reorderUltBiases(orderedMemberIds: string[]) {
  const userId = await requireUserId();
  await prisma.$transaction(
    orderedMemberIds.map((memberId, idx) =>
      prisma.userBias.update({
        where: { userId_memberId: { userId, memberId } },
        data: { ultRank: idx + 1 },
      })
    )
  );
  await revalidateAfterEdit(userId, "/dashboard/artists");
}

// ---------- Group members (manual fallback for gaps in MusicBrainz) ----------

export async function addGroupMember(groupId: string, name: string, imageUrl?: string) {
  const userId = await requireUserId();
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Member name is required");

  await prisma.groupMember.create({
    data: {
      artistId: groupId,
      name: trimmed,
      imageUrl: imageUrl?.trim() || null,
      source: "MANUAL",
    },
  });
  await revalidateAfterEdit(userId, "/dashboard/artists");
}

export async function updateGroupMember(memberId: string, name: string, imageUrl?: string) {
  const userId = await requireUserId();
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Member name is required");

  await prisma.groupMember.update({
    where: { id: memberId },
    // A manual edit is the user's final say — mark it so a later
    // enrichment re-check doesn't come along and overwrite it.
    data: { name: trimmed, imageUrl: imageUrl?.trim() || null, manuallyEdited: true },
  });
  await revalidateAfterEdit(userId, "/dashboard/artists");
}

export async function removeGroupMember(memberId: string) {
  const userId = await requireUserId();
  await prisma.groupMember.delete({ where: { id: memberId } });
  await reindexUltRanks(userId);
  await revalidateAfterEdit(userId, "/dashboard/artists");
}

// ---------- Member enrichment (romanize names, fetch photos) ----------

export async function enrichGroupMembers(
  groupId: string
): Promise<{ checked: number; updated: number }> {
  const userId = await requireUserId();

  const group = await prisma.artist.findUnique({ where: { id: groupId } });
  if (!group) throw new Error("Group not found");

  // A member can lack a MusicBrainz ID for two different reasons: the
  // *group itself* was never matched to MusicBrainz (this is the common
  // case for members the user added by hand — there was no MusicBrainz
  // group to source them from in the first place), or MusicBrainz simply
  // doesn't have that person. Try to fix the first case before giving up,
  // by re-running the same classification used when the artist was first
  // added — it's a one-shot lookup at add-time, so an artist added before
  // MusicBrainz retry logic existed (or hit a transient 503) can be stuck
  // with no musicbrainzId forever otherwise.
  let groupMbId = group.musicbrainzId;
  if (!groupMbId && group.spotifyId) {
    const classification = await classifyArtist(group.name, group.spotifyId);
    if (classification) {
      groupMbId = classification.musicbrainzId;
      await prisma.artist.update({ where: { id: group.id }, data: { musicbrainzId: groupMbId } });
    }
  }

  // Always re-checks eligible members — including ones already attempted —
  // so a member that failed last time (transient API flakiness, or a
  // source that simply didn't have data yet) gets another shot. A manual
  // edit is the only thing that opts a member out permanently.
  const members = await prisma.groupMember.findMany({
    where: { artistId: groupId, manuallyEdited: false },
  });

  // Members added by hand (source: MANUAL) usually have no musicbrainzId of
  // their own. Now that we have the group's MusicBrainz ID, match them by
  // name against MusicBrainz's current-member list for that group and
  // adopt the id — that's what unlocks alias/photo lookups for them below.
  const unresolved = members.filter((m) => !m.musicbrainzId);
  if (groupMbId && unresolved.length > 0) {
    const mbMembers = await getCurrentMembers(groupMbId);
    const byNormalizedName = new Map(mbMembers.map((m) => [normalizeMemberName(m.name), m.musicbrainzId]));
    for (const member of unresolved) {
      const matchedId = byNormalizedName.get(normalizeMemberName(member.name));
      if (!matchedId) continue;
      await prisma.groupMember.update({ where: { id: member.id }, data: { musicbrainzId: matchedId } });
      member.musicbrainzId = matchedId; // keep the in-memory copy in sync for the loop below
    }
  }

  let checked = 0;
  let updated = 0;
  for (const member of members) {
    if (!member.musicbrainzId) continue; // no MusicBrainz identity found for this one — nothing to enrich from

    const needsName = needsRomanization(member.name);
    const needsImage = !member.imageUrl;
    if (!needsName && !needsImage) continue; // already fully resolved, nothing to check
    checked++;

    let newName: string | null = null;
    let newImage: string | null = null;

    // Priority for the name: MusicBrainz's own English alias (most
    // authoritative — it's the actual official spelling), then Wikidata's
    // English label, and only if neither has anything do we fall back to
    // algorithmic romanization ("direct translation" from the characters,
    // which can't know e.g. that 지젤 is styled "Giselle").
    const source = await getMemberEnrichmentSource(member.musicbrainzId!);

    if (needsName && source) {
      newName = pickLatinAlias(source.aliases);
    }

    if (source?.wikidataQid && (needsImage || (needsName && !newName))) {
      const wd = await getWikidataImageAndLabel(source.wikidataQid);
      if (needsImage) newImage = wd.imageUrl;
      if (needsName && !newName && wd.enLabel && isLatinText(wd.enLabel)) {
        newName = wd.enLabel;
      }
    }

    if (needsName && !newName) {
      newName = algorithmicRomanize(member.name);
    }

    await prisma.groupMember.update({
      where: { id: member.id },
      data: {
        ...(newName ? { name: newName } : {}),
        ...(newImage ? { imageUrl: newImage } : {}),
        enrichAttemptedAt: new Date(),
      },
    });
    if (newName || newImage) updated++;
  }

  await revalidateAfterEdit(userId, "/dashboard/artists");
  return { checked, updated };
}

// ---------- Artist metadata overrides (auto-detection isn't perfect) ----------

export async function setArtistType(artistId: string, type: ArtistType) {
  const userId = await requireUserId();
  await prisma.artist.update({ where: { id: artistId }, data: { type } });
  await revalidateAfterEdit(userId, "/dashboard/artists");
}

export async function setArtistOrigin(artistId: string, origin: ArtistOrigin) {
  const userId = await requireUserId();
  await prisma.artist.update({ where: { id: artistId }, data: { origin } });
  await revalidateAfterEdit(userId, "/dashboard/artists");
}

// ---------- helpers ----------

/** Loose match for lining up a manually-typed member name against
 *  MusicBrainz's version of it (casing/accent differences shouldn't block
 *  the match — "Rosé" and "ROSÉ" are the same person). */
const COMBINING_MARKS_RE = /[\u0300-\u036f]/g;

function normalizeMemberName(name: string): string {
  return name.trim().toLowerCase().normalize("NFKD").replace(COMBINING_MARKS_RE, "");
}

async function reindexRanks<T>(
  fetchRows: () => Promise<T[]>,
  update: (id: string, rank: number) => Promise<unknown>,
  getId: (row: T) => string
) {
  const rows = await fetchRows();
  await Promise.all(rows.map((row, idx) => update(getId(row), idx + 1)));
}

/** Close any gaps left in a user's ult-bias ranking after a removal. */
async function reindexUltRanks(userId: string) {
  const rows = await prisma.userBias.findMany({
    where: { userId, isUlt: true },
    orderBy: { ultRank: "asc" },
  });
  const stale = rows.filter((row, idx) => row.ultRank !== idx + 1);
  if (stale.length === 0) return;

  await prisma.$transaction(
    rows.map((row, idx) =>
      prisma.userBias.update({
        where: { userId_memberId: { userId, memberId: row.memberId } },
        data: { ultRank: idx + 1 },
      })
    )
  );
}
