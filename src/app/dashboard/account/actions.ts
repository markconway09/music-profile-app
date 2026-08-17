"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/require-user";

// Server Actions have their thrown error messages redacted by Next.js in
// production (to avoid leaking server internals), so every expected
// validation/business failure here is returned as `{ success: false, error }`
// instead of thrown — thrown errors are reserved for genuinely unexpected
// failures. `success` is a proper boolean discriminant (rather than checking
// truthiness of `error`) so TypeScript can actually narrow the union: an
// empty-string error would still be a valid (if useless) member of a
// `{ error: string }` branch, so a truthy check on `error` alone can't fully
// exclude it.
type Failure = { success: false; error: string };
type ActionResult<T> = Failure | ({ success: true } & T);
type SimpleResult = Failure | { success: true };

function fail(error: string): Failure {
  return { success: false, error };
}

const USERNAME_RE = /^[a-z0-9_-]{3,20}$/i;

function isUniqueConstraintError(e: unknown): boolean {
  return e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";
}

export async function updateProfileImage(
  imageUrl: string
): Promise<ActionResult<{ image: string | null }>> {
  const userId = await requireUserId();
  const trimmed = imageUrl.trim();

  if (trimmed && !/^https?:\/\//i.test(trimmed)) {
    return fail("Image must be a URL starting with http:// or https://");
  }

  await prisma.user.update({ where: { id: userId }, data: { image: trimmed || null } });
  await revalidateForUser(userId);
  return { success: true, image: trimmed || null };
}

export async function updateUsername(
  newUsername: string
): Promise<ActionResult<{ username: string }>> {
  const userId = await requireUserId();
  const trimmed = newUsername.trim();

  if (!USERNAME_RE.test(trimmed)) {
    return fail("Username must be 3-20 letters, numbers, - or _.");
  }

  const previous = await prisma.user.findUnique({ where: { id: userId }, select: { username: true } });

  try {
    await prisma.user.update({ where: { id: userId }, data: { username: trimmed } });
  } catch (e) {
    if (isUniqueConstraintError(e)) return fail("That username is already taken.");
    throw e;
  }

  revalidatePath("/dashboard/account");
  revalidatePath("/dashboard");
  if (previous) revalidatePath(`/u/${previous.username}`);
  revalidatePath(`/u/${trimmed}`);
  return { success: true, username: trimmed };
}

export async function updateEmail(
  newEmail: string,
  currentPassword: string
): Promise<ActionResult<{ email: string }>> {
  const userId = await requireUserId();
  const email = newEmail.trim().toLowerCase();

  if (!email.includes("@") || email.length < 5) {
    return fail("Invalid email address.");
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return fail("Account not found.");

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) return fail("Incorrect password.");

  try {
    await prisma.user.update({ where: { id: userId }, data: { email } });
  } catch (e) {
    if (isUniqueConstraintError(e)) return fail("That email is already in use.");
    throw e;
  }

  revalidatePath("/dashboard/account");
  return { success: true, email };
}

export async function updatePassword(
  currentPassword: string,
  newPassword: string
): Promise<SimpleResult> {
  const userId = await requireUserId();

  if (newPassword.length < 8) {
    return fail("New password must be at least 8 characters.");
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return fail("Account not found.");

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) return fail("Current password is incorrect.");

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
  return { success: true };
}

export async function deleteAccount(currentPassword: string): Promise<SimpleResult> {
  const userId = await requireUserId();

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return fail("Account not found.");

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) return fail("Incorrect password.");

  // Cascades (onDelete: Cascade) clean up favorites/top songs/biases; the
  // shared catalog (artists/songs/members) is untouched.
  await prisma.user.delete({ where: { id: userId } });
  return { success: true };
}

async function revalidateForUser(userId: string) {
  revalidatePath("/dashboard/account");
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { username: true } });
  if (user) revalidatePath(`/u/${user.username}`);
}
