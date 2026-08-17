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

async function mbFetch<T>(path: string): Promise<T> {
  await throttle();
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`MusicBrainz request failed: ${res.status} ${await res.text()}`);
  }
  return res.json() as Promise<T>;
}

interface MbArtistSearchHit {
  id: string;
  name: string;
  score: number;
  type?: string; // "Person" | "Group" | "Orchestra" | "Choir" | "Character" | "Other"
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

interface MbArtistDetail {
  id: string;
  name: string;
  type?: string;
  relations: (MbUrlRelation | MbArtistRelation)[];
}

export type ArtistClassification = {
  musicbrainzId: string;
  type: "SOLO" | "GROUP";
};

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
