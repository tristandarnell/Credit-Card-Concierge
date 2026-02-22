import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

const MANUAL_SOURCE_PATH = path.join(rootDir, "data/rewards/sources.us.json");
const DISCOVERY_CONFIG_PATH = path.join(rootDir, "data/rewards/discovery.us.json");
const DISCOVERED_SOURCE_PATH = path.join(rootDir, "data/rewards/sources.discovered.us.json");
const DISCOVERY_REPORT_PATH = path.join(rootDir, "data/rewards/discovery-report.us.json");
const OVERRIDES_PATH = path.join(rootDir, "data/rewards/overrides.us.json");
const OUTPUT_PATH = path.join(rootDir, "data/rewards/cards.us.json");
const RAW_DIR = path.join(rootDir, "data/rewards/raw");

const USER_AGENT =
  "CreditCardConciergeBot/0.3 (hackathon research; contact: bobbydarnell6@gmail.com)";
const FETCH_TIMEOUT_MS = Number(process.env.FETCH_TIMEOUT_MS ?? 20000);
const REQUEST_DELAY_MS = Number(process.env.REQUEST_DELAY_MS ?? 125);
const SOURCE_LIMIT = Number(process.env.SOURCE_LIMIT ?? 0);
const MAX_FETCH_SOURCES = Number(process.env.MAX_FETCH_SOURCES ?? 3000);
const MAX_DISCOVERED_SOURCES = Number(process.env.MAX_DISCOVERED_SOURCES ?? 10000);
const MAX_SITEMAP_CHILDREN = Number(process.env.MAX_SITEMAP_CHILDREN ?? 200);
const FETCH_CONCURRENCY = Number(process.env.FETCH_CONCURRENCY ?? 8);
const DISCOVERY_CONCURRENCY = Number(process.env.DISCOVERY_CONCURRENCY ?? 6);
const HOST_CONCURRENCY = Number(process.env.HOST_CONCURRENCY ?? 2);
const HOST_MIN_DELAY_MS = Number(process.env.HOST_MIN_DELAY_MS ?? 300);
const MAX_FETCH_RETRIES = Number(process.env.MAX_FETCH_RETRIES ?? 4);
const RETRY_BACKOFF_BASE_MS = Number(process.env.RETRY_BACKOFF_BASE_MS ?? 700);
const RETRY_BACKOFF_MAX_MS = Number(process.env.RETRY_BACKOFF_MAX_MS ?? 20000);
const RETRY_JITTER_MS = Number(process.env.RETRY_JITTER_MS ?? 350);
const MIN_CONFIDENCE_SCORE = Number(process.env.MIN_CONFIDENCE_SCORE ?? 0.4);
const OUTPUT_REQUIRE_REWARD_RULES = process.env.OUTPUT_REQUIRE_REWARD_RULES !== "0";
const ALLOW_AGGREGATOR_SOURCES = process.env.ALLOW_AGGREGATOR_SOURCES === "1";
const NERDWALLET_ONLY = process.env.NERDWALLET_ONLY === "1";
const DISCOVERY_ONLY = process.env.DISCOVERY_ONLY === "1";
const ENABLE_DISCOVERY = process.env.ENABLE_DISCOVERY === "1";
const ENABLE_SITEMAP_DISCOVERY = process.env.ENABLE_SITEMAP_DISCOVERY !== "0";
const DISCOVERY_SOURCE_FILTER = (process.env.DISCOVERY_SOURCE_FILTER ?? "").toLowerCase().trim();
const FETCH_SOURCE_FILTER = (process.env.FETCH_SOURCE_FILTER ?? "").toLowerCase().trim();
const TARGET_BUSINESS_SHARE = Number(process.env.TARGET_BUSINESS_SHARE ?? 0.3);
const NERDWALLET_CRAWL_MAX_PAGES = Number(process.env.NERDWALLET_CRAWL_MAX_PAGES ?? 400);
const NERDWALLET_CRAWL_DEPTH = Number(process.env.NERDWALLET_CRAWL_DEPTH ?? 5);
const NERDWALLET_MAX_REVIEWS_PER_SEED = Number(process.env.NERDWALLET_MAX_REVIEWS_PER_SEED ?? 6);
const NERDWALLET_SEED_ONLY = process.env.NERDWALLET_SEED_ONLY === "1";
const NERDWALLET_EXTRA_SEEDS = (process.env.NERDWALLET_EXTRA_SEEDS ?? "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);
const NERDWALLET_SEED_URLS_OVERRIDE = (process.env.NERDWALLET_SEED_URLS_OVERRIDE ?? "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

const CATEGORY_ALIASES = {
  dining: ["dining", "restaurant", "restaurants", "food delivery", "takeout"],
  groceries: ["grocery", "groceries", "supermarket", "supermarkets"],
  gas: ["gas", "fuel", "gas station", "gas stations", "service stations"],
  travel: ["travel", "travel purchases", "travel spend", "travel portal"],
  airfare: ["airfare", "flights", "airline", "airlines"],
  hotels: ["hotel", "hotels", "lodging"],
  transit: ["transit", "rideshare", "taxis", "subway", "train"],
  streaming: ["streaming", "streaming services", "select streaming"],
  drugstores: ["drugstore", "drugstores", "pharmacy", "pharmacies"],
  online_retail: ["online retail", "online purchases", "online shopping", "ecommerce", "amazon"],
  entertainment: ["entertainment", "live entertainment", "movie theater", "movie theaters"],
  utilities: ["utilities", "electric", "water", "internet bill", "internet bills"],
  phone: ["phone", "cell phone", "wireless", "telephone"],
  office_supply: ["office supply", "office supplies"],
  all_other: ["all other", "all purchases", "everything else", "all eligible purchases"]
};

const REWARD_CONTEXT_REGEX =
  /(earn|earning|cash back|points?|miles?|rewards?|bonus categories?|on purchases|booked through|per \$?1)/i;
const RATE_CONTEXT_BLOCKLIST_REGEX =
  /(apr|annual percentage rate|interest rate|balance transfer|cash advance|late fee|penalty|minimum payment|variable rate|purchase rate|foreign transaction fee)/i;
const POSITIVE_REWARD_WORD_REGEX =
  /(cash back|back on|points?|miles?|rewards?|statement credits?|bonus categories?|earn(?:ing)?)/i;
const PERCENT_REWARD_CONTEXT_REGEX = /(%\s*(?:cash\s*back|back|rewards?)|\bcash\s*back\b|statement credits?)/i;
const X_RATE_CONTEXT_REGEX = /([xX]\s*(?:points?|miles?)|per\s+\$?1|for every\s+\$?1|earn(?:ing)?)/i;
const STRONG_ROTATING_REGEX =
  /(rotating categories|bonus categories each quarter|activate categories|category calendar|5% categories this quarter)/i;
const PERIOD_REGEX =
  /(q[1-4](?:\s*\d{4})?|[1-4](?:st|nd|rd|th)\s+quarter(?:\s*\d{4})?|quarter\s*[1-4]|jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)(?:\s*(?:-|to|through)\s*(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?))?/i;
const LISTING_URL_REGEX =
  /(?:\/best(?:-|\/)|\/top(?:-|\/)|\/compare|\/comparison|\/zero-interest|\/balance-transfer|\/student-credit-cards|\/travel-credit-cards\/best|\/cash-back-credit-cards\/best|\/guides?\/|\/news\/|\/education\/|\/the-best-credit-cards)/i;
const NON_CARD_PATH_REGEX =
  /(?:\/advice\/|\/benefits(?:\/|$)|\/business-hub(?:\/|$)|\/guide(?:\/|$)|\/guides\/|\/blog\/|\/news\/|\/education\/|\/help\/|\/support\/|\/faq\/|\/contact\/|\/about\/|\/legal\/|\/terms(?:\/|$)|\/privacy(?:\/|$)|\/resources?\/|\/tools?\/|\/account(?:\/|$)|\/employee(?:\/|$)|\/vendor(?:\/|$)|\/virtual(?:\/|$)|\/public(?:\/|$)|\/search(?:\/|$)|\/wholesale(?:\/|$)|\/cryptopedia\/)/i;
const SINGLE_CARD_URL_HINT_REGEX =
  /(?:\/review\/|\/reviews\/|\/card\/|\/cards\/[a-z0-9-]+(?:\/|$)|\/credit-cards\/[a-z0-9-]+(?:\/|$))/i;
const CARD_DETAIL_URL_REGEX =
  /(?:\/credit-cards?\/[a-z0-9-]+(?:\/[a-z0-9-]+){0,3}(?:\/|$)|\/cards?\/[a-z0-9-]+(?:\/[a-z0-9-]+){0,2}(?:\/|$)|\/card\/[a-z0-9-]+(?:\/[a-z0-9-]+){0,2}(?:\/|$)|\/bank-credit-card-[a-z0-9-]+|\/smallbusiness\/credit-cards\/products\/[a-z0-9-]+)/i;
const AGGREGATOR_HOSTS = ["nerdwallet.com", "bankrate.com", "creditcards.com", "forbes.com"];
const AGGREGATE_TEXT_REGEX =
  /(best credit cards|top picks|editor'?s picks|compare cards|cards? compared|our picks for|why you(?:'|’)ll like this|n\/a rewards rate)/i;
const GENERIC_CARD_NAME_REGEX =
  /(best|zero interest|balance transfer|credit cards?|cash back cards?|travel cards?|rewards cards?)/i;
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

const DOMAIN_ISSUER_HINTS = {
  "americanexpress.com": "American Express",
  "creditcards.chase.com": "Chase",
  "capitalone.com": "Capital One",
  "citi.com": "Citi",
  "discover.com": "Discover",
  "bankofamerica.com": "Bank of America",
  "wellsfargo.com": "Wells Fargo",
  "usbank.com": "U.S. Bank",
  "barclaycardus.com": "Barclays",
  "robinhood.com": "Robinhood",
  "bilt.com": "Bilt",
  "biltrewards.com": "Bilt",
  "amazon.com": "Amazon",
  "gemini.com": "Gemini",
  "sofi.com": "SoFi",
  "penfed.org": "PenFed",
  "navyfederal.org": "Navy Federal",
  "fnbo.com": "FNBO",
  "usaa.com": "USAA",
  "creditonebank.com": "Credit One",
  "petalcard.com": "Petal",
  "upgrade.com": "Upgrade",
  "apple.com": "Apple",
  "paypal.com": "PayPal",
  "breadfinancial.com": "Bread Financial",
  "missionlane.com": "Mission Lane"
};

const ISSUER_TEXT_HINTS = [
  ["american express", "American Express"],
  ["amex", "American Express"],
  ["chase", "Chase"],
  ["capital one", "Capital One"],
  ["citi", "Citi"],
  ["discover", "Discover"],
  ["wells fargo", "Wells Fargo"],
  ["bank of america", "Bank of America"],
  ["u.s. bank", "U.S. Bank"],
  ["us bank", "U.S. Bank"],
  ["barclays", "Barclays"],
  ["navy federal", "Navy Federal"],
  ["penfed", "PenFed"],
  ["usaa", "USAA"],
  ["credit one", "Credit One"],
  ["fnbo", "FNBO"],
  ["sofi", "SoFi"],
  ["apple card", "Apple"],
  ["amazon", "Amazon"],
  ["paypal", "PayPal"],
  ["venmo", "Venmo"],
  ["bilt", "Bilt"],
  ["robinhood", "Robinhood"]
];

const NERDWALLET_SEED_URLS = [
  "https://www.nerdwallet.com/credit-cards",
  "https://www.nerdwallet.com/the-best-credit-cards",
  "https://www.nerdwallet.com/credit-cards/best",
  "https://www.nerdwallet.com/credit-cards/best/rewards",
  "https://www.nerdwallet.com/credit-cards/best/cash-back",
  "https://www.nerdwallet.com/credit-cards/best/travel",
  "https://www.nerdwallet.com/credit-cards/best/gas",
  "https://www.nerdwallet.com/credit-cards/best/college-student",
  "https://www.nerdwallet.com/credit-cards/best/zero-percent",
  "https://www.nerdwallet.com/credit-cards/best/balance-transfer",
  "https://www.nerdwallet.com/credit-cards/compare",
  "https://www.nerdwallet.com/business/credit-cards/best",
  "https://www.nerdwallet.com/best/credit-cards/airline"
];

const DEFAULT_DISCOVERY_CONFIG = {
  linkSources: [],
  sitemapSources: []
};

const NERDWALLET_SEED_URLS = [
  "https://www.nerdwallet.com/credit-cards",
  "https://www.nerdwallet.com/the-best-credit-cards",
  "https://www.nerdwallet.com/best/credit-cards",
  "https://www.nerdwallet.com/best/small-business/credit-cards",
  "https://www.nerdwallet.com/business/credit-cards/best",
  "https://www.nerdwallet.com/credit-cards/best",
  "https://www.nerdwallet.com/credit-cards/best/cash-back",
  "https://www.nerdwallet.com/credit-cards/best/rewards",
  "https://www.nerdwallet.com/credit-cards/best/travel",
  "https://www.nerdwallet.com/credit-cards/best/gas",
  "https://www.nerdwallet.com/credit-cards/best/college-student",
  "https://www.nerdwallet.com/credit-cards/best/zero-percent",
  "https://www.nerdwallet.com/credit-cards/best/balance-transfer",
  "https://www.nerdwallet.com/credit-cards/compare",
  "https://www.nerdwallet.com/best/credit-cards/airline"
];

const hostThrottleState = new Map();

function clampInt(value, minValue, maxValue) {
  if (!Number.isFinite(value)) {
    return minValue;
  }

  return Math.min(maxValue, Math.max(minValue, Math.floor(value)));
}

const SAFE_FETCH_CONCURRENCY = clampInt(FETCH_CONCURRENCY, 1, 40);
const SAFE_DISCOVERY_CONCURRENCY = clampInt(DISCOVERY_CONCURRENCY, 1, 40);
const SAFE_HOST_CONCURRENCY = clampInt(HOST_CONCURRENCY, 1, 8);
const SAFE_HOST_MIN_DELAY_MS = Math.max(0, Math.floor(HOST_MIN_DELAY_MS));
const SAFE_MAX_FETCH_RETRIES = clampInt(MAX_FETCH_RETRIES, 0, 10);
const SAFE_RETRY_BACKOFF_BASE_MS = Math.max(50, Math.floor(RETRY_BACKOFF_BASE_MS));
const SAFE_RETRY_BACKOFF_MAX_MS = Math.max(SAFE_RETRY_BACKOFF_BASE_MS, Math.floor(RETRY_BACKOFF_MAX_MS));
const SAFE_RETRY_JITTER_MS = Math.max(0, Math.floor(RETRY_JITTER_MS));
const SAFE_REQUEST_DELAY_MS = Math.max(0, Math.floor(REQUEST_DELAY_MS));
const SAFE_TARGET_BUSINESS_SHARE = Math.max(0, Math.min(0.9, TARGET_BUSINESS_SHARE));
const SAFE_MIN_CONFIDENCE_SCORE = Math.max(0, Math.min(1, Number.isFinite(MIN_CONFIDENCE_SCORE) ? MIN_CONFIDENCE_SCORE : 0.6));

function normalizedPopularityRank(value) {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return Math.floor(value);
  }

  return null;
}

