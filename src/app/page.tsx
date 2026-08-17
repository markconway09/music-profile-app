import Link from "next/link";
import { prisma } from "@/lib/prisma";

// Lists recently created users, so this must not be frozen at build time.
export const dynamic = "force-dynamic";

export default async function Home() {
  const recentUsers = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    take: 8,
    select: { username: true },
  });

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 text-center sm:px-8">
      <h1 className="text-3xl font-semibold sm:text-4xl">
        Rank your favorite artists, songs, and biases.
      </h1>
      <p className="mt-4 text-black/60 dark:text-white/60">
        Build a public profile with your top k-pop and j-pop artists, songs, member
        rankings, and biases — then share it.
      </p>
      <div className="mt-8 flex justify-center gap-3">
        <Link
          href="/signup"
          className="rounded-md bg-foreground px-5 py-2.5 text-sm font-medium text-background"
        >
          Create your profile
        </Link>
        <Link
          href="/login"
          className="rounded-md border border-black/10 px-5 py-2.5 text-sm font-medium dark:border-white/20"
        >
          Log in
        </Link>
      </div>

      {recentUsers.length > 0 && (
        <div className="mt-16">
          <h2 className="mb-3 text-sm font-medium text-black/50 dark:text-white/50">
            Recent profiles
          </h2>
          <ul className="flex flex-wrap justify-center gap-2">
            {recentUsers.map((u) => (
              <li key={u.username}>
                <Link
                  href={`/u/${u.username}`}
                  className="rounded-full border border-black/10 px-3 py-1 text-sm hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
                >
                  @{u.username}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
