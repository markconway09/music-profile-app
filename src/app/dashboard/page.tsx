import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { FavoriteArtistsEditor } from "@/components/dashboard/FavoriteArtistsEditor";
import { TopSongsEditor } from "@/components/dashboard/TopSongsEditor";
import { MemberRankingEditor } from "@/components/dashboard/MemberRankingEditor";
import { BiasEditor } from "@/components/dashboard/BiasEditor";
import type { BiasCategory } from "@prisma/client";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  const [user, allArtists, allSongs] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      include: {
        favoriteArtists: { include: { artist: true }, orderBy: { rank: "asc" } },
        topSongs: { include: { song: { include: { artist: true } } }, orderBy: { rank: "asc" } },
        memberRankings: { include: { member: true }, orderBy: [{ groupId: "asc" }, { rank: "asc" }] },
        biases: true,
      },
    }),
    prisma.artist.findMany({
      orderBy: { name: "asc" },
      include: { members: true },
    }),
    prisma.song.findMany({ orderBy: { title: "asc" }, include: { artist: true } }),
  ]);

  if (!user) redirect("/login");

  const favoriteArtistIds = new Set(user.favoriteArtists.map((fa) => fa.artistId));
  const topSongIds = new Set(user.topSongs.map((ts) => ts.songId));

  const availableArtists = allArtists
    .filter((a) => !favoriteArtistIds.has(a.id))
    .map((a) => ({ id: a.id, name: a.name }));

  const availableSongs = allSongs
    .filter((s) => !topSongIds.has(s.id))
    .map((s) => ({ id: s.id, title: s.title, artistName: s.artist.name }));

  const favoritedGroups = allArtists.filter(
    (a) => a.type === "GROUP" && favoriteArtistIds.has(a.id)
  );

  const rankingsByGroup = new Map<string, { memberId: string; rank: number }[]>();
  for (const r of user.memberRankings) {
    const list = rankingsByGroup.get(r.groupId) ?? [];
    list.push({ memberId: r.memberId, rank: r.rank });
    rankingsByGroup.set(r.groupId, list);
  }

  const biasesByGroup = new Map<string, Partial<Record<BiasCategory, string>>>();
  for (const b of user.biases) {
    const rec = biasesByGroup.get(b.groupId) ?? {};
    rec[b.category] = b.memberId;
    biasesByGroup.set(b.groupId, rec);
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-8">
      <header className="mb-10">
        <h1 className="text-2xl font-semibold">Editor</h1>
        <p className="text-sm text-black/60 dark:text-white/60">
          Logged in as @{user.username}. Drag to reorder — changes save automatically.
        </p>
      </header>

      <Section title="Favorite Artists">
        <FavoriteArtistsEditor
          favorites={user.favoriteArtists.map((fa) => ({
            id: fa.artistId,
            label: fa.artist.name,
          }))}
          availableArtists={availableArtists}
        />
      </Section>

      <Section title="Top Songs">
        <TopSongsEditor
          topSongs={user.topSongs.map((ts) => ({
            id: ts.songId,
            label: ts.song.title,
            sublabel: ts.song.artist.name,
          }))}
          availableSongs={availableSongs}
        />
      </Section>

      <Section title="Member Rankings">
        {favoritedGroups.length === 0 ? (
          <p className="text-sm text-black/40 dark:text-white/40">
            Add a group to your favorite artists to rank its members.
          </p>
        ) : (
          <div className="flex flex-col gap-8">
            {favoritedGroups.map((group) => {
              const existing = rankingsByGroup.get(group.id) ?? [];
              const rankedIds = existing
                .slice()
                .sort((a, b) => a.rank - b.rank)
                .map((r) => r.memberId);
              const unrankedMembers = group.members.filter((m) => !rankedIds.includes(m.id));
              const orderedMembers = [
                ...rankedIds
                  .map((id) => group.members.find((m) => m.id === id))
                  .filter((m): m is (typeof group.members)[number] => Boolean(m)),
                ...unrankedMembers,
              ];

              return (
                <div key={group.id}>
                  <h3 className="mb-2 text-sm font-medium text-black/70 dark:text-white/70">
                    {group.name}
                  </h3>
                  <MemberRankingEditor
                    groupId={group.id}
                    members={orderedMembers.map((m) => ({ id: m.id, label: m.name }))}
                  />
                </div>
              );
            })}
          </div>
        )}
      </Section>

      <Section title="Biases">
        {favoritedGroups.length === 0 ? (
          <p className="text-sm text-black/40 dark:text-white/40">
            Add a group to your favorite artists to pick a bias.
          </p>
        ) : (
          <div className="flex flex-col gap-8">
            {favoritedGroups.map((group) => (
              <div key={group.id}>
                <h3 className="mb-2 text-sm font-medium text-black/70 dark:text-white/70">
                  {group.name}
                </h3>
                <BiasEditor
                  groupId={group.id}
                  members={group.members.map((m) => ({ id: m.id, name: m.name }))}
                  biases={biasesByGroup.get(group.id) ?? {}}
                />
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="mb-3 text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}