function effectivePopularityRank(value) {
  return normalizedPopularityRank(value) ?? 999999;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function jitterMs() {
  if (SAFE_RETRY_JITTER_MS <= 0) {
    return 0;
  }

  return Math.floor(Math.random() * (SAFE_RETRY_JITTER_MS + 1));
}

function getHostKey(url) {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return "unknown-host";
  }
}

async function acquireHostSlot(url) {
  const hostKey = getHostKey(url);

  while (true) {
    const now = Date.now();
    const state = hostThrottleState.get(hostKey) ?? {
      active: 0,
      nextAllowedAt: 0
    };

    const canRun = state.active < SAFE_HOST_CONCURRENCY && now >= state.nextAllowedAt;
    if (canRun) {
      state.active += 1;
      state.nextAllowedAt = now + SAFE_HOST_MIN_DELAY_MS;
      hostThrottleState.set(hostKey, state);
      return hostKey;
    }

    const waitForQuota = state.active >= SAFE_HOST_CONCURRENCY ? 40 : 0;
    const waitForDelay = Math.max(0, state.nextAllowedAt - now);
    await sleep(Math.max(waitForQuota, waitForDelay, 25));
  }
}

function releaseHostSlot(hostKey) {
  const state = hostThrottleState.get(hostKey);
  if (!state) {
    return;
  }

  state.active = Math.max(0, state.active - 1);
  hostThrottleState.set(hostKey, state);
}

function parseRetryAfterMs(value) {
  if (!value) {
    return null;
  }

  if (/^\d+$/i.test(value.trim())) {
    return Number(value.trim()) * 1000;
  }

  const retryAt = Date.parse(value);
  if (Number.isNaN(retryAt)) {
    return null;
  }

  return Math.max(0, retryAt - Date.now());
}

function isRetryableHttpStatus(status) {
  return status === 408 || status === 409 || status === 425 || status === 429 || status >= 500;
}

function isRetryableError(error) {
  if (!(error instanceof Error)) {
    return false;
  }

  if (error.name === "AbortError") {
    return true;
  }

  return (
    error.message.includes("ECONNRESET") ||
    error.message.includes("ETIMEDOUT") ||
    error.message.includes("ENOTFOUND") ||
    error.message.includes("EAI_AGAIN") ||
    error.message.includes("network")
  );
}

function computeBackoffMs(attemptNumber, retryAfterMs = null) {
  const exponential = Math.min(
    SAFE_RETRY_BACKOFF_MAX_MS,
    SAFE_RETRY_BACKOFF_BASE_MS * 2 ** Math.max(0, attemptNumber)
  );
  const withRetryAfter = retryAfterMs == null ? exponential : Math.max(exponential, retryAfterMs);
  return Math.min(SAFE_RETRY_BACKOFF_MAX_MS, withRetryAfter + jitterMs());
}

function normalizeWhitespace(text) {
  return text.replace(/\s+/g, " ").trim();
}

function decodeHtmlEntities(text) {
  return String(text ?? "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&mdash;/gi, "-")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, value) => String.fromCharCode(Number.parseInt(value, 10)));
}

function stripHtml(html) {
  return normalizeWhitespace(
    html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, " ")
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, " ")
      .replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/gi, " ")
      .replace(/&amp;/gi, "&")
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'")
      .replace(/&mdash;/gi, "-")
  );
}

function normalizeUrl(url) {
  try {
    const parsed = new URL(url);
    parsed.hash = "";
    if (parsed.pathname !== "/") {
      parsed.pathname = parsed.pathname.replace(/\/+$/, "");
    }
    return parsed.toString();
  } catch {
    return url;
  }
}

function getHostname(url) {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
}

function isNerdwalletUrl(url) {
  const hostname = getHostname(url);
  return hostname === "nerdwallet.com" || hostname.endsWith(".nerdwallet.com");
}

function canonicalCrawlUrl(url) {
  try {
    const parsed = new URL(url);
    parsed.hash = "";
    parsed.search = "";
    if (parsed.pathname !== "/") {
      parsed.pathname = parsed.pathname.replace(/\/+$/, "");
    }
    return parsed.toString();
  } catch {
    return normalizeUrl(url);
  }
}

function isNerdwalletReviewUrl(url) {
  try {
    const pathname = new URL(url).pathname.toLowerCase();
    return /\/credit-cards\/reviews?\//i.test(pathname);
  } catch {
    return false;
  }
}

