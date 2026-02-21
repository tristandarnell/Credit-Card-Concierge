import { SectionHeading } from "@/components/section-heading";
import { STANDARD_CATEGORIES, type StandardCategory } from "@/lib/rewards/categories";
import { getCleanRewardCards } from "@/lib/rewards/data";
import { CATEGORY_LABELS, bestRuleAcrossCard, bestRuleForCategory } from "@/lib/rewards/scoring";

type CardsPageProps = {
  searchParams?: Record<string, string | string[] | undefined> | Promise<Record<string, string | string[] | undefined>>;
};

function readParam(params: Record<string, string | string[] | undefined> | undefined, key: string): string {
  const value = params?.[key];
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export default async function CardsPage({ searchParams }: CardsPageProps) {
  const params = searchParams ? await Promise.resolve(searchParams) : undefined;
  const cards = await getCleanRewardCards(2000);
  const searchTerm = readParam(params, "q").trim().toLowerCase();
  const issuer = readParam(params, "issuer").trim();
  const segment = readParam(params, "segment").trim();
  const category = readParam(params, "category").trim() as StandardCategory | "";

  const issuers = [...new Set(cards.map((card) => card.issuer))].sort((left, right) => left.localeCompare(right));

  const filtered = cards.filter((card) => {
    if (searchTerm) {
      const haystack = `${card.cardName} ${card.issuer} ${card.id}`.toLowerCase();
      if (!haystack.includes(searchTerm)) {
        return false;
      }
    }

    if (issuer && card.issuer !== issuer) {
      return false;
    }

    if (segment && card.cardSegment !== segment) {
      return false;
    }

    if (category && !card.rewardRules.some((rule) => rule.category === category || rule.category === "all_other")) {
      return false;
    }

    return true;
  });

  return (
    <section className="section section-tight">
      <SectionHeading
        title="Card Explorer"
        subtitle="Browse clean rewards records with issuer, segment, and category filters."
      />

      <div className="panel">
        <form className="grid-form" method="get">
          <label>
            Search
            <input name="q" defaultValue={searchTerm} placeholder="Card or issuer" />
          </label>
          <label>
            Issuer
            <select name="issuer" defaultValue={issuer}>
              <option value="">All issuers</option>
              {issuers.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label>
            Segment
            <select name="segment" defaultValue={segment}>
              <option value="">All segments</option>
              <option value="personal">Personal</option>
              <option value="business">Business</option>
            </select>
          </label>
          <label>
            Category
            <select name="category" defaultValue={category}>
              <option value="">Any category</option>
              {STANDARD_CATEGORIES.map((item) => (
                <option key={item} value={item}>
                  {CATEGORY_LABELS[item]}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" className="btn btn-primary">
            Apply Filters
          </button>
        </form>
      </div>

      <p className="muted">{filtered.length} cards match current filters.</p>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Card</th>
              <th>Issuer</th>
              <th>Segment</th>
              <th>Confidence</th>
              <th>Best Rule</th>
              <th>Source</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((card) => {
              const rule = category ? bestRuleForCategory(card.rewardRules, category) : bestRuleAcrossCard(card.rewardRules);
              const ruleText = rule ? `${rule.rateText} (${CATEGORY_LABELS[rule.category]})` : "No rule";

              return (
                <tr key={card.id}>
                  <td>{card.cardName}</td>
                  <td>{card.issuer}</td>
                  <td>{card.cardSegment}</td>
                  <td>{Math.round(card.confidenceScore * 100)}%</td>
                  <td>{ruleText}</td>
                  <td>
                    <a href={card.cardUrl} target="_blank" rel="noreferrer">
                      Open
                    </a>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6}>No cards matched your filter set.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}
