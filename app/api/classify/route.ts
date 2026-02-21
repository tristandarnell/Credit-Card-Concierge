/**
 * Classify transaction descriptions into categories.
 * Calls Python ML pipeline (TF-IDF + LR or TF-IDF + embedding + LR).
 */

import { NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";
import fs from "fs";
import os from "os";

export interface ClassifyRequest {
  descriptions: string[];
}

export interface ClassifyResult {
  description: string;
  category: string;
  confidence: number;
  confidence_score?: number;
  is_ood?: boolean;
}

export async function POST(request: Request) {
  let tmpPath: string | null = null;
  try {
    const { descriptions } = (await request.json()) as ClassifyRequest;
    if (!Array.isArray(descriptions) || descriptions.length === 0) {
      return NextResponse.json(
        { error: "descriptions must be a non-empty array" },
        { status: 400 }
      );
    }

    const projectRoot = path.resolve(process.cwd());
    const scriptPath = path.join(projectRoot, "ml", "predict.py");
    const modelPath = path.join(projectRoot, "ml", "artifacts", "tfidf_lr");
    const monitorPath = path.join(
      projectRoot,
      "ml",
      "artifacts",
      "confidence_monitor_tfidf_lr.npz"
    );

    tmpPath = path.join(os.tmpdir(), `classify-${Date.now()}.csv`);
    const csvContent =
      "description\n" + descriptions.map((d) => `"${d.replace(/"/g, '""')}"`).join("\n");
    fs.writeFileSync(tmpPath, csvContent);

    const result = await new Promise<string>((resolve, reject) => {
      const proc = spawn(
        "python",
        [
          scriptPath,
          "--csv",
          tmpPath!,
          "--model",
          modelPath,
          "--monitor",
          monitorPath,
          "--json",
        ],
        { cwd: projectRoot }
      );
      let stdout = "";
      let stderr = "";
      proc.stdout?.on("data", (d) => (stdout += d.toString()));
      proc.stderr?.on("data", (d) => (stderr += d.toString()));
      proc.on("close", (code) => {
        if (code !== 0) reject(new Error(stderr || `Exit ${code}`));
        else resolve(stdout);
      });
      proc.on("error", reject);
    });

    try {
      fs.unlinkSync(tmpPath);
    } catch {
      /* ignore */
    }
    tmpPath = null;

    const parsed = JSON.parse(result) as ClassifyResult[];
    return NextResponse.json({ results: parsed });
  } catch (err) {
    if (tmpPath && fs.existsSync(tmpPath)) {
      try {
        fs.unlinkSync(tmpPath);
      } catch {
        /* ignore */
      }
    }
    const message = err instanceof Error ? err.message : "Classification failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
