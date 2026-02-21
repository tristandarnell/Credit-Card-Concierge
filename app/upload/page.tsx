import Link from "next/link";
import { SectionHeading } from "@/components/section-heading";

const checklist = [
  "Statement files accepted: PDF, CSV, OFX",
  "Data encrypted in transit and at rest",
  "Merchant names normalized for category mapping",
  "Recurring charges detected automatically"
];

export default function UploadPage() {
  return (
    <section className="section section-tight">
      <SectionHeading
        title="Upload Statements"
        subtitle="Import statements from one or more banks to generate personalized card recommendations."
      />

      <div className="panel upload-layout">
        <div className="dropzone" role="region" aria-label="Upload zone">
          <p className="dropzone-label">Drag and drop statement files</p>
          <p className="muted">or</p>
          <label className="btn btn-secondary" htmlFor="statement-files">
            Choose Files
          </label>
          <input id="statement-files" type="file" multiple accept=".pdf,.csv,.ofx" />
          <p className="hint">Maximum file size: 20MB each</p>
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
