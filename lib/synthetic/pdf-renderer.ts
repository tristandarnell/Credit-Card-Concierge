/**
 * PDF renderer for Wells Fargo-style bank statements.
 * Renders transactions into a PDF that the parser can read.
 */

import PDFDocument from "pdfkit";
import type { Transaction } from "./transaction-model";
import type { RenderableTransaction } from "./transaction-model";

export interface RenderOptions {
  /** Account holder name */
  accountHolder?: string;
  /** Statement date (e.g. "December 5, 2025") */
  statementDate?: string;
  /** Starting balance for the period */
  startingBalance?: number;
}

/**
 * Render transactions to a PDF (Wells Fargo-style layout).
 * Returns a Buffer. Pipe to fs.createWriteStream() to save.
 */
export function renderStatement(
  transactions: (Transaction | RenderableTransaction)[],
  options: RenderOptions = {}
): InstanceType<typeof PDFDocument> {
  const {
    accountHolder = "John Doe",
    statementDate = "December 5, 2025",
    startingBalance = 2500,
  } = options;

  const doc = new PDFDocument({
    size: "letter",
    margin: 50,
    pdfVersion: "1.7",
  });
  let balance = startingBalance;

  // Compute running balances
  const txnsWithBalance = transactions.map((t) => {
    const amt = t.type === "credit" ? t.amount : -t.amount;
    balance += amt;
    return { ...t, endingBalance: balance };
  });

  const lineHeight = 14;
  let y = 50;

  // Header
  doc.fontSize(10).font("Helvetica-Bold").text("Wells Fargo Clear Access Banking SM", 50, y);
  y += lineHeight;
  doc.font("Helvetica").fontSize(9).text(`${statementDate} Page 1 of 1`, 50, y);
  y += lineHeight * 2;

  doc.text("Statement period activity summary", 50, y);
  y += lineHeight;
  const totalDebits = transactions.filter((t) => t.type === "debit").reduce((s, t) => s + t.amount, 0);
  const totalCredits = transactions.filter((t) => t.type === "credit").reduce((s, t) => s + t.amount, 0);
  doc.text(`Beginning balance on ${statementDate.split(" ")[1]?.replace(",", "") ?? ""}  $${startingBalance.toFixed(2)}`, 50, y);
  y += lineHeight;
  doc.text(`Deposits/Additions  ${totalCredits.toFixed(2)}`, 50, y);
  y += lineHeight;
  doc.text(`Withdrawals/Subtractions  - ${totalDebits.toFixed(2)}`, 50, y);
  y += lineHeight;
  doc.text(`Ending balance  $${balance.toFixed(2)}`, 50, y);
  y += lineHeight * 2;

  doc.text(`Account number: 6232026028 (primary account)`, 50, y);
  y += lineHeight;
  doc.text(accountHolder, 50, y);
  y += lineHeight * 2;

  doc.text("Transaction history", 50, y);
  y += lineHeight;
  doc.fontSize(8).text("Date    Check Number  Description    Deposits/Additions  Withdrawals/Subtractions  Ending daily balance", 50, y);
  y += lineHeight * 1.5;

  for (const t of txnsWithBalance) {
    const r = t as RenderableTransaction;
    const amtStr = t.amount.toFixed(2);
    const balStr = r.endingBalance != null ? r.endingBalance.toLocaleString("en-US", { minimumFractionDigits: 2 }) : "";

    if (r.continuation) {
      // Multi-line purchase: date + desc on line 1 (sometimes with amount+balance)
      // Line 2: continuation. Line 3: amount + balance (matches pdf-parse extraction)
      const line1 = `${t.date}   ${t.description}`;
      doc.text(line1, 50, y);
      y += lineHeight;
      doc.text(r.continuation, 50, y);
      y += lineHeight;
      doc.text(`   ${amtStr}    ${balStr}`, 50, y);
      y += lineHeight;
    } else {
      // Single line (e.g. Venmo): date + desc + amount + balance
      const line = `${t.date}   ${t.description}     ${amtStr}    ${balStr}`;
      doc.text(line, 50, y);
      y += lineHeight;
    }

    if (y > 700) {
      doc.addPage();
      y = 50;
    }
  }

  y += lineHeight;
  doc.text(`Totals   $${totalCredits.toFixed(2)}   $${totalDebits.toFixed(2)}`, 50, y);

  return doc;
}

/**
 * Render to a Buffer (for API response or file write).
 */
export function renderStatementToBuffer(
  transactions: (Transaction | RenderableTransaction)[],
  options?: RenderOptions
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = renderStatement(transactions, options);
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    doc.end();
  });
}
