import { auth } from "@/auth";

/** Throws if there's no signed-in session — for server actions/routes that need one. */
export async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session.user.id;
}
