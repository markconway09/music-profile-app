"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";

export function NavBar() {
  const { data: session, status } = useSession();

  return (
    <header className="flex items-center justify-between border-b border-black/10 px-4 py-3 dark:border-white/15 sm:px-8">
      <Link href="/" className="font-semibold">
        🎵 MusicMeter
      </Link>
      <nav className="flex items-center gap-4 text-sm">
        {status === "loading" ? null : session?.user ? (
          <>
            {session.user.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={session.user.image}
                alt=""
                className="h-7 w-7 rounded-full object-cover"
              />
            ) : (
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-black/5 text-xs font-semibold dark:bg-white/10">
                {session.user.name?.slice(0, 1).toUpperCase()}
              </span>
            )}
            <Link href={`/u/${session.user.name}`} className="hover:underline">
              My profile
            </Link>
            <Link href="/dashboard" className="hover:underline">
              Dashboard
            </Link>
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="rounded-md border border-black/10 px-3 py-1 dark:border-white/20"
            >
              Log out
            </button>
          </>
        ) : (
          <>
            <Link href="/login" className="hover:underline">
              Log in
            </Link>
            <Link
              href="/signup"
              className="rounded-md bg-foreground px-3 py-1 text-background"
            >
              Sign up
            </Link>
          </>
        )}
      </nav>
    </header>
  );
}
