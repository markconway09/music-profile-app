// Best-effort, offline romanization for Korean Hangul and Japanese kana.
// Kanji (and anything else not covered below) can't be derived from the
// characters alone — that's left to the MusicBrainz-alias / Wikidata-label
// fallbacks in the enrichment pipeline.

// Latin-1 Supplement letters (À-ÖØ-öø-ÿ) cover accented stage names like
// "ROSÉ" — without them, an already-fine name gets wrongly flagged as
// needing romanization and run through the alias/algorithmic pipeline,
// which can replace a perfectly good stylized name with something else
// (e.g. MusicBrainz's legal-name alias).
const LATIN_RE = /^[A-Za-z0-9À-ÖØ-öø-ÿ\s\-'.]+$/;
const HANGUL_RE = /[가-힣]/;
const KANA_RE = /[぀-ゟ゠-ヿ]/;
const KANJI_RE = /[一-鿿]/;

export function needsRomanization(text: string): boolean {
  return !LATIN_RE.test(text);
}

/** Does this text contain a script we can't algorithmically convert (e.g. Kanji)? */
export function hasUnconvertibleScript(text: string): boolean {
  return KANJI_RE.test(text);
}

export function isLatinText(text: string): boolean {
  return LATIN_RE.test(text);
}

/**
 * Attempts a full romanization of `text`. Returns null if any character
 * couldn't be converted (most commonly Kanji), signaling the caller should
 * fall back to an alias/label lookup instead.
 */
export function algorithmicRomanize(text: string): string | null {
  if (isLatinText(text)) return text;
  if (hasUnconvertibleScript(text)) return null;
  if (!HANGUL_RE.test(text) && !KANA_RE.test(text)) return null;

  let out = "";
  let i = 0;
  while (i < text.length) {
    const ch = text[i];
    const code = text.codePointAt(i)!;

    if (code >= 0xac00 && code <= 0xd7a3) {
      out += romanizeHangulSyllable(code);
      i += 1;
      continue;
    }

    if (KANA_RE.test(ch)) {
      const kanaResult = romanizeKanaAt(text, i);
      if (!kanaResult) return null;
      out += kanaResult.romaji;
      i += kanaResult.consumed;
      continue;
    }

    if (/\s/.test(ch)) {
      out += " ";
      i += 1;
      continue;
    }

    // Unknown character we don't have a mapping for.
    return null;
  }

  return out
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .map((word) => (word ? word.charAt(0).toUpperCase() + word.slice(1) : word))
    .join(" ");
}

// ---------- Korean: Revised Romanization of Korean (2000) ----------

const RR_INITIAL = [
  "g", "kk", "n", "d", "tt", "r", "m", "b", "pp", "s",
  "ss", "", "j", "jj", "ch", "k", "t", "p", "h",
];
const RR_MEDIAL = [
  "a", "ae", "ya", "yae", "eo", "e", "yeo", "ye", "o", "wa",
  "wae", "oe", "yo", "u", "wo", "we", "wi", "yu", "eu", "ui", "i",
];
const RR_FINAL = [
  "", "g", "kk", "gs", "n", "nj", "nh", "d", "l", "lg",
  "lm", "lb", "ls", "lt", "lp", "lh", "m", "b", "bs", "s",
  "ss", "ng", "j", "ch", "k", "t", "p", "h",
];

function romanizeHangulSyllable(code: number): string {
  const offset = code - 0xac00;
  const initial = Math.floor(offset / (21 * 28));
  const medial = Math.floor((offset % (21 * 28)) / 28);
  const final = offset % 28;
  return RR_INITIAL[initial] + RR_MEDIAL[medial] + RR_FINAL[final];
}

// ---------- Japanese: kana -> Hepburn romaji ----------

// Katakana (U+30A1-U+30F6) maps 1:1 onto Hiragana (U+3041-U+3096) with a
// fixed -0x60 offset, so normalize to hiragana and use one table.
function toHiragana(ch: string): string {
  const code = ch.codePointAt(0)!;
  if (code >= 0x30a1 && code <= 0x30f6) {
    return String.fromCodePoint(code - 0x60);
  }
  return ch;
}

const KANA_DIGRAPHS: Record<string, string> = {
  きゃ: "kya", きゅ: "kyu", きょ: "kyo",
  しゃ: "sha", しゅ: "shu", しょ: "sho",
  ちゃ: "cha", ちゅ: "chu", ちょ: "cho",
  にゃ: "nya", にゅ: "nyu", にょ: "nyo",
  ひゃ: "hya", ひゅ: "hyu", ひょ: "hyo",
  みゃ: "mya", みゅ: "myu", みょ: "myo",
  りゃ: "rya", りゅ: "ryu", りょ: "ryo",
  ぎゃ: "gya", ぎゅ: "gyu", ぎょ: "gyo",
  じゃ: "ja", じゅ: "ju", じょ: "jo",
  びゃ: "bya", びゅ: "byu", びょ: "byo",
  ぴゃ: "pya", ぴゅ: "pyu", ぴょ: "pyo",
};

const KANA_SINGLES: Record<string, string> = {
  あ: "a", い: "i", う: "u", え: "e", お: "o",
  か: "ka", き: "ki", く: "ku", け: "ke", こ: "ko",
  が: "ga", ぎ: "gi", ぐ: "gu", げ: "ge", ご: "go",
  さ: "sa", し: "shi", す: "su", せ: "se", そ: "so",
  ざ: "za", じ: "ji", ず: "zu", ぜ: "ze", ぞ: "zo",
  た: "ta", ち: "chi", つ: "tsu", て: "te", と: "to",
  だ: "da", ぢ: "ji", づ: "zu", で: "de", ど: "do",
  な: "na", に: "ni", ぬ: "nu", ね: "ne", の: "no",
  は: "ha", ひ: "hi", ふ: "fu", へ: "he", ほ: "ho",
  ば: "ba", び: "bi", ぶ: "bu", べ: "be", ぼ: "bo",
  ぱ: "pa", ぴ: "pi", ぷ: "pu", ぺ: "pe", ぽ: "po",
  ま: "ma", み: "mi", む: "mu", め: "me", も: "mo",
  や: "ya", ゆ: "yu", よ: "yo",
  ら: "ra", り: "ri", る: "ru", れ: "re", ろ: "ro",
  わ: "wa", ゐ: "i", ゑ: "e", を: "o", ん: "n",
  ゔ: "vu",
};

/** Romanizes one kana "unit" starting at index i (handles digraphs, っ gemination, ー). */
function romanizeKanaAt(text: string, i: number): { romaji: string; consumed: number } | null {
  const ch = toHiragana(text[i]);

  // Long vowel mark: repeat the previous vowel's romaji letter.
  if (ch === "ー") {
    const prev = i > 0 ? text[i - 1] : "";
    const prevRomaji = prev ? romanizeKanaAt(text, i - 1) : null;
    const vowel = prevRomaji?.romaji.slice(-1) ?? "";
    return { romaji: vowel, consumed: 1 };
  }

  // Small tsu (っ/ッ): geminate the next consonant. Only consumes itself —
  // the following kana is still processed normally by the main loop, so
  // this just emits the doubled leading consonant letter as a prefix.
  if (ch === "っ") {
    const next = i + 1 < text.length ? romanizeKanaAt(text, i + 1) : null;
    if (!next || !/^[a-z]/.test(next.romaji)) return null;
    return { romaji: next.romaji.charAt(0), consumed: 1 };
  }

  // Digraph: base kana + small ya/yu/yo.
  const two = ch + (i + 1 < text.length ? toHiragana(text[i + 1]) : "");
  if (KANA_DIGRAPHS[two]) {
    return { romaji: KANA_DIGRAPHS[two], consumed: 2 };
  }

  if (KANA_SINGLES[ch]) {
    return { romaji: KANA_SINGLES[ch], consumed: 1 };
  }

  return null;
}
