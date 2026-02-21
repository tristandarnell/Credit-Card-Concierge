/**
 * Merchant normalization: reduce noise in transaction descriptions.
 * - Remove store numbers (#1234), locations (NY, NYC, city names)
 * - Standardize common merchant name variants (from built-in or external map)
 * - Fuzzy matching for variant lookup and repeated merchants
 * - First-N-words heuristic for unknown merchants
 */

import stringSimilarity from "string-similarity";
import { removeCityNames, firstNWords, stripTlds } from "./enhancements";

export type MerchantVariantMap = Record<string, string[]>;

/** Built-in seed. Extend via data/merchant-variants.json or setMerchantVariants(). */
const BUILTIN_VARIANTS: MerchantVariantMap = {
  mcdonalds: ["mcd", "mcds", "mcdonalds", "macdonalds"],
  starbucks: ["starbucks", "starbucks coffee", "sbux"],
  walmart: ["walmart", "wal mart", "wm supercenter"],
  target: ["target", "target store"],
  costco: ["costco", "costco wholesale"],
  amazon: ["amazon", "amazon.com", "amzn"],
  shell: ["shell", "shell oil"],
  exxon: ["exxon", "exxonmobil", "exxon mobil"],
  chevron: ["chevron", "chevron texaco"],
  subway: ["subway", "subway sandwiches"],
  chipotle: ["chipotle", "chipotle mexican grill"],
  whole_foods: ["whole foods", "whole foods market"],
  trader_joes: ["trader joes", "trader joe", "trader joes market"],
  uber: ["uber", "uber trip", "uber eats"],
  lyft: ["lyft", "lyft ride"],
  venmo: ["venmo", "venmo payment"],
  spotify: ["spotify", "spotify usa"],
  netflix: ["netflix", "netflix.com"],
  hulu: ["hulu", "hulu llc"],
  apple: ["apple", "apple.com", "apple store", "itunes"],
  pepsi: ["pepsi", "pepsi bottling", "pepsi co", "ctlppepsi", "ctlpepsi"],
  mta: ["mta", "mta nyct", "mta paygo", "mta mnr", "mta lirr"],
  njt: ["njt", "njt rail", "nj transit"],
};

// Mutable variant map: merge built-in + any loaded custom data
let activeVariantMap = new Map<string, string>();
let activeSingleWordMap = new Map<string, string>();

function rebuildMaps(variants: MerchantVariantMap) {
  const variantMap = new Map<string, string>();
  const singleWordMap = new Map<string, string>();
  for (const [canonical, list] of Object.entries(variants)) {
    for (const v of list) {
      const key = v.replace(/\s+/g, " ").trim().replace(/\s+/g, "_");
      variantMap.set(key, canonical);
      const token = v.split(/\s+/)[0];
      if (token && !singleWordMap.has(token)) singleWordMap.set(token, canonical);
    }
    variantMap.set(canonical.replace(/_/g, " "), canonical);
  }
  activeVariantMap = variantMap;
  activeSingleWordMap = singleWordMap;
}

rebuildMaps(BUILTIN_VARIANTS);

/**
 * Replace or extend the merchant variant map.
 * Use to load a larger external map (JSON file, API, etc.).
 * Merges with built-in unless replaceBuiltin is true.
 */
export function setMerchantVariants(
  variants: MerchantVariantMap,
  replaceBuiltin = false
): void {
  const merged = replaceBuiltin ? variants : { ...BUILTIN_VARIANTS, ...variants };
  rebuildMaps(merged);
}

/**
 * Load variant map from JSON. Format: { "canonical": ["variant1", "variant2"], ... }
 */
export async function loadMerchantVariantsFromUrl(url: string): Promise<void> {
  const res = await fetch(url);
  const data = (await res.json()) as MerchantVariantMap;
  setMerchantVariants(data, false);
}

// US state abbreviations (2-letter)
const STATE_ABBREVS = new Set([
  "al", "ak", "az", "ar", "ca", "co", "ct", "de", "fl", "ga",
  "hi", "id", "il", "in", "ia", "ks", "ky", "la", "me", "md",
  "ma", "mi", "mn", "ms", "mo", "mt", "ne", "nv", "nh", "nj",
  "nm", "ny", "nc", "nd", "oh", "ok", "or", "pa", "ri", "sc",
  "sd", "tn", "tx", "ut", "vt", "va", "wa", "wv", "wi", "wy", "dc"
]);