function shouldCrawlNerdwalletPage(url) {
  if (!isNerdwalletUrl(url)) {
    return false;
  }

  try {
    const pathname = new URL(url).pathname.toLowerCase();
    if (!pathname || pathname === "/") {
      return false;
    }

    if (NON_CARD_PATH_REGEX.test(pathname)) {
      return false;
    }

    if (
      /\/(credit-cards(?:\/|$)|the-best-credit-cards(?:\/|$)|best\/(?:small-business\/)?credit-cards(?:\/|$)|business\/credit-cards(?:\/|$)|small-business\/credit-cards(?:\/|$)|article\/credit-cards(?:\/|$))/i.test(
        pathname
      )
    ) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

function isAggregatorHost(url) {
  const hostname = getHostname(url);
  return AGGREGATOR_HOSTS.some((domain) => hostname.endsWith(domain));
}

function isNerdwalletUrl(url) {
  const hostname = getHostname(url);
  return hostname === "nerdwallet.com" || hostname.endsWith(".nerdwallet.com");
}

function canonicalCrawlUrl(url) {
  try {
    const parsed = new URL(url);
    parsed.hash = "";
    parsed.search = "";
    if (parsed.pathname !== "/") {
      parsed.pathname = parsed.pathname.replace(/\/+$/, "");
    }
    return parsed.toString();
  } catch {
    return normalizeUrl(url);
  }
}

function isNerdwalletReviewUrl(url) {
  try {
    return /\/credit-cards\/reviews?\//i.test(new URL(url).pathname);
  } catch {
    return false;
  }
}

function shouldCrawlNerdwalletPage(url) {
  if (!isNerdwalletUrl(url)) {
    return false;
  }

  try {
    const pathname = new URL(url).pathname.toLowerCase();
    if (!pathname || pathname === "/") {
      return false;
    }

    if (NON_CARD_PATH_REGEX.test(pathname)) {
      return false;
    }

    return (
      /\/credit-cards(?:\/|$)/i.test(pathname) ||
      /\/best\/credit-cards(?:\/|$)/i.test(pathname) ||
      /\/credit-cards\/best(?:\/|$)/i.test(pathname) ||
      /\/business\/credit-cards(?:\/|$)/i.test(pathname)
    );
  } catch {
    return false;
  }
}

function normalizedCardName(name) {
  return String(name ?? "")
    .toLowerCase()
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isGenericCardName(name) {
  const normalized = normalizedCardName(name);
  if (!normalized) {
    return true;
  }

  if (GENERIC_CARD_NAME_EXACT.has(normalized)) {
    return true;
  }

  if (normalized.split(" ").length === 1 && normalized.length <= 3) {
    return true;
  }

  return GENERIC_CARD_NAME_REGEX.test(normalized);
}

function isNonUsLocalizedPath(url) {
  try {
    const pathname = new URL(url).pathname.replace(/^\/+/, "");
    const firstSegment = pathname.split("/")[0]?.toLowerCase() ?? "";

    if (!firstSegment) {
      return false;
    }

    if (firstSegment === "us" || firstSegment === "en-us") {
      return false;
    }

    return /^[a-z]{2}(?:-[a-z]{2})?$/.test(firstSegment);
  } catch {
    return false;
  }
}

function hasNonCardPathHints(url) {
  return NON_CARD_PATH_REGEX.test(url) || isNonUsLocalizedPath(url);
}

function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
}

function makeUniqueId(base, usedIds) {
  let candidate = base || "card";
  let counter = 2;

  while (usedIds.has(candidate)) {
    candidate = `${base}-${counter}`;
    counter += 1;
  }

  usedIds.add(candidate);
  return candidate;
}

function parseRateCandidates(text) {
  const candidates = [];
  const xRegex = /(\d+(?:\.\d+)?)\s*[xX](?:\s*(?:points?|miles?))?/g;
  const pctRegex = /(\d+(?:\.\d+)?)\s*%\s*(?:cash\s*back|back|rewards?)?/g;

  for (const match of text.matchAll(xRegex)) {
    const value = Number(match[1]);
    const raw = normalizeWhitespace(match[0]);
    candidates.push({
      index: match.index ?? 0,
      rateText: raw,
      rateValue: Number.isFinite(value) ? value : null,
      unit: /mile/i.test(raw) ? "x_miles" : "x_points"
    });
  }

  for (const match of text.matchAll(pctRegex)) {
    const value = Number(match[1]);
    const raw = normalizeWhitespace(match[0]);
    candidates.push({
      index: match.index ?? 0,
      rateText: raw,
      rateValue: Number.isFinite(value) ? value : null,
      unit: "percent_cashback"
    });
  }

  return candidates;
}

function isValidRewardCandidate(candidate, sentence) {
  if (candidate.rateValue == null) {
    return false;
  }

  const sentenceLower = sentence.toLowerCase();
  const left = Math.max(0, candidate.index - 48);
  const right = Math.min(sentence.length, candidate.index + candidate.rateText.length + 48);
  const localContext = sentence.slice(left, right);
  const localLower = localContext.toLowerCase();

  if (candidate.unit === "percent_cashback") {
    if (candidate.rateValue <= 0 || candidate.rateValue > 12) {
      return false;
    }
  }

  if (candidate.unit === "x_points" || candidate.unit === "x_miles") {
    if (candidate.rateValue <= 0 || candidate.rateValue > 15) {
      return false;
    }
  }

  if (RATE_CONTEXT_BLOCKLIST_REGEX.test(localContext)) {
    return false;
  }

  if (!REWARD_CONTEXT_REGEX.test(localContext) && !REWARD_CONTEXT_REGEX.test(sentenceLower)) {
    return false;
  }

  const hasPositiveRewardWords =
    POSITIVE_REWARD_WORD_REGEX.test(localContext) || POSITIVE_REWARD_WORD_REGEX.test(sentenceLower);
  if (!hasPositiveRewardWords) {
    return false;
  }

  if (candidate.unit === "percent_cashback") {
    const hasExplicitPercentReward =
      PERCENT_REWARD_CONTEXT_REGEX.test(localContext) || /%\s*(?:on|at|for)\b/i.test(localContext);
    if (!hasExplicitPercentReward) {
      return false;
    }
  }

  if (candidate.unit === "x_points" || candidate.unit === "x_miles") {
    const hasXContext =
      X_RATE_CONTEXT_REGEX.test(localContext) ||
      /(points?|miles?)/i.test(candidate.rateText) ||
      /(points?|miles?)/i.test(sentenceLower);
    if (!hasXContext) {
      return false;
    }
  }

  if (/(intro\s+apr|variable\s+apr|apr\s+for|purchase\s+apr)/i.test(localLower)) {
    return false;
  }

  return true;
}

function extractCap(text) {
  const capMatch = text.match(
    /(?:up to|on up to|first|up\s*to)\s+\$[\d,]+(?:\s+in)?(?:\s+combined)?[^.]{0,90}/i
  );
  return capMatch ? normalizeWhitespace(capMatch[0]) : undefined;
}

function extractAnnualFee(text) {
  const normalized = normalizeWhitespace(text).toLowerCase();

  function collect(pattern) {
    const values = [];
    let match = null;
    while ((match = pattern.exec(normalized)) !== null) {
      const value = Number((match[1] ?? "").replace(/[^0-9.]/g, ""));
      if (Number.isFinite(value) && value >= 0 && value <= 5000) {
        values.push(Math.round(value));
      }
    }
    return values;
  }

  if (/^(none|n\/a|na|not applicable|not available|unknown)$/.test(normalized)) {
    return null;
  }

  if (/^(no annual fee|annual fee waived|no fee|free|zero)$/.test(normalized)) {
    return "$0";
  }

  const transitionValues = collect(
    /(?:then|thereafter|after(?:\s+the)?\s+first\s+year|after\s+year\s+one)[^0-9]{0,30}(?:\$|usd\s*)?([\d,]+(?:\.\d{1,2})?)/gi
  );
  if (transitionValues.length > 0) {
    const value = transitionValues.find((candidate) => candidate > 0) ?? transitionValues[0];
    return `$${value}`;
  }

  const explicitAnnualValues = [
    ...collect(/annual fee(?:\s+of)?(?:\s*[:\-])?(?:\s+is)?\s*(?:\$|usd\s*)?([\d,]+(?:\.\d{1,2})?)/gi),
    ...collect(/(?:\$|usd\s*)?([\d,]+(?:\.\d{1,2})?)\s+annual fee/gi),
    ...collect(
      /annual membership fee(?:\s+of)?(?:\s*[:\-])?(?:\s+is)?\s*(?:\$|usd\s*)?([\d,]+(?:\.\d{1,2})?)/gi
    ),
    ...collect(/(?:\$|usd\s*)?([\d,]+(?:\.\d{1,2})?)\s+(?:yearly fee|fee per year|per year)/gi)
  ];
  if (explicitAnnualValues.length > 0) {
    const introContext = /intro|introductory|first year|first-year|waived/.test(normalized);
    const value = introContext
      ? explicitAnnualValues.find((candidate) => candidate > 0) ?? explicitAnnualValues[0]
      : explicitAnnualValues[0];
    return `$${value}`;
  }

  if (/no annual fee|annual fee waived/.test(normalized)) {
    return "$0";
  }

  if (normalized.length <= 28) {
    const directValues = collect(
      /^(?:\$|usd\s*)?([\d,]+(?:\.\d{1,2})?)(?:\s*(?:usd|per year|annually|annual))?$/gi
    );
    if (directValues.length > 0) {
      return `$${directValues[0]}`;
    }
  }

  return null;
}

function extractIntroOffer(text) {
  const specificBonus = text.match(
    /earn\s+[\d,]+\s+(?:bonus\s+)?(?:points?|miles?)\s+after\s+you\s+spend[^.]{0,180}\./i
  );

  if (specificBonus) {
    return normalizeWhitespace(specificBonus[0]);
  }

  const general = text.match(
    /(?:welcome|sign[-\s]?up|intro(?:ductory)?)\s+(?:offer|bonus)[^.]{0,180}\./i
  );

  if (general) {
    return normalizeWhitespace(general[0]);
  }

  return null;
}

function splitIntoSentences(text) {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((segment) => normalizeWhitespace(segment))
    .filter((segment) => segment.length >= 24 && segment.length <= 420);
}

function categoriesInText(lowerText) {
  const matched = [];

  for (const [category, aliases] of Object.entries(CATEGORY_ALIASES)) {
    if (aliases.some((alias) => new RegExp(`\\b${escapeRegex(alias)}\\b`, "i").test(lowerText))) {
      matched.push(category);
    }
  }

  if (/(everything else|all purchases|all other purchases|all eligible purchases)/i.test(lowerText)) {
    matched.push("all_other");
  }

  return [...new Set(matched)];
}

function dedupeRules(rules) {
  const unique = new Map();

  for (const rule of rules) {
    const key = `${rule.category}|${rule.unit}|${rule.rateValue}|${rule.capText ?? ""}|${rule.notes ?? ""}`;
    const existing = unique.get(key);

    if (!existing) {
      unique.set(key, rule);
      continue;
    }

    const betterText = rule.rateText.length > existing.rateText.length ? rule.rateText : existing.rateText;
    const betterCap = existing.capText ?? rule.capText;
    const betterNotes = existing.notes ?? rule.notes;

    unique.set(key, {
      ...existing,
      rateText: betterText,
      capText: betterCap,
      notes: betterNotes
    });
  }

  const normalized = [...unique.values()].map((rule) => ({
    ...rule,
    rateText: normalizeWhitespace(rule.rateText)
  }));

  const groupedCounts = new Map();
  return normalized
    .sort((a, b) => a.category.localeCompare(b.category) || (b.rateValue ?? 0) - (a.rateValue ?? 0))
    .filter((rule) => {
      const count = groupedCounts.get(rule.category) ?? 0;
      if (count >= 4) {
        return false;
      }

      groupedCounts.set(rule.category, count + 1);
      return true;
    });
}

function readJsonArrayFrom(text, fromIndex) {
  const start = text.indexOf("[", fromIndex);
  if (start < 0) {
    return null;
  }

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = start; index < text.length; index += 1) {
    const char = text[index];
    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (char === "\\") {
        escaped = true;
        continue;
      }
      if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
      continue;
    }

    if (char === "[") {
      depth += 1;
      continue;
    }

    if (char === "]") {
      depth -= 1;
      if (depth === 0) {
        return text.slice(start, index + 1);
      }
    }
  }

  return null;
}

function cardLabelTokens(text) {
  const stopwords = new Set(["card", "credit", "review", "rewards", "best", "the", "for", "from"]);
  return normalizedCardName(
    decodeHtmlEntities(String(text ?? ""))
      .replace(/®|℠|™/g, " ")
      .replace(/[^a-z0-9\s]/gi, " ")
  )
    .split(" ")
    .filter((token) => token.length >= 2)
    .filter((token) => !stopwords.has(token));
}

function tokenOverlapScore(left, right) {
  if (!left.length || !right.length) {
    return 0;
  }

  const rightSet = new Set(right);
  let matches = 0;
  for (const token of new Set(left)) {
    if (rightSet.has(token)) {
      matches += 1;
    }
  }

  return matches / Math.max(1, rightSet.size);
}

function parseNumericRateValue(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const number = Number(value.replace(/[^\d.]+/g, ""));
    if (Number.isFinite(number)) {
      return number;
    }
  }

  return null;
}

