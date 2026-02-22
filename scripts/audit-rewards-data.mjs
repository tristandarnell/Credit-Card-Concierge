import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

const DATASET_PATH = path.join(rootDir, "data/rewards/cards.us.json");
const REPORT_PATH = path.join(rootDir, "data/rewards/audit-report.us.json");

const SUPABASE_URL = process.env.SUPABASE_URL ?? "";
const SUPABASE_READ_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  process.env.SUPABASE_ANON_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "";
const SUPABASE_TABLE = process.env.SUPABASE_REWARDS_TABLE ?? "credit_card_rewards";
const MIN_CONFIDENCE_SCORE = Number(process.env.MIN_CONFIDENCE_SCORE ?? 0.4);

const STANDARD_CATEGORIES = [
  "dining",
  "groceries",
  "gas",
  "travel",
  "airfare",
  "hotels",
  "transit",
  "streaming",
  "drugstores",
  "online_retail",
  "entertainment",
  "utilities",
  "phone",
  "office_supply",
  "all_other"
];

const CATEGORY_ALIASES = {
  dining: ["dining", "restaurant", "restaurants", "food delivery", "takeout"],
  groceries: ["grocery", "groceries", "supermarket", "supermarkets", "grocery store", "grocery stores"],
  gas: ["gas", "fuel", "gas stations", "gas station", "service stations"],
  travel: ["travel", "travel purchases", "travel spend"],
  airfare: ["airfare", "flights", "airline", "airlines"],
  hotels: ["hotel", "hotels", "lodging"],
  transit: ["transit", "rideshare", "taxis", "subway", "train"],
  streaming: ["streaming", "streaming services", "select streaming"],
  drugstores: ["drugstore", "drugstores", "drug store", "drug stores", "pharmacy", "pharmacies"],
  online_retail: ["online retail", "online purchases", "amazon", "ecommerce"],
  entertainment: ["entertainment", "live entertainment", "movie theaters"],
  utilities: ["utilities", "electric", "water", "internet bills"],
  phone: ["phone", "cell phone", "wireless", "telephone", "mobile phone", "mobile phones", "phone bill", "phone bills"],
  office_supply: ["office supply", "office supplies"],
  all_other: ["all other", "all purchases", "everything else", "all eligible purchases"]
};

const CATEGORY_SET = new Set(STANDARD_CATEGORIES);
const CATEGORY_LOOKUP = buildCategoryLookup();

function buildCategoryLookup() {
  const map = new Map();
  for (const category of STANDARD_CATEGORIES) {
    map.set(normalizeToken(category), category);
    map.set(normalizeToken(category.replace(/_/g, " ")), category);
    const aliases = CATEGORY_ALIASES[category] ?? [];
    for (const alias of aliases) {
      map.set(normalizeToken(alias), category);
    }
  }
  return map;
}

function normalizeToken(value) {
  return String(value)
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[_/+-]+/g, " ")
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeCategory(rawCategory) {
  if (typeof rawCategory !== "string") {
    return { category: "all_other", aliasMapped: false, unknownRawCategory: null };
  }

  if (CATEGORY_SET.has(rawCategory)) {
    return { category: rawCategory, aliasMapped: false, unknownRawCategory: null };
  }

  const token = normalizeToken(rawCategory);
  const mapped = CATEGORY_LOOKUP.get(token);
  if (mapped) {
    return { category: mapped, aliasMapped: true, unknownRawCategory: null };
  }

  if (token.endsWith("s")) {
    const singular = CATEGORY_LOOKUP.get(token.slice(0, -1));
    if (singular) {
      return { category: singular, aliasMapped: true, unknownRawCategory: null };
    }
  }

  return { category: "all_other", aliasMapped: false, unknownRawCategory: rawCategory };
}

function normalizeUnit(rawUnit) {
  if (rawUnit === "percent_cashback" || rawUnit === "x_points" || rawUnit === "x_miles") {
    return rawUnit;
  }
  return "unknown";
}

function toNumber(raw) {
  if (typeof raw === "number") {
    return Number.isFinite(raw) ? raw : null;
  }
  if (typeof raw === "string") {
    const num = Number(raw);
    return Number.isFinite(num) ? num : null;
  }
  return null;
}

function normalizeRewardRules(rules) {
  if (!Array.isArray(rules)) {
    return [];
  }

  return rules
    .map((rule) => {
      if (!rule || typeof rule !== "object") {
        return null;
      }

      const categoryInfo = normalizeCategory(rule.category);
      const rateText = typeof rule.rateText === "string" ? rule.rateText.trim() : "";
      if (!rateText) {
        return null;
      }

      return {
        rawCategory: typeof rule.category === "string" ? rule.category : null,
        category: categoryInfo.category,
        aliasMapped: categoryInfo.aliasMapped,
        unknownRawCategory: categoryInfo.unknownRawCategory,
        rateText,
        rateValue: toNumber(rule.rateValue),
        unit: normalizeUnit(rule.unit)
      };
    })
    .filter((rule) => rule != null);
}

function dedupKey(rule) {
  const value = rule.rateValue == null ? "null" : String(rule.rateValue);
  return `${rule.category}|${value}|${rule.unit}|${normalizeToken(rule.rateText)}`;
}

