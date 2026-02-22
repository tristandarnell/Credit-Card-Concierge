import { promises as fs } from "node:fs";
import path from "node:path";
import { CATEGORY_ALIASES, STANDARD_CATEGORIES, type StandardCategory } from "@/lib/rewards/categories";
import type { CardRewardRecord, RewardRule, RewardUnit } from "@/lib/rewards/types";

type SupabaseRewardRow = {
  id: string;
  issuer: string;
  card_name: string;
  network: string | null;
  card_segment: "personal" | "business" | string;
  popularity_rank: number | null;
  country: string;
  card_url: string;
  last_fetched_at: string | null;
  annual_fee_text: string | null;
  intro_offer_text: string | null;
  rotating_category_program: boolean | null;
  rotating_categories: unknown;
  reward_rules: unknown;
  notes: unknown;
  confidence_score: number | string | null;
  fetch_status: "ok" | "error" | string;
  fetch_error: string | null;
};

export type DataQualityIssue = {
  id: string;
  issuer: string;
  cardName: string;
  cardUrl: string;
  fetchStatus: string;
  confidenceScore: number;
  reasons: string[];
};

const LOCAL_REWARDS_PATH = path.join(process.cwd(), "data/rewards/cards.us.json");

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_READ_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  process.env.SUPABASE_ANON_KEY ??
  "";
const SUPABASE_TABLE = process.env.SUPABASE_REWARDS_TABLE ?? "credit_card_rewards";
const SUPABASE_CLEAN_VIEW = process.env.SUPABASE_REWARDS_CLEAN_VIEW ?? `${SUPABASE_TABLE}_clean`;

const SELECT_COLUMNS = [
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
].join(",");

const AGGREGATOR_HOST_REGEX = /(nerdwallet\.com|creditcards\.com|bankrate\.com|forbes\.com)/i;
const NON_CARD_PATH_REGEX =
  /(?:\/advice\/|\/benefits(?:\/|$)|\/business-hub(?:\/|$)|\/guide(?:\/|$)|\/guides\/|\/blog\/|\/news\/|\/education\/|\/help\/|\/support\/|\/faq\/|\/contact\/|\/about\/|\/legal\/|\/terms(?:\/|$)|\/privacy(?:\/|$)|\/resources?\/|\/tools?\/|\/account(?:\/|$)|\/employee(?:\/|$)|\/vendor(?:\/|$)|\/virtual(?:\/|$)|\/public(?:\/|$)|\/search(?:\/|$)|\/wholesale(?:\/|$)|\/cryptopedia\/)/i;
const GENERIC_CARD_NAME_EXACT = new Set([
  "all",
  "travel",
  "rewards",
  "visa",
  "mastercard",
  "card",
  "hotel",
  "benefits",
  "business hub",
  "banking public",
  "banking benefits",
  "app",
  "btc",
  "au",
  "sg",
  "gb",
  "it",
  "fr",
  "es",
  "pt",
  "newest offers",
  "no annual fee",
  "no foreign transaction fee"
]);
const CATEGORY_SET = new Set<StandardCategory>(STANDARD_CATEGORIES);
const CATEGORY_LOOKUP: ReadonlyMap<string, StandardCategory> = (() => {
  const map = new Map<string, StandardCategory>();

  for (const category of STANDARD_CATEGORIES) {
    map.set(normalizeToken(category), category);
    map.set(normalizeToken(category.replace(/_/g, " ")), category);

    for (const alias of CATEGORY_ALIASES[category]) {
      map.set(normalizeToken(alias), category);
    }
  }

  map.set("drug store", "drugstores");
  map.set("drug stores", "drugstores");
  map.set("gas station", "gas");
  map.set("gas stations", "gas");
  map.set("grocery store", "groceries");
  map.set("grocery stores", "groceries");
  map.set("phone bill", "phone");
  map.set("phone bills", "phone");
  map.set("mobile phone", "phone");
  map.set("mobile phones", "phone");

  return map;
})();

function hasSupabaseReadConfig(): boolean {
  return SUPABASE_URL.length > 0 && SUPABASE_READ_KEY.length > 0;
}

