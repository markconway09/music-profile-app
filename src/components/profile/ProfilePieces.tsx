import Link from "next/link";

export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}

export function ViewAllLink({ href, count }: { href: string; count: number }) {
  return (
    <Link
      href={href}
      className="mt-3 inline-block text-sm text-black/50 hover:underline dark:text-white/50"
    >
      View all {count} →
    </Link>
  );
}

export function ArtistRow({
  rank,
  name,
  imageUrl,
  topSong,
  biases,
}: {
  rank: number;
  name: string;
  imageUrl: string | null;
  topSong?: { song: { title: string; imageUrl: string | null } };
  biases?: {
    memberId: string;
    isUlt: boolean;
    member: { name: string; imageUrl: string | null };
  }[];
}) {
  const ult = biases?.find((b) => b.isUlt);
  const others = biases?.filter((b) => !b.isUlt) ?? [];
  const hasDetails = Boolean(topSong) || Boolean(ult) || others.length > 0;

  return (
    <li className="group rounded-lg border border-black/10 dark:border-white/15">
      <details>
        <summary className="flex cursor-pointer list-none items-center gap-3 px-3 py-2 [&::-webkit-details-marker]:hidden">
          <span className="w-6 shrink-0 text-right text-sm font-semibold text-black/40 dark:text-white/40">
            {rank}
          </span>
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageUrl} alt="" className="h-10 w-10 shrink-0 rounded object-cover" />
          ) : (
            <span className="h-10 w-10 shrink-0 rounded bg-black/5 dark:bg-white/10" />
          )}
          <span className="flex-1">{name}</span>
          {hasDetails && (
            <svg
              viewBox="0 0 20 20"
              className="h-4 w-4 shrink-0 text-black/40 transition-transform group-open:rotate-90 dark:text-white/40"
              fill="currentColor"
            >
              <path d="M7 4l6 6-6 6V4z" />
            </svg>
          )}
        </summary>

        {hasDetails && (
          <div className="flex flex-col gap-3 border-t border-black/10 px-3 py-3 dark:border-white/15">
            {topSong && (
              <div>
                <p className="mb-1 text-xs text-black/40 dark:text-white/40">
                  Highest-ranked song
                </p>
                <div className="flex items-center gap-2">
                  {topSong.song.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={topSong.song.imageUrl}
                      alt=""
                      className="h-8 w-8 shrink-0 rounded object-cover"
                    />
                  ) : (
                    <span className="h-8 w-8 shrink-0 rounded bg-black/5 dark:bg-white/10" />
                  )}
                  <span className="text-sm">{topSong.song.title}</span>
                </div>
              </div>
            )}

            {(ult || others.length > 0) && (
              <div>
                <p className="mb-1 text-xs text-black/40 dark:text-white/40">Biases</p>
                <ul className="flex flex-wrap gap-2">
                  {ult && <BiasBadge name={ult.member.name} imageUrl={ult.member.imageUrl} isUlt />}
                  {others.map((b) => (
                    <BiasBadge key={b.memberId} name={b.member.name} imageUrl={b.member.imageUrl} />
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </details>
    </li>
  );
}

function BiasBadge({
  name,
  imageUrl,
  isUlt,
}: {
  name: string;
  imageUrl: string | null;
  isUlt?: boolean;
}) {
  return (
    <li
      className={`flex items-center gap-2 rounded-full border py-1 pl-1 pr-3 text-sm ${
        isUlt
          ? "border-foreground/30 bg-foreground/5"
          : "border-black/10 dark:border-white/20"
      }`}
    >
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt="" className="h-6 w-6 shrink-0 rounded-full object-cover" />
      ) : (
        <span className="h-6 w-6 shrink-0 rounded-full bg-black/5 dark:bg-white/10" />
      )}
      <span>
        {isUlt && <span className="text-black/50 dark:text-white/50">ult · </span>}
        {name}
      </span>
    </li>
  );
}

export function RankedRow({
  rank,
  label,
  sublabel,
  imageUrl,
}: {
  rank: number;
  label: string;
  sublabel?: string;
  imageUrl?: string | null;
}) {
  return (
    <li className="flex items-center gap-3 rounded-lg border border-black/10 px-3 py-2 dark:border-white/15">
      <span className="w-6 shrink-0 text-right text-sm font-semibold text-black/40 dark:text-white/40">
        {rank}
      </span>
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt="" className="h-10 w-10 shrink-0 rounded object-cover" />
      ) : (
        <span className="h-10 w-10 shrink-0 rounded bg-black/5 dark:bg-white/10" />
      )}
      <span className="flex-1">
        {label}
        {sublabel && (
          <span className="ml-2 text-sm text-black/50 dark:text-white/50">
            {sublabel}
          </span>
        )}
      </span>
    </li>
  );
}

export function Empty() {
  return (
    <p className="text-sm text-black/40 dark:text-white/40">Nothing here yet.</p>
  );
}
