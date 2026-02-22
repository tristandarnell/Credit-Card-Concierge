import { promises as fs } from "fs";
import { STANDARD_CATEGORIES, type StandardCategory } from "@/lib/rewards/categories";
import {
  buildPortfolioParetoFrontier,
  getBestCardForPurchase,
  parseAnnualFee,
  type AnnualSpendProfile,
  type PortfolioFrontierResult,
} from "@/lib/rewards/scoring";
import type { CardRewardRecord } from "@/lib/rewards/types";

const BASELINE_REWARD_RATE = 0.01; // 1x / 1%
const CATEGORY_ALIAS: Record<string, StandardCategory> = {
  other: "all_other",
  office_supplies: "office_supply",
};

const KNOWN_MERCHANT_PATTERNS: Array<{ pattern: RegExp; canonical: string }> = [
  { pattern: /\bnetflix\b/i, canonical: "netflix" },
  { pattern: /\bspotify\b/i, canonical: "spotify" },
  { pattern: /\bhulu\b/i, canonical: "hulu" },
  { pattern: /\bdisney\s*\+?\b/i, canonical: "disney plus" },
  { pattern: /\bamazon\b/i, canonical: "amazon" },
  { pattern: /\bverizon\b/i, canonical: "verizon" },
  { pattern: /\bcomcast\b/i, canonical: "comcast" },
  { pattern: /\bapple\b/i, canonical: "apple" },
  { pattern: /\buber\b/i, canonical: "uber" },
  { pattern: /\blyft\b/i, canonical: "lyft" },
];

export type SubscriptionOpportunity = {
  merchant: string;
  category: StandardCategory;
  annualizedSpend: number;
  baselineRewards: number;
  optimizedRewards: number;
  incrementalRewards: number;
  recommendedCardName: string | null;
  recommendedCardIssuer: string | null;
};

export type SpendingPersonality = {
  title: string;
  summary: string;
  traits: string[];
  monthlyVolatility: number | null;
};

export type RewardLeakScore = {
  score: number;
  wrongCardPoints: number;
  missedCategoryPoints: number;
  annualFeeMismatchPoints: number;
  wrongCardLeak: number;
  missedCategoryLeak: number;
  annualFeeMismatchLeak: number;
};

export type PredictiveCardRecommendation = {
  category: StandardCategory;
  growthPercent: number;
  predictedAnnualSpend: number;
  cardName: string;
  issuer: string;
  netAnnualLift: number;
  monthsToPositive: number;
};

export type RewardsInsights = {
  subscriptionOpportunities: SubscriptionOpportunity[];
  personality: SpendingPersonality;
  rewardLeakScore: RewardLeakScore;
  predictiveRecommendation: PredictiveCardRecommendation | null;
};

type ParsedTransaction = {
  date: Date;
  description: string;
  merchant: string;
  amount: number;
  category: StandardCategory;
  monthKey: string;
};

