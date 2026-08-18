import Link from "next/link";
import { notFound } from "next/navigation";
import { getProfileData } from "@/lib/profile-data";
import { Section, RankedCard, Empty } from "@/components/profile/ProfilePieces";

export default async function AllUltBiasesPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;

  const data = await getProfileData(username);
  if (!data) notFound();
  const { user, ultBiasesRanked } = data;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-8">
      <header className="mb-10">
        <Link
          href={`/u/${user.username}`}
          className="text-sm text-black/50 hover:underline dark:text-white/50"
        >
          ← @{user.username}
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">All Ultimate Biases</h1>
      </header>

      <Section title={`Ultimate Biases (${ultBiasesRanked.length})`}>
        {ultBiasesRanked.length === 0 ? (
          <Empty />
        ) : (
          <ol className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {ultBiasesRanked.map((b, idx) => (
              <RankedCard
                key={b.memberId}
                rank={idx + 1}
                label={b.member.name}
                sublabel={b.group.name}
                imageUrl={b.member.imageUrl}
              />
            ))}
          </ol>
        )}
      </Section>
    </div>
  );
}
