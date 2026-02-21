import { SectionHeading } from "@/components/section-heading";
import { getDataQualityIssues } from "@/lib/rewards/data";

export default async function ReviewPage() {
  const issues = await getDataQualityIssues(200);

  return (
    <section className="section section-tight">
      <SectionHeading
        title="Data Review Queue"
        subtitle="Rows shown here failed clean-data checks and should be fixed in the source list or overrides."
      />

      <article className="panel">
        <p className="muted">
          Manual override file: <code>data/rewards/overrides.us.json</code>
        </p>
        <p className="muted">
          Typical fix flow: update <code>sources.us.json</code> or <code>overrides.us.json</code>, rerun{" "}
          <code>npm run rewards:collect</code>, then sync.
        </p>
      </article>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Issuer</th>
              <th>Card</th>
              <th>Status</th>
              <th>Confidence</th>
              <th>Issues</th>
              <th>Source</th>
            </tr>
          </thead>
          <tbody>
            {issues.map((issue) => (
              <tr key={issue.id}>
                <td>{issue.id}</td>
                <td>{issue.issuer}</td>
                <td>{issue.cardName}</td>
                <td>{issue.fetchStatus}</td>
                <td>{Math.round(issue.confidenceScore * 100)}%</td>
                <td>{issue.reasons.join(", ")}</td>
                <td>
                  <a href={issue.cardUrl} target="_blank" rel="noreferrer">
                    Open
                  </a>
                </td>
              </tr>
            ))}
            {issues.length === 0 ? (
              <tr>
                <td colSpan={7}>No current issues detected in fetched rewards records.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}
