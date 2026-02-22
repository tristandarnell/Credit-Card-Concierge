/**
 * Build annual spend profile from categorized transaction CSV.
 * Used to personalize card recommendations based on uploaded statements.
 */

import { STANDARD_CATEGORIES, type StandardCategory } from "@/lib/rewards/categories";
import type { AnnualSpendProfile } from "@/lib/rewards/scoring";
import { promises as fs } from "fs";
import path from "node:path";

const CATEGORY_ALIAS: Record<string, StandardCategory> = {
  other: "all_other",
  "office supplies": "office_supply",
};

function normalizeCategory(raw: string): StandardCategory {
  const lower = raw.toLowerCase().trim().replace(/\s+/g, "_");
  if (STANDARD_CATEGORIES.includes(lower as StandardCategory)) {
    return lower as StandardCategory;
  }
  return (CATEGORY_ALIAS[lower] as StandardCategory) ?? "all_other";
}

/**
 * Parse a categorized CSV and aggregate spend by category.
 * Annualizes based on the date range in the data.
 */
export async function buildSpendProfileFromCsv(
  csvPath: string
): Promise<{ profile: AnnualSpendProfile; totalSpend: number; monthsOfData: number }> {
  const content = await fs.readFile(csvPath, "utf-8");
  const lines = content.split("\n").filter((l) => l.trim());
  if (lines.length < 2) {
    return {
      profile: Object.fromEntries(STANDARD_CATEGORIES.map((c) => [c, 0])) as AnnualSpendProfile,
      totalSpend: 0,
      monthsOfData: 0,
    };
  }

  const header = lines[0].toLowerCase();
  const hasCategory = header.includes("category");
  const cols = header.split(",");
  const dateIdx = cols.findIndex((h) => h.includes("date"));
  const amountIdx = cols.findIndex((h) => h.includes("amount"));
  const typeIdx = cols.findIndex((h) => h.includes("type"));
  const categoryIdx = hasCategory ? cols.findIndex((h) => h.includes("category")) : -1;

  if (amountIdx < 0) {
    throw new Error("CSV must have an amount column");
  }

  const byCategory: Record<string, number> = {};
  for (const cat of STANDARD_CATEGORIES) {
    byCategory[cat] = 0;
  }

  const dates: number[] = [];
  let totalSpend = 0;

  for (let i = 1; i < lines.length; i++) {
    const row = parseCsvRow(lines[i]);
    if (row.length <= amountIdx) continue;

    const amount = parseFloat(row[amountIdx]?.replace(/[^0-9.-]/g, "") || "0");
    if (!Number.isFinite(amount) || amount <= 0) continue;

    // Skip credits (refunds, payments)
    if (typeIdx >= 0 && row[typeIdx]?.toLowerCase() === "credit") continue;

    let category: StandardCategory = "all_other";
    if (categoryIdx >= 0 && row[categoryIdx]) {
      category = normalizeCategory(row[categoryIdx]);
    }

    byCategory[category] = (byCategory[category] ?? 0) + amount;
    totalSpend += amount;

    if (dateIdx >= 0 && row[dateIdx]) {
      const d = parseDate(row[dateIdx]);
      if (d) dates.push(d.getTime());
    }
  }

  // Annualize: infer months of data from date range
  let monthsOfData = 12;
  if (dates.length >= 2) {
    const minDate = Math.min(...dates);
    const maxDate = Math.max(...dates);
    const daysDiff = (maxDate - minDate) / (1000 * 60 * 60 * 24);
    monthsOfData = Math.max(1, Math.min(12, Math.round(daysDiff / 30) + 1));
  }

  const factor = 12 / monthsOfData;
  const profile = Object.fromEntries(
    STANDARD_CATEGORIES.map((c) => [c, Number(((byCategory[c] ?? 0) * factor).toFixed(2))])
  ) as AnnualSpendProfile;

  return {
    profile,
    totalSpend,
    monthsOfData,
  };
}

function parseCsvRow(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        current += ch;
      }
    } else if (ch === ",") {
      result.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

function parseDate(s: string): Date | null {
  const parts = s.split(/[/\-]/);
  if (parts.length >= 3) {
    const month = parseInt(parts[0], 10) - 1;
    const day = parseInt(parts[1], 10);
    const year = parseInt(parts[2], 10) || new Date().getFullYear();
    const d = new Date(year, month, day);
    if (!isNaN(d.getTime())) return d;
  }
  return null;
}

export async function getCategorizedTransactionsPath(): Promise<string | null> {
  const p = path.join(process.cwd(), "data", "transactions_categorized.csv");
  try {
    await fs.access(p);
    return p;
  } catch {
    return null;
  }
}