function formatRateValue(value) {
  if (!Number.isFinite(value)) {
    return "";
  }
  if (Number.isInteger(value)) {
    return String(value);
  }
  return String(value).replace(/0+$/, "").replace(/\.$/, "");
}

function inferRateUnit(description) {
  const lower = description.toLowerCase();
  if (/%|cash\s*back|cashback|statement credits?/i.test(lower)) {
    return "percent_cashback";
  }
  if (/\bmiles?\b/i.test(lower)) {
    return "x_miles";
  }
  return "x_points";
}

function categoriesForNerdwalletDescription(description) {
  const lower = description.toLowerCase();
  let categories = categoriesInText(lower);

  if (/all other (travel|dining|restaurants?|grocery|groceries|gas|streaming|transit|hotel|hotels|airfare|flights?|airlines?)/i.test(lower)) {
    categories = categories.filter((category) => category !== "all_other");
  }

  if (/(all purchases|all other purchases|all eligible purchases|every purchase)/i.test(lower)) {
    if (!categories.includes("all_other")) {
      categories.push("all_other");
    }
  }

  if (categories.length === 0 && /(purchases?|spend|transactions?)/i.test(lower)) {
    categories = ["all_other"];
  }

  return [...new Set(categories)];
}

function rateTextFromUnit(rateValue, unit) {
  const formatted = formatRateValue(rateValue);
  if (unit === "percent_cashback") {
    return `${formatted}% cash back`;
  }
  if (unit === "x_miles") {
    return `${formatted}X miles`;
  }
  return `${formatted}X points`;
}

function restrictionNotesFromText(text) {
  const notes = [];
  if (hasPortalRestriction(text)) {
    notes.push("Requires booking through an issuer travel portal.");
  }
  if (hasMobileWalletRestriction(text)) {
    notes.push("Requires payment via mobile wallet (e.g., Apple Pay/Google Pay).");
  }
  if (hasPhysicalCardRestriction(text)) {
    notes.push("Applies only to purchases made with the physical card.");
  }
  if (hasMerchantRestriction(text)) {
    notes.push("Rate is limited to select/eligible merchants.");
  }

  return notes.length > 0 ? [...new Set(notes)].join(" ") : undefined;
}

function extractNerdwalletRewardsBreakdownRules({ html, sourceCardName, finalUrl, pageTitle = "", pageH1 = "" }) {
  const decoded = html.replace(/\\"/g, '"');
  const marker = '"rewardsRates":';
  const candidates = [];
  let cursor = 0;

  while (cursor < decoded.length) {
    const index = decoded.indexOf(marker, cursor);
    if (index < 0) {
      break;
    }

    const arrayText = readJsonArrayFrom(decoded, index + marker.length);
    if (!arrayText) {
      cursor = index + marker.length;
      continue;
    }

    let entries = [];
    try {
      const parsed = JSON.parse(arrayText);
      entries = Array.isArray(parsed) ? parsed : [];
    } catch {
      cursor = index + marker.length;
      continue;
    }

    const leftContext = decoded.slice(Math.max(0, index - 1600), index);
    const nameMatches = [...leftContext.matchAll(/"product":\{"name":"([^"]+)"/g)];
    const productName =
      nameMatches.length > 0 ? decodeHtmlEntities(nameMatches[nameMatches.length - 1][1] ?? "") : null;

    const rates = entries
      .map((entry) => {
        const rateValue = parseNumericRateValue(entry?.rate);
        const description = normalizeWhitespace(decodeHtmlEntities(entry?.description ?? ""));
        return { rateValue, description };
      })
      .filter((entry) => entry.rateValue != null && entry.rateValue > 0 && entry.rateValue <= 15 && entry.description.length > 0);

    candidates.push({
      productName,
      rates
    });

    cursor = index + marker.length;
  }

  if (candidates.length === 0) {
    return { rules: [], reason: "No NerdWallet rewards breakdown payload found." };
  }

  const sourceTokens = cardLabelTokens(sourceCardName);
  const titleTokens = cardLabelTokens(`${pageTitle} ${pageH1}`);
  const urlTokens = cardLabelTokens(guessCardNameFromUrl(finalUrl));

  const scored = candidates.map((candidate) => {
    const candidateTokens = cardLabelTokens(candidate.productName ?? "");
    const sourceOverlap = tokenOverlapScore(sourceTokens, candidateTokens);
    const titleOverlap = tokenOverlapScore(titleTokens, candidateTokens);
    const urlOverlap = tokenOverlapScore(urlTokens, candidateTokens);
    return {
      ...candidate,
      overlap: Math.max(sourceOverlap, titleOverlap, urlOverlap),
      score: sourceOverlap * 5 + titleOverlap * 3 + urlOverlap * 2 + Math.min(candidate.rates.length, 8) * 0.03
    };
  });

  scored.sort((a, b) => b.score - a.score);
  const best = scored[0];

  if (!best || best.overlap <= 0) {
    return { rules: [], reason: "No matching NerdWallet product block for this card." };
  }

  if (!Array.isArray(best.rates) || best.rates.length === 0) {
    return { rules: [], reason: "Matched NerdWallet product has no rewards breakdown rates." };
  }

  const rules = [];
  for (const entry of best.rates) {
    const unit = inferRateUnit(entry.description);
    const categories = categoriesForNerdwalletDescription(entry.description);
    if (categories.length === 0) {
      continue;
    }
    const note = restrictionNotesFromText(entry.description);
    const capText = extractCap(entry.description);
    for (const category of categories) {
      rules.push({
        category,
        rateText: rateTextFromUnit(entry.rateValue, unit),
        rateValue: entry.rateValue,
        unit,
        capText,
        notes: note
      });
    }
  }

  return {
    rules: dedupeRules(rules),
    reason: null
  };
}

function hasPortalRestriction(text) {
  const lower = text.toLowerCase();
  return (
    /booked?\s+through/i.test(lower) ||
    /travel\s+portal/i.test(lower) ||
    /capital one travel/i.test(lower) ||
    /chase travel/i.test(lower) ||
    /amex travel/i.test(lower) ||
    /bank of america travel center/i.test(lower)
  );
}

function hasMobileWalletRestriction(text) {
  const lower = text.toLowerCase();
  return (
    /apple pay|google pay|samsung pay|mobile wallet|digital wallet|wallet app|contactless/i.test(lower)
  );
}

function hasPhysicalCardRestriction(text) {
  const lower = text.toLowerCase();
  return /physical card|card swipe|swiped|dipped|tapped card|card present/i.test(lower);
}

function hasMerchantRestriction(text) {
  const lower = text.toLowerCase();
  return (
    /(select|participating|eligible)\s+merchants?/i.test(lower) ||
    /\bincluding\b[^.]{0,120},/i.test(lower) ||
    /\bwith\s+(apple|nike|t-mobile|exxon|walgreens|amazon|uber|lyft|walmart|target|costco)\b/i.test(lower) ||
    /\b(?:at|with|through)\s+(hilton|marriott|bonvoy|hyatt|ihg|wyndham|united|delta|southwest|jetblue|alaska|american airlines|aadvantage|frontier|spirit)\b/i.test(
      lower
    )
  );
}

function hasGenericPurchaseLanguage(text) {
  const lower = text.toLowerCase();
  return /\b(purchases?|spend|transactions?)\b/i.test(lower);
}

function categoriesNearRate(sentence, rate) {
  const start = Math.max(0, (rate.index ?? 0) - 120);
  const end = Math.min(sentence.length, (rate.index ?? 0) + String(rate.rateText ?? "").length + 120);
  const localContext = sentence.slice(start, end).toLowerCase();
  return categoriesInText(localContext);
}

function extractRestrictionNote(sentence, rate) {
  const start = Math.max(0, (rate.index ?? 0) - 90);
  const end = Math.min(sentence.length, (rate.index ?? 0) + String(rate.rateText ?? "").length + 90);
  const localContext = sentence.slice(start, end);
  const notes = [];

  if (hasPortalRestriction(localContext)) {
    notes.push("Requires booking through an issuer travel portal.");
  }

  if (hasMobileWalletRestriction(localContext)) {
    notes.push("Requires payment via mobile wallet (e.g., Apple Pay/Google Pay).");
  }

  if (hasPhysicalCardRestriction(localContext)) {
    notes.push("Applies only to purchases made with the physical card.");
  }

  if (hasMerchantRestriction(localContext)) {
    notes.push("Rate is limited to select/eligible merchants.");
  }

  if (notes.length === 0) {
    return undefined;
  }

  return [...new Set(notes)].join(" ");
}

function extractRewardRules(text) {
  const sentences = splitIntoSentences(text);
  const rules = [];

  for (const sentence of sentences) {
    const lower = sentence.toLowerCase();
    if (!REWARD_CONTEXT_REGEX.test(lower)) {
      continue;
    }

    if (RATE_CONTEXT_BLOCKLIST_REGEX.test(lower) && !/(cash back|points|miles|earn)/i.test(lower)) {
      continue;
    }

    const sentenceCategories = categoriesInText(lower);

    const rates = parseRateCandidates(sentence).filter((candidate) => isValidRewardCandidate(candidate, sentence));
    if (rates.length === 0) {
      continue;
    }

    const capText = extractCap(sentence);

    for (const rate of rates) {
      let categories = categoriesNearRate(sentence, rate);
      if (categories.length === 0) {
        categories = sentenceCategories;
      }
      if (categories.length === 0 && hasGenericPurchaseLanguage(lower)) {
        categories = ["all_other"];
      }
      if (categories.length === 0) {
        continue;
      }

      const notes = extractRestrictionNote(sentence, rate);
      for (const category of categories) {
        rules.push({
          category,
          rateText: rate.rateText,
          rateValue: rate.rateValue,
          unit: rate.unit,
          capText,
          notes
        });
      }
    }
  }

  return dedupeRules(rules);
}

function readJsonArrayFrom(text, fromIndex) {
  const start = text.indexOf("[", fromIndex);
  if (start < 0) {
    return null;
  }

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = start; index < text.length; index += 1) {
    const char = text[index];

    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }

      if (char === "\\") {
        escaped = true;
        continue;
      }

      if (char === '"') {
        inString = false;
      }

      continue;
    }

    if (char === '"') {
      inString = true;
      continue;
    }

    if (char === "[") {
      depth += 1;
      continue;
    }

    if (char === "]") {
      depth -= 1;
      if (depth === 0) {
        return text.slice(start, index + 1);
      }
    }
  }

  return null;
}

function cardLabelTokens(text) {
  const stopwords = new Set(["card", "credit", "review", "rewards", "best", "the", "for", "from"]);
  return normalizedCardName(
    decodeHtmlEntities(String(text ?? ""))
      .replace(/®|℠|™/g, " ")
      .replace(/[^a-z0-9\s]/gi, " ")
  )
    .split(" ")
    .filter((token) => token.length >= 2)
    .filter((token) => !stopwords.has(token));
}

