import Link from "next/link";
import { notFound } from "next/navigation";
import { getProfileData } from "@/lib/profile-data";
import { Section, RankedCard, Empty } from "@/components/profile/ProfilePieces";

export default async function AllSongsPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;

  const data = await getProfileData(username);
  if (!data) notFound();
  const { user } = data;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-8">
      <header className="mb-10">
        <Link
          href={`/u/${user.username}`}
          className="text-sm text-black/50 hover:underline dark:text-white/50"
        >
          ← @{user.username}
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">All Top Songs</h1>
      </header>

      <Section title={`Top Songs (${user.topSongs.length})`}>
        {user.topSongs.length === 0 ? (
          <Empty />
        ) : (
          <ol className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {user.topSongs.map((ts) => (
              <RankedCard
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
    </div>
  );
}
