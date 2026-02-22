"use client";

import Link from "next/link";
import { SectionHeading } from "@/components/section-heading";
import { useCallback, useRef, useState } from "react";

const checklist = [
  "Accepted formats: PDF, CSV, OFX — all major bank exports",
  "Merchant names normalized and categorized automatically",
  "Recurring charges detected across billing periods",
  "Statement data deleted immediately after analysis completes",
];

export default function UploadPage() {
  const [status, setStatus] = useState<"idle" | "uploading" | "success" | "error">("idle");
  const [message, setMessage] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files?.length) return;

      const fileList = Array.from(files);
      const invalid = fileList.find((f) => f.type !== "application/pdf");
      if (invalid) {
        setStatus("error");
        setMessage(`"${invalid.name}" is not a PDF. Please select PDF files only.`);
        return;
      }

      setStatus("uploading");
      setMessage(`Parsing ${fileList.length} statement(s) and categorizing transactions...`);

      try {
        const formData = new FormData();
        for (const file of fileList) {
          formData.append("file", file);
        }

        const res = await fetch("/api/parse-pdf", {
          method: "POST",
          body: formData,
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Upload failed");
        }

        setStatus("success");
        setMessage(
          data.message ??
            `Extracted ${data.count} transactions from ${data.filesProcessed ?? 1} file(s). Ready for recommendations.`
        );
      } catch (err) {
        setStatus("error");
        setMessage(err instanceof Error ? err.message : "Failed to parse PDF.");
      } finally {
        if (inputRef.current) inputRef.current.value = "";
      }
    },
    []
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const files = e.dataTransfer.files;
      if (files?.length) {
        const dt = new DataTransfer();
        for (let i = 0; i < files.length; i++) {
          if (files[i].type === "application/pdf") dt.items.add(files[i]);
        }
        if (dt.files.length && inputRef.current) {
          inputRef.current.files = dt.files;
          handleFileChange({ target: inputRef.current } as React.ChangeEvent<HTMLInputElement>);
        }
      }
    },
    [handleFileChange]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  return (
    <section className="section section-tight">
      <SectionHeading
        title="Upload Statements"
        subtitle="Import statements from one or more banks to generate personalized card recommendations."
      />

      <div className="panel upload-layout">
        <div
          className="dropzone"
          role="region"
          aria-label="Upload zone"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
        >
          <p className="dropzone-label">Drag and drop credit card statement PDFs</p>
          <p className="muted">or</p>
          <label className="btn btn-secondary" htmlFor="statement-files">
            Choose Files
          </label>
          <input
            ref={inputRef}
            id="statement-files"
            type="file"
            multiple
            accept=".pdf,.csv,.ofx"
            onChange={handleFileChange}
          />
          <p className="hint">Select multiple PDFs to combine statements. Parsed and categorized automatically.</p>

          {status !== "idle" && (
            <p
              style={{
                marginTop: "0.75rem",
                color:
                  status === "success"
                    ? "var(--success)"
                    : status === "error"
                      ? "#c00"
                      : "inherit",
                fontWeight: status === "uploading" ? 500 : 400,
                fontSize: "0.88rem",
              }}
              role="status"
              aria-live="polite"
            >
              {status === "uploading" && "Analyzing... "}
              {status === "success" && "Done — "}
              {status === "error" && "Error: "}
              {message}
            </p>
          )}
        </div>

        <aside>
          <h3>Before you upload</h3>
          <ul className="checklist">
            {checklist.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <p className="hint" style={{ marginBottom: "1rem" }}>
            Your data is processed in memory and never written to a permanent database. Analysis
            typically completes in under 10 seconds.
          </p>
          <Link
            href="/recommendations"
            className="btn btn-primary full-width"
            style={{ marginTop: status === "success" ? "0.5rem" : undefined }}
          >
            {status === "success" ? "View portfolio recommendations" : "Continue to recommendations"}
          </Link>
        </aside>
      </div>
    </section>
  );
}
