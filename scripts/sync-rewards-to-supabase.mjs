import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

const DATASET_PATH = path.join(rootDir, "data/rewards/cards.us.json");

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_REWARDS_TABLE = process.env.SUPABASE_REWARDS_TABLE ?? "credit_card_rewards";
const CHUNK_SIZE = Number(process.env.SUPABASE_SYNC_CHUNK_SIZE ?? 200);
const MIN_CONFIDENCE_SCORE = Number(process.env.MIN_CONFIDENCE_SCORE ?? 0.4);
const SYNC_ONLY_HIGH_QUALITY = process.env.SYNC_ONLY_HIGH_QUALITY !== "0";

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

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.");
  process.exit(1);
}

function toDbRow(record, generatedAt) {
  return {
    id: record.id,
    issuer: record.issuer,
    card_name: record.cardName,
    network: record.network,
    card_segment: record.cardSegment,
    popularity_rank: record.popularityRank,
    country: record.country,
    card_url: record.cardUrl,
    last_fetched_at: record.lastFetchedAt,
    annual_fee_text: record.annualFeeText,
    intro_offer_text: record.introOfferText,
    rotating_category_program: record.rotatingCategoryProgram,
    rotating_categories: record.rotatingCategories,
    reward_rules: record.rewardRules,
    notes: record.notes,
    confidence_score: record.confidenceScore,
    fetch_status: record.fetchStatus,
    fetch_error: record.fetchError,
    source_generated_at: generatedAt
  };
}

function chunk(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

function isHighQualityRecord(record) {
  if (!record || record.fetchStatus !== "ok") {
    return false;
  }

  if (!record.issuer || record.issuer === "Unknown") {
    return false;
  }

  if (!record.cardUrl || AGGREGATOR_HOST_REGEX.test(record.cardUrl) || NON_CARD_PATH_REGEX.test(record.cardUrl)) {
    return false;
  }

  const normalizedName = String(record.cardName ?? "")
    .toLowerCase()
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!normalizedName || GENERIC_CARD_NAME_EXACT.has(normalizedName)) {
    return false;
  }
  if (normalizedName.split(" ").length === 1 && normalizedName.length <= 3) {
    return false;
  }

  try {
    const pathname = new URL(record.cardUrl).pathname.replace(/^\/+/, "");
    const firstSegment = pathname.split("/")[0]?.toLowerCase() ?? "";
    if (firstSegment && firstSegment !== "us" && firstSegment !== "en-us" && /^[a-z]{2}(?:-[a-z]{2})?$/.test(firstSegment)) {
      return false;
    }
  } catch {
    return false;
  }

  if (!Array.isArray(record.rewardRules) || record.rewardRules.length === 0) {
    return false;
  }

  if (!Number.isFinite(record.confidenceScore) || record.confidenceScore < MIN_CONFIDENCE_SCORE) {
    return false;
  }

  return true;
}

async function upsertChunk(rows) {
  const url = `${SUPABASE_URL}/rest/v1/${SUPABASE_REWARDS_TABLE}?on_conflict=id`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      Prefer: "resolution=merge-duplicates,return=minimal"
    },
    body: JSON.stringify(rows)
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Supabase upsert failed (${response.status}): ${text}`);
  }
}

async function main() {
  const raw = await fs.readFile(DATASET_PATH, "utf8");
  const parsed = JSON.parse(raw);

  const generatedAt = parsed.generatedAt ?? null;
  const records = Array.isArray(parsed.records) ? parsed.records : [];

  if (records.length === 0) {
    console.log("No records found in rewards dataset. Nothing to sync.");
    return;
  }

  const filteredRecords = SYNC_ONLY_HIGH_QUALITY ? records.filter(isHighQualityRecord) : records;
  if (filteredRecords.length === 0) {
    console.log("No high-quality records found after filtering. Nothing to sync.");
    return;
  }

  const rows = filteredRecords.map((record) => toDbRow(record, generatedAt));
  const batches = chunk(rows, Math.max(1, CHUNK_SIZE));

  for (const batch of batches) {
    await upsertChunk(batch);
  }

  console.log(
    `Synced ${rows.length} records to Supabase table ${SUPABASE_REWARDS_TABLE} (source records=${records.length}, high-quality filter=${SYNC_ONLY_HIGH_QUALITY ? "on" : "off"}).`
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
