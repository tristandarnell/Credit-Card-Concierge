import { promises as fs } from "node:fs";
import path from "node:path";
import { CATEGORY_ALIASES, STANDARD_CATEGORIES, type StandardCategory } from "@/lib/rewards/categories";
import { normalizeAnnualFeeText } from "@/lib/rewards/scoring";
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
  [key: string]: unknown;
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
const LOCAL_OVERRIDES_PATH = path.join(process.cwd(), "data/rewards/overrides.us.json");

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_READ_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  process.env.SUPABASE_ANON_KEY ??
  "";
const SUPABASE_TABLE = process.env.SUPABASE_REWARDS_TABLE ?? "credit_card_rewards";
const SUPABASE_CLEAN_VIEW = process.env.SUPABASE_REWARDS_CLEAN_VIEW ?? `${SUPABASE_TABLE}_clean`;
const ALLOW_AGGREGATOR_REWARD_SOURCES = process.env.ALLOW_AGGREGATOR_REWARD_SOURCES === "1";

const SELECT_COLUMNS = "*";

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
  map.set("other", "all_other");

  return map;
})();

let recordOverridesCache: Record<string, unknown> | null = null;

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

const EXPECTED_ANNUAL_FEE_BY_CARD_NAME: Array<{ patterns: RegExp[]; fee: string }> = [
  { patterns: [/\bblue cash preferred\b/i], fee: "$95" },
  { patterns: [/\bamerican express gold\b/i, /\bamex gold\b/i, /\bgold delta skymiles\b/i], fee: "$325" },
  { patterns: [/\bcapital one venture x\b/i, /\bventure x\b/i], fee: "$395" },
  { patterns: [/\bcapital one venture\b/i, /\bventure rewards\b/i], fee: "$95" },
  { patterns: [/\bchase sapphire preferred\b/i, /\bsapphire preferred\b/i], fee: "$95" },
  { patterns: [/\bciti strata premier\b/i, /\bstrata premier\b/i], fee: "$95" },
  { patterns: [/\bwells fargo autograph journey\b/i, /\bautograph journey\b/i], fee: "$95" },
  { patterns: [/\bpenfed pathfinder rewards\b/i, /\bpathfinder rewards\b/i], fee: "$95" }
];

function expectedAnnualFeeFromCardName(cardName: string): string | null {
  const normalizedName = normalizeCardName(cardName);
  for (const candidate of EXPECTED_ANNUAL_FEE_BY_CARD_NAME) {
    if (candidate.patterns.some((pattern) => pattern.test(normalizedName))) {
      return candidate.fee;
    }
  }

  return null;
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

function normalizeAnnualFeeCandidate(value: unknown): string | null {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
    return `$${Math.round(value).toLocaleString("en-US")}`;
  }

  if (typeof value === "string") {
    return normalizeAnnualFeeText(value);
  }

  return null;
}

function resolveAnnualFeeTextFromDbRow(row: SupabaseRewardRow): string | null {
  const directFee = normalizeAnnualFeeText(row.annual_fee_text ?? null);
  if (directFee) {
    return directFee;
  }

  for (const [key, value] of Object.entries(row)) {
    const normalizedKey = key.toLowerCase();
    if (normalizedKey === "annual_fee_text") {
      continue;
    }

    if (!normalizedKey.includes("annual") || !normalizedKey.includes("fee")) {
      continue;
    }

    const candidateFee = normalizeAnnualFeeCandidate(value);
    if (candidateFee) {
      return candidateFee;
    }
  }

  return null;
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
    annualFeeText: resolveAnnualFeeTextFromDbRow(row),
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
    annualFeeText: normalizeAnnualFeeText(value.annualFeeText ?? null),
    rewardRules: normalizeRewardRules(value.rewardRules),
    notes: Array.isArray(value.notes) ? value.notes.filter((note): note is string => typeof note === "string") : [],
    confidenceScore: Number.isFinite(value.confidenceScore) ? value.confidenceScore : 0,
    fetchStatus: value.fetchStatus === "ok" ? "ok" : "error",
    fetchError: value.fetchError ?? null
  };
}

function applyRecordOverride(record: CardRewardRecord, overrides: Record<string, unknown>): CardRewardRecord {
  const override = overrides[record.id];
  if (!override || typeof override !== "object") {
    const expectedFee = expectedAnnualFeeFromCardName(record.cardName);
    if (!expectedFee) {
      return record;
    }

    const currentFee = normalizeAnnualFeeText(record.annualFeeText);
    if (currentFee && currentFee !== "$0") {
      return record;
    }

    return {
      ...record,
      annualFeeText: expectedFee
    };
  }

  const value = override as Partial<CardRewardRecord>;
  const merged = {
    ...record,
    issuer: typeof value.issuer === "string" ? value.issuer : record.issuer,
    cardName: typeof value.cardName === "string" ? value.cardName : record.cardName,
    annualFeeText: normalizeAnnualFeeText(value.annualFeeText ?? record.annualFeeText),
    introOfferText:
      typeof value.introOfferText === "string" || value.introOfferText === null
        ? value.introOfferText
        : record.introOfferText,
    rewardRules: Array.isArray(value.rewardRules) ? normalizeRewardRules(value.rewardRules) : record.rewardRules,
    notes: Array.isArray(value.notes) ? value.notes.filter((note): note is string => typeof note === "string") : record.notes,
    confidenceScore:
      typeof value.confidenceScore === "number" && Number.isFinite(value.confidenceScore)
        ? value.confidenceScore
        : record.confidenceScore,
    fetchStatus: value.fetchStatus === "error" ? "error" : value.fetchStatus === "ok" ? "ok" : record.fetchStatus,
    fetchError: typeof value.fetchError === "string" || value.fetchError === null ? value.fetchError : record.fetchError
  };

  const expectedFee = expectedAnnualFeeFromCardName(merged.cardName);
  if (!expectedFee) {
    return merged;
  }

  const currentFee = normalizeAnnualFeeText(merged.annualFeeText);
  if (currentFee && currentFee !== "$0") {
    return merged;
  }

  return {
    ...merged,
    annualFeeText: expectedFee
  };
}

