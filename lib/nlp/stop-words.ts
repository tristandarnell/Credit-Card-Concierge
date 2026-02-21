/**
 * Stop-word removal for statement text.
 * Removes common words that don't aid categorization or merchant matching.
 */

/** Statement-specific: boilerplate from bank formatting */
const STATEMENT_STOP_WORDS = new Set([
  "purchase", "authorized", "payment", "payments",
  "transaction", "transactions", "debit", "credit",
  "card", "inc", "llc", "ltd", "corp", "co",
]);

/** General English stop words */
const GENERAL_STOP_WORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "by",
  "for", "from", "has", "he", "in", "is", "it",
  "of", "on", "or", "that", "the", "to", "was",
  "were", "will", "with",
]);

/** Combined set */
const STOP_WORDS = new Set([...STATEMENT_STOP_WORDS, ...GENERAL_STOP_WORDS]);

/**
 * Remove stop words from tokenized text.
 * Input should already be lowercase, no punctuation.
 */
export function removeStopWords(text: string): string {
  if (!text?.trim()) return "";

  const words = text.split(/\s+/).filter(Boolean);
  const filtered = words.filter((w) => !STOP_WORDS.has(w));
  return filtered.join(" ");
}

/**
 * Add custom stop words (e.g. from your data analysis).
 */
export function addStopWords(words: string[]): void {
  for (const w of words) {
    STOP_WORDS.add(w.toLowerCase());
  }
}

/**
 * Get the current stop word set (read-only).
 */
export function getStopWords(): ReadonlySet<string> {
  return STOP_WORDS;
}
