import { notFound } from "next/navigation";
import { getProfileData } from "@/lib/profile-data";
import { Section, ViewAllLink, ArtistRow, RankedRow, Empty } from "@/components/profile/ProfilePieces";

const PREVIEW_COUNT = 10;

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;

  const data = await getProfileData(username);
  if (!data) notFound();
  const { user, topSongByArtistId, biasesByGroupId, ultBiasesRanked } = data;

  const artistsPreview = user.favoriteArtists.slice(0, PREVIEW_COUNT);
  const songsPreview = user.topSongs.slice(0, PREVIEW_COUNT);
  const ultsPreview = ultBiasesRanked.slice(0, PREVIEW_COUNT);

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
        {artistsPreview.length === 0 ? (
          <Empty />
        ) : (
          <ol className="flex flex-col gap-2">
            {artistsPreview.map((fa) => (
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
        {user.favoriteArtists.length > PREVIEW_COUNT && (
          <ViewAllLink href={`/u/${user.username}/artists`} count={user.favoriteArtists.length} />
        )}
      </Section>

      <Section title="Top Songs">
        {songsPreview.length === 0 ? (
          <Empty />
        ) : (
          <ol className="flex flex-col gap-2">
            {songsPreview.map((ts) => (
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
        {user.topSongs.length > PREVIEW_COUNT && (
          <ViewAllLink href={`/u/${user.username}/songs`} count={user.topSongs.length} />
        )}
      </Section>

      <Section title="Ultimate Biases">
        {ultsPreview.length === 0 ? (
          <Empty />
        ) : (
          <ol className="flex flex-col gap-2">
            {ultsPreview.map((b, idx) => (
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
        {ultBiasesRanked.length > PREVIEW_COUNT && (
          <ViewAllLink href={`/u/${user.username}/ults`} count={ultBiasesRanked.length} />
        )}
      </Section>
    </div>
  );
}
