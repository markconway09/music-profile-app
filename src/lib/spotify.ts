// Thin server-side client for the Spotify Web API using the Client
// Credentials flow (app-only auth — no user login, just catalog search).
// Never import this from a Client Component; the secret must stay server-side.

const TOKEN_URL = "https://accounts.spotify.com/api/token";
const API_BASE = "https://api.spotify.com/v1";

let cachedToken: { value: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 5_000) {
    return cachedToken.value;
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET are not configured");
  }

  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Spotify token request failed: ${res.status} ${await res.text()}`);
  }

  const data = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = {
    value: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
  return cachedToken.value;
}

async function spotifyFetch<T>(path: string): Promise<T> {
  const token = await getAccessToken();
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Spotify API request failed: ${res.status} ${await res.text()}`);
  }
  return res.json() as Promise<T>;
}

export type SpotifyArtistResult = {
  spotifyId: string;
  name: string;
  imageUrl: string | null;
  genres: string[];
  popularity: number;
};

export type SpotifyTrackResult = {
  spotifyId: string;
  title: string;
  imageUrl: string | null;
  previewUrl: string | null;
  artistSpotifyId: string;
  artistName: string;
};

interface SpotifyImage {
  url: string;
  height: number | null;
  width: number | null;
}

interface SpotifyArtistObject {
  id: string;
  name: string;
  images: SpotifyImage[];
  genres: string[];
  popularity: number;
}

interface SpotifyArtistSearchResponse {
  artists: { items: SpotifyArtistObject[] };
}

interface SpotifyTrackObject {
  id: string;
  name: string;
  preview_url: string | null;
  album: { images: SpotifyImage[] };
  artists: { id: string; name: string }[];
}

interface SpotifyTrackSearchResponse {
  tracks: { items: SpotifyTrackObject[] };
}

function pickImage(images: SpotifyImage[]): string | null {
  if (images.length === 0) return null;
  // Prefer a mid-sized image (roughly 300px) over the largest, to keep
  // profile pages light; fall back to whatever is available.
  const midSized = images.find((img) => (img.height ?? 0) <= 320 && (img.height ?? 0) >= 150);
  return (midSized ?? images[0]).url;
}

export async function searchArtists(query: string, limit = 8): Promise<SpotifyArtistResult[]> {
  const params = new URLSearchParams({ q: query, type: "artist", limit: String(limit) });
  const data = await spotifyFetch<SpotifyArtistSearchResponse>(`/search?${params}`);
  return data.artists.items.map((a) => ({
    spotifyId: a.id,
    name: a.name,
    imageUrl: pickImage(a.images),
    genres: a.genres,
    popularity: a.popularity,
  }));
}

export async function searchTracks(query: string, limit = 8): Promise<SpotifyTrackResult[]> {
  const params = new URLSearchParams({ q: query, type: "track", limit: String(limit) });
  const data = await spotifyFetch<SpotifyTrackSearchResponse>(`/search?${params}`);
  return data.tracks.items.map((t) => ({
    spotifyId: t.id,
    title: t.name,
    imageUrl: pickImage(t.album.images),
    previewUrl: t.preview_url,
    artistSpotifyId: t.artists[0]?.id ?? "",
    artistName: t.artists[0]?.name ?? "Unknown Artist",
  }));
}

export async function getArtist(spotifyId: string): Promise<SpotifyArtistResult> {
  const a = await spotifyFetch<SpotifyArtistObject>(`/artists/${spotifyId}`);
  return {
    spotifyId: a.id,
    name: a.name,
    imageUrl: pickImage(a.images),
    genres: a.genres,
    popularity: a.popularity,
  };
}

const KPOP_GENRE_HINTS = ["k-pop", "korean", "kpop"];
const JPOP_GENRE_HINTS = ["j-pop", "japanese", "jpop", "j-rock", "anime"];

export function inferOriginFromGenres(genres: string[] | undefined | null): "KPOP" | "JPOP" | "OTHER" {
  const lower = (genres ?? []).map((g) => g.toLowerCase());
  if (lower.some((g) => KPOP_GENRE_HINTS.some((hint) => g.includes(hint)))) return "KPOP";
  if (lower.some((g) => JPOP_GENRE_HINTS.some((hint) => g.includes(hint)))) return "JPOP";
  return "OTHER";
}