function tokenOverlapScore(left, right) {
  if (!left.length || !right.length) {
    return 0;
  }

  const rightSet = new Set(right);
  let matches = 0;

  for (const token of new Set(left)) {
    if (rightSet.has(token)) {
      matches += 1;
    }
  }

  return matches / Math.max(1, rightSet.size);
}

function parseNumericRateValue(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const number = Number(value.replace(/[^\d.]+/g, ""));
    if (Number.isFinite(number)) {
      return number;
    }
  }

  return null;
}

function formatRateValue(value) {
  if (!Number.isFinite(value)) {
    return "";
  }

  if (Number.isInteger(value)) {
    return String(value);
  }

  return String(value).replace(/0+$/, "").replace(/\.$/, "");
}

function inferRateUnit(description) {
  const lower = description.toLowerCase();
  if (/%|cash\s*back|cashback|statement credits?/i.test(lower)) {
    return "percent_cashback";
  }
  if (/\bmiles?\b/i.test(lower)) {
    return "x_miles";
  }
  return "x_points";
}

function categoriesForNerdwalletDescription(description) {
  const lower = description.toLowerCase();
  let categories = categoriesInText(lower);

  if (/all other (travel|dining|restaurants?|grocery|groceries|gas|streaming|transit|hotel|hotels|airfare|flights?|airlines?)/i.test(lower)) {
    categories = categories.filter((category) => category !== "all_other");
  }

  if (/(all purchases|all other purchases|all eligible purchases|every purchase)/i.test(lower)) {
    if (!categories.includes("all_other")) {
      categories.push("all_other");
    }
  }

  if (categories.length === 0) {
    categories = ["all_other"];
  }

  return [...new Set(categories)];
}

function rateTextFromUnit(rateValue, unit) {
  const formatted = formatRateValue(rateValue);
  if (unit === "percent_cashback") {
    return `${formatted}% cash back`;
  }
  if (unit === "x_miles") {
    return `${formatted}X miles`;
  }
  return `${formatted}X points`;
}

function extractNerdwalletRewardsBreakdownRules({ html, sourceCardName, finalUrl }) {
  const decoded = html.replace(/\\"/g, '"');
  const marker = '"rewardsRates":';
  const candidates = [];
  let cursor = 0;

  while (cursor < decoded.length) {
    const index = decoded.indexOf(marker, cursor);
    if (index < 0) {
      break;
    }

    const arrayText = readJsonArrayFrom(decoded, index + marker.length);
    if (!arrayText) {
      cursor = index + marker.length;
      continue;
    }

    let entries = [];
    try {
      const parsed = JSON.parse(arrayText);
      entries = Array.isArray(parsed) ? parsed : [];
    } catch {
      cursor = index + marker.length;
      continue;
    }

    const rates = entries
      .map((entry) => {
        const rateValue = parseNumericRateValue(entry?.rate);
        const description = normalizeWhitespace(decodeHtmlEntities(entry?.description ?? ""));
        return { rateValue, description };
      })
      .filter(
        (entry) =>
          entry.rateValue != null &&
          entry.rateValue > 0 &&
          entry.rateValue <= 15 &&
          entry.description.length > 0 &&
          REWARD_CONTEXT_REGEX.test(entry.description.toLowerCase()) &&
          !RATE_CONTEXT_BLOCKLIST_REGEX.test(entry.description.toLowerCase())
      );

    const leftContext = decoded.slice(Math.max(0, index - 1600), index);
    const nameMatches = [...leftContext.matchAll(/"product":\{"name":"([^"]+)"/g)];
    const productName =
      nameMatches.length > 0 ? decodeHtmlEntities(nameMatches[nameMatches.length - 1][1] ?? "") : null;

    candidates.push({
      productName,
      rates
    });

    cursor = index + marker.length;
  }

  if (candidates.length === 0) {
    return { rules: [], productName: null };
  }

  const titleMatch = html.match(/<title>([\s\S]*?)<\/title>/i);
  const title = titleMatch ? normalizeWhitespace(stripHtml(titleMatch[1])) : "";
  const urlTokens = (() => {
    try {
      return cardLabelTokens(new URL(finalUrl).pathname.replace(/[/-]+/g, " "));
    } catch {
      return [];
    }
  })();
  const sourceTokens = cardLabelTokens(sourceCardName);
  const titleTokens = cardLabelTokens(title);
  const titleIndicatesUnavailable = /no longer available|not available/i.test(title);

  const scored = candidates.map((candidate) => {
    const candidateTokens = cardLabelTokens(candidate.productName ?? "");
    const sourceOverlap = tokenOverlapScore(sourceTokens, candidateTokens);
    const titleOverlap = tokenOverlapScore(titleTokens, candidateTokens);
    const urlOverlap = tokenOverlapScore(urlTokens, candidateTokens);
    const overlap = Math.max(sourceOverlap, titleOverlap, urlOverlap);
    const score =
      sourceOverlap * 5 +
      titleOverlap * 3 +
      urlOverlap * 2 +
      Math.min(candidate.rates.length, 8) * 0.03;

    return {
      ...candidate,
      overlap,
      score
    };
  });

  scored.sort((left, right) => right.score - left.score);
  const best = scored[0];
  const namedCandidates = scored.filter((candidate) => cardLabelTokens(candidate.productName ?? "").length > 0);
  const matchingCandidates = namedCandidates.filter((candidate) => candidate.overlap > 0);
  const fallbackCandidate =
    matchingCandidates.length > 0
      ? [...matchingCandidates].sort((left, right) => right.score - left.score)[0]
      : best;

  if (!fallbackCandidate || fallbackCandidate.overlap <= 0) {
    return {
      rules: [],
      productName: fallbackCandidate?.productName ?? null,
      reason: "No matching NerdWallet rewards breakdown block found for this card."
    };
  }

  if (fallbackCandidate.rates.length === 0) {
    const reason = titleIndicatesUnavailable
      ? "NerdWallet page is marked unavailable and has no rewards breakdown for this card."
      : "Matched NerdWallet card block has no rewards breakdown rates.";
    return {
      rules: [],
      productName: fallbackCandidate.productName ?? null,
      reason
    };
  }

  const rules = [];
  for (const entry of fallbackCandidate.rates) {
    const unit = inferRateUnit(entry.description);
    const rateText = rateTextFromUnit(entry.rateValue, unit);
    const categories = categoriesForNerdwalletDescription(entry.description);
    const capText = extractCap(entry.description);

    for (const category of categories) {
      rules.push({
        category,
        rateText,
        rateValue: entry.rateValue,
        unit,
        capText,
        notes: undefined
      });
    }
  }

  return {
    rules: dedupeRules(rules),
    productName: fallbackCandidate.productName ?? null,
    reason: null
  };
}

function extractRotatingCategories(text) {
  const sentences = splitIntoSentences(text);
  const rotating = [];
  const seen = new Set();

  for (const sentence of sentences) {
    const lower = sentence.toLowerCase();

    if (!/(quarter|q1|q2|q3|q4|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i.test(lower)) {
      continue;
    }

    if (!/(rotating|activate|bonus categories|5%|5x|calendar)/i.test(lower)) {
      continue;
    }

    const categories = categoriesInText(lower).filter((category) => category !== "all_other");
    if (categories.length === 0) {
      continue;
    }

    const rate = parseRateCandidates(sentence).find((candidate) => isValidRewardCandidate(candidate, sentence));
    const periodMatch = sentence.match(PERIOD_REGEX);
    const period = periodMatch ? normalizeWhitespace(periodMatch[0]) : "Unspecified period";
    const sourceText = normalizeWhitespace(sentence).slice(0, 220);

    const key = `${period}|${categories.join(",")}|${rate?.rateText ?? ""}`;
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    rotating.push({
      period,
      rateText: rate?.rateText ?? null,
      categories,
      sourceText
    });

    if (rotating.length >= 16) {
      break;
    }
  }

  return rotating;
}

function hasRotatingCategories(text, rotatingDetails) {
  return rotatingDetails.length > 0 || STRONG_ROTATING_REGEX.test(text);
}

function computeConfidence({
  fetchOk,
  ruleCount,
  introOfferFound,
  annualFeeFound,
  rotatingCount
}) {
  if (!fetchOk) {
    return 0;
  }

  let score = 0.22;
  score += Math.min(ruleCount, 8) * 0.07;
  if (introOfferFound) {
    score += 0.08;
  }
  if (annualFeeFound) {
    score += 0.08;
  }
  if (rotatingCount > 0) {
    score += 0.05;
  }
  if (ruleCount === 0) {
    score -= 0.15;
  }

  return Math.max(0, Math.min(0.95, Number(score.toFixed(2))));
}

async function fetchText(url, acceptHeader = "text/html,application/xhtml+xml") {
  let lastError = null;

  for (let attempt = 0; attempt <= SAFE_MAX_FETCH_RETRIES; attempt += 1) {
    const hostKey = await acquireHostSlot(url);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        redirect: "follow",
        signal: controller.signal,
        headers: {
          "user-agent": USER_AGENT,
          accept: acceptHeader
        }
      });

      if (!response.ok) {
        const retryAfterMs = parseRetryAfterMs(response.headers.get("retry-after"));
        const statusError = new Error(`HTTP ${response.status}`);
        const canRetry = attempt < SAFE_MAX_FETCH_RETRIES && isRetryableHttpStatus(response.status);

        if (canRetry) {
          await sleep(computeBackoffMs(attempt, retryAfterMs));
          continue;
        }

        throw statusError;
      }

      return {
        body: await response.text(),
        finalUrl: response.url,
        contentType: response.headers.get("content-type") ?? ""
      };
    } catch (error) {
      lastError = error;
      const canRetry = attempt < SAFE_MAX_FETCH_RETRIES && isRetryableError(error);
      if (!canRetry) {
        throw error;
      }

      await sleep(computeBackoffMs(attempt));
    } finally {
      clearTimeout(timeout);
      releaseHostSlot(hostKey);
    }
  }

  throw lastError ?? new Error("Request failed");
}

async function fetchCardPage(url) {
  return fetchText(url, "text/html,application/xhtml+xml");
}

function matchesIncludeExclude(url, include = [], exclude = []) {
  if (include.length > 0 && !include.some((pattern) => url.includes(pattern))) {
    return false;
  }

  if (exclude.length > 0 && exclude.some((pattern) => url.includes(pattern))) {
    return false;
  }

  return true;
}

