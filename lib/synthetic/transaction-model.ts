/**
 * Transaction model for synthetic statement generation.
 * Compatible with NLP pipeline (date, description, amount, type).
 */

export interface Transaction {
  /** Transaction date (MM/DD/YYYY or MM/DD) */
  date: string;
  /** Raw description as it would appear on a bank statement */
  description: string;
  /** Transaction amount (positive for debits, positive for credits) */
  amount: number;
  /** "debit" | "credit" */
  type: "debit" | "credit";
}

/**
 * Extended model for PDF rendering: adds optional metadata
 * that affects how the transaction is displayed.
 */
export interface RenderableTransaction extends Transaction {
  /** Optional: continuation line(s) for multi-line display (e.g. location, ref #) */
  continuation?: string;
  /** Optional: ending balance after this transaction (for statement format) */
  endingBalance?: number;
}

export function isRenderable(txn: Transaction): txn is RenderableTransaction {
  return "continuation" in txn || "endingBalance" in txn;
}
