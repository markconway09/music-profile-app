import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";

export default async function DashboardHubPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:px-8">
      <h1 className="mb-2 text-2xl font-semibold">Editor</h1>
      <p className="mb-10 text-sm text-black/60 dark:text-white/60">
        What do you want to edit?
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          href="/dashboard/artists"
          className="rounded-xl border border-black/10 p-6 hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/10"
        >
          <h2 className="text-lg font-medium">Favorite Artists</h2>
          <p className="mt-1 text-sm text-black/60 dark:text-white/60">
            Search and rank artists, tick biases and ult biases, manage group members.
          </p>
        </Link>
        <Link
          href="/dashboard/songs"
          className="rounded-xl border border-black/10 p-6 hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/10"
        >
          <h2 className="text-lg font-medium">Favorite Songs</h2>
          <p className="mt-1 text-sm text-black/60 dark:text-white/60">
            Search and rank your top songs.
          </p>
        </Link>
      </div>
    </div>
  );
}