function looksLikeCardUrl(url) {
  if (!/^https?:\/\//i.test(url)) {
    return false;
  }

  if (LISTING_URL_REGEX.test(url)) {
    return false;
  }

  if (hasNonCardPathHints(url)) {
    return false;
  }

  if (
    /(\/login|\/signin|\/privacy|\/terms|\/careers|\/about|\/contact|\/help|\/support|\/press|\/news|\/blog|\/faq|\/sitemap)/i.test(
      url
    )
  ) {
    return false;
  }

  if (/(\.(css|js|png|jpg|jpeg|gif|svg|pdf|xml)(\?|$))/i.test(url)) {
    return false;
  }

  if (isAggregatorHost(url)) {
    if (NERDWALLET_ONLY && isNerdwalletUrl(url)) {
      return isNerdwalletReviewUrl(url);
    }

    if (!ALLOW_AGGREGATOR_SOURCES) {
      return false;
    }
    return SINGLE_CARD_URL_HINT_REGEX.test(url);
  }

  return (
    CARD_DETAIL_URL_REGEX.test(url) ||
    /(credit-card|credit-cards|\/card\/|\/cards\/|cash-back-credit-cards|rewards-credit-cards|travel-credit-cards|small-business\/credit-cards|business-credit-cards)/i.test(
      url
    ) ||
    /(prime-visa|storecard|store-card|apple-card|crypto.*card|bitcoin.*card)/i.test(url)
  );
}

function looksLikeAggregateContent({ url, cardName, issuer, text, rewardRules }) {
  const hostname = getHostname(url);
  const textSample = text.slice(0, 2500).toLowerCase();
  const uniqueCategories = new Set(rewardRules.map((rule) => rule.category)).size;
  const tooManyRules = rewardRules.length >= 18 && uniqueCategories >= 8;
  const genericName = isGenericCardName(cardName);
  const listingUrl = LISTING_URL_REGEX.test(url);
  const aggregateText = AGGREGATE_TEXT_REGEX.test(textSample);
  const unknownIssuer = !issuer || issuer === "Unknown";

  if (listingUrl && (isAggregatorHost(url) || unknownIssuer)) {
    return true;
  }

  if (isAggregatorHost(url) && aggregateText && (tooManyRules || genericName)) {
    return true;
  }

  if (isAggregatorHost(url) && !SINGLE_CARD_URL_HINT_REGEX.test(url) && (aggregateText || tooManyRules)) {
    return true;
  }

  if (hostname.endsWith("bankrate.com") && /\/credit-cards\/zero-interest\//i.test(url)) {
    return true;
  }

  if (hasNonCardPathHints(url)) {
    return true;
  }

  return false;
}

function guessIssuerFromUrl(url, fallbackIssuer = "Unknown") {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.replace(/^www\./, "");
    const entry = Object.entries(DOMAIN_ISSUER_HINTS).find(([domain]) => hostname.endsWith(domain));
    if (entry) {
      return entry[1];
    }

    const sourceText = normalizeWhitespace(`${hostname} ${parsed.pathname}`.replace(/[-_/]+/g, " ").toLowerCase());
    for (const [needle, issuer] of ISSUER_TEXT_HINTS) {
      if (sourceText.includes(needle)) {
        return issuer;
      }
    }

    return fallbackIssuer;
  } catch {
    return fallbackIssuer;
  }
}

function guessIssuerFromText(text, fallbackIssuer = "Unknown") {
  const lower = String(text ?? "").toLowerCase();
  if (!lower) {
    return fallbackIssuer;
  }

  for (const [needle, issuer] of ISSUER_TEXT_HINTS) {
    if (new RegExp(`\\b${escapeRegex(needle)}\\b`, "i").test(lower)) {
      return issuer;
    }
  }

  return fallbackIssuer;
}

function extractHtmlTitle(html) {
  const match = html.match(/<title>([\s\S]*?)<\/title>/i);
  if (!match?.[1]) {
    return "";
  }

  return normalizeWhitespace(match[1].replace(/<[^>]+>/g, " "));
}

function extractHtmlH1(html) {
  const match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (!match?.[1]) {
    return "";
  }

  return normalizeWhitespace(match[1].replace(/<[^>]+>/g, " "));
}

function guessCardNameFromUrl(url) {
  try {
    const parsed = new URL(url);
    const segments = parsed.pathname.split("/").filter(Boolean);
    const raw = segments.slice(-2).join(" ") || segments.at(-1) || "card";
    return raw
      .replace(/[-_]+/g, " ")
      .replace(/\b(credit|cards?|reviews?|best|the|us|en|products?)\b/gi, " ")
      .replace(/\s+/g, " ")
      .trim() || "Card";
  } catch {
    return "Card";
  }
}

function inferCardSegmentFromUrl(url) {
  return /\/business|business[-/ ]credit|small[-/ ]business|\/biz\//i.test(url) ? "business" : "personal";
}

function extractLinksFromHtml(html, baseUrl) {
  const links = new Set();
  const hrefRegex = /href\s*=\s*["']([^"']+)["']/gi;

  for (const match of html.matchAll(hrefRegex)) {
    const href = match[1];
    if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) {
      continue;
    }

    try {
      const absolute = new URL(href, baseUrl).toString();
      links.add(normalizeUrl(absolute));
    } catch {
      // ignore malformed links
    }
  }

  return [...links];
}

function extractLocTagsFromXml(xmlText) {
  const urls = [];

  for (const match of xmlText.matchAll(/<loc>([^<]+)<\/loc>/gi)) {
    urls.push(normalizeWhitespace(match[1]));
  }

  return urls;
}

async function collectSitemapUrls(sitemapUrl, visited = new Set(), depth = 0) {
  if (visited.has(sitemapUrl) || depth > 2) {
    return [];
  }

  visited.add(sitemapUrl);

  try {
    const { body } = await fetchText(sitemapUrl, "application/xml,text/xml,*/*");
    const locs = extractLocTagsFromXml(body);

    const looksLikeIndex = /<sitemapindex/i.test(body) || locs.some((loc) => /sitemap.*\.xml/i.test(loc));
    if (!looksLikeIndex) {
      return locs;
    }

    const childSitemaps = locs.filter((loc) => /\.xml(\?|$)/i.test(loc)).slice(0, MAX_SITEMAP_CHILDREN);
    const discovered = [];

    for (const child of childSitemaps) {
      await sleep(SAFE_REQUEST_DELAY_MS);
      const childUrls = await collectSitemapUrls(child, visited, depth + 1);
      discovered.push(...childUrls);

      if (discovered.length >= MAX_DISCOVERED_SOURCES * 2) {
        break;
      }
    }

    return discovered;
  } catch {
    return [];
  }
}

function makeSourceFromUrl(url, usedIds, fallbackIssuer = "Unknown") {
  const cardName = guessCardNameFromUrl(url);
  const issuer = guessIssuerFromUrl(url, fallbackIssuer === "Unknown" ? cardName : fallbackIssuer);
  const baseId = slugify(`${issuer}-${cardName}`);

  return {
    id: makeUniqueId(baseId || "discovered-card", usedIds),
    issuer,
    cardName,
    network: null,
    cardSegment: inferCardSegmentFromUrl(url),
    popularityRank: null,
    cardUrl: url
  };
}

function dedupeSources(sources) {
  const seenByUrl = new Set();
  const deduped = [];

  for (const source of sources) {
    const normalizedUrl = normalizeUrl(source.cardUrl);
    if (seenByUrl.has(normalizedUrl)) {
      continue;
    }

    seenByUrl.add(normalizedUrl);
    deduped.push({
      ...source,
      cardSegment: source.cardSegment === "business" ? "business" : "personal",
      popularityRank: normalizedPopularityRank(source.popularityRank),
      cardUrl: normalizedUrl
    });
  }

  return deduped;
}

function sortSourcesByPriority(sources) {
  return [...sources].sort((a, b) => {
    const rankDelta = effectivePopularityRank(a.popularityRank) - effectivePopularityRank(b.popularityRank);
    if (rankDelta !== 0) {
      return rankDelta;
    }

    if (a.cardSegment !== b.cardSegment) {
      return a.cardSegment === "personal" ? -1 : 1;
    }

    return a.issuer.localeCompare(b.issuer) || a.cardName.localeCompare(b.cardName);
  });
}

function pickSourcesWithBusinessMix(sortedSources, limit) {
  if (limit <= 0 || sortedSources.length <= limit) {
    return sortedSources.slice(0, Math.max(0, limit));
  }

  const personal = [];
  const business = [];
  for (const source of sortedSources) {
    if (source.cardSegment === "business") {
      business.push(source);
    } else {
      personal.push(source);
    }
  }

  if (business.length === 0 || personal.length === 0 || SAFE_TARGET_BUSINESS_SHARE <= 0) {
    return sortedSources.slice(0, limit);
  }

  const minBusiness = Math.min(
    business.length,
    Math.max(1, Math.floor(limit * SAFE_TARGET_BUSINESS_SHARE))
  );
  const minPersonal = Math.min(personal.length, Math.max(0, limit - minBusiness));

  const selectedIds = new Set();
  const selected = [];

  for (let i = 0; i < minPersonal; i += 1) {
    selected.push(personal[i]);
    selectedIds.add(personal[i].id);
  }

  for (let i = 0; i < minBusiness; i += 1) {
    selected.push(business[i]);
    selectedIds.add(business[i].id);
  }

  if (selected.length < limit) {
    for (const source of sortedSources) {
      if (selected.length >= limit) {
        break;
      }
      if (selectedIds.has(source.id)) {
        continue;
      }
      selected.push(source);
      selectedIds.add(source.id);
    }
  }

  return sortSourcesByPriority(selected).slice(0, limit);
}

function sourceMatchesFilter(source) {
  if (NERDWALLET_ONLY && !isNerdwalletUrl(source.url ?? "")) {
    return false;
  }

  if (!DISCOVERY_SOURCE_FILTER) {
    return true;
  }

  const haystack = `${source.name ?? ""} ${source.url ?? ""} ${source.issuer ?? ""}`.toLowerCase();
  return haystack.includes(DISCOVERY_SOURCE_FILTER);
}

function sourceMatchesFetchFilter(source) {
  if (NERDWALLET_ONLY && !isNerdwalletUrl(source.cardUrl ?? "")) {
    return false;
  }

  if (!FETCH_SOURCE_FILTER) {
    return true;
  }

  const terms = FETCH_SOURCE_FILTER
    .split(",")
    .map((term) => term.trim())
    .filter(Boolean);

  if (terms.length === 0) {
    return true;
  }

  const haystack = `${source.id ?? ""} ${source.issuer ?? ""} ${source.cardName ?? ""} ${source.cardUrl ?? ""}`.toLowerCase();
  return terms.some((term) => haystack.includes(term));
}

function isHighQualityRecord(record) {
  if (record.fetchStatus !== "ok") {
    return false;
  }

  if ((!record.issuer || record.issuer === "Unknown") && !NERDWALLET_ONLY) {
    return false;
  }

  if (isGenericCardName(record.cardName)) {
    return false;
  }

  if (!looksLikeCardUrl(record.cardUrl)) {
    return false;
  }

  if (OUTPUT_REQUIRE_REWARD_RULES && (!Array.isArray(record.rewardRules) || record.rewardRules.length === 0)) {
    return false;
  }

  if (!Number.isFinite(record.confidenceScore) || record.confidenceScore < SAFE_MIN_CONFIDENCE_SCORE) {
    return false;
  }

  return true;
}