type CategoryBest = {
  cardId: string | null;
  cardName: string | null;
  issuer: string | null;
  rewardRate: number;
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function mean(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function standardDeviation(values: number[]): number {
  if (values.length <= 1) {
    return 0;
  }
  const avg = mean(values);
  const variance = values.reduce((sum, value) => sum + (value - avg) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function median(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2;
  }

  return sorted[middle];
}

function formatMerchantLabel(merchant: string): string {
  const normalized = merchant.trim();
  if (!normalized) {
    return "Unknown merchant";
  }

  return normalized
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function normalizeMerchantForInsights(description: string): string {
  const original = description.trim();
  if (!original) {
    return "";
  }

  for (const entry of KNOWN_MERCHANT_PATTERNS) {
    if (entry.pattern.test(original)) {
      return entry.canonical;
    }
  }

  const cleaned = original
    .toLowerCase()
    .replace(/^purchase\s+authorized\s+on\s+\d{1,2}\s*\/\s*\d{1,2}\s*/i, "")
    .replace(/\bcard\s*\d{4}\b/gi, "")
    .replace(/\bs\d{6,}\b/gi, "")
    .replace(/[^\w\s&+']/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned) {
    return "unknown merchant";
  }

  return cleaned.split(" ").slice(0, 3).join(" ");
}

function normalizeCategory(raw: string): StandardCategory {
  const lower = raw.toLowerCase().trim().replace(/\s+/g, "_");
  if (STANDARD_CATEGORIES.includes(lower as StandardCategory)) {
    return lower as StandardCategory;
  }

  return (CATEGORY_ALIAS[lower] as StandardCategory) ?? "all_other";
}

function parseCsvRow(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"') {
      if (inQuotes && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (!inQuotes && char === ",") {
      result.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  result.push(current.trim());
  return result;
}

function parseDate(raw: string): Date | null {
  const value = raw.trim();
  if (!value) {
    return null;
  }

  const parts = value.split(/[\/-]/).map((segment) => segment.trim());
  if (parts.length < 3) {
    return null;
  }

  const month = Number(parts[0]);
  const day = Number(parts[1]);
  const yearRaw = Number(parts[2]);
  if (!Number.isFinite(month) || !Number.isFinite(day) || !Number.isFinite(yearRaw)) {
    return null;
  }

  let year = yearRaw;
  if (yearRaw < 100) {
    year = yearRaw + 2000;
  }

  const date = new Date(year, month - 1, day);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

async function readCategorizedTransactions(csvPath: string): Promise<ParsedTransaction[]> {
  const raw = await fs.readFile(csvPath, "utf8");
  const lines = raw.split("\n").filter((line) => line.trim().length > 0);
  if (lines.length < 2) {
    return [];
  }

  const header = parseCsvRow(lines[0]).map((column) => column.toLowerCase());
  const dateIndex = header.findIndex((column) => column.includes("date"));
  const descriptionIndex = header.findIndex((column) => column.includes("description"));
  const amountIndex = header.findIndex((column) => column.includes("amount"));
  const typeIndex = header.findIndex((column) => column === "type" || column.includes("debit") || column.includes("credit"));
  const categoryIndex = header.findIndex((column) => column.includes("category"));

  if (dateIndex < 0 || descriptionIndex < 0 || amountIndex < 0) {
    return [];
  }

  const transactions: ParsedTransaction[] = [];

  for (let rowIndex = 1; rowIndex < lines.length; rowIndex += 1) {
    const row = parseCsvRow(lines[rowIndex]);
    const date = parseDate(row[dateIndex] ?? "");
    if (!date) {
      continue;
    }

    const amount = Number((row[amountIndex] ?? "").replace(/[^\d.-]/g, ""));
    if (!Number.isFinite(amount) || amount <= 0) {
      continue;
    }

    const rawType = (row[typeIndex] ?? "debit").toLowerCase();
    if (rawType.includes("credit")) {
      continue;
    }

    const description = row[descriptionIndex] ?? "";
    const merchant = normalizeMerchantForInsights(description);
    const category = categoryIndex >= 0 ? normalizeCategory(row[categoryIndex] ?? "") : "all_other";
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

    transactions.push({
      date,
      description,
      merchant,
      amount,
      category,
      monthKey,
    });
  }

  return transactions.sort((left, right) => left.date.getTime() - right.date.getTime());
}

function buildCategoryBestMap(cards: CardRewardRecord[]): Record<StandardCategory, CategoryBest> {
  const benchmarkAmount = 100;
  const map = {} as Record<StandardCategory, CategoryBest>;

  for (const category of STANDARD_CATEGORIES) {
    const best = getBestCardForPurchase(cards, category, benchmarkAmount);
    map[category] = {
      cardId: best?.cardId ?? null,
      cardName: best?.cardName ?? null,
      issuer: best?.issuer ?? null,
      rewardRate: best ? best.estimatedRewardValue / benchmarkAmount : BASELINE_REWARD_RATE,
    };
  }

  return map;
}

function estimateLeakByProfile(
  profile: AnnualSpendProfile,
  categoryBestMap: Record<StandardCategory, CategoryBest>
): { wrongCardLeak: number; missedCategoryLeak: number } {
  let wrongCardLeak = 0;
  let missedCategoryLeak = 0;

  const allOtherRate = categoryBestMap.all_other.rewardRate;

  for (const category of STANDARD_CATEGORIES) {
    const amount = profile[category] ?? 0;
    if (amount <= 0) {
      continue;
    }

    const bestRate = categoryBestMap[category].rewardRate;
    wrongCardLeak += Math.max(0, amount * (bestRate - BASELINE_REWARD_RATE));

    if (category !== "all_other") {
      missedCategoryLeak += Math.max(0, amount * (bestRate - allOtherRate));
    }
  }

  return {
    wrongCardLeak: Number(wrongCardLeak.toFixed(2)),
    missedCategoryLeak: Number(missedCategoryLeak.toFixed(2)),
  };
}

function estimateLeakByTransactions(
  transactions: ParsedTransaction[],
  categoryBestMap: Record<StandardCategory, CategoryBest>
): { wrongCardLeak: number; missedCategoryLeak: number } {
  let wrongCardLeak = 0;
  let missedCategoryLeak = 0;
  const allOtherRate = categoryBestMap.all_other.rewardRate;

  for (const transaction of transactions) {
    const bestRate = categoryBestMap[transaction.category].rewardRate;
    wrongCardLeak += Math.max(0, transaction.amount * (bestRate - BASELINE_REWARD_RATE));

    if (transaction.category !== "all_other") {
      missedCategoryLeak += Math.max(0, transaction.amount * (bestRate - allOtherRate));
    }
  }

  return {
    wrongCardLeak: Number(wrongCardLeak.toFixed(2)),
    missedCategoryLeak: Number(missedCategoryLeak.toFixed(2)),
  };
}

function buildMonthlyTotals(transactions: ParsedTransaction[]): { monthKey: string; total: number }[] {
  const monthlyTotals = new Map<string, number>();
  for (const transaction of transactions) {
    monthlyTotals.set(transaction.monthKey, (monthlyTotals.get(transaction.monthKey) ?? 0) + transaction.amount);
  }

  return [...monthlyTotals.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([monthKey, total]) => ({ monthKey, total: Number(total.toFixed(2)) }));
}

function buildSubscriptionOpportunities(
  transactions: ParsedTransaction[],
  categoryBestMap: Record<StandardCategory, CategoryBest>
): SubscriptionOpportunity[] {
  const groups = new Map<string, ParsedTransaction[]>();
  for (const transaction of transactions) {
    const key = `${transaction.merchant}::${transaction.category}`;
    const next = groups.get(key) ?? [];
    next.push(transaction);
    groups.set(key, next);
  }

  const opportunities: SubscriptionOpportunity[] = [];

  for (const [groupKey, groupTransactions] of groups.entries()) {
    if (groupTransactions.length < 2) {
      continue;
    }

    const sorted = [...groupTransactions].sort((left, right) => left.date.getTime() - right.date.getTime());
    const monthCount = new Set(sorted.map((transaction) => transaction.monthKey)).size;
    if (monthCount < 2) {
      continue;
    }

    const amounts = sorted.map((transaction) => transaction.amount);
    const avgAmount = mean(amounts);
    if (avgAmount <= 0) {
      continue;
    }

    const amountStdev = standardDeviation(amounts);
    const amountCv = amountStdev / avgAmount;

    const intervals: number[] = [];
    for (let index = 1; index < sorted.length; index += 1) {
      const dayDiff = (sorted[index].date.getTime() - sorted[index - 1].date.getTime()) / (1000 * 60 * 60 * 24);
      intervals.push(dayDiff);
    }

    const medianInterval = median(intervals);
    const isMonthlyCadence = medianInterval >= 20 && medianInterval <= 40;
    const stableAmount = amountCv <= 0.3 || Math.max(...amounts) - Math.min(...amounts) <= 6;

    if (!isMonthlyCadence || !stableAmount) {
      continue;
    }

    const [merchantName, categoryRaw] = groupKey.split("::");
    const category = normalizeCategory(categoryRaw);

    const observedTotal = amounts.reduce((sum, amount) => sum + amount, 0);
    const annualizedSpend = Number(((observedTotal / monthCount) * 12).toFixed(2));
    const baselineRewards = Number((annualizedSpend * BASELINE_REWARD_RATE).toFixed(2));

    const best = categoryBestMap[category];
    const optimizedRewards = Number((annualizedSpend * best.rewardRate).toFixed(2));
    const incrementalRewards = Number((optimizedRewards - baselineRewards).toFixed(2));

    if (incrementalRewards < 2) {
      continue;
    }

    opportunities.push({
      merchant: formatMerchantLabel(merchantName),
      category,
      annualizedSpend,
      baselineRewards,
      optimizedRewards,
      incrementalRewards,
      recommendedCardName: best.cardName,
      recommendedCardIssuer: best.issuer,
    });
  }

  return opportunities.sort((left, right) => right.incrementalRewards - left.incrementalRewards).slice(0, 6);
}

function buildSpendingPersonality(
  profile: AnnualSpendProfile,
  cards: CardRewardRecord[],
  categoryBestMap: Record<StandardCategory, CategoryBest>,
  monthlyTotals: { monthKey: string; total: number }[]
): SpendingPersonality {
  const totalSpend = STANDARD_CATEGORIES.reduce((sum, category) => sum + (profile[category] ?? 0), 0);
  const safeTotalSpend = totalSpend > 0 ? totalSpend : 1;

  const travelDiningShare =
    ((profile.travel ?? 0) +
      (profile.airfare ?? 0) +
      (profile.hotels ?? 0) +
      (profile.transit ?? 0) +
      (profile.dining ?? 0)) /
    safeTotalSpend;

  const homeShare =
    ((profile.groceries ?? 0) + (profile.utilities ?? 0) + (profile.phone ?? 0) + (profile.streaming ?? 0)) /
    safeTotalSpend;

  const digitalShare =
    ((profile.online_retail ?? 0) + (profile.streaming ?? 0) + (profile.entertainment ?? 0)) / safeTotalSpend;

  let title = "Balanced Rewards Builder";
  let summary = "Your spend is distributed across multiple categories with room to optimize category-specific bonuses.";

  if (travelDiningShare >= 0.45) {
    title = "Travel-Dining Optimizer";
    summary = "A large share of your spend is in travel and dining, so transfer-value and travel multipliers matter most.";
  } else if (homeShare >= 0.45) {
    title = "Home-Centric Maximizer";
    summary = "Your household and recurring bills dominate spend, so stable everyday multipliers outperform niche cards.";
  } else if (digitalShare >= 0.4) {
    title = "Digital Convenience Earner";
    summary = "Online and digital merchants drive your profile, making e-commerce and streaming multipliers high impact.";
  }

  const traits: string[] = [];

  const groceriesAmount = profile.groceries ?? 0;
  if (groceriesAmount >= 2500) {
    const groceriesRate = categoryBestMap.groceries.rewardRate;
    const incrementalGroceries = groceriesAmount * (groceriesRate - BASELINE_REWARD_RATE);
    if (incrementalGroceries >= 40) {
      traits.push("You under-utilize grocery bonuses");
    }
  }

  if (monthlyTotals.length >= 3) {
    const values = monthlyTotals.map((entry) => entry.total);
    const avg = mean(values);
    const stdev = standardDeviation(values);
    const cv = avg > 0 ? stdev / avg : 0;

    if (cv >= 0.35) {
      traits.push("High volatility spender");
    } else if (cv <= 0.18) {
      traits.push("Stable monthly spender");
    }
  }

  const streamingAmount = profile.streaming ?? 0;
  if (streamingAmount >= 180) {
    const bestStreaming = getBestCardForPurchase(cards, "streaming", Math.max(streamingAmount, 100));
    if (bestStreaming && bestStreaming.estimatedRewardValue > streamingAmount * BASELINE_REWARD_RATE * 1.4) {
      traits.push("Recurring subscriptions are optimization-ready");
    }
  }

  return {
    title,
    summary,
    traits: traits.slice(0, 4),
    monthlyVolatility:
      monthlyTotals.length >= 3
        ? Number(
            (
              standardDeviation(monthlyTotals.map((entry) => entry.total)) /
              Math.max(1, mean(monthlyTotals.map((entry) => entry.total)))
            ).toFixed(2)
          )
        : null,
  };
}

function bestNetPoint(frontier: PortfolioFrontierResult): PortfolioFrontierResult["frontier"][number] | null {
  if (frontier.frontier.length === 0) {
    return null;
  }

  return [...frontier.frontier].sort(
    (left, right) => right.netValue - left.netValue || left.annualFee - right.annualFee || left.cardCount - right.cardCount
  )[0];
}

function maxRewardsPoint(frontier: PortfolioFrontierResult): PortfolioFrontierResult["frontier"][number] | null {
  if (frontier.frontier.length === 0) {
    return null;
  }

  return [...frontier.frontier].sort(
    (left, right) =>
      right.totalRewards - left.totalRewards || left.annualFee - right.annualFee || left.cardCount - right.cardCount
  )[0];
}

function buildRewardLeakScore(
  wrongCardLeak: number,
  missedCategoryLeak: number,
  frontier: PortfolioFrontierResult
): RewardLeakScore {
  const bestNet = bestNetPoint(frontier);
  const maxRewards = maxRewardsPoint(frontier);
  const annualFeeMismatchLeak = bestNet && maxRewards ? Math.max(0, bestNet.netValue - maxRewards.netValue) : 0;

  const wrongCardPoints = clamp(Math.round((wrongCardLeak / 180) * 18), 0, 18);
  const missedCategoryPoints = clamp(Math.round((missedCategoryLeak / 120) * 6), 0, 6);
  const annualFeeMismatchPoints = clamp(Math.round((annualFeeMismatchLeak / 240) * 4), 0, 4);
  const totalLossPoints = wrongCardPoints + missedCategoryPoints + annualFeeMismatchPoints;

  return {
    score: clamp(100 - totalLossPoints, 0, 100),
    wrongCardPoints,
    missedCategoryPoints,
    annualFeeMismatchPoints,
    wrongCardLeak: Number(wrongCardLeak.toFixed(2)),
    missedCategoryLeak: Number(missedCategoryLeak.toFixed(2)),
    annualFeeMismatchLeak: Number(annualFeeMismatchLeak.toFixed(2)),
  };
}

function buildMonthlyCategoryMatrix(transactions: ParsedTransaction[]): {
  monthKeys: string[];
  categorySeries: Record<StandardCategory, number[]>;
} {
  const monthKeys = [...new Set(transactions.map((transaction) => transaction.monthKey))].sort();
  const byMonthCategory = new Map<string, Map<StandardCategory, number>>();

  for (const monthKey of monthKeys) {
    byMonthCategory.set(monthKey, new Map());
  }

  for (const transaction of transactions) {
    const monthBucket = byMonthCategory.get(transaction.monthKey);
    if (!monthBucket) {
      continue;
    }

    monthBucket.set(transaction.category, (monthBucket.get(transaction.category) ?? 0) + transaction.amount);
  }

  const categorySeries = {} as Record<StandardCategory, number[]>;
  for (const category of STANDARD_CATEGORIES) {
    categorySeries[category] = monthKeys.map((monthKey) => {
      const monthBucket = byMonthCategory.get(monthKey);
      return Number(((monthBucket?.get(category) ?? 0)).toFixed(2));
    });
  }

  return { monthKeys, categorySeries };
}

function linearSlope(values: number[]): number {
  if (values.length <= 1) {
    return 0;
  }

  const n = values.length;
  const xMean = (n - 1) / 2;
  const yMean = mean(values);
  let numerator = 0;
  let denominator = 0;

  for (let index = 0; index < n; index += 1) {
    numerator += (index - xMean) * (values[index] - yMean);
    denominator += (index - xMean) ** 2;
  }

  if (denominator === 0) {
    return 0;
  }

  return numerator / denominator;
}

function estimateCardCategoryAnnualReward(card: CardRewardRecord, category: StandardCategory, annualSpend: number): number {
  if (annualSpend <= 0) {
    return 0;
  }

  const recommendation = getBestCardForPurchase([card], category, annualSpend);
  if (!recommendation) {
    return 0;
  }

  return recommendation.estimatedRewardValue;
}

function buildPredictiveRecommendation(
  transactions: ParsedTransaction[],
  profile: AnnualSpendProfile,
  cards: CardRewardRecord[]
): PredictiveCardRecommendation | null {
  if (transactions.length < 8) {
    return null;
  }

  const { monthKeys, categorySeries } = buildMonthlyCategoryMatrix(transactions);
  if (monthKeys.length < 4) {
    return null;
  }

  const candidates: Array<{ category: StandardCategory; growthPercent: number; score: number }> = [];

  for (const category of STANDARD_CATEGORIES) {
    if (category === "all_other") {
      continue;
    }

    const series = categorySeries[category];
    const trailingAvg = mean(series.slice(-3));
    if (trailingAvg < 35) {
      continue;
    }

    const slope = linearSlope(series);
    const projectedNext = Math.max(0, trailingAvg + slope);
    const growthPercent = trailingAvg > 0 ? (projectedNext - trailingAvg) / trailingAvg : 0;
    const score = growthPercent * Math.log1p(trailingAvg);

    if (growthPercent >= 0.12 && score > 0) {
      candidates.push({ category, growthPercent, score });
    }
  }

  if (candidates.length === 0) {
    return null;
  }

  const trend = candidates.sort((left, right) => right.score - left.score || right.growthPercent - left.growthPercent)[0];
  const cappedGrowth = clamp(trend.growthPercent, 0, 1.5);
  const predictedAnnualSpend = Number(((profile[trend.category] ?? 0) * (1 + cappedGrowth)).toFixed(2));

  if (predictedAnnualSpend <= 0) {
    return null;
  }

  const baselineAnnualRewards = predictedAnnualSpend * BASELINE_REWARD_RATE;

  let bestCard: {
    card: CardRewardRecord;
    grossLift: number;
    netLift: number;
    monthsToPositive: number;
  } | null = null;

  for (const card of cards) {
    const annualRewards = estimateCardCategoryAnnualReward(card, trend.category, predictedAnnualSpend);
    const grossLift = Math.max(0, annualRewards - baselineAnnualRewards);
    const annualFee = parseAnnualFee(card.annualFeeText);
    const netLift = grossLift - annualFee;

    const monthlyGrossLift = grossLift / 12;
    const monthsToPositive = annualFee <= 0 ? 1 : monthlyGrossLift > 0 ? Math.ceil(annualFee / monthlyGrossLift) : 999;

    if (!bestCard || netLift > bestCard.netLift || (netLift === bestCard.netLift && monthsToPositive < bestCard.monthsToPositive)) {
      bestCard = {
        card,
        grossLift,
        netLift,
        monthsToPositive,
      };
    }
  }

  if (!bestCard || bestCard.netLift <= 0) {
    return null;
  }

  return {
    category: trend.category,
    growthPercent: Number((trend.growthPercent * 100).toFixed(1)),
    predictedAnnualSpend,
    cardName: bestCard.card.cardName,
    issuer: bestCard.card.issuer,
    netAnnualLift: Number(bestCard.netLift.toFixed(2)),
    monthsToPositive: clamp(bestCard.monthsToPositive, 1, 24),
  };
}

export async function buildRewardsInsights(params: {
  cards: CardRewardRecord[];
  spendProfile: AnnualSpendProfile;
  categorizedCsvPath: string | null;
  frontier?: PortfolioFrontierResult;
}): Promise<RewardsInsights> {
  const { cards, spendProfile, categorizedCsvPath } = params;
  const frontier =
    params.frontier ??
    buildPortfolioParetoFrontier(cards, spendProfile, {
      maxCardsPerCombo: 4,
      candidatePoolSize: 12,
    });

  const transactions = categorizedCsvPath ? await readCategorizedTransactions(categorizedCsvPath) : [];
  const categoryBestMap = buildCategoryBestMap(cards);
  const monthlyTotals = buildMonthlyTotals(transactions);

  const leakFromProfile = estimateLeakByProfile(spendProfile, categoryBestMap);
  const leakFromTransactions =
    transactions.length > 0 ? estimateLeakByTransactions(transactions, categoryBestMap) : leakFromProfile;

  return {
    subscriptionOpportunities: buildSubscriptionOpportunities(transactions, categoryBestMap),
    personality: buildSpendingPersonality(spendProfile, cards, categoryBestMap, monthlyTotals),
    rewardLeakScore: buildRewardLeakScore(
      leakFromTransactions.wrongCardLeak,
      leakFromTransactions.missedCategoryLeak,
      frontier
    ),
    predictiveRecommendation: buildPredictiveRecommendation(transactions, spendProfile, cards),
  };
}
