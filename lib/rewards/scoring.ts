import { STANDARD_CATEGORIES, type StandardCategory } from "@/lib/rewards/categories";
import type { CardRewardRecord, RewardRule } from "@/lib/rewards/types";

const DEFAULT_POINT_CENTS_VALUE = 1.0;
const DEFAULT_MILE_CENTS_VALUE = 1.0;
const MAX_POINT_OR_MILE_CENTS_VALUE = 1.0;
const HILTON_POINT_CENTS_VALUE = 0.4;
const ALLOW_RESTRICTED_REWARD_RULES = process.env.ALLOW_RESTRICTED_REWARD_RULES === "1";

// Baseline cents-per-point values from NerdWallet travel valuations pages.
// We still enforce MAX_POINT_OR_MILE_CENTS_VALUE so points/miles never exceed 1.0 cent.
const NERDWALLET_POINT_CENTS_BY_PROGRAM: Array<{ patterns: RegExp[]; cents: number }> = [
  { patterns: [/\bhilton\b/i, /\bhilton honors\b/i], cents: 0.4 },
  { patterns: [/\bihg\b/i, /\bihg one rewards\b/i, /\bholiday inn\b/i], cents: 0.6 },
  { patterns: [/\bwyndham\b/i, /\bwyndham rewards\b/i], cents: 0.7 },
  { patterns: [/\bmarriott\b/i, /\bbonvoy\b/i], cents: 0.8 },
  { patterns: [/\bhyatt\b/i, /\bworld of hyatt\b/i], cents: 1.8 }
];

const NERDWALLET_MILE_CENTS_BY_PROGRAM: Array<{ patterns: RegExp[]; cents: number }> = [
  { patterns: [/\balaska\b/i, /\bmileage plan\b/i], cents: 1.2 },
  { patterns: [/\bamerican airlines\b/i, /\baadvantage\b/i], cents: 1.3 },
  { patterns: [/\bdelta\b/i, /\bskymiles\b/i], cents: 1.2 },
  { patterns: [/\bjetblue\b/i, /\btrueblue\b/i], cents: 1.4 },
  { patterns: [/\bsouthwest\b/i, /\brapid rewards\b/i], cents: 1.3 },
  { patterns: [/\bunited\b/i, /\bmileageplus\b/i], cents: 1.2 }
];

export const CATEGORY_LABELS: Record<StandardCategory, string> = {
  dining: "Dining",
  groceries: "Groceries",
  gas: "Gas",
  travel: "Travel",
  airfare: "Airfare",
  hotels: "Hotels",
  transit: "Transit",
  streaming: "Streaming",
  drugstores: "Drugstores",
  online_retail: "Online Retail",
  entertainment: "Entertainment",
  utilities: "Utilities",
  phone: "Phone",
  office_supply: "Office Supply",
  all_other: "General"
};

export type AnnualSpendProfile = Record<StandardCategory, number>;

export const DEFAULT_ANNUAL_SPEND_PROFILE: AnnualSpendProfile = {
  dining: 4800,
  groceries: 7200,
  gas: 1800,
  travel: 3000,
  airfare: 1800,
  hotels: 1200,
  transit: 1200,
  streaming: 600,
  drugstores: 700,
  online_retail: 3000,
  entertainment: 1200,
  utilities: 1800,
  phone: 1200,
  office_supply: 600,
  all_other: 9000
};

export type PurchaseCardRecommendation = {
  cardId: string;
  cardName: string;
  issuer: string;
  estimatedRewardValue: number;
  matchedRule: RewardRule;
};

function ruleValuePerDollar(
  rule: RewardRule,
  pointCentsValue = DEFAULT_POINT_CENTS_VALUE,
  mileCentsValue = DEFAULT_MILE_CENTS_VALUE
): number {
  const rate = Number(rule.rateValue ?? 0);
  if (!Number.isFinite(rate) || rate <= 0) {
    return 0;
  }

  if (rule.unit === "percent_cashback") {
    return rate / 100;
  }

  if (rule.unit === "x_points") {
    return (rate * pointCentsValue) / 100;
  }

  if (rule.unit === "x_miles") {
    return (rate * mileCentsValue) / 100;
  }

  return 0;
}

function cardProgramText(card: CardRewardRecord, rule: RewardRule): string {
  return `${card.issuer} ${card.cardName} ${rule.notes ?? ""} ${rule.capText ?? ""} ${rule.rateText ?? ""}`.toLowerCase();
}

function lookupProgramCentsValue(text: string, mappings: Array<{ patterns: RegExp[]; cents: number }>): number | null {
  for (const mapping of mappings) {
    if (mapping.patterns.some((pattern) => pattern.test(text))) {
      return mapping.cents;
    }
  }

  return null;
}

