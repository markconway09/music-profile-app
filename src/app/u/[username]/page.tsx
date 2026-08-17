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
      biases: {
        include: { member: true, group: true },
      },
    },
  });

  if (!user) notFound();

  // user.topSongs is already ordered by rank asc, so the first match per
  // artist is that user's highest-ranked song from them.
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
              <ArtistRow
                key={fa.artistId}
                rank={fa.rank}
                name={fa.artist.name}
                imageUrl={fa.artist.imageUrl}
                topSong={topSongByArtistId.get(fa.artistId)}
                biases={fa.artist.type === "GROUP" ? biasesByGroupId.get(fa.artistId) : undefined}
              />
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
                imageUrl={ts.song.imageUrl}
              />
            ))}
          </ol>
        )}
      </Section>

      <Section title="Ultimate Biases">
        {ultBiasesRanked.length === 0 ? (
          <Empty />
        ) : (
          <ol className="flex flex-col gap-2">
            {ultBiasesRanked.map((b, idx) => (
              <RankedRow
                key={b.memberId}
                rank={idx + 1}
                label={b.member.name}
                sublabel={b.group.name}
                imageUrl={b.member.imageUrl}
              />
            ))}
          </ol>
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

function ArtistRow({
  rank,
  name,
  imageUrl,
  topSong,
  biases,
}: {
  rank: number;
  name: string;
  imageUrl: string | null;
  topSong?: { song: { title: string; imageUrl: string | null } };
  biases?: {
    memberId: string;
    isUlt: boolean;
    member: { name: string; imageUrl: string | null };
  }[];
}) {
  const ult = biases?.find((b) => b.isUlt);
  const others = biases?.filter((b) => !b.isUlt) ?? [];
  const hasDetails = Boolean(topSong) || Boolean(ult) || others.length > 0;

  return (
    <li className="group rounded-lg border border-black/10 dark:border-white/15">
      <details>
        <summary className="flex cursor-pointer list-none items-center gap-3 px-3 py-2 [&::-webkit-details-marker]:hidden">
          <span className="w-6 shrink-0 text-right text-sm font-semibold text-black/40 dark:text-white/40">
            {rank}
          </span>
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageUrl} alt="" className="h-10 w-10 shrink-0 rounded object-cover" />
          ) : (
            <span className="h-10 w-10 shrink-0 rounded bg-black/5 dark:bg-white/10" />
          )}
          <span className="flex-1">{name}</span>
          {hasDetails && (
            <svg
              viewBox="0 0 20 20"
              className="h-4 w-4 shrink-0 text-black/40 transition-transform group-open:rotate-90 dark:text-white/40"
              fill="currentColor"
            >
              <path d="M7 4l6 6-6 6V4z" />
            </svg>
          )}
        </summary>

        {hasDetails && (
          <div className="flex flex-col gap-3 border-t border-black/10 px-3 py-3 dark:border-white/15">
            {topSong && (
              <div>
                <p className="mb-1 text-xs text-black/40 dark:text-white/40">
                  Highest-ranked song
                </p>
                <div className="flex items-center gap-2">
                  {topSong.song.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={topSong.song.imageUrl}
                      alt=""
                      className="h-8 w-8 shrink-0 rounded object-cover"
                    />
                  ) : (
                    <span className="h-8 w-8 shrink-0 rounded bg-black/5 dark:bg-white/10" />
                  )}
                  <span className="text-sm">{topSong.song.title}</span>
                </div>
              </div>
            )}

            {(ult || others.length > 0) && (
              <div>
                <p className="mb-1 text-xs text-black/40 dark:text-white/40">Biases</p>
                <ul className="flex flex-wrap gap-2">
                  {ult && <BiasBadge name={ult.member.name} imageUrl={ult.member.imageUrl} isUlt />}
                  {others.map((b) => (
                    <BiasBadge key={b.memberId} name={b.member.name} imageUrl={b.member.imageUrl} />
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </details>
    </li>
  );
}

function BiasBadge({
  name,
  imageUrl,
  isUlt,
}: {
  name: string;
  imageUrl: string | null;
  isUlt?: boolean;
}) {
  return (
    <li
      className={`flex items-center gap-2 rounded-full border py-1 pl-1 pr-3 text-sm ${
        isUlt
          ? "border-foreground/30 bg-foreground/5"
          : "border-black/10 dark:border-white/20"
      }`}
    >
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt="" className="h-6 w-6 shrink-0 rounded-full object-cover" />
      ) : (
        <span className="h-6 w-6 shrink-0 rounded-full bg-black/5 dark:bg-white/10" />
      )}
      <span>
        {isUlt && <span className="text-black/50 dark:text-white/50">ult · </span>}
        {name}
      </span>
    </li>
  );
}

function RankedRow({
  rank,
  label,
  sublabel,
  imageUrl,
}: {
  rank: number;
  label: string;
  sublabel?: string;
  imageUrl?: string | null;
}) {
  return (
    <li className="flex items-center gap-3 rounded-lg border border-black/10 px-3 py-2 dark:border-white/15">
      <span className="w-6 shrink-0 text-right text-sm font-semibold text-black/40 dark:text-white/40">
        {rank}
      </span>
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt="" className="h-10 w-10 shrink-0 rounded object-cover" />
      ) : (
        <span className="h-10 w-10 shrink-0 rounded bg-black/5 dark:bg-white/10" />
      )}
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
