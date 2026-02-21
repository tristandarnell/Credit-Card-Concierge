/**
 * Pipeline: Faker → Transaction Model → PDF Renderer
 * Generates a synthetic Wells Fargo-style statement for parser testing.
 *
 * Run: npx tsx scripts/generate-synthetic-statement.ts
 */

import { writeFileSync } from "fs";
import { join } from "path";
import { generateTransactions, renderStatementToBuffer } from "../lib/synthetic";

const OUTPUT_PATH = join(process.cwd(), "data", "synthetic-statement.pdf");

async function main() {
  // 1. Faker → Transaction Model
  const transactions = generateTransactions({
    count: 12,
    startDate: new Date("2025-11-01"),
    endDate: new Date("2025-12-05"),
    creditFraction: 0.2,
    seed: 42, // reproducible
  });

  console.log(`Generated ${transactions.length} transactions`);
  transactions.forEach((t) => {
    console.log(`  ${t.date} | ${t.type} | $${t.amount.toFixed(2)} | ${t.description.slice(0, 50)}...`);
  });

  // 2. Transaction Model → PDF Renderer
  const pdfBuffer = await renderStatementToBuffer(transactions, {
    accountHolder: "ETHAN H LIU",
    statementDate: "December 5, 2025",
    startingBalance: 2545.78,
  });

  // 3. Write to file
  writeFileSync(OUTPUT_PATH, pdfBuffer);
  console.log(`\nSaved to ${OUTPUT_PATH}`);
  console.log("Run your PDF parser on this file to test.");
}

main().catch(console.error);
