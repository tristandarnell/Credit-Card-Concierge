/**
 * Quick test for the NLP normalization pipeline.
 * Loads from data/transactions_cleaned.csv and runs the full pipeline.
 *
 * Run: npx tsx scripts/test-normalize.ts
 */

import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { normalizeText, normalizeTransactions, removeStopWords } from "../lib/nlp";

function loadTransactionsFromCsv(csvPath: string): { date: string; description: string; amount: number; type: string }[] {
  const content = readFileSync(csvPath, "utf-8");
  const lines = content.trim().split("\n");
  const rows = lines.slice(1).filter((line) => line.trim());

  return rows.map((line) => {
    const parts: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        inQuotes = !inQuotes;
      } else if (c === "," && !inQuotes) {
        parts.push(current.trim());
        current = "";
      } else {
        current += c;
      }
    }
    parts.push(current.trim());

    const [date, description, amountStr, type] = parts;
    return {
      date: date ?? "",
      description: (description ?? "").replace(/^"|"$/g, "").replace(/""/g, '"'),
      amount: parseFloat(amountStr ?? "0") || 0,
      type: type ?? "debit",
    };
  });
}

const csvPath = join(process.cwd(), "data", "transactions_cleaned.csv");
const transactions = existsSync(csvPath)
  ? loadTransactionsFromCsv(csvPath)
  : [
      { date: "11/19/2025", description: "Purchase authorized on 11/18 Chi Psi Kappa Delt Instagram.Com TX S305323136433754 Card 8875", amount: 21.89, type: "debit" },
      { date: "11/24/2025", description: "Venmo Payment 251123 1046387755757 Ethan Liu", amount: 10.0, type: "credit" },
    ];

console.log(`Loaded ${transactions.length} transactions from ${existsSync(csvPath) ? "data/transactions_cleaned.csv" : "fallback sample"}\n`);

console.log("=== normalizeText + stop words (first row) ===\n");
const raw = transactions[0].description;
const afterNormalize = normalizeText(raw);
console.log("Input:       ", raw);
console.log("Normalized:  ", afterNormalize);
console.log("No stop words:", removeStopWords(afterNormalize));
console.log();

console.log("=== normalizeTransactions (full pipeline on all CSV rows) ===\n");
const normalized = normalizeTransactions(transactions);
for (const t of normalized) {
  console.log(`Date: ${t.date} | $${t.amount} | ${t.type}`);
  console.log(`  Original:   ${t.description}`);
  console.log(`  Normalized: ${t.normalizedDescription}`);
  console.log(`  Merchant:   ${t.normalizedMerchant}`);
  console.log();
}
