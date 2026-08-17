import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ProfilePictureForm } from "@/components/account/ProfilePictureForm";
import { UsernameForm } from "@/components/account/UsernameForm";
import { EmailForm } from "@/components/account/EmailForm";
import { PasswordForm } from "@/components/account/PasswordForm";
import { DeleteAccountForm } from "@/components/account/DeleteAccountForm";

export default async function AccountSettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { username: true, email: true, image: true },
  });
  if (!user) redirect("/login");

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-8">
      <header className="mb-10">
        <Link href="/dashboard" className="text-sm text-black/50 hover:underline dark:text-white/50">
          ← Dashboard
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">Account Settings</h1>
      </header>

      <Section title="Profile Picture">
        <ProfilePictureForm currentImage={user.image} />
      </Section>

      <Section title="Username">
        <UsernameForm currentUsername={user.username} />
      </Section>

      <Section title="Email">
        <EmailForm currentEmail={user.email} />
      </Section>

      <Section title="Password">
        <PasswordForm />
      </Section>

      <Section title="Danger Zone" danger>
        <DeleteAccountForm />
      </Section>
    </div>
  );
}

function Section({
  title,
  children,
  danger,
}: {
  title: string;
  children: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <section
      className={`mb-6 rounded-xl border p-5 ${
        danger ? "border-red-600/30" : "border-black/10 dark:border-white/15"
      }`}
    >
      <h2 className={`mb-3 text-lg font-semibold ${danger ? "text-red-600" : ""}`}>{title}</h2>
      {children}
    </section>
  );
}
