/**
 * Faker-based synthetic transaction generator.
 * Produces realistic credit card/bank transaction data for testing.
 */

import { faker } from "@faker-js/faker";
import type { Transaction, RenderableTransaction } from "./transaction-model";

const MERCHANT_TEMPLATES = [
  { kind: "purchase" as const, name: () => `${faker.company.name()} ${faker.location.city()} ${faker.location.state({ abbreviated: true })}`, prefix: "Purchase authorized on" },
  { kind: "purchase" as const, name: () => `${faker.company.name()} ${faker.internet.domainWord()}.com ${faker.location.state({ abbreviated: true })}`, prefix: "Purchase authorized on" },
  { kind: "purchase" as const, name: () => `${faker.company.name()} ${faker.location.city()} ${faker.location.state({ abbreviated: true })}`, prefix: "Purchase authorized on" },
  { kind: "purchase" as const, name: () => `Ctlp*${faker.company.name()} ${faker.location.city()} ${faker.location.state({ abbreviated: true })}`, prefix: "Purchase authorized on" },
  { kind: "purchase" as const, name: () => `Mta*${faker.company.name()} ${faker.location.city()} ${faker.location.state({ abbreviated: true })}`, prefix: "Purchase authorized on" },
  { kind: "purchase" as const, name: () => `Njt Rail ${faker.company.name()} ${faker.location.city()} ${faker.location.state({ abbreviated: true })}`, prefix: "Purchase authorized on" },
  { kind: "purchase" as const, name: () => `${faker.company.name()} NEW York NY`, prefix: "Purchase authorized on" },
  { kind: "venmo" as const, name: () => `Venmo Payment ${faker.date.recent({ days: 7 }).toISOString().slice(2, 10).replace(/-/g, "").slice(0, 6)} ${faker.string.numeric(13)} ${faker.person.fullName()}`, prefix: "" },
];

/** Generate a random ref line (location + card ref) like "S305323136433754 Card 8875" */
function refLine(): string {
  return `S${faker.string.numeric(15)} Card ${faker.string.numeric(4)}`;
}

/** Format date as MM/DD for statement display */
function formatDate(d: Date): string {
  const m = d.getMonth() + 1;
  const day = d.getDate();
  return `${m}/${day}`;
}

/** Format auth date (for "Purchase authorized on MM/DD") */
function formatAuthDate(d: Date): string {
  const m = d.getMonth() + 1;
  const day = d.getDate();
  return `${m}/${day}`;
}

export interface GenerateOptions {
  /** Number of transactions to generate */
  count?: number;
  /** Start date for transaction range */
  startDate?: Date;
  /** End date for transaction range */
  endDate?: Date;
  /** Approx fraction of credits (0–1). Default 0.15 */
  creditFraction?: number;
  /** Seed for reproducible generation */
  seed?: number;
}

/**
 * Generate synthetic transactions.
 */
export function generateTransactions(options: GenerateOptions = {}): (Transaction | RenderableTransaction)[] {
  const {
    count = 10,
    startDate = faker.date.recent({ days: 30 }),
    endDate = new Date(),
    creditFraction = 0.15,
    seed,
  } = options;

  if (seed != null) faker.seed(seed);

  const txns: Transaction[] = [];
  const start = Math.min(startDate.getTime(), endDate.getTime());
  const end = Math.max(startDate.getTime(), endDate.getTime());

  for (let i = 0; i < count; i++) {
    const isCredit = faker.number.float({ min: 0, max: 1 }) < creditFraction;
    const txnDate = faker.date.between({ from: start, to: end });
    const txnDateStr = formatDate(txnDate);
    const authDate = faker.date.between({
      from: new Date(txnDate.getTime() - 3 * 24 * 60 * 60 * 1000),
      to: txnDate,
    });

    if (isCredit) {
      // Venmo-style credit
      const template = MERCHANT_TEMPLATES.find((t) => t.kind === "venmo");
      const amount = faker.number.float({ min: 5, max: 200, fractionDigits: 2 });
      txns.push({
        date: txnDateStr,
        description: template!.name(),
        amount,
        type: "credit",
      });
    } else {
      // Purchase
      const template = faker.helpers.arrayElement(
        MERCHANT_TEMPLATES.filter((t) => t.kind === "purchase")
      );
      const merchantName = template.name();
      const desc = template.prefix
        ? `${template.prefix} ${formatAuthDate(authDate)} ${merchantName}`
        : merchantName;
      const amount = faker.number.float({ min: 1.5, max: 150, fractionDigits: 2 });
      txns.push({
        date: txnDateStr,
        description: desc,
        amount,
        type: "debit",
        continuation: refLine(),
      } as RenderableTransaction);
    }
  }

  // Sort by date
  txns.sort((a, b) => {
    const [ma, da] = a.date.split("/").map(Number);
    const [mb, db] = b.date.split("/").map(Number);
    return ma !== mb ? ma - mb : da - db;
  });

  return txns;
}
