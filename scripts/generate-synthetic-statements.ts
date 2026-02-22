/**
 * Generate 10 Wells Fargo-style synthetic credit card statement PDFs.
 * Uses real merchant names for meaningful categorization in the optimizer.
 *
 * Run: npx tsx scripts/generate-synthetic-statements.ts
 */

import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import { faker } from "@faker-js/faker";
import { renderStatementToBuffer } from "../lib/synthetic";
import type { Transaction, RenderableTransaction } from "../lib/synthetic/transaction-model";

const MONTHS = [
  { name: "January", num: 1 },
  { name: "February", num: 2 },
  { name: "March", num: 3 },
  { name: "April", num: 4 },
  { name: "May", num: 5 },
  { name: "June", num: 6 },
  { name: "July", num: 7 },
  { name: "August", num: 8 },
  { name: "September", num: 9 },
  { name: "October", num: 10 },
];

const MERCHANTS: Array<{ name: string; min: number; max: number }> = [
  { name: "STARBUCKS", min: 4, max: 12 },
  { name: "DUNKIN", min: 3, max: 10 },
  { name: "CHIPOTLE", min: 10, max: 18 },
  { name: "MCDONALDS", min: 8, max: 25 },
  { name: "WHOLE FOODS", min: 40, max: 180 },
  { name: "TRADER JOE'S", min: 25, max: 95 },
  { name: "COSTCO", min: 80, max: 250 },
  { name: "WALMART", min: 20, max: 120 },
  { name: "TARGET", min: 30, max: 150 },
  { name: "SHELL", min: 45, max: 75 },
  { name: "CHEVRON", min: 35, max: 80 },
  { name: "UBER", min: 12, max: 45 },
  { name: "LYFT", min: 15, max: 50 },
  { name: "AMAZON", min: 15, max: 120 },
  { name: "NETFLIX", min: 15, max: 16 },
  { name: "SPOTIFY", min: 10, max: 11 },
  { name: "CVS", min: 12, max: 65 },
  { name: "WALGREENS", min: 10, max: 55 },
  { name: "COMCAST", min: 80, max: 120 },
  { name: "VERIZON", min: 75, max: 95 },
  { name: "DELTA AIR LINES", min: 180, max: 600 },
  { name: "MARRIOTT", min: 120, max: 350 },
  { name: "AIRBNB", min: 85, max: 280 },
  { name: "AMC THEATRES", min: 18, max: 45 },
  { name: "STARBUCKS", min: 5, max: 14 },
  { name: "DOMINOS", min: 18, max: 35 },
  { name: "OLIVE GARDEN", min: 45, max: 90 },
  { name: "BEST BUY", min: 40, max: 350 },
  { name: "NIKE", min: 65, max: 180 },
  { name: "STAPLES", min: 25, max: 120 },
];

const STATEMENT_YEAR = 2025;

function formatDate(d: Date): string {
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function generateStatementTransactions(
  month: (typeof MONTHS)[0],
  seed: number
): (Transaction | RenderableTransaction)[] {
  faker.seed(seed);

  const daysInMonth = new Date(STATEMENT_YEAR, month.num, 0).getDate();
  const startDate = new Date(STATEMENT_YEAR, month.num - 1, 1);
  const endDate = new Date(STATEMENT_YEAR, month.num - 1, daysInMonth);
  const start = startDate.getTime();
  const end = endDate.getTime();

  const count = faker.number.int({ min: 18, max: 28 });
  const txns: (Transaction | RenderableTransaction)[] = [];

  for (let i = 0; i < count; i++) {
    const isCredit = i < 3 && faker.number.float({ min: 0, max: 1 }) < 0.25;
    const txnDate = new Date(start + Math.random() * (end - start));
    const txnDateStr = formatDate(txnDate);

    if (isCredit) {
      const amount = faker.number.float({ min: 25, max: 150, fractionDigits: 2 });
      txns.push({
        date: txnDateStr,
        description: `Venmo Payment ${faker.string.numeric(6)} ${faker.person.fullName()}`,
        amount,
        type: "credit",
      });
    } else {
      const merchant = faker.helpers.arrayElement(MERCHANTS);
      const amount = faker.number.float({ min: merchant.min, max: merchant.max, fractionDigits: 2 });
      const city = faker.location.city().toUpperCase();
      const state = faker.location.state({ abbreviated: true });
      const desc = `Purchase authorized on ${formatDate(txnDate)} ${merchant.name} ${city} ${state}`;
      const ref = `S${faker.string.numeric(15)} Card ${faker.string.numeric(4)}`;

      txns.push({
        date: txnDateStr,
        description: desc,
        amount,
        type: "debit",
        continuation: ref,
      } as RenderableTransaction);
    }
  }

  txns.sort((a, b) => {
    const [ma, da] = a.date.split("/").map(Number);
    const [mb, db] = b.date.split("/").map(Number);
    return ma !== mb ? ma - mb : da - db;
  });

  return txns;
}

async function main() {
  const outputDir = join(process.cwd(), "data", "synthetic-statements");
  mkdirSync(outputDir, { recursive: true });

  console.log("Generating 10 Wells Fargo-style statement PDFs...\n");

  for (let i = 0; i < 10; i++) {
    const month = MONTHS[i];
    const transactions = generateStatementTransactions(month, 42 + i * 100);
    const statementDate = `${month.name} 5, ${STATEMENT_YEAR}`;
    const startingBalance = 1800 + faker.number.int({ min: -300, max: 800 });

    const pdfBuffer = await renderStatementToBuffer(transactions, {
      accountHolder: "ETHAN H LIU",
      statementDate,
      startingBalance,
    });

    const filename = `wells-fargo-statement-${STATEMENT_YEAR}-${String(month.num).padStart(2, "0")}.pdf`;
    const filepath = join(outputDir, filename);
    writeFileSync(filepath, pdfBuffer);

    const totalDebits = transactions.filter((t) => t.type === "debit").reduce((s, t) => s + t.amount, 0);
    const totalCredits = transactions.filter((t) => t.type === "credit").reduce((s, t) => s + t.amount, 0);

    console.log(
      `  ${filename}  —  ${transactions.length} txns  |  debits: $${totalDebits.toFixed(0)}  credits: $${totalCredits.toFixed(0)}`
    );
  }

  console.log(`\nSaved 10 PDFs to ${outputDir}`);
  console.log("Upload these at /upload to test the credit card optimizer.");
}

main().catch(console.error);
