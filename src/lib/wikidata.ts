// Thin server-side client for Wikidata's public API. Used as a fallback
// image (and occasionally name) source for group members, via a "wikidata"
// URL relation MusicBrainz already links from the member's own artist page.

const API_BASE = "https://www.wikidata.org/w/api.php";
const USER_AGENT = "MusicMeter/1.0 (https://music-profile-app.vercel.app)";

interface WikidataClaimImage {
  mainsnak: { datavalue?: { value: string } };
}

interface WikidataEntity {
  labels?: { en?: { value: string } };
  claims?: { P18?: WikidataClaimImage[] };
}

interface WikidataResponse {
  entities?: Record<string, WikidataEntity>;
}

export type WikidataResult = {
  imageUrl: string | null;
  enLabel: string | null;
};

export async function getWikidataImageAndLabel(qid: string): Promise<WikidataResult> {
  try {
    const params = new URLSearchParams({
      action: "wbgetentities",
      ids: qid,
      props: "claims|labels",
      languages: "en",
      format: "json",
    });
    const res = await fetch(`${API_BASE}?${params}`, {
      headers: { "User-Agent": USER_AGENT },
      cache: "no-store",
    });
    if (!res.ok) return { imageUrl: null, enLabel: null };

    const data = (await res.json()) as WikidataResponse;
    const entity = data.entities?.[qid];
    if (!entity) return { imageUrl: null, enLabel: null };

    const enLabel = entity.labels?.en?.value ?? null;

    const filename = entity.claims?.P18?.[0]?.mainsnak?.datavalue?.value;
    const imageUrl = filename
      ? `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(filename)}?width=300`
      : null;

    return { imageUrl, enLabel };
  } catch {
    return { imageUrl: null, enLabel: null };
  }
}