async function getRecordOverrides(): Promise<Record<string, unknown>> {
  if (recordOverridesCache) {
    return recordOverridesCache;
  }

  try {
    const raw = await fs.readFile(LOCAL_OVERRIDES_PATH, "utf8");
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      recordOverridesCache = {};
      return recordOverridesCache;
    }

    recordOverridesCache = parsed as Record<string, unknown>;
    return recordOverridesCache;
  } catch {
    recordOverridesCache = {};
    return recordOverridesCache;
  }
}

function qualityIssues(record: CardRewardRecord): string[] {
  const reasons: string[] = [];

  if (record.fetchStatus !== "ok") {
    reasons.push("Fetch failed");
  }

  if (!record.issuer || record.issuer === "Unknown") {
    reasons.push("Unknown issuer");
  }

  if (!ALLOW_AGGREGATOR_REWARD_SOURCES && AGGREGATOR_HOST_REGEX.test(record.cardUrl)) {
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

function feeLookupKey(record: Pick<CardRewardRecord, "issuer" | "cardName">): string {
  return `${record.issuer.toLowerCase()}::${normalizeCardName(record.cardName)}`;
}

function mergeMissingAnnualFees(
  primaryRecords: CardRewardRecord[],
  feeSourceRecords: CardRewardRecord[]
): CardRewardRecord[] {
  const feeById = new Map<string, string>();
  const feeByName = new Map<string, string>();

  for (const record of feeSourceRecords) {
    const normalizedFee = normalizeAnnualFeeText(record.annualFeeText);
    if (!normalizedFee) {
      continue;
    }

    feeById.set(record.id, normalizedFee);
    feeByName.set(feeLookupKey(record), normalizedFee);
  }

  return primaryRecords.map((record) => {
    const existingFee = normalizeAnnualFeeText(record.annualFeeText);
    if (existingFee) {
      return {
        ...record,
        annualFeeText: existingFee
      };
    }

    const feeFromId = feeById.get(record.id);
    if (feeFromId) {
      return {
        ...record,
        annualFeeText: feeFromId
      };
    }

    const feeFromName = feeByName.get(feeLookupKey(record));
    if (feeFromName) {
      return {
        ...record,
        annualFeeText: feeFromName
      };
    }

    return record;
  });
}

async function readLocalRewardsRecords(): Promise<CardRewardRecord[]> {
  try {
    const raw = await fs.readFile(LOCAL_REWARDS_PATH, "utf8");
    const parsed = JSON.parse(raw) as { records?: unknown[] };
    const localRecords = Array.isArray(parsed.records) ? parsed.records : [];
    const overrides = await getRecordOverrides();
    return localRecords
      .map((record) => mapRecordFromLocal(record))
      .filter((record): record is CardRewardRecord => record != null)
      .map((record) => applyRecordOverride(record, overrides));
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
  const overrides = await getRecordOverrides();
  return payload.map((row) => applyRecordOverride(mapRecordFromDb(row), overrides));
}

export async function getRawRewardCards(limit = 500): Promise<CardRewardRecord[]> {
  if (hasSupabaseReadConfig()) {
    try {
      const fromSupabase = await fetchSupabaseRecords(SUPABASE_TABLE, limit);
      const localRecords = await readLocalRewardsRecords();
      return mergeMissingAnnualFees(fromSupabase, localRecords);
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
      const fromRaw = await fetchSupabaseRecords(SUPABASE_TABLE, Math.max(limit, 1200));
      const fromLocal = await readLocalRewardsRecords();
      const mergedWithRawFees = mergeMissingAnnualFees(fromView, fromRaw);
      const mergedFees = mergeMissingAnnualFees(mergedWithRawFees, fromLocal);
      const cleanFromView = mergedFees.filter((record) => isHighQualityRecord(record));
      const cleanWithKnownFees = cleanFromView.filter((record) => normalizeAnnualFeeText(record.annualFeeText) != null);

      if (cleanWithKnownFees.length > 0) {
        return cleanWithKnownFees;
      }

      if (cleanFromView.length > 0) {
        return cleanFromView;
      }
    } catch {
      // fallback to raw-table filtering
    }
  }

  const rawRecords = await getRawRewardCards(limit);
  const cleanFromRaw = rawRecords.filter((record) => isHighQualityRecord(record));
  const cleanWithKnownFees = cleanFromRaw.filter((record) => normalizeAnnualFeeText(record.annualFeeText) != null);
  return cleanWithKnownFees.length > 0 ? cleanWithKnownFees : cleanFromRaw;
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