function chooseBetterRecord(existing, candidate) {
  const existingScore = Number.isFinite(existing.confidenceScore) ? existing.confidenceScore : -1;
  const candidateScore = Number.isFinite(candidate.confidenceScore) ? candidate.confidenceScore : -1;
  if (candidateScore !== existingScore) {
    return candidateScore > existingScore ? candidate : existing;
  }

  const existingRules = Array.isArray(existing.rewardRules) ? existing.rewardRules.length : 0;
  const candidateRules = Array.isArray(candidate.rewardRules) ? candidate.rewardRules.length : 0;
  if (candidateRules !== existingRules) {
    return candidateRules > existingRules ? candidate : existing;
  }

  const existingRanked = existing.popularityRank != null ? 1 : 0;
  const candidateRanked = candidate.popularityRank != null ? 1 : 0;
  if (candidateRanked !== existingRanked) {
    return candidateRanked > existingRanked ? candidate : existing;
  }

  return existing;
}

function dedupeRecordsByCardIdentity(records) {
  const byKey = new Map();

  for (const record of records) {
    const key = `${record.issuer.toLowerCase()}::${normalizedCardName(record.cardName)}::${record.cardSegment}`;
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, record);
      continue;
    }

    byKey.set(key, chooseBetterRecord(existing, record));
  }

  return [...byKey.values()];
}

async function mapWithConcurrency(items, concurrency, iteratee) {
  const queue = [...items];
  const results = [];

  async function worker() {
    while (queue.length > 0) {
      const item = queue.shift();
      if (!item) {
        continue;
      }

      results.push(await iteratee(item));
    }
  }

  const workerCount = Math.max(1, Math.min(concurrency, items.length || 1));
  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  return results;
}

async function discoverNerdwalletReviewUrls(seedUrls = NERDWALLET_SEED_URLS) {
  const maxPages = clampInt(NERDWALLET_CRAWL_MAX_PAGES, 10, 2500);
  const maxDepth = clampInt(NERDWALLET_CRAWL_DEPTH, 1, 6);
  const queue = [];
  const queued = new Set();
  const visited = new Set();
  const discovered = new Set();
  const stats = {
    pagesFetched: 0,
    pagesQueued: 0,
    linksSeen: 0,
    reviewLinksFound: 0,
    errors: 0
  };

  for (const seed of seedUrls) {
    const canonical = canonicalCrawlUrl(seed);
    if (!isNerdwalletUrl(canonical) || queued.has(canonical)) {
      continue;
    }
    queued.add(canonical);
    queue.push({ url: canonical, depth: 0 });
  }
  stats.pagesQueued = queue.length;

  while (queue.length > 0 && visited.size < maxPages && discovered.size < MAX_DISCOVERED_SOURCES) {
    const current = queue.shift();
    if (!current) {
      continue;
    }

    const crawlUrl = canonicalCrawlUrl(current.url);
    if (visited.has(crawlUrl)) {
      continue;
    }

    visited.add(crawlUrl);

    try {
      const { body, finalUrl } = await fetchText(current.url);
      stats.pagesFetched += 1;
      const resolvedBaseUrl = normalizeUrl(finalUrl);
      const links = extractLinksFromHtml(body, resolvedBaseUrl);
      stats.linksSeen += links.length;

      for (const link of links) {
        const normalized = canonicalCrawlUrl(link);
        if (!isNerdwalletUrl(normalized)) {
          continue;
        }

        if (isNerdwalletReviewUrl(normalized)) {
          if (!discovered.has(normalized)) {
            discovered.add(normalized);
            stats.reviewLinksFound += 1;
          }
          continue;
        }

        if (current.depth >= maxDepth) {
          continue;
        }

        if (!shouldCrawlNerdwalletPage(normalized)) {
          continue;
        }

        if (queued.has(normalized) || visited.has(normalized)) {
          continue;
        }

        queued.add(normalized);
        queue.push({ url: normalized, depth: current.depth + 1 });
        stats.pagesQueued += 1;
      }
    } catch {
      stats.errors += 1;
    }

    await sleep(SAFE_REQUEST_DELAY_MS);
  }

  return {
    urls: [...discovered].sort((left, right) => left.localeCompare(right)),
    stats
  };
}

async function discoverSources(manualSources) {
  const config = await readJson(DISCOVERY_CONFIG_PATH, DEFAULT_DISCOVERY_CONFIG);
  const discovered = [];
  const usedIds = new Set(manualSources.map((source) => source.id));
  const seenUrls = new Set(manualSources.map((source) => normalizeUrl(source.cardUrl)));
  const discoveryStats = {
    generatedAt: new Date().toISOString(),
    discoverySourceFilter: DISCOVERY_SOURCE_FILTER || null,
    manualSourceCount: manualSources.length,
    linkSources: [],
    sitemapSources: [],
    discoveredCount: 0
  };

  function tryAddDiscovered(url, issuer) {
    if (discovered.length >= MAX_DISCOVERED_SOURCES) {
      return false;
    }

    const normalized = normalizeUrl(url);
    if (seenUrls.has(normalized)) {
      return false;
    }

    seenUrls.add(normalized);
    discovered.push(makeSourceFromUrl(normalized, usedIds, issuer ?? "Unknown"));
    return true;
  }

  if (NERDWALLET_ONLY) {
    const seedInput =
      NERDWALLET_SEED_URLS_OVERRIDE.length > 0
        ? NERDWALLET_SEED_URLS_OVERRIDE
        : [...NERDWALLET_SEED_URLS, ...NERDWALLET_EXTRA_SEEDS];
    const seeds = seedInput
      .map((url) => normalizeUrl(url))
      .filter((url, index, list) => list.indexOf(url) === index);
    const queue = seeds.map((url) => ({ url, depth: 0 }));
    const queued = new Set(queue.map((item) => canonicalCrawlUrl(item.url)));
    const visited = new Set();
    const crawlStats = {
      seedCount: seeds.length,
      maxPages: NERDWALLET_CRAWL_MAX_PAGES,
      maxDepth: NERDWALLET_CRAWL_DEPTH,
      seedOnly: NERDWALLET_SEED_ONLY,
      pagesFetched: 0,
      pagesQueued: queue.length,
      linksSeen: 0,
      reviewLinksFound: 0,
      added: 0,
      errors: 0
    };

    while (queue.length > 0 && crawlStats.pagesFetched < NERDWALLET_CRAWL_MAX_PAGES) {
      const next = queue.shift();
      if (!next) {
        continue;
      }

      if (next.depth > NERDWALLET_CRAWL_DEPTH) {
        continue;
      }

      const key = canonicalCrawlUrl(next.url);
      if (visited.has(key)) {
        continue;
      }
      visited.add(key);

      try {
        const { body } = await fetchText(next.url);
        crawlStats.pagesFetched += 1;
        const links = extractLinksFromHtml(body, next.url);
        crawlStats.linksSeen += links.length;
        let addedFromCurrentSeed = 0;

        for (const link of links) {
          if (!isNerdwalletUrl(link)) {
            continue;
          }

          if (isNerdwalletReviewUrl(link)) {
            crawlStats.reviewLinksFound += 1;
            if (NERDWALLET_SEED_ONLY && addedFromCurrentSeed >= NERDWALLET_MAX_REVIEWS_PER_SEED) {
              continue;
            }
            if (tryAddDiscovered(link, "Unknown")) {
              crawlStats.added += 1;
              addedFromCurrentSeed += 1;
            }
            continue;
          }

          if (NERDWALLET_SEED_ONLY) {
            continue;
          }

          if (next.depth >= NERDWALLET_CRAWL_DEPTH || !shouldCrawlNerdwalletPage(link)) {
            continue;
          }

          const crawlKey = canonicalCrawlUrl(link);
          if (visited.has(crawlKey) || queued.has(crawlKey)) {
            continue;
          }

          queued.add(crawlKey);
          queue.push({ url: link, depth: next.depth + 1 });
          crawlStats.pagesQueued += 1;
        }
      } catch {
        crawlStats.errors += 1;
      }

      await sleep(SAFE_REQUEST_DELAY_MS);
    }

    discoveryStats.nerdwalletCrawl = crawlStats;
    discoveryStats.discoveredCount = discovered.length;

    return {
      discovered: sortSourcesByPriority(dedupeSources(discovered)).slice(0, MAX_DISCOVERED_SOURCES),
      report: discoveryStats
    };
  }

  const linkSources = (Array.isArray(config.linkSources) ? config.linkSources : []).filter(sourceMatchesFilter);
  await mapWithConcurrency(linkSources, SAFE_DISCOVERY_CONCURRENCY, async (source) => {
    const sourceStat = {
      name: source.name ?? source.url,
      url: source.url,
      fetched: false,
      linksSeen: 0,
      linksMatched: 0,
      added: 0,
      error: null
    };

    if (discovered.length >= MAX_DISCOVERED_SOURCES) {
      sourceStat.error = "max discovered sources reached";
      discoveryStats.linkSources.push(sourceStat);
      return sourceStat;
    }

    try {
      const { body } = await fetchText(source.url);
      sourceStat.fetched = true;
      const links = extractLinksFromHtml(body, source.url);
      sourceStat.linksSeen = links.length;

      for (const link of links) {
        if (!matchesIncludeExclude(link, source.include ?? [], source.exclude ?? [])) {
          continue;
        }

        if (!looksLikeCardUrl(link)) {
          continue;
        }

        sourceStat.linksMatched += 1;
        if (tryAddDiscovered(link, source.issuer ?? "Unknown")) {
          sourceStat.added += 1;
        }
      }
    } catch (error) {
      sourceStat.error = error instanceof Error ? error.message : String(error);
    }

    discoveryStats.linkSources.push(sourceStat);
    await sleep(SAFE_REQUEST_DELAY_MS);
    return sourceStat;
  });

  if (ENABLE_SITEMAP_DISCOVERY) {
    const sitemapSources = (Array.isArray(config.sitemapSources) ? config.sitemapSources : []).filter(
      sourceMatchesFilter
    );
    await mapWithConcurrency(sitemapSources, SAFE_DISCOVERY_CONCURRENCY, async (source) => {
      const sourceStat = {
        name: source.name ?? source.url,
        url: source.url,
        fetched: false,
        urlsSeen: 0,
        urlsMatched: 0,
        added: 0,
        error: null
      };

      if (discovered.length >= MAX_DISCOVERED_SOURCES) {
        sourceStat.error = "max discovered sources reached";
        discoveryStats.sitemapSources.push(sourceStat);
        return sourceStat;
      }

      try {
        const urls = await collectSitemapUrls(source.url);
        sourceStat.fetched = true;
        sourceStat.urlsSeen = urls.length;

        for (const url of urls) {
          const normalized = normalizeUrl(url);
          if (!matchesIncludeExclude(normalized, source.include ?? [], source.exclude ?? [])) {
            continue;
          }

          if (!looksLikeCardUrl(normalized)) {
            continue;
          }

          sourceStat.urlsMatched += 1;
          if (tryAddDiscovered(normalized, source.issuer ?? "Unknown")) {
            sourceStat.added += 1;
          }
        }
      } catch (error) {
        sourceStat.error = error instanceof Error ? error.message : String(error);
      }

      discoveryStats.sitemapSources.push(sourceStat);
      await sleep(SAFE_REQUEST_DELAY_MS);
      return sourceStat;
    });
  }

  discovered.sort((a, b) => a.issuer.localeCompare(b.issuer) || a.cardName.localeCompare(b.cardName));
  discoveryStats.discoveredCount = discovered.length;
  return {
    discovered,
    report: discoveryStats
  };
}

