import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;

  const user = await prisma.user.findUnique({
    where: { username },
    include: {
      favoriteArtists: {
        include: { artist: true },
        orderBy: { rank: "asc" },
      },
      topSongs: {
        include: { song: { include: { artist: true } } },
        orderBy: { rank: "asc" },
      },
      memberRankings: {
        include: { member: true, group: true },
        orderBy: [{ groupId: "asc" }, { rank: "asc" }],
      },
      biases: {
        include: { member: true, group: true },
      },
    },
  });

  if (!user) notFound();

  const rankingsByGroup = groupBy(user.memberRankings, (r) => r.group.id);
  const biasesByGroup = groupBy(user.biases, (b) => b.group.id);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-8">
      <header className="mb-10 flex items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-black/5 text-2xl font-semibold dark:bg-white/10">
          {user.username.slice(0, 1).toUpperCase()}
        </div>
        <div>
          <h1 className="text-2xl font-semibold">@{user.username}</h1>
          <p className="text-sm text-black/60 dark:text-white/60">
            Music profile
          </p>
        </div>
      </header>

      <Section title="Favorite Artists">
        {user.favoriteArtists.length === 0 ? (
          <Empty />
        ) : (
          <ol className="flex flex-col gap-2">
            {user.favoriteArtists.map((fa) => (
              <RankedRow key={fa.artistId} rank={fa.rank} label={fa.artist.name} />
            ))}
          </ol>
        )}
      </Section>

      <Section title="Top Songs">
        {user.topSongs.length === 0 ? (
          <Empty />
        ) : (
          <ol className="flex flex-col gap-2">
            {user.topSongs.map((ts) => (
              <RankedRow
                key={ts.songId}
                rank={ts.rank}
                label={ts.song.title}
                sublabel={ts.song.artist.name}
              />
            ))}
          </ol>
        )}
      </Section>

      <Section title="Member Rankings">
        {Object.keys(rankingsByGroup).length === 0 ? (
          <Empty />
        ) : (
          <div className="flex flex-col gap-6">
            {Object.values(rankingsByGroup).map((rankings) => (
              <div key={rankings[0].group.id}>
                <h3 className="mb-2 text-sm font-medium text-black/70 dark:text-white/70">
                  {rankings[0].group.name}
                </h3>
                <ol className="flex flex-col gap-2">
                  {rankings.map((r) => (
                    <RankedRow key={r.memberId} rank={r.rank} label={r.member.name} />
                  ))}
                </ol>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title="Biases">
        {Object.keys(biasesByGroup).length === 0 ? (
          <Empty />
        ) : (
          <div className="flex flex-col gap-6">
            {Object.values(biasesByGroup).map((biases) => (
              <div key={biases[0].group.id}>
                <h3 className="mb-2 text-sm font-medium text-black/70 dark:text-white/70">
                  {biases[0].group.name}
                </h3>
                <ul className="flex flex-wrap gap-2">
                  {biases.map((b) => (
                    <li
                      key={`${b.groupId}-${b.category}`}
                      className="rounded-full border border-black/10 px-3 py-1 text-sm dark:border-white/20"
                    >
                      <span className="text-black/50 dark:text-white/50">
                        {b.category.toLowerCase()}
                      </span>{" "}
                      · {b.member.name}
                    </li>
                  ))}
                </ul>
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

function RankedRow({
  rank,
  label,
  sublabel,
}: {
  rank: number;
  label: string;
  sublabel?: string;
}) {
  return (
    <li className="flex items-center gap-3 rounded-lg border border-black/10 px-3 py-2 dark:border-white/15">
      <span className="w-6 shrink-0 text-right text-sm font-semibold text-black/40 dark:text-white/40">
        {rank}
      </span>
      <span className="flex-1">
        {label}
        {sublabel && (
          <span className="ml-2 text-sm text-black/50 dark:text-white/50">
            {sublabel}
          </span>
        )}
      </span>
    </li>
  );
}

function Empty() {
  return (
    <p className="text-sm text-black/40 dark:text-white/40">Nothing here yet.</p>
  );
}

function groupBy<T, K extends string>(items: T[], key: (item: T) => K): Record<K, T[]> {
  return items.reduce((acc, item) => {
    const k = key(item);
    (acc[k] ??= []).push(item);
    return acc;
  }, {} as Record<K, T[]>);
}
