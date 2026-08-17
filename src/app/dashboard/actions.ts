"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { BiasCategory } from "@prisma/client";

async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session.user.id;
}

function revalidateAfterEdit(username?: string | null) {
  revalidatePath("/dashboard");
  if (username) revalidatePath(`/u/${username}`);
}

// ---------- Favorite artists ----------

export async function addFavoriteArtist(artistId: string) {
  const userId = await requireUserId();
  const count = await prisma.userFavoriteArtist.count({ where: { userId } });
  await prisma.userFavoriteArtist.create({
    data: { userId, artistId, rank: count + 1 },
  });
  const user = await prisma.user.findUnique({ where: { id: userId } });
  revalidateAfterEdit(user?.username);
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
  const user = await prisma.user.findUnique({ where: { id: userId } });
  revalidateAfterEdit(user?.username);
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
  const user = await prisma.user.findUnique({ where: { id: userId } });
  revalidateAfterEdit(user?.username);
}

// ---------- Top songs ----------

export async function addTopSong(songId: string) {
  const userId = await requireUserId();
  const count = await prisma.userTopSong.count({ where: { userId } });
  await prisma.userTopSong.create({ data: { userId, songId, rank: count + 1 } });
  const user = await prisma.user.findUnique({ where: { id: userId } });
  revalidateAfterEdit(user?.username);
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
  const user = await prisma.user.findUnique({ where: { id: userId } });
  revalidateAfterEdit(user?.username);
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
  const user = await prisma.user.findUnique({ where: { id: userId } });
  revalidateAfterEdit(user?.username);
}

// ---------- Member rankings (per group, full reorder) ----------

export async function setMemberRanking(groupId: string, orderedMemberIds: string[]) {
  const userId = await requireUserId();

  await prisma.$transaction([
    prisma.userMemberRanking.deleteMany({ where: { userId, groupId } }),
    ...orderedMemberIds.map((memberId, idx) =>
      prisma.userMemberRanking.create({
        data: { userId, groupId, memberId, rank: idx + 1 },
      })
    ),
  ]);
  const user = await prisma.user.findUnique({ where: { id: userId } });
  revalidateAfterEdit(user?.username);
}

// ---------- Biases ----------

export async function setBias(groupId: string, category: BiasCategory, memberId: string) {
  const userId = await requireUserId();
  await prisma.userBias.upsert({
    where: { userId_groupId_category: { userId, groupId, category } },
    update: { memberId },
    create: { userId, groupId, category, memberId },
  });
  const user = await prisma.user.findUnique({ where: { id: userId } });
  revalidateAfterEdit(user?.username);
}

export async function removeBias(groupId: string, category: BiasCategory) {
  const userId = await requireUserId();
  await prisma.userBias.delete({
    where: { userId_groupId_category: { userId, groupId, category } },
  });
  const user = await prisma.user.findUnique({ where: { id: userId } });
  revalidateAfterEdit(user?.username);
}

// ---------- helpers ----------

async function reindexRanks<T>(
  fetchRows: () => Promise<T[]>,
  update: (id: string, rank: number) => Promise<unknown>,
  getId: (row: T) => string
) {
  const rows = await fetchRows();
  await Promise.all(rows.map((row, idx) => update(getId(row), idx + 1)));
}
