import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { FavoriteArtistsEditor } from "@/components/dashboard/FavoriteArtistsEditor";
import { ArtistMetaEditor } from "@/components/dashboard/ArtistMetaEditor";
import { MemberBiasTicker } from "@/components/dashboard/MemberBiasTicker";
import { MemberManager } from "@/components/dashboard/MemberManager";
import { EnrichMembersButton } from "@/components/dashboard/EnrichMembersButton";
import { CollapsibleGroup } from "@/components/dashboard/CollapsibleGroup";
import { UltBiasRankingEditor } from "@/components/dashboard/UltBiasRankingEditor";

export default async function ArtistsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      favoriteArtists: {
        include: { artist: { include: { members: true } } },
        orderBy: { rank: "asc" },
      },
      biases: { include: { member: true, group: true } },
    },
  });
  if (!user) redirect("/login");

  const allFavoritedGroups = user.favoriteArtists
    .map((fa) => fa.artist)
    .filter((a) => a.type === "GROUP");

  // Biases only make sense to tick for K-pop/J-pop groups — that's the
  // whole point of the origin field. A group that already has bias data
  // (e.g. from before its origin was corrected) stays visible so nothing
  // already set becomes unmanageable; fixing a misclassified origin above
  // is what brings a group back into this list.
  const groupIdsWithExistingBiases = new Set(user.biases.map((b) => b.groupId));
  const favoritedGroups = allFavoritedGroups.filter(
    (a) => a.origin === "KPOP" || a.origin === "JPOP" || groupIdsWithExistingBiases.has(a.id)
  );
  const excludedGroupCount = allFavoritedGroups.length - favoritedGroups.length;

  const biasByMemberId = new Map(user.biases.map((b) => [b.memberId, b]));

  const ultBiases = user.biases
    .filter((b) => b.isUlt)
    .sort((a, b) => (a.ultRank ?? 0) - (b.ultRank ?? 0))
    .map((b) => ({
      id: b.memberId,
      label: b.member.name,
      sublabel: b.group.name,
      imageUrl: b.member.imageUrl,
    }));

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-8">
      <header className="mb-10">
        <Link href="/dashboard" className="text-sm text-black/50 hover:underline dark:text-white/50">
          ← Dashboard
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">Favorite Artists</h1>
        <p className="text-sm text-black/60 dark:text-white/60">
          Search Spotify to add artists — drag to reorder, changes save automatically.
        </p>
      </header>

      <Section title="Favorite Artists">
        <FavoriteArtistsEditor
          favorites={user.favoriteArtists.map((fa) => ({
            id: fa.artistId,
            label: fa.artist.name,
            imageUrl: fa.artist.imageUrl,
          }))}
        />
        <ArtistMetaEditor
          artists={user.favoriteArtists.map((fa) => ({
            id: fa.artist.id,
            name: fa.artist.name,
            type: fa.artist.type,
            origin: fa.artist.origin,
          }))}
        />
      </Section>

      <Section title="Biases">
        {favoritedGroups.length === 0 ? (
          <p className="text-sm text-black/40 dark:text-white/40">
            {allFavoritedGroups.length === 0
              ? "Add a group to your favorite artists to tick biases."
              : "Biases are only available for K-pop and J-pop groups — fix a group's origin above if it's misclassified."}
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {favoritedGroups.map((group) => {
              const groupMembers = group.members.map((m) => {
                const b = biasByMemberId.get(m.id);
                return {
                  id: m.id,
                  name: m.name,
                  imageUrl: m.imageUrl,
                  isBias: Boolean(b),
                  isUlt: Boolean(b?.isUlt),
                };
              });
              const biasCount = groupMembers.filter((m) => m.isBias).length;
              const ult = groupMembers.find((m) => m.isUlt);

              return (
                <CollapsibleGroup
                  key={group.id}
                  title={group.name}
                  subtitle={
                    biasCount === 0
                      ? undefined
                      : `${biasCount} bias${biasCount === 1 ? "" : "es"}${ult ? ` · ult: ${ult.name}` : ""}`
                  }
                >
                  <MemberBiasTicker groupId={group.id} members={groupMembers} />
                  <MemberManager
                    groupId={group.id}
                    members={group.members.map((m) => ({
                      id: m.id,
                      name: m.name,
                      imageUrl: m.imageUrl,
                    }))}
                  />
                  <EnrichMembersButton groupId={group.id} />
                </CollapsibleGroup>
              );
            })}
            {excludedGroupCount > 0 && (
              <p className="text-xs text-black/40 dark:text-white/40">
                {excludedGroupCount} group{excludedGroupCount === 1 ? "" : "s"} hidden — biases are
                only available for K-pop and J-pop groups. Fix a group&apos;s origin above if it&apos;s
                misclassified.
              </p>
            )}
          </div>
        )}
      </Section>

      <Section title="Ult Bias Ranking">
        <UltBiasRankingEditor items={ultBiases} />
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="mb-3 text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}