function pointCentsValueForCard(card: CardRewardRecord, rule: RewardRule): number {
  const text = cardProgramText(card, rule);
  const mappedValue = lookupProgramCentsValue(text, NERDWALLET_POINT_CENTS_BY_PROGRAM);

  if (mappedValue != null) {
    return Math.min(mappedValue, MAX_POINT_OR_MILE_CENTS_VALUE);
  }

  if (/hilton/.test(text)) {
    return Math.min(HILTON_POINT_CENTS_VALUE, MAX_POINT_OR_MILE_CENTS_VALUE);
  }

  return Math.min(DEFAULT_POINT_CENTS_VALUE, MAX_POINT_OR_MILE_CENTS_VALUE);
}

function mileCentsValueForCard(card: CardRewardRecord, rule: RewardRule): number {
  const text = cardProgramText(card, rule);
  const mappedValue = lookupProgramCentsValue(text, NERDWALLET_MILE_CENTS_BY_PROGRAM);
  return Math.min(mappedValue ?? DEFAULT_MILE_CENTS_VALUE, MAX_POINT_OR_MILE_CENTS_VALUE);
}

function cashbackFirstTieBreak(left: RewardRule, right: RewardRule): number {
  const leftCash = left.unit === "percent_cashback";
  const rightCash = right.unit === "percent_cashback";
  if (leftCash === rightCash) {
    return 0;
  }
  return leftCash ? -1 : 1;
}

function ruleSortCompare(left: RewardRule, right: RewardRule): number {
  return ruleValuePerDollar(right) - ruleValuePerDollar(left) || cashbackFirstTieBreak(left, right);
}

function ruleValuePerDollarForCard(card: CardRewardRecord, rule: RewardRule): number {
  return ruleValuePerDollar(rule, pointCentsValueForCard(card, rule), mileCentsValueForCard(card, rule));
}

export function estimateRewardValue(rule: RewardRule, amount: number): number {
  if (!Number.isFinite(amount) || amount <= 0) {
    return 0;
  }

  const value = amount * ruleValuePerDollar(rule);
  return Number.isFinite(value) ? Number(value.toFixed(2)) : 0;
}

function estimateRewardValueForCard(card: CardRewardRecord, rule: RewardRule, amount: number): number {
  if (!Number.isFinite(amount) || amount <= 0) {
    return 0;
  }

  const value = amount * ruleValuePerDollarForCard(card, rule);
  return Number.isFinite(value) ? Number(value.toFixed(2)) : 0;
}

function ruleMatchesCategory(rule: RewardRule, category: StandardCategory): boolean {
  if (rule.category === category) {
    return true;
  }

  return category !== "all_other" && rule.category === "all_other";
}

function isPlausibleAllOtherRule(rule: RewardRule): boolean {
  const rate = Number(rule.rateValue ?? 0);
  if (!Number.isFinite(rate) || rate <= 0) {
    return false;
  }

  if (rule.unit === "percent_cashback") {
    return rate <= 3;
  }

  if (rule.unit === "x_points" || rule.unit === "x_miles") {
    return rate <= 3;
  }

  return false;
}

function isRuleRestricted(rule: RewardRule): boolean {
  const text = `${rule.rateText ?? ""} ${rule.notes ?? ""} ${rule.capText ?? ""}`.toLowerCase();
  const explicitRestriction =
    /booked?\s+through/.test(text) ||
    /travel\s+portal/.test(text) ||
    /capital one travel/.test(text) ||
    /chase travel/.test(text) ||
    /amex travel/.test(text) ||
    /bank of america travel center/.test(text) ||
    /requires payment via mobile wallet/.test(text) ||
    /physical card/.test(text) ||
    /limited to select\/eligible merchants/.test(text);

  if (explicitRestriction) {
    return true;
  }

  const likelyCobrandTravelRule =
    (rule.category === "travel" || rule.category === "airfare" || rule.category === "hotels") &&
    (rule.unit === "x_points" || rule.unit === "x_miles") &&
    Number(rule.rateValue ?? 0) >= 6 &&
    /\b(hilton|marriott|bonvoy|hyatt|ihg|wyndham|united|delta|southwest|jetblue|alaska|american airlines|aadvantage|frontier|spirit)\b/.test(
      text
    );

  return likelyCobrandTravelRule;
}

function isPlausibleRuleForCategory(rule: RewardRule, category: StandardCategory): boolean {
  const rate = Number(rule.rateValue ?? 0);
  if (!Number.isFinite(rate) || rate <= 0) {
    return false;
  }

  if (rule.unit === "percent_cashback") {
    if (rate > 12) {
      return false;
    }
    return true;
  }

  if (rule.unit === "x_points" || rule.unit === "x_miles") {
    const travelLike = category === "travel" || category === "airfare" || category === "hotels";
    if (travelLike) {
      return rate <= 6;
    }

    return rate <= 6;
  }

  return false;
}

