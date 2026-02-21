/**
 * Additional normalization: date fragments, city names, phone fragments,
 * TLDs, fuzzy spelling correction, stemming, first-N-words heuristic.
 */

import { PorterStemmer } from "natural";
import stringSimilarity from "string-similarity";

/** Common words in transaction descriptions for fuzzy spelling correction */
const SPELLING_DICT = [
  "pizza", "restaurant", "coffee", "grocery", "gas", "fuel",
  "bottling", "bottles", "transit", "ticket", "paygo", "etix",
  "instagram", "amazon", "uber", "lyft", "venmo", "spotify",
  "netflix", "quality", "pepsi", "mcdonalds", "starbucks",
  "walmart", "target", "whole", "foods", "trader", "joes",
  "chi", "psi", "kappa", "delt", "paygo", "newark", "new",
  "york", "raleigh", "north", "carolina",
];

const FUZZY_THRESHOLD = 0.75;

/** Remove standalone date-like tokens (1-2 digit numbers, e.g. 11, 18, 23) */
export function removeDateFragments(text: string): string {
  if (!text?.trim()) return "";
  const words = text.split(/\s+/).filter(Boolean);
  const filtered = words.filter((w) => {
    if (/^\d{1,2}$/.test(w)) return false; // standalone 1-2 digit
    return true;
  });
  return filtered.join(" ");
}

/** Common city names (multi-word and single) */
const CITY_NAMES = new Set([
  "new york", "los angeles", "san francisco", "san diego", "las vegas",
  "newark", "raleigh", "chicago", "houston", "phoenix", "philadelphia",
  "boston", "seattle", "denver", "austin", "miami", "atlanta",
]);

const STATE_ABBREVS = new Set([
  "al", "ak", "az", "ar", "ca", "co", "ct", "de", "fl", "ga", "hi", "id",
  "il", "in", "ia", "ks", "ky", "la", "me", "md", "ma", "mi", "mn", "ms",
  "mo", "mt", "ne", "nv", "nh", "nj", "nm", "ny", "nc", "nd", "oh", "ok",
  "or", "pa", "ri", "sc", "sd", "tn", "tx", "ut", "vt", "va", "wa", "wv",
  "wi", "wy", "dc",
]);

/** Remove city names and state abbrevs from text */
export function removeCityNames(text: string): string {
  if (!text?.trim()) return "";
  let result = text.trim().toLowerCase();
  // First remove state abbrevs so "new york ny" becomes "new york"
  const words1 = result.split(/\s+/).filter(Boolean);
  const noStates = words1.filter((w) => !(w.length === 2 && STATE_ABBREVS.has(w))).join(" ");
  result = noStates;
  for (const city of CITY_NAMES) {
    const re = new RegExp(`\\s+${city.replace(/\s+/g, "\\s+")}\\s*$`, "i");
    result = result.replace(re, "");
    result = result.replace(/\s+/g, " ").trim();
  }
  return result;
}

/** Remove orphan phone fragments (3-3-4 digit groups after punctuation removal) */
export function removePhoneFragments(text: string): string {
  if (!text?.trim()) return "";
  // Match: 3 digits + space + 3 digits + space + 4 digits (with possible extra digits)
  return text
    .replace(/\b\d{3}\s+\d{3}\s+\d{4}\b/g, "")
    .replace(/\b\d{3}\s+\d{3}\s+\d{3}\s+\d{4}\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Strip TLDs when they appear as standalone words after domain split */
const TLDs = new Set(["com", "net", "org", "co", "io"]);
export function stripTlds(text: string): string {
  if (!text?.trim()) return "";
  const words = text.split(/\s+/).filter(Boolean);
  const filtered = words.filter((w) => !TLDs.has(w.toLowerCase()));
  return filtered.join(" ");
}

/**
 * Fuzzy spelling correction: replace tokens with closest dictionary match.
 */
export function fuzzyCorrectSpelling(text: string): string {
  if (!text?.trim()) return "";
  const words = text.split(/\s+/).filter(Boolean);
  const corrected = words.map((w) => {
    if (/^\d+$/.test(w)) return w; // keep numbers
    if (w.length < 3) return w; // don't correct short tokens
    const match = stringSimilarity.findBestMatch(w.toLowerCase(), SPELLING_DICT);
    if (match.bestMatch.rating >= FUZZY_THRESHOLD) {
      return match.bestMatch.target;
    }
    return w;
  });
  return corrected.join(" ");
}

/**
 * Apply Porter stemming to each word.
 */
export function applyStemming(text: string): string {
  if (!text?.trim()) return "";
  const words = text.split(/\s+/).filter(Boolean);
  const stemmed = words.map((w) => {
    if (/^\d+$/.test(w)) return w;
    return PorterStemmer.stem(w);
  });
  return stemmed.join(" ");
}

/**
 * First N meaningful words for unknown merchants.
 * Use when we have "quality pizza new york" → "quality pizza"
 */
export function firstNWords(text: string, n = 2): string {
  if (!text?.trim()) return "";
  const words = text.split(/\s+/).filter(Boolean);
  return words.slice(0, n).join(" ");
}
