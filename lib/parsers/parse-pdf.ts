/**
 * Bank statement PDF text parser.
 * Supports Wells Fargo format; extracts transactions from statement text.
 */

export interface Transaction {
  date: string;
  description: string;
  amount: number;
  type: "debit" | "credit";
}

// Full transaction on one line: Date + Description + Amount (+ optional balance)
const TXN_LINE_FULL = /^(\d{1,2}\/\d{1,2})\s+(.+?)\s+([\d,]+\.\d{2})(?:\s+[\d,]+\.\d{2})?\s*$/;
// Date + description only (amount on next line)
const TXN_LINE_PARTIAL = /^(\d{1,2}\/\d{1,2})\s+(.+)$/;
// Amount line (optional leading spaces, amount, optional balance)
const AMOUNT_LINE = /^\s*([\d,]+\.\d{2})(?:\s+[\d,]+\.\d{2})?\s*$/;
const DATE_START = /^\d{1,2}\/\d{1,2}\s+/;
// e.g. "December 5, 2025" or "Page 2 of 5" near statement date
const YEAR_IN_TEXT = /\b(20\d{2})\b/;

function inferStatementYear(text: string): number {
  const match = text.match(YEAR_IN_TEXT);
  return match ? parseInt(match[1], 10) : new Date().getFullYear();
}

export function parseStatementText(
  text: string,
  statementYear?: number
): Transaction[] {
  const year = statementYear ?? inferStatementYear(text);
  const transactions: Transaction[] = [];
  const lines = text.split("\n");
  let inTransactionSection = false;
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const stripped = line.trim();

    if (stripped.includes("Transaction history")) {
      inTransactionSection = true;
      i++;
      while (i < lines.length && !DATE_START.test(lines[i].trim())) {
        i++;
      }
      continue;
    }

    if (inTransactionSection && stripped.startsWith("Totals")) {
      break;
    }

    if (!inTransactionSection) {
      i++;
      continue;
    }

    // Case 1: Full transaction on one line (e.g. Venmo)
    const fullMatch = stripped.match(TXN_LINE_FULL);
    if (fullMatch) {
      const dateStr = fullMatch[1];
      const desc = fullMatch[2];
      const amountStr = fullMatch[3];
      const fullDate = `${dateStr}/${year}`;
      const amount = parseFloat(amountStr.replace(/,/g, ""));
      const normalizedDesc = desc.split(/\s+/).filter(Boolean).join(" ");
      const txnType: "debit" | "credit" =
        (normalizedDesc.includes("Venmo") || normalizedDesc.toLowerCase().includes("deposit")) &&
        amount > 0
          ? "credit"
          : "debit";
      transactions.push({
        date: fullDate,
        description: normalizedDesc,
        amount: Math.abs(amount),
        type: txnType,
      });
      i++;
      continue;
    }

    // Case 2: Date + description, amount on following line(s)
    const partialMatch = stripped.match(TXN_LINE_PARTIAL);
    if (partialMatch) {
      const dateStr = partialMatch[1];
      let desc = partialMatch[2];
      const fullDate = `${dateStr}/${year}`;
      let amountStr: string | null = null;

      i++;
      while (i < lines.length) {
        const nextLine = lines[i];
        const nextStripped = nextLine.trim();

        if (!nextStripped) {
          i++;
          continue;
        }
        if (DATE_START.test(nextStripped) || nextStripped.startsWith("Totals") || nextStripped.startsWith("--")) {
          break;
        }

        const amtMatch = nextStripped.match(AMOUNT_LINE);
        if (amtMatch) {
          amountStr = amtMatch[1];
          i++;
          break;
        }

        desc += " " + nextStripped;
        i++;
      }

      if (amountStr !== null) {
        const amount = parseFloat(amountStr.replace(/,/g, ""));
        const normalizedDesc = desc.split(/\s+/).filter(Boolean).join(" ");
        const txnType: "debit" | "credit" =
          (normalizedDesc.includes("Venmo") || normalizedDesc.toLowerCase().includes("deposit")) &&
          amount > 0
            ? "credit"
            : "debit";
        transactions.push({
          date: fullDate,
          description: normalizedDesc,
          amount: Math.abs(amount),
          type: txnType,
        });
      }
      continue;
    }

    i++;
  }

  return transactions;
}

export function transactionsToCsv(transactions: Transaction[]): string {
  const header = "date,description,amount,type";
  const rows = transactions.map(
    (t) => `${t.date},"${t.description.replace(/"/g, '""')}",${t.amount},${t.type}`
  );
  return [header, ...rows].join("\n");
}