function detectIssues(record) {
  const issues = [];
  const rewardRules = normalizeRewardRules(record.reward_rules ?? record.rewardRules);

  if ((record.fetch_status ?? record.fetchStatus ?? "ok") !== "ok") {
    issues.push("fetch_failed");
  }
  if (!record.annual_fee_text && !record.annualFeeText) {
    issues.push("missing_annual_fee");
  }
  if (!record.intro_offer_text && !record.introOfferText) {
    issues.push("missing_intro_offer");
  }
  if (rewardRules.length === 0) {
    issues.push("missing_reward_rules");
  }

  const confidence = toNumber(record.confidence_score ?? record.confidenceScore) ?? 0;
  if (confidence < MIN_CONFIDENCE_SCORE) {
    issues.push("low_confidence");
  }

  const unknownCategories = rewardRules.filter((rule) => rule.unknownRawCategory);
  if (unknownCategories.length > 0) {
    issues.push("unknown_category_values");
  }

  const duplicateMap = new Map();
  for (const rule of rewardRules) {
    const key = dedupKey(rule);
    duplicateMap.set(key, (duplicateMap.get(key) ?? 0) + 1);
  }
  if ([...duplicateMap.values()].some((count) => count > 1)) {
    issues.push("duplicate_reward_rules");
  }

  const lowRateMap = new Map();
  for (const rule of rewardRules) {
    if (rule.rateValue == null || rule.rateValue > 1.5) {
      continue;
    }
    const key = `${rule.rateValue}|${rule.unit}|${normalizeToken(rule.rateText)}`;
    const set = lowRateMap.get(key) ?? new Set();
    set.add(rule.category);
    lowRateMap.set(key, set);
  }
  for (const categories of lowRateMap.values()) {
    if (categories.size >= 3 && !categories.has("all_other")) {
      issues.push("baseline_repeated_by_category");
      break;
    }
  }

  return {
    issues,
    normalizedRuleCount: rewardRules.length,
    unknownCategoryValues: [...new Set(unknownCategories.map((rule) => rule.unknownRawCategory))],
    dedupedRuleCount: new Set(rewardRules.map((rule) => dedupKey(rule))).size
  };
}

function summarizeIssueCounts(reports) {
  const counts = new Map();
  for (const report of reports) {
    for (const issue of report.issues) {
      counts.set(issue, (counts.get(issue) ?? 0) + 1);
    }
  }
  return Object.fromEntries([...counts.entries()].sort((a, b) => b[1] - a[1]));
}

async function fetchSupabaseRows() {
  const url = new URL(`/rest/v1/${SUPABASE_TABLE}`, SUPABASE_URL);
  url.searchParams.set(
    "select",
    [
      "id",
      "issuer",
      "card_name",
      "network",
      "card_segment",
      "popularity_rank",
      "country",
      "card_url",
      "last_fetched_at",
      "annual_fee_text",
      "intro_offer_text",
      "rotating_category_program",
      "rotating_categories",
      "reward_rules",
      "notes",
      "confidence_score",
      "fetch_status",
      "fetch_error"
    ].join(",")
  );
  url.searchParams.set("order", "issuer.asc,card_name.asc");
  url.searchParams.set("limit", "5000");

  const response = await fetch(url.toString(), {
    headers: {
      apikey: SUPABASE_READ_KEY,
      Authorization: `Bearer ${SUPABASE_READ_KEY}`
    }
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Supabase query failed (${response.status}): ${body}`);
  }

  return response.json();
}

async function loadRecords() {
  if (SUPABASE_URL && SUPABASE_READ_KEY) {
    const rows = await fetchSupabaseRows();
    return { source: "supabase", records: rows };
  }

  const raw = await fs.readFile(DATASET_PATH, "utf8");
  const parsed = JSON.parse(raw);
  return { source: "local-json", records: Array.isArray(parsed.records) ? parsed.records : [] };
}

function toManualActionList(report) {
  const actions = [];
  if (report.issues.includes("missing_reward_rules")) {
    actions.push("Add full reward_rules");
  }
  if (report.issues.includes("missing_annual_fee")) {
    actions.push("Add annual_fee_text");
  }
  if (report.issues.includes("missing_intro_offer")) {
    actions.push("Add intro_offer_text");
  }
  if (report.issues.includes("unknown_category_values")) {
    actions.push("Fix category names to standard categories");
  }
  if (report.issues.includes("duplicate_reward_rules")) {
    actions.push("Remove duplicate reward rules");
  }
  if (report.issues.includes("baseline_repeated_by_category")) {
    actions.push("Move baseline earn rate to all_other");
  }
  return actions;
}

async function main() {
  const { source, records } = await loadRecords();

  const reports = records.map((record) => {
    const audit = detectIssues(record);
    const id = record.id;
    const issuer = record.issuer ?? "Unknown";
    const cardName = record.card_name ?? record.cardName ?? "Unknown Card";
    const cardUrl = record.card_url ?? record.cardUrl ?? "";
    return {
      id,
      issuer,
      cardName,
      cardUrl,
      issues: audit.issues,
      unknownCategoryValues: audit.unknownCategoryValues,
      normalizedRuleCount: audit.normalizedRuleCount,
      dedupedRuleCount: audit.dedupedRuleCount,
      manualActions: toManualActionList({ issues: audit.issues })
    };
  });

  const withIssues = reports.filter((report) => report.issues.length > 0);
  withIssues.sort((a, b) => b.issues.length - a.issues.length || a.issuer.localeCompare(b.issuer) || a.cardName.localeCompare(b.cardName));

  const output = {
    generatedAt: new Date().toISOString(),
    source,
    totalRecords: records.length,
    recordsWithIssues: withIssues.length,
    issuesByType: summarizeIssueCounts(withIssues),
    cardsNeedingManualReview: withIssues
  };

  await fs.writeFile(REPORT_PATH, JSON.stringify(output, null, 2) + "\n", "utf8");

  console.log(`Audited ${records.length} records from ${source}.`);
  console.log(`Cards needing manual review: ${withIssues.length}`);
  console.log("Issue counts:");
  for (const [issue, count] of Object.entries(output.issuesByType)) {
    console.log(`  ${issue}: ${count}`);
  }
  console.log(`Wrote report: ${path.relative(rootDir, REPORT_PATH)}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
