// Thin server-side client for Wikidata + Wikipedia's public APIs. Used as a
// fallback image (and occasionally name) source for group members, via a
// "wikidata" URL relation MusicBrainz already links from the member's own
// artist page.

const WIKIDATA_API = "https://www.wikidata.org/w/api.php";
const WIKIPEDIA_SUMMARY_API = "https://en.wikipedia.org/api/rest_v1/page/summary";
const USER_AGENT = "MusicMeter/1.0 (https://music-profile-app.vercel.app)";

interface WikidataClaimImage {
  mainsnak: { datavalue?: { value: string } };
}

interface WikidataEntity {
  labels?: { en?: { value: string } };
  claims?: { P18?: WikidataClaimImage[] };
  sitelinks?: { enwiki?: { title: string } };
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
      props: "claims|labels|sitelinks",
      languages: "en",
      format: "json",
    });
    const res = await fetch(`${WIKIDATA_API}?${params}`, {
      headers: { "User-Agent": USER_AGENT },
      cache: "no-store",
    });
    if (!res.ok) return { imageUrl: null, enLabel: null };

    const data = (await res.json()) as WikidataResponse;
    const entity = data.entities?.[qid];
    if (!entity) return { imageUrl: null, enLabel: null };

    const enLabel = entity.labels?.en?.value ?? null;

    const filename = entity.claims?.P18?.[0]?.mainsnak?.datavalue?.value;
    let imageUrl = filename
      ? `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(filename)}?width=300`
      : null;

    // Wikidata has no P18 photo claim for a lot of newer/less-notable
    // members — but the linked Wikipedia article often has a lead image
    // that just hasn't been mirrored into Wikidata's structured data yet.
    const enwikiTitle = entity.sitelinks?.enwiki?.title;
    if (!imageUrl && enwikiTitle) {
      imageUrl = await getWikipediaPageImage(enwikiTitle);
    }

    return { imageUrl, enLabel };
  } catch {
    return { imageUrl: null, enLabel: null };
  }
}

async function getWikipediaPageImage(title: string): Promise<string | null> {
  try {
    const path = encodeURIComponent(title.replace(/ /g, "_"));
    const res = await fetch(`${WIKIPEDIA_SUMMARY_API}/${path}`, {
      headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) return null;

    const data = (await res.json()) as {
      originalimage?: { source: string };
      thumbnail?: { source: string };
    };
    return data.originalimage?.source ?? data.thumbnail?.source ?? null;
  } catch {
    return null;
  }
}
