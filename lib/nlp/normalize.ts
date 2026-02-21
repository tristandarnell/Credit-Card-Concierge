/**
 * NLP text normalization pipeline for transaction descriptions.
 * Prepares raw merchant/description text for categorization and analysis.
 */

import { normalizeMerchantDescription } from "./merchant-normalize";
import { removeStopWords } from "./stop-words";
import {
  removeDateFragments,
  removeCityNames,
  removePhoneFragments,
  stripTlds,
  fuzzyCorrectSpelling,
  applyStemming,
} from "./enhancements";

export interface Transaction {
  date: string;
  description: string;
  amount: number;
  type: string;
}

export interface NormalizedTransaction extends Transaction {
  /** Original description for display */
  description: string;
  /** Normalized text (lowercase, no punctuation, no IDs, no stop words) */
  normalizedDescription: string;
  /** Clean merchant name (no store #, locations; standardized variants) */
  normalizedMerchant: string;
}

/**
 * Normalize a single text string for NLP/categorization:
 * - Lowercase
 * - Remove punctuation
 * - Collapse whitespace
 * - Remove card/transaction reference numbers (e.g. S305323136433754, Card 8875)
 * - Remove common noise tokens
 */
export function normalizeText(text: string): string {
  if (!text?.trim()) return "";

  let normalized = text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ") // remove punctuation, keep letters/digits/spaces
    .replace(/\s+/g, " ") // collapse multiple spaces
    .trim();

  // Remove card/transaction IDs (long digit strings, "card 1234", etc.)
  normalized = normalized
    .replace(/\b[s]?\d{10,}\b/gi, "") // e.g. S305323136433754
    .replace(/\bcard\s*\d{4}\b/gi, "") // e.g. card 8875
    .replace(/\b\d{10,}\b/g, ""); // standalone long numbers

  // Remove common noise (phone numbers, authorization refs)
  normalized = normalized.replace(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, ""); // phone numbers

  // Additional enhancements
  normalized = removePhoneFragments(normalized);
  normalized = removeDateFragments(normalized);
  normalized = removeCityNames(normalized);
  normalized = stripTlds(normalized);

  // Final cleanup: collapse spaces again, trim
  normalized = normalized.replace(/\s+/g, " ").trim();

  return normalized;
}

/**
 * Apply normalization to a single transaction.
 * Pipeline: raw → normalizeText → removeStopWords → fuzzyCorrect → stem → normalizedDescription.
 */
export function normalizeTransaction(txn: Transaction): NormalizedTransaction {
  const normalizedDesc = normalizeText(txn.description);
  const noStopWords = removeStopWords(normalizedDesc);
  const spellCorrected = fuzzyCorrectSpelling(noStopWords);
  const stemmed = applyStemming(spellCorrected);
  return {
    ...txn,
    normalizedDescription: stemmed,
    normalizedMerchant: normalizeMerchantDescription(txn.description),
  };
}

/**
 * Normalize a list of transactions for the NLP pipeline.
 */
export function normalizeTransactions(txns: Transaction[]): NormalizedTransaction[] {
  return txns.map(normalizeTransaction);
}
