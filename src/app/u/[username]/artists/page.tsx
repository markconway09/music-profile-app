import Link from "next/link";
import { notFound } from "next/navigation";
import { getProfileData } from "@/lib/profile-data";
import { Section, ArtistCard, Empty } from "@/components/profile/ProfilePieces";

export default async function AllArtistsPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;

  const data = await getProfileData(username);
  if (!data) notFound();
  const { user, topSongByArtistId, biasesByGroupId } = data;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-8">
      <header className="mb-10">
        <Link
          href={`/u/${user.username}`}
          className="text-sm text-black/50 hover:underline dark:text-white/50"
        >
          ← @{user.username}
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">All Favorite Artists</h1>
      </header>

      <Section title={`Favorite Artists (${user.favoriteArtists.length})`}>
        {user.favoriteArtists.length === 0 ? (
          <Empty />
        ) : (
          <ol className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {user.favoriteArtists.map((fa) => (
              <ArtistCard
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
    </div>
  );
}