function applyOverride(record, override) {
  if (!override) {
    return record;
  }

  return {
    ...record,
    ...override,
    cardSegment: override.cardSegment === "business" ? "business" : record.cardSegment,
    popularityRank:
      override.popularityRank === undefined
        ? record.popularityRank
        : normalizedPopularityRank(override.popularityRank),
    rewardRules: Array.isArray(override.rewardRules) ? override.rewardRules : record.rewardRules,
    notes: Array.isArray(override.notes) ? override.notes : record.notes,
    rotatingCategories: Array.isArray(override.rotatingCategories)
      ? override.rotatingCategories
      : record.rotatingCategories
  };
}

async function readJson(filePath, fallback) {
  try {
    const value = await fs.readFile(filePath, "utf8");
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

async function main() {
  const manualSources = await readJson(MANUAL_SOURCE_PATH, []);
  const cachedDiscovered = await readJson(DISCOVERED_SOURCE_PATH, []);
  const overrides = await readJson(OVERRIDES_PATH, {});

  const shouldRunDiscovery = NERDWALLET_ONLY || DISCOVERY_ONLY || ENABLE_DISCOVERY;
  let discoveredSources = Array.isArray(cachedDiscovered) ? cachedDiscovered : [];
  let discoveryReport = {
    generatedAt: new Date().toISOString(),
    discoverySourceFilter: DISCOVERY_SOURCE_FILTER || null,
    discoveryEnabled: shouldRunDiscovery,
    discoveryOnlyMode: DISCOVERY_ONLY,
    manualSourceCount: manualSources.length,
    discoveredCount: discoveredSources.length,
    linkSources: [],
    sitemapSources: []
  };

  if (shouldRunDiscovery) {
    const discoveryResult = await discoverSources(manualSources);
    discoveredSources = discoveryResult.discovered;
    discoveryReport = {
      ...discoveryReport,
      ...discoveryResult.report,
      discoveryEnabled: true,
      discoveryOnlyMode: DISCOVERY_ONLY
    };
  } else {
    discoveryReport = {
      ...discoveryReport,
      note: "Discovery disabled; using cached discovered source file."
    };
  }

  await fs.writeFile(DISCOVERED_SOURCE_PATH, JSON.stringify(discoveredSources, null, 2), "utf8");
  await fs.writeFile(DISCOVERY_REPORT_PATH, JSON.stringify(discoveryReport, null, 2), "utf8");

  if (DISCOVERY_ONLY) {
    console.log(
      `Discovery only mode complete. Wrote ${discoveredSources.length} sources to ${path.relative(rootDir, DISCOVERED_SOURCE_PATH)}.`
    );
    console.log(`Discovery report saved to ${path.relative(rootDir, DISCOVERY_REPORT_PATH)}.`);
    return;
  }

  const sourceInputs =
    NERDWALLET_ONLY && NERDWALLET_SEED_ONLY ? discoveredSources : [...manualSources, ...discoveredSources];
  const mergedSources = sortSourcesByPriority(dedupeSources(sourceInputs));
  const fetchSourcePool = NERDWALLET_ONLY
    ? mergedSources.filter((source) => isNerdwalletUrl(source.cardUrl))
    : mergedSources;
  const fetchCandidateSources = fetchSourcePool.filter(sourceMatchesFetchFilter);
  const selectionLimit = SOURCE_LIMIT > 0 ? SOURCE_LIMIT : MAX_FETCH_SOURCES;
  const selectedSources = pickSourcesWithBusinessMix(fetchCandidateSources, selectionLimit);

  const output = {
    generatedAt: new Date().toISOString(),
    country: "US",
    records: [],
    failures: []
  };

  const shouldSaveRaw = process.env.SAVE_RAW_HTML === "1";
  if (shouldSaveRaw) {
    await fs.mkdir(RAW_DIR, { recursive: true });
  }

  const queue = [...selectedSources];

  function baseRecordFor(source) {
    return {
      id: source.id,
      issuer: source.issuer,
      cardName: source.cardName,
      network: source.network ?? null,
      cardSegment: source.cardSegment === "business" ? "business" : "personal",
      popularityRank: normalizedPopularityRank(source.popularityRank),
      country: "US",
      cardUrl: source.cardUrl,
      lastFetchedAt: new Date().toISOString(),
      annualFeeText: null,
      introOfferText: null,
      rotatingCategoryProgram: false,
      rotatingCategories: [],
      rewardRules: [],
      notes: [],
      confidenceScore: 0,
      fetchStatus: "error",
      fetchError: null
    };
  }

  async function collectOne(source) {
    const baseRecord = baseRecordFor(source);

    try {
      const { body, finalUrl } = await fetchCardPage(source.cardUrl);
      const text = stripHtml(body);
      const pageTitle = extractHtmlTitle(body);
      const pageH1 = extractHtmlH1(body);
      const nerdwalletBreakdown = isNerdwalletUrl(finalUrl)
        ? extractNerdwalletRewardsBreakdownRules({
            html: body,
            sourceCardName: source.cardName,
            finalUrl,
            pageTitle,
            pageH1
          })
        : null;
      const rewardRules = nerdwalletBreakdown ? nerdwalletBreakdown.rules : extractRewardRules(text);
      const annualFeeText = extractAnnualFee(text);
      const introOfferText = extractIntroOffer(text);
      const rotatingCategories = extractRotatingCategories(text);
      const rotatingCategoryProgram = hasRotatingCategories(text, rotatingCategories);

      if (
        looksLikeAggregateContent({
          url: normalizeUrl(finalUrl),
          cardName: source.cardName,
          issuer: source.issuer,
          text,
          rewardRules
        })
      ) {
        throw new Error("Rejected non-card list/comparison page");
      }

      const notes = [];
      if (rotatingCategoryProgram) {
        notes.push("Detected rotating or activation-based category language.");
      }
      if (nerdwalletBreakdown?.reason) {
        notes.push(nerdwalletBreakdown.reason);
      }
      if (rewardRules.length === 0) {
        notes.push("No high-confidence reward rules detected. Add manual override if needed.");
      }

      const resolvedIssuer =
        source.issuer && source.issuer !== "Unknown"
          ? source.issuer
          : guessIssuerFromUrl(
              normalizeUrl(finalUrl),
              guessIssuerFromText(
                `${source.cardName} ${guessCardNameFromUrl(finalUrl)} ${pageTitle} ${pageH1}`,
                "Unknown"
              )
            );

      const record = {
        ...baseRecord,
        issuer: resolvedIssuer,
        cardUrl: normalizeUrl(finalUrl),
        annualFeeText,
        introOfferText,
        rotatingCategoryProgram,
        rotatingCategories,
        rewardRules,
        notes,
        confidenceScore: computeConfidence({
          fetchOk: true,
          ruleCount: rewardRules.length,
          introOfferFound: Boolean(introOfferText),
          annualFeeFound: Boolean(annualFeeText),
          rotatingCount: rotatingCategories.length
        }),
        fetchStatus: "ok",
        fetchError: null
      };

      const merged = applyOverride(record, overrides[source.id]);
      output.records.push(merged);

      if (shouldSaveRaw) {
        const rawPath = path.join(RAW_DIR, `${source.id}.html`);
        await fs.writeFile(rawPath, body, "utf8");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      output.failures.push({
        id: source.id,
        cardUrl: source.cardUrl,
        error: message
      });

      output.records.push({
        ...baseRecord,
        confidenceScore: 0,
        fetchStatus: "error",
        fetchError: message
      });
    }
  }

  async function worker() {
    while (queue.length > 0) {
      const source = queue.shift();
      if (!source) {
        continue;
      }

      await collectOne(source);
      await sleep(SAFE_REQUEST_DELAY_MS);
    }
  }

  const workerCount = Math.max(1, Math.min(SAFE_FETCH_CONCURRENCY, 24));
  await Promise.all(Array.from({ length: workerCount }, () => worker()));

  const rawRecordCount = output.records.length;
  output.records = output.records.filter((record) => isHighQualityRecord(record));
  output.records = dedupeRecordsByCardIdentity(output.records);
  const droppedByQuality = rawRecordCount - output.records.length;
  output.failures = output.failures.filter((failure) => !output.records.some((record) => record.id === failure.id));
  output.records.sort((a, b) => a.issuer.localeCompare(b.issuer) || a.cardName.localeCompare(b.cardName));

  await fs.writeFile(OUTPUT_PATH, JSON.stringify(output, null, 2), "utf8");

  const successCount = output.records.filter((record) => record.fetchStatus === "ok").length;
  const failureCount = output.failures.length;
  const selectedPersonalCount = selectedSources.filter((source) => source.cardSegment !== "business").length;
  const selectedBusinessCount = selectedSources.filter((source) => source.cardSegment === "business").length;

  console.log(`Sources: manual=${manualSources.length}, discovered=${discoveredSources.length}, merged=${mergedSources.length}`);
  if (NERDWALLET_ONLY) {
    console.log("Mode: NerdWallet-only discovery + fetch");
  }
  console.log(
    `Concurrency: fetch=${workerCount}, discovery=${SAFE_DISCOVERY_CONCURRENCY}, per-host=${SAFE_HOST_CONCURRENCY}`
  );
  if (DISCOVERY_SOURCE_FILTER) {
    console.log(`Discovery source filter: "${DISCOVERY_SOURCE_FILTER}"`);
  }
  if (FETCH_SOURCE_FILTER) {
    console.log(`Fetch source filter: "${FETCH_SOURCE_FILTER}"`);
  }
  console.log(`Fetched: ${selectedSources.length} sources (limit=${selectionLimit})`);
  if (NERDWALLET_ONLY) {
    console.log("Source scope: NerdWallet only");
  }
  console.log(
    `Segments in fetch set: personal=${selectedPersonalCount}, business=${selectedBusinessCount} (target business share=${Math.round(
      SAFE_TARGET_BUSINESS_SHARE * 100
    )}%)`
  );
  console.log(`Saved ${output.records.length} records to ${path.relative(rootDir, OUTPUT_PATH)}.`);
  console.log(`Discovery report saved to ${path.relative(rootDir, DISCOVERY_REPORT_PATH)}.`);
  console.log(
    `Quality filter: minConfidence=${SAFE_MIN_CONFIDENCE_SCORE}, requireRewardRules=${OUTPUT_REQUIRE_REWARD_RULES ? "yes" : "no"}, allowAggregator=${ALLOW_AGGREGATOR_SOURCES ? "yes" : "no"}`
  );
  console.log(`Dropped low-quality/non-card records: ${droppedByQuality}`);
  console.log(`Successful fetches: ${successCount}`);
  console.log(`Failures: ${failureCount}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
