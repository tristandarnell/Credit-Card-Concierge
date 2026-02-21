import { STANDARD_CATEGORIES, type StandardCategory } from "@/lib/rewards/categories";
import type { CardRewardRecord, RewardRule } from "@/lib/rewards/types";

const POINT_CENTS_VALUE = 1.5;
const MILE_CENTS_VALUE = 1.2;

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

function ruleValuePerDollar(rule: RewardRule): number {
  const rate = Number(rule.rateValue ?? 0);
  if (!Number.isFinite(rate) || rate <= 0) {
    return 0;
  }

  if (rule.unit === "percent_cashback") {
    return rate / 100;
  }

  if (rule.unit === "x_points") {
    return (rate * POINT_CENTS_VALUE) / 100;
  }

  if (rule.unit === "x_miles") {
    return (rate * MILE_CENTS_VALUE) / 100;
  }

  return 0;
}

export function estimateRewardValue(rule: RewardRule, amount: number): number {
  if (!Number.isFinite(amount) || amount <= 0) {
    return 0;
  }

  const value = amount * ruleValuePerDollar(rule);
  return Number.isFinite(value) ? Number(value.toFixed(2)) : 0;
}

function ruleMatchesCategory(rule: RewardRule, category: StandardCategory): boolean {
  if (rule.category === category) {
    return true;
  }

  return category !== "all_other" && rule.category === "all_other";
}

export function bestRuleForCategory(rules: RewardRule[], category: StandardCategory): RewardRule | null {
  const matches = rules.filter((rule) => ruleMatchesCategory(rule, category));
  if (matches.length === 0) {
    return null;
  }

  return [...matches].sort((left, right) => ruleValuePerDollar(right) - ruleValuePerDollar(left))[0];
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

    const estimatedRewardValue = estimateRewardValue(bestRule, amount);
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

  return candidates.sort((left, right) => right.estimatedRewardValue - left.estimatedRewardValue)[0];
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

    total += estimateRewardValue(rule, amount);
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