const LOCATION_ABBREVS = new Set([
  "ny", "nyc", "la", "sf", "chicago", "houston", "phoenix", "philly",
  "dc", "nj", "tx", "nc", "fl"
]);

/** Strip Wells Fargo boilerplate: "purchase authorized on 11 23" or "purchase authorized on 11/23" */
function removeStatementBoilerplate(text: string): string {
  return text
    .replace(/^purchase\s+authorized\s+on\s+\d{1,2}\s*\/?\s*\d{1,2}\s*/i, "")
    .replace(/^payment\s+/i, "")
    .trim();
}

function removeStoreNumbers(text: string): string {
  return text
    .replace(/#\s*\d+/g, "")
    .replace(/\bstore\s*\d+\b/gi, "")
    .replace(/\bunit\s*\d+\b/gi, "")
    .replace(/\b\d+\s*(?:st|nd|rd|th)\s+(?:ave|street|st)\b/gi, "");
}

function removeLocations(text: string): string {
  const words = text.split(/\s+/);
  const filtered: string[] = [];
  for (let i = 0; i < words.length; i++) {
    const w = words[i].toLowerCase();
    if (w.length === 2 && STATE_ABBREVS.has(w)) continue;
    if (LOCATION_ABBREVS.has(w)) continue;
    filtered.push(words[i]);
  }
  return filtered.join(" ");
}

function applyMerchantVariants(text: string): string | null {
  const trimmed = text.replace(/\s+/g, " ").trim().toLowerCase();
  const words = trimmed.split(/\s+/).filter(Boolean);

  for (let len = Math.min(words.length, 4); len >= 1; len--) {
    const phrase = words.slice(0, len).join("_");
    const canonical = activeVariantMap.get(phrase);
    if (canonical) return canonical.replace(/_/g, " ");
  }

  for (const word of words) {
    const canonical = activeSingleWordMap.get(word);
    if (canonical) return canonical.replace(/_/g, " ");
  }

  // Fuzzy match against known variants
  const variantStrings = Array.from(activeVariantMap.keys());
  const match = stringSimilarity.findBestMatch(trimmed.replace(/\s+/g, "_"), variantStrings);
  if (match.bestMatch.rating >= 0.85) {
    const canonical = activeVariantMap.get(match.bestMatch.target);
    if (canonical) return canonical.replace(/_/g, " ");
  }

  return null; // no match → caller uses firstNWords heuristic
}

/**
 * Full merchant normalization pipeline.
 */
export function normalizeMerchant(text: string): string {
  if (!text?.trim()) return "";

  let result = text
    .toLowerCase()
    .replace(/[^\w\s#]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  result = removeStatementBoilerplate(result);
  result = removeStoreNumbers(result);
  result = removeLocations(result);
  result = removeCityNames(result);
  result = stripTlds(result);
  result = result.replace(/\s+/g, " ").trim();

  const canonical = applyMerchantVariants(result);
  if (canonical != null) return canonical;

  // First-N-words heuristic for unknown merchants (max 3 to preserve org names)
  return firstNWords(result, 3);
}

/**
 * Normalize merchant for categorization.
 */
export function normalizeMerchantDescription(rawDescription: string): string {
  const cleaned = rawDescription
    .toLowerCase()
    .replace(/[^\w\s#]/g, " ")
    .replace(/\b[s]?\d{10,}\b/gi, "")
    .replace(/\bcard\s*\d{4}\b/gi, "")
    .replace(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, "")
    .replace(/\s+/g, " ")
    .trim();

  return normalizeMerchant(cleaned);
}

/**
 * Fuzzy similarity (Jaccard on word tokens). Returns 0–1.
 */
export function merchantSimilarity(a: string, b: string): number {
  const wordsA = new Set(a.toLowerCase().split(/\s+/).filter(Boolean));
  const wordsB = new Set(b.toLowerCase().split(/\s+/).filter(Boolean));
  if (wordsA.size === 0 && wordsB.size === 0) return 1;
  if (wordsA.size === 0 || wordsB.size === 0) return 0;
  const intersection = [...wordsA].filter((w) => wordsB.has(w)).length;
  const union = new Set([...wordsA, ...wordsB]).size;
  return intersection / union;
}
