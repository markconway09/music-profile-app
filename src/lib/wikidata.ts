// Thin server-side client for Wikidata + Wikipedia's public APIs. Used as a
// fallback image (and occasionally name) source for group members, via a
// "wikidata" URL relation MusicBrainz already links from the member's own
// artist page — and, when MusicBrainz has no such link at all, via a
// name-search fallback confirmed against the group's own Wikidata item.

const WIKIDATA_API = "https://www.wikidata.org/w/api.php";
const WIKIPEDIA_SUMMARY_API = "https://en.wikipedia.org/api/rest_v1/page/summary";
const USER_AGENT = "MusicMeter/1.0 (https://music-profile-app.vercel.app)";

interface WikidataClaimImage {
  mainsnak: { datavalue?: { value: string } };
}

interface WikidataClaimEntity {
  mainsnak: { datavalue?: { value: { id: string } } };
}

interface WikidataEntity {
  labels?: { en?: { value: string } };
  claims?: {
    P18?: WikidataClaimImage[]; // image
    P463?: WikidataClaimEntity[]; // member of
    P361?: WikidataClaimEntity[]; // part of
  };
  sitelinks?: { enwiki?: { title: string } };
}

interface WikidataResponse {
  entities?: Record<string, WikidataEntity>;
}

export type WikidataResult = {
  imageUrl: string | null;
  enLabel: string | null;
};

async function fetchEntity(qid: string): Promise<WikidataEntity | null> {
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
  if (!res.ok) return null;
  const data = (await res.json()) as WikidataResponse;
  return data.entities?.[qid] ?? null;
}

async function extractResult(entity: WikidataEntity): Promise<WikidataResult> {
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
}

export async function getWikidataImageAndLabel(qid: string): Promise<WikidataResult> {
  try {
    const entity = await fetchEntity(qid);
    if (!entity) return { imageUrl: null, enLabel: null };
    return await extractResult(entity);
  } catch {
    return { imageUrl: null, enLabel: null };
  }
}

export type WikidataMemberMatch = WikidataResult & { qid: string };

/**
 * Last-resort discovery path for a member whose own MusicBrainz page has no
 * Wikidata link at all (common for newer/less-mainstream idols MusicBrainz
 * hasn't fully cross-referenced yet). Searches Wikidata directly by name
 * and only accepts a candidate that has a "member of" (P463) or "part of"
 * (P361) claim pointing at the group's own Wikidata item — idol stage
 * names are short, common words, so an unconfirmed hit is treated as no
 * match at all rather than risk attaching the wrong person's name/photo.
 */
export async function searchWikidataMemberMatch(
  name: string,
  groupWikidataQid: string
): Promise<WikidataMemberMatch | null> {
  try {
    const searchParams = new URLSearchParams({
      action: "wbsearchentities",
      search: name,
      language: "en",
      type: "item",
      limit: "5",
      format: "json",
    });
    const searchRes = await fetch(`${WIKIDATA_API}?${searchParams}`, {
      headers: { "User-Agent": USER_AGENT },
      cache: "no-store",
    });
    if (!searchRes.ok) return null;
    const searchData = (await searchRes.json()) as { search?: { id: string }[] };

    for (const candidate of searchData.search ?? []) {
      const entity = await fetchEntity(candidate.id);
      if (!entity) continue;

      const memberOfIds = [...(entity.claims?.P463 ?? []), ...(entity.claims?.P361 ?? [])].map(
        (c) => c.mainsnak?.datavalue?.value?.id
      );
      if (!memberOfIds.includes(groupWikidataQid)) continue;

      const result = await extractResult(entity);
      return { ...result, qid: candidate.id };
    }
    return null;
  } catch {
    return null;
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