function normalizeCardName(cardName: string): string {
  return cardName
    .toLowerCase()
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeToken(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[_/+-]+/g, " ")
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeRewardUnit(unit: unknown): RewardUnit {
  if (unit === "percent_cashback" || unit === "x_points" || unit === "x_miles") {
    return unit;
  }

  return "unknown";
}

function normalizeCategory(category: unknown): StandardCategory {
  if (typeof category !== "string") {
    return "all_other";
  }

  if (CATEGORY_SET.has(category as StandardCategory)) {
    return category as StandardCategory;
  }

  const normalized = normalizeToken(category);
  const mapped = CATEGORY_LOOKUP.get(normalized);
  if (mapped) {
    return mapped;
  }

  if (normalized.endsWith("s")) {
    const singular = CATEGORY_LOOKUP.get(normalized.slice(0, -1));
    if (singular) {
      return singular;
    }
  }

  return "all_other";
}

function normalizeRewardRule(rule: unknown): RewardRule | null {
  if (!rule || typeof rule !== "object") {
    return null;
  }

  const value = rule as {
    category?: unknown;
    rateText?: unknown;
    rateValue?: unknown;
    unit?: unknown;
    capText?: unknown;
    notes?: unknown;
  };

  if (typeof value.rateText !== "string" || value.rateText.length === 0) {
    return null;
  }

  const rateValue =
    typeof value.rateValue === "number"
      ? value.rateValue
      : typeof value.rateValue === "string"
        ? Number(value.rateValue)
        : null;

  return {
    category: normalizeCategory(value.category),
    rateText: value.rateText.trim(),
    rateValue: Number.isFinite(rateValue ?? NaN) ? (rateValue as number) : null,
    unit: normalizeRewardUnit(value.unit),
    capText: typeof value.capText === "string" ? value.capText : undefined,
    notes: typeof value.notes === "string" ? value.notes : undefined
  };
}

function ruleDedupKey(rule: RewardRule): string {
  const rateValue = typeof rule.rateValue === "number" ? String(rule.rateValue) : "null";
  return `${rule.category}|${rateValue}|${rule.unit}|${normalizeToken(rule.rateText)}`;
}

function normalizeRewardRules(input: unknown): RewardRule[] {
  if (!Array.isArray(input)) {
    return [];
  }

  const deduped = new Map<string, RewardRule>();
  for (const rule of input) {
    const normalized = normalizeRewardRule(rule);
    if (!normalized) {
      continue;
    }

    const key = ruleDedupKey(normalized);
    const existing = deduped.get(key);
    if (!existing) {
      deduped.set(key, normalized);
      continue;
    }

    deduped.set(key, {
      ...existing,
      capText: existing.capText ?? normalized.capText,
      notes: existing.notes ?? normalized.notes
    });
  }

  return [...deduped.values()];
}

function isNonUsLocalizedPath(cardUrl: string): boolean {
  try {
    const firstSegment = new URL(cardUrl).pathname.replace(/^\/+/, "").split("/")[0]?.toLowerCase() ?? "";
    if (!firstSegment || firstSegment === "us" || firstSegment === "en-us") {
      return false;
    }

    return /^[a-z]{2}(?:-[a-z]{2})?$/.test(firstSegment);
  } catch {
    return true;
  }
}

function mapRecordFromDb(row: SupabaseRewardRow): CardRewardRecord {
  const rewardRules = normalizeRewardRules(row.reward_rules);

  return {
    id: row.id,
    issuer: row.issuer,
    cardName: row.card_name,
    network: row.network ?? undefined,
    cardSegment: row.card_segment === "business" ? "business" : "personal",
    popularityRank: typeof row.popularity_rank === "number" ? row.popularity_rank : null,
    country: "US",
    cardUrl: row.card_url,
    lastFetchedAt: row.last_fetched_at ?? new Date(0).toISOString(),
    annualFeeText: row.annual_fee_text ?? null,
    introOfferText: row.intro_offer_text ?? null,
    rotatingCategoryProgram: Boolean(row.rotating_category_program),
    rotatingCategories: Array.isArray(row.rotating_categories) ? row.rotating_categories : [],
    rewardRules,
    notes: Array.isArray(row.notes) ? row.notes.filter((note): note is string => typeof note === "string") : [],
    confidenceScore:
      typeof row.confidence_score === "number"
        ? row.confidence_score
        : typeof row.confidence_score === "string"
          ? Number(row.confidence_score)
          : 0,
    fetchStatus: row.fetch_status === "ok" ? "ok" : "error",
    fetchError: row.fetch_error ?? null
  };
}

function mapRecordFromLocal(record: unknown): CardRewardRecord | null {
  if (!record || typeof record !== "object") {
    return null;
  }

  const value = record as CardRewardRecord;
  if (typeof value.id !== "string" || typeof value.issuer !== "string" || typeof value.cardName !== "string") {
    return null;
  }

  return {
    ...value,
    cardSegment: value.cardSegment === "business" ? "business" : "personal",
    popularityRank: typeof value.popularityRank === "number" ? value.popularityRank : null,
    country: "US",
    rewardRules: normalizeRewardRules(value.rewardRules),
    notes: Array.isArray(value.notes) ? value.notes.filter((note): note is string => typeof note === "string") : [],
    confidenceScore: Number.isFinite(value.confidenceScore) ? value.confidenceScore : 0,
    fetchStatus: value.fetchStatus === "ok" ? "ok" : "error",
    fetchError: value.fetchError ?? null
  };
}

function qualityIssues(record: CardRewardRecord): string[] {
  const reasons: string[] = [];

  if (record.fetchStatus !== "ok") {
    reasons.push("Fetch failed");
  }

  if (!record.issuer || record.issuer === "Unknown") {
    reasons.push("Unknown issuer");
  }

  if (AGGREGATOR_HOST_REGEX.test(record.cardUrl)) {
    reasons.push("Aggregator source");
  }

  if (NON_CARD_PATH_REGEX.test(record.cardUrl)) {
    reasons.push("Non-card URL path");
  }

  if (isNonUsLocalizedPath(record.cardUrl)) {
    reasons.push("Non-US locale page");
  }

  const normalizedName = normalizeCardName(record.cardName);
  if (!normalizedName || GENERIC_CARD_NAME_EXACT.has(normalizedName)) {
    reasons.push("Generic card name");
  }

  if (normalizedName.split(" ").length === 1 && normalizedName.length <= 3) {
    reasons.push("Likely slug fragment");
  }

  if (!Array.isArray(record.rewardRules) || record.rewardRules.length === 0) {
    reasons.push("No reward rules");
  }

  if (!Number.isFinite(record.confidenceScore) || record.confidenceScore < 0.4) {
    reasons.push("Low confidence");
  }

  return reasons;
}

export function isHighQualityRecord(record: CardRewardRecord): boolean {
  return qualityIssues(record).length === 0;
}

async function readLocalRewardsRecords(): Promise<CardRewardRecord[]> {
  try {
    const raw = await fs.readFile(LOCAL_REWARDS_PATH, "utf8");
    const parsed = JSON.parse(raw) as { records?: unknown[] };
    const localRecords = Array.isArray(parsed.records) ? parsed.records : [];
    return localRecords.map((record) => mapRecordFromLocal(record)).filter((record): record is CardRewardRecord => record != null);
  } catch {
    return [];
  }
}

async function fetchSupabaseRecords(table: string, limit = 500): Promise<CardRewardRecord[]> {
  const url = new URL(`/rest/v1/${table}`, SUPABASE_URL);
  url.searchParams.set("select", SELECT_COLUMNS);
  url.searchParams.set("order", "issuer.asc,card_name.asc");
  url.searchParams.set("limit", String(limit));

  const response = await fetch(url.toString(), {
    cache: "no-store",
    headers: {
      apikey: SUPABASE_READ_KEY,
      Authorization: `Bearer ${SUPABASE_READ_KEY}`
    }
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Supabase query failed for ${table}: ${response.status} ${body}`);
  }

  const payload = (await response.json()) as SupabaseRewardRow[];
  return payload.map((row) => mapRecordFromDb(row));
}

export async function getRawRewardCards(limit = 500): Promise<CardRewardRecord[]> {
  if (hasSupabaseReadConfig()) {
    try {
      return await fetchSupabaseRecords(SUPABASE_TABLE, limit);
    } catch {
      // fallback below
    }
  }

  return readLocalRewardsRecords();
}

export async function getCleanRewardCards(limit = 500): Promise<CardRewardRecord[]> {
  if (hasSupabaseReadConfig()) {
    try {
      const fromView = await fetchSupabaseRecords(SUPABASE_CLEAN_VIEW, limit);
      if (fromView.length > 0) {
        return fromView;
      }
    } catch {
      // fallback to raw-table filtering
    }
  }

  const rawRecords = await getRawRewardCards(limit);
  return rawRecords.filter((record) => isHighQualityRecord(record));
}

export async function getDataQualityIssues(limit = 150): Promise<DataQualityIssue[]> {
  const rawRecords = await getRawRewardCards(Math.max(limit * 3, 500));
  return rawRecords
    .map((record) => ({
      id: record.id,
      issuer: record.issuer,
      cardName: record.cardName,
      cardUrl: record.cardUrl,
      fetchStatus: record.fetchStatus,
      confidenceScore: record.confidenceScore,
      reasons: qualityIssues(record)
    }))
    .filter((issue) => issue.reasons.length > 0)
    .slice(0, limit);
}
