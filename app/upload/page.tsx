"use client";

import Link from "next/link";
import { SectionHeading } from "@/components/section-heading";
import { useCallback, useRef, useState } from "react";

const checklist = [
  "Statement files accepted: PDF, CSV, OFX",
  "Data encrypted in transit and at rest",
  "Merchant names normalized for category mapping",
  "Recurring charges detected automatically",
];

export default function UploadPage() {
  const [status, setStatus] = useState<"idle" | "uploading" | "success" | "error">("idle");
  const [message, setMessage] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (file.type !== "application/pdf") {
        setStatus("error");
        setMessage("Please select a PDF file.");
        return;
      }

      setStatus("uploading");
      setMessage("Parsing PDF and extracting transactions...");

      try {
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch("/api/parse-pdf", {
          method: "POST",
          body: formData,
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Upload failed");
        }

        setStatus("success");
        setMessage(data.message ?? `Extracted ${data.count} transactions and saved to CSV.`);
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
      const file = e.dataTransfer.files?.[0];
      if (file) {
        const dt = new DataTransfer();
        dt.items.add(file);
        if (inputRef.current) {
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
          <p className="dropzone-label">Drag and drop statement files</p>
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
          <p className="hint">Maximum file size: 20MB each. PDFs are parsed automatically.</p>

          {status !== "idle" && (
            <p
              className={
                status === "success"
                  ? "hint"
                  : status === "error"
                    ? "hint"
                    : "hint"
              }
              style={{
                marginTop: "1rem",
                color:
                  status === "success"
                    ? "var(--success, green)"
                    : status === "error"
                      ? "var(--error, #c00)"
                      : "inherit",
                fontWeight: status === "uploading" ? 500 : 400,
              }}
              role="status"
            >
              {status === "uploading" && "⏳ "}
              {status === "success" && "✓ "}
              {status === "error" && "✗ "}
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
          <Link href="/recommendations" className="btn btn-primary full-width">
            Continue to Recommendations
          </Link>
        </aside>
      </div>
    </section>
  );
}
