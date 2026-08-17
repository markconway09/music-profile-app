import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { TopSongsEditor } from "@/components/dashboard/TopSongsEditor";

export default async function SongsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      topSongs: { include: { song: { include: { artist: true } } }, orderBy: { rank: "asc" } },
    },
  });
  if (!user) redirect("/login");

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-8">
      <header className="mb-10">
        <Link href="/dashboard" className="text-sm text-black/50 hover:underline dark:text-white/50">
          ← Dashboard
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">Favorite Songs</h1>
        <p className="text-sm text-black/60 dark:text-white/60">
          Search Spotify to add songs — drag to reorder, changes save automatically.
        </p>
      </header>

      <TopSongsEditor
        topSongs={user.topSongs.map((ts) => ({
          id: ts.songId,
          label: ts.song.title,
          sublabel: ts.song.artist.name,
          imageUrl: ts.song.imageUrl,
        }))}
      />
    </div>
  );
}
