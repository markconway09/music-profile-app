import { prisma } from "@/lib/prisma";

/**
 * Shared query + shaping for the public profile page and its "view all"
 * sub-pages, so they all agree on what "highest-ranked song" and "ult
 * biases ranked across groups" mean.
 */
export async function getProfileData(username: string) {
  const user = await prisma.user.findUnique({
    where: { username },
    include: {
      favoriteArtists: { include: { artist: true }, orderBy: { rank: "asc" } },
      topSongs: { include: { song: { include: { artist: true } } }, orderBy: { rank: "asc" } },
      biases: { include: { member: true, group: true } },
    },
  });
  if (!user) return null;

  // topSongs is already ordered by rank asc, so the first match per artist
  // is that user's highest-ranked song from them.
  const topSongByArtistId = new Map<string, (typeof user.topSongs)[number]>();
  for (const ts of user.topSongs) {
    if (!topSongByArtistId.has(ts.song.artistId)) {
      topSongByArtistId.set(ts.song.artistId, ts);
    }
  }

  const biasesByGroupId = new Map<string, typeof user.biases>();
  for (const b of user.biases) {
    const list = biasesByGroupId.get(b.groupId) ?? [];
    list.push(b);
    biasesByGroupId.set(b.groupId, list);
  }

  const ultBiasesRanked = user.biases
    .filter((b) => b.isUlt)
    .sort((a, b) => (a.ultRank ?? 0) - (b.ultRank ?? 0));

  return { user, topSongByArtistId, biasesByGroupId, ultBiasesRanked };
}

export type ProfileData = NonNullable<Awaited<ReturnType<typeof getProfileData>>>;
