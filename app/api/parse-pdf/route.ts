import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require("pdf-parse");
import { parseStatementText, transactionsToCsv } from "@/lib/parsers/parse-pdf";

const DATA_DIR = path.join(process.cwd(), "data");
const CSV_PATH = path.join(DATA_DIR, "transactions_cleaned.csv");

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file || file.type !== "application/pdf") {
      return NextResponse.json(
        { error: "Please upload a PDF file." },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const data = await pdfParse(buffer);
    const text = data.text as string;

    if (!text?.trim()) {
      return NextResponse.json(
        { error: "Could not extract text from PDF." },
        { status: 400 }
      );
    }

    const transactions = parseStatementText(text);

    if (transactions.length === 0) {
      return NextResponse.json(
        { error: "No transactions found. This may not be a supported statement format." },
        { status: 400 }
      );
    }

    const csv = transactionsToCsv(transactions);
    await mkdir(DATA_DIR, { recursive: true });
    await writeFile(CSV_PATH, csv, "utf-8");

    return NextResponse.json({
      success: true,
      count: transactions.length,
      message: `Extracted ${transactions.length} transactions and saved to data/transactions_cleaned.csv`,
    });
  } catch (err) {
    console.error("Parse PDF error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to parse PDF." },
      { status: 500 }
    );
  }
}
