// Thin server-side client for the MusicBrainz API. No API key required,
// but their usage policy requires a descriptive User-Agent and asks for
// roughly 1 request/second from unauthenticated clients — we throttle to
// be a good citizen.

const API_BASE = "https://musicbrainz.org/ws/2";
const USER_AGENT = "MusicMeter/1.0 (https://music-profile-app.vercel.app)";

let lastRequestAt = 0;
const MIN_INTERVAL_MS = 1100;

async function throttle() {
  const wait = lastRequestAt + MIN_INTERVAL_MS - Date.now();
  if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
  lastRequestAt = Date.now();
}

// MusicBrainz's shared public instance returns 503 ("currently busy, try
// again later") fairly often under normal load — not a sign of anything
// wrong on our end. A couple of short retries meaningfully improves success
// rate for what would otherwise silently degrade to "unknown" every time.
const MAX_RETRIES = 2;

async function mbFetch<T>(path: string): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    await throttle();
    const res = await fetch(`${API_BASE}${path}`, {
      headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
      cache: "no-store",
    });
    if (res.ok) return res.json() as Promise<T>;

    if (res.status === 503 && attempt < MAX_RETRIES) {
      await new Promise((resolve) => setTimeout(resolve, 1500 * (attempt + 1)));
      continue;
    }
    throw new Error(`MusicBrainz request failed: ${res.status} ${await res.text()}`);
  }
}

interface MbArtistSearchHit {
  id: string;
  name: string;
  score: number;
  type?: string; // "Person" | "Group" | "Orchestra" | "Choir" | "Character" | "Other"
  country?: string; // ISO 3166-1 alpha-2, e.g. "KR", "JP"
  area?: { name: string } | null;
}

interface MbArtistSearchResponse {
  artists: MbArtistSearchHit[];
}

interface MbUrlRelation {
  type: string;
  "target-type": "url";
  url: { resource: string };
}

interface MbArtistRelation {
  type: string; // e.g. "member of band"
  "target-type": "artist";
  direction: "forward" | "backward";
  ended: boolean;
  artist: { id: string; name: string; type?: string };
}

interface MbAlias {
  name: string;
  locale: string | null;
  primary: boolean | null;
}

interface MbArtistDetail {
  id: string;
  name: string;
  type?: string;
  relations: (MbUrlRelation | MbArtistRelation)[];
  aliases?: MbAlias[];
}

export type ArtistClassification = {
  musicbrainzId: string;
  type: "SOLO" | "GROUP";
  origin: "KPOP" | "JPOP" | "OTHER";
};

/** MusicBrainz's own country/area data is a far more reliable origin signal
 *  than Spotify genre tags, which are frequently empty for K-pop/J-pop acts. */
function inferOriginFromCountry(hit: MbArtistSearchHit): "KPOP" | "JPOP" | "OTHER" {
  if (hit.country === "KR") return "KPOP";
  if (hit.country === "JP") return "JPOP";
  const area = hit.area?.name.toLowerCase() ?? "";
  if (area.includes("korea")) return "KPOP";
  if (area.includes("japan")) return "JPOP";
  return "OTHER";
}

export type MusicBrainzMember = {
  musicbrainzId: string;
  name: string;
};

/**
 * Best-effort lookup: search MusicBrainz for an artist by name, and try to
 * confirm the match by finding a relation URL pointing at the given Spotify
 * artist ID. Returns null if nothing confident is found — callers should
 * treat that as "unknown, ask the user" rather than an error.
 */
export async function classifyArtist(
  name: string,
  spotifyId: string
): Promise<ArtistClassification | null> {
  try {
    const query = encodeURIComponent(`artist:"${name}"`);
    const search = await mbFetch<MbArtistSearchResponse>(`/artist/?query=${query}&fmt=json&limit=5`);

    for (const candidate of search.artists) {
      if (candidate.score < 80) continue;
      const detail = await mbFetch<MbArtistDetail>(
        `/artist/${candidate.id}?inc=url-rels&fmt=json`
      );
      const spotifyMatch = detail.relations.some(
        (rel): rel is MbUrlRelation =>
          rel["target-type"] === "url" &&
          "url" in rel &&
          rel.url.resource.includes(`open.spotify.com/artist/${spotifyId}`)
      );
      if (spotifyMatch) {
        return {
          musicbrainzId: candidate.id,
          type: candidate.type === "Group" ? "GROUP" : "SOLO",
          origin: inferOriginFromCountry(candidate),
        };
      }
    }
    return null;
  } catch {
    // MusicBrainz being slow/down shouldn't block adding an artist.
    return null;
  }
}

/** Fetch current (non-former) members of a group by MusicBrainz ID. */
export async function getCurrentMembers(musicbrainzId: string): Promise<MusicBrainzMember[]> {
  try {
    const detail = await mbFetch<MbArtistDetail>(
      `/artist/${musicbrainzId}?inc=artist-rels&fmt=json`
    );
    return detail.relations
      .filter(
        (rel): rel is MbArtistRelation =>
          rel["target-type"] === "artist" && rel.type === "member of band" && !rel.ended
      )
      .map((rel) => ({ musicbrainzId: rel.artist.id, name: rel.artist.name }));
  } catch {
    return [];
  }
}

export type MemberEnrichmentSource = {
  aliases: { name: string; locale: string | null; primary: boolean | null }[];
  wikidataQid: string | null;
};

/**
 * One combined lookup (aliases + external links) for a single member's own
 * MusicBrainz page, used by the name-romanization / photo enrichment flow.
 */
export async function getMemberEnrichmentSource(
  musicbrainzId: string
): Promise<MemberEnrichmentSource | null> {
  try {
    const detail = await mbFetch<MbArtistDetail>(
      `/artist/${musicbrainzId}?inc=aliases+url-rels&fmt=json`
    );
    const wikidataRel = detail.relations.find(
      (rel): rel is MbUrlRelation =>
        rel["target-type"] === "url" && rel.url.resource.includes("wikidata.org/wiki/")
    );
    const wikidataQid = wikidataRel ? (wikidataRel.url.resource.split("/").pop() ?? null) : null;

    return { aliases: detail.aliases ?? [], wikidataQid };
  } catch {
    return null;
  }
}

const LATIN_ALIAS_RE = /^[A-Za-z0-9\s\-'.]+$/;

/** Picks the best Latin-script name from a MusicBrainz alias list, if any. */
export function pickLatinAlias(aliases: MemberEnrichmentSource["aliases"]): string | null {
  const primaryEn = aliases.find(
    (a) => a.primary && a.locale?.startsWith("en") && LATIN_ALIAS_RE.test(a.name)
  );
  if (primaryEn) return primaryEn.name;

  const anyEn = aliases.find((a) => a.locale?.startsWith("en") && LATIN_ALIAS_RE.test(a.name));
  if (anyEn) return anyEn.name;

  const anyLatin = aliases.find((a) => LATIN_ALIAS_RE.test(a.name));
  return anyLatin?.name ?? null;
}