export function bestRuleForCategory(rules: RewardRule[], category: StandardCategory): RewardRule | null {
  const exactMatches = rules.filter(
    (rule) => rule.category === category && isPlausibleRuleForCategory(rule, category)
  );
  const exactUnrestricted = exactMatches.filter((rule) => !isRuleRestricted(rule));
  if (exactUnrestricted.length > 0) {
    return [...exactUnrestricted].sort(ruleSortCompare)[0];
  }
  if (ALLOW_RESTRICTED_REWARD_RULES && exactMatches.length > 0) {
    return [...exactMatches].sort(ruleSortCompare)[0];
  }

  if (category === "all_other") {
    const generalMatches = rules.filter(
      (rule) =>
        rule.category === "all_other" && isPlausibleAllOtherRule(rule) && isPlausibleRuleForCategory(rule, category)
    );
    const generalUnrestricted = generalMatches.filter((rule) => !isRuleRestricted(rule));
    if (generalUnrestricted.length > 0) {
      return [...generalUnrestricted].sort(ruleSortCompare)[0];
    }

    if (!ALLOW_RESTRICTED_REWARD_RULES || generalMatches.length === 0) {
      return null;
    }

    return [...generalMatches].sort(ruleSortCompare)[0];
  }

  const fallbackMatches = rules.filter(
    (rule) =>
      ruleMatchesCategory(rule, category) &&
      rule.category === "all_other" &&
      isPlausibleAllOtherRule(rule) &&
      isPlausibleRuleForCategory(rule, category)
  );
  const fallbackUnrestricted = fallbackMatches.filter((rule) => !isRuleRestricted(rule));
  if (fallbackUnrestricted.length > 0) {
    return [...fallbackUnrestricted].sort(ruleSortCompare)[0];
  }

  if (!ALLOW_RESTRICTED_REWARD_RULES || fallbackMatches.length === 0) {
    return null;
  }

  return [...fallbackMatches].sort(ruleSortCompare)[0];
}

export function bestRuleAcrossCard(rules: RewardRule[]): RewardRule | null {
  if (rules.length === 0) {
    return null;
  }

  return [...rules].sort((left, right) => ruleValuePerDollar(right) - ruleValuePerDollar(left))[0];
}

export function getBestCardForPurchase(
  cards: CardRewardRecord[],
  category: StandardCategory,
  amount: number
): PurchaseCardRecommendation | null {
  const candidates: PurchaseCardRecommendation[] = [];

  for (const card of cards) {
    const bestRule = bestRuleForCategory(card.rewardRules, category);
    if (!bestRule) {
      continue;
    }

    const estimatedRewardValue = estimateRewardValueForCard(card, bestRule, amount);
    if (estimatedRewardValue <= 0) {
      continue;
    }

    candidates.push({
      cardId: card.id,
      cardName: card.cardName,
      issuer: card.issuer,
      estimatedRewardValue,
      matchedRule: bestRule
    });
  }

  if (candidates.length === 0) {
    return null;
  }

  return candidates.sort(
    (left, right) =>
      right.estimatedRewardValue - left.estimatedRewardValue || cashbackFirstTieBreak(left.matchedRule, right.matchedRule)
  )[0];
}

export function estimateAnnualCardValue(
  card: CardRewardRecord,
  profile: AnnualSpendProfile = DEFAULT_ANNUAL_SPEND_PROFILE
): number {
  let total = 0;

  for (const category of STANDARD_CATEGORIES) {
    const amount = profile[category] ?? 0;
    if (amount <= 0) {
      continue;
    }

    const rule = bestRuleForCategory(card.rewardRules, category);
    if (!rule) {
      continue;
    }

    total += estimateRewardValueForCard(card, rule, amount);
  }

  return Number(total.toFixed(2));
}

export function parseAnnualFee(annualFeeText: string | null): number {
  if (!annualFeeText) {
    return 0;
  }

  if (/no annual fee/i.test(annualFeeText)) {
    return 0;
  }

  const match = annualFeeText.match(/\$([\d,]+)/);
  if (!match) {
    return 0;
  }

  return Number(match[1].replace(/,/g, ""));
}

export function estimateNetAnnualCardValue(
  card: CardRewardRecord,
  profile: AnnualSpendProfile = DEFAULT_ANNUAL_SPEND_PROFILE
): number {
  const gross = estimateAnnualCardValue(card, profile);
  const fee = parseAnnualFee(card.annualFeeText);
  return Number((gross - fee).toFixed(2));
}

export function topRewardHighlights(card: CardRewardRecord, maxItems = 3): string[] {
  const sorted = [...card.rewardRules]
    .sort((left, right) => ruleValuePerDollar(right) - ruleValuePerDollar(left))
    .slice(0, maxItems);

  return sorted.map((rule) => `${rule.rateText} on ${CATEGORY_LABELS[rule.category]}`);
}

export function formatDollars(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(value);
}
