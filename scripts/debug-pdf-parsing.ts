/**
 * Debug PDF parsing and spend calculation.
 * Run after uploading a statement: npx tsx scripts/debug-pdf-parsing.ts
 *
 * Shows: parsed transactions, debit vs credit totals, what goes into the pie chart.
 */

import { readFileSync, existsSync } from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const CSV_PATH = path.join(DATA_DIR, "transactions_categorized.csv");

function parseCsvRow(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      inQuotes = !inQuotes;
    } else if ((c === "," && !inQuotes) || c === "\n") {
      out.push(cur.trim());
      cur = "";
    } else {
      cur += c;
    }
  }
  out.push(cur.trim());
  return out;
}

function main() {
  if (!existsSync(CSV_PATH)) {
    console.log("No categorized CSV found. Upload a PDF first via /upload.");
    console.log(`Expected path: ${CSV_PATH}`);
    process.exit(1);
  }

  const content = readFileSync(CSV_PATH, "utf-8");
  const lines = content.split("\n").filter((l) => l.trim());
  if (lines.length < 2) {
    console.log("CSV is empty or has no data rows.");
    process.exit(1);
  }

  const header = lines[0].toLowerCase().split(",");
  const amountIdx = header.findIndex((h) => h.includes("amount"));
  const typeIdx = header.findIndex((h) => h.includes("type"));
  const descIdx = header.findIndex((h) => h.includes("description"));
  const dateIdx = header.findIndex((h) => h.includes("date"));
  const catIdx = header.findIndex((h) => h.includes("category"));

  if (amountIdx < 0) {
    console.log("CSV missing amount column.");
    process.exit(1);
  }

  let totalDebits = 0;
  let totalCredits = 0;
  let spendByCategory: Record<string, number> = {};
  const debits: { date: string; desc: string; amount: number; category: string }[] = [];
  const credits: { date: string; desc: string; amount: number }[] = [];

  for (let i = 1; i < lines.length; i++) {
    const row = parseCsvRow(lines[i]);
    const amount = parseFloat(row[amountIdx]?.replace(/[^0-9.-]/g, "") || "0");
    if (!Number.isFinite(amount) || amount <= 0) continue;

    const type = typeIdx >= 0 ? row[typeIdx]?.toLowerCase() : "debit";
    const desc = descIdx >= 0 ? (row[descIdx] ?? "").slice(0, 50) : "";
    const date = dateIdx >= 0 ? row[dateIdx] ?? "" : "";
    const category = catIdx >= 0 ? row[catIdx] ?? "all_other" : "all_other";

    if (type === "credit") {
      totalCredits += amount;
      credits.push({ date, desc, amount });
    } else {
      totalDebits += amount;
      spendByCategory[category] = (spendByCategory[category] ?? 0) + amount;
      debits.push({ date, desc, amount, category });
    }
  }

  const totalActivity = totalDebits + totalCredits;

  console.log("═".repeat(60));
  console.log("PDF PARSING DEBUG REPORT");
  console.log("═".repeat(60));
  console.log(`\nData source: ${CSV_PATH}`);
  console.log(`Total rows: ${lines.length - 1}\n`);

  console.log("─ Transaction breakdown ─");
  console.log(`  Debits (purchases/withdrawals):  $${totalDebits.toFixed(2)}  ← included in pie chart`);
  console.log(`  Credits (refunds/Venmo in, etc): $${totalCredits.toFixed(2)}  ← excluded from spend`);
  console.log(`  Total activity:                  $${totalActivity.toFixed(2)}\n`);

  if (totalCredits > 0) {
    console.log("Why credits are excluded: The pie chart shows SPENDING. Credits (Venmo received,");
    console.log("refunds, deposits) are money coming IN, not money spent.\n");
  }

  console.log("─ Spend by category (pie chart) ─");
  const sorted = Object.entries(spendByCategory).sort((a, b) => b[1] - a[1]);
  for (const [cat, amt] of sorted) {
    if (amt > 0) console.log(`  ${cat}: $${amt.toFixed(2)}`);
  }
  console.log(`  ───────────────`);
  console.log(`  Total: $${totalDebits.toFixed(2)}\n`);

  if (debits.length > 0) {
    console.log("─ Debit transactions (in pie chart) ─");
    debits.slice(0, 15).forEach((d) => {
      console.log(`  ${d.date}  $${d.amount.toFixed(2).padStart(8)}  ${d.category.padEnd(14)}  ${d.desc}...`);
    });
    if (debits.length > 15) console.log(`  ... and ${debits.length - 15} more\n`);
  }

  if (credits.length > 0) {
    console.log("\n─ Credit transactions (excluded from pie chart) ─");
    credits.forEach((c) => {
      console.log(`  ${c.date}  $${c.amount.toFixed(2).padStart(8)}  ${c.desc}...`);
    });
  }

  console.log("\n" + "═".repeat(60));
}

main();
