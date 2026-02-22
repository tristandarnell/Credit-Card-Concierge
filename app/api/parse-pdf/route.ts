import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { spawn } from "child_process";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require("pdf-parse");
import { parseStatementText, transactionsToCsv } from "@/lib/parsers/parse-pdf";
import type { Transaction } from "@/lib/parsers/parse-pdf";
import { getCleanRewardCards } from "@/lib/rewards/data";
import { buildSpendProfileFromCsv } from "@/lib/rewards/spend-profile";
import { buildRewardsInsights } from "@/lib/rewards/insights";

const DATA_DIR = path.join(process.cwd(), "data");
const CSV_RAW_PATH = path.join(DATA_DIR, "transactions_cleaned.csv");
const CSV_CATEGORIZED_PATH = path.join(DATA_DIR, "transactions_categorized.csv");

async function runClassifier(inputPath: string, outputPath: string): Promise<void> {
  const projectRoot = process.cwd();
  const scriptPath = path.join(projectRoot, "ml", "predict.py");
  const modelPath = path.join(projectRoot, "ml", "artifacts", "tfidf_lr");
  const monitorPath = path.join(projectRoot, "ml", "artifacts", "confidence_monitor_tfidf_lr.npz");

  await new Promise<void>((resolve, reject) => {
    const pythonCmd = process.env.PYTHON || "python3";
    const proc = spawn(
      pythonCmd,
      [
        scriptPath,
        "--csv",
        inputPath,
        "--output",
        outputPath,
        "--model",
        modelPath,
        "--monitor",
        monitorPath,
      ],
      { cwd: projectRoot }
    );
    let stderr = "";
    proc.stderr?.on("data", (d) => (stderr += d.toString()));
    proc.on("close", (code) => {
      if (code !== 0) reject(new Error(stderr || `Classifier exited with code ${code}`));
      else resolve();
    });
    proc.on("error", reject);
  });
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll("file") as File[];
    const singleFile = formData.get("file") as File | null;
    const fileList = files.length > 0 ? files : singleFile ? [singleFile] : [];

    if (fileList.length === 0) {
      return NextResponse.json(
        { error: "Please upload at least one PDF file." },
        { status: 400 }
      );
    }

    const allTransactions: Transaction[] = [];

    for (const file of fileList) {
      if (file.type !== "application/pdf") {
        return NextResponse.json(
          { error: `"${file.name}" is not a PDF. Please upload PDF files only.` },
          { status: 400 }
        );
      }

      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      const data = await pdfParse(buffer);
      const text = data.text as string;

      if (!text?.trim()) {
        return NextResponse.json(
          { error: `Could not extract text from "${file.name}". The PDF may be scanned/image-based.` },
          { status: 400 }
        );
      }

      const transactions = parseStatementText(text);
      if (transactions.length === 0 && fileList.length === 1) {
        return NextResponse.json(
          { error: "No transactions found. This may not be a supported statement format." },
          { status: 400 }
        );
      }

      allTransactions.push(...transactions);
    }

    if (allTransactions.length === 0) {
      return NextResponse.json(
        { error: "No transactions found in any of the uploaded files." },
        { status: 400 }
      );
    }

    const csv = transactionsToCsv(allTransactions);
    await mkdir(DATA_DIR, { recursive: true });
    await writeFile(CSV_RAW_PATH, csv, "utf-8");

    try {
      await runClassifier(CSV_RAW_PATH, CSV_CATEGORIZED_PATH);
    } catch (classifyErr) {
      console.warn("Classifier failed, using uncategorized data:", classifyErr);
      await writeFile(CSV_CATEGORIZED_PATH, csv, "utf-8");
    }

    let optimization: {
      lostRewardsDollars: number;
      potentialSavingsDollars: number;
      rewardEfficiencyScore: number;
    } | null = null;

    try {
      const cards = await getCleanRewardCards(1000);
      const spendProfile = await buildSpendProfileFromCsv(CSV_CATEGORIZED_PATH);
      const insights = await buildRewardsInsights({
        cards,
        spendProfile: spendProfile.profile,
        categorizedCsvPath: CSV_CATEGORIZED_PATH
      });

      const lostRewardsDollars = Number(
        (insights.rewardLeakScore.wrongCardLeak + insights.rewardLeakScore.missedCategoryLeak).toFixed(2)
      );
      const potentialSavingsDollars = Number(
        (lostRewardsDollars + insights.rewardLeakScore.annualFeeMismatchLeak).toFixed(2)
      );

      optimization = {
        lostRewardsDollars,
        potentialSavingsDollars,
        rewardEfficiencyScore: insights.rewardLeakScore.score
      };
    } catch (insightErr) {
      console.warn("Could not compute post-upload optimization summary:", insightErr);
    }

    return NextResponse.json({
      success: true,
      count: allTransactions.length,
      filesProcessed: fileList.length,
      message: `Extracted ${allTransactions.length} transactions from ${fileList.length} file(s). Categorized and ready for portfolio recommendations.`,
      optimization
    });
  } catch (err) {
    console.error("Parse PDF error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to parse PDF." },
      { status: 500 }
    );
  }
}
