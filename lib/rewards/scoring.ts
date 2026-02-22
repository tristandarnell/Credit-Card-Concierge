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

export type PortfolioCardRecommendation = {
  card: CardRewardRecord;
  netValue: number;
  categories: Array<{ category: StandardCategory; amount: number; rewardValue: number; rateText: string }>;
};

export type PortfolioCategoryAssignment = {
  category: StandardCategory;
  cardName: string;
  amount: number;
  rewardValue: number;
};

export type PortfolioRecommendation = {
  cards: PortfolioCardRecommendation[];
  totalProjectedValue: number;
  totalFees: number;
  categoryAssignments: PortfolioCategoryAssignment[];
};

export type PortfolioComboPoint = {
  id: string;
  cardIds: string[];
  cardNames: string[];
  cardCount: number;
  annualFee: number;
  totalRewards: number;
  netValue: number;
  categoryAssignments: PortfolioCategoryAssignment[];
  onParetoFrontier: boolean;
};

export type PortfolioFrontierOptions = {
  maxCardsPerCombo?: number;
  candidatePoolSize?: number;
};

export type PortfolioFrontierResult = {
  points: PortfolioComboPoint[];
  frontier: PortfolioComboPoint[];
  candidateCardPoolSize: number;
  maxCardsPerCombo: number;
  minAnnualFee: number;
  maxAnnualFee: number;
  maxRewardsValue: number;
};

function estimateCardRewardForCategory(card: CardRewardRecord, category: StandardCategory, amount: number): number {
  if (amount <= 0) {
    return 0;
  }

  const rule = bestRuleForCategory(card.rewardRules, category);
  if (!rule) {
    return 0;
  }

  return estimateRewardValueForCard(card, rule, amount);
}

function evaluatePortfolioCombo(
  comboCards: CardRewardRecord[],
  profile: AnnualSpendProfile
): Omit<PortfolioComboPoint, "onParetoFrontier"> {
  const categoryAssignments: PortfolioCategoryAssignment[] = [];
  let totalRewards = 0;

  for (const category of STANDARD_CATEGORIES) {
    const amount = profile[category] ?? 0;
    if (amount <= 0) {
      continue;
    }

    let bestCardName = "No card";
    let bestRewardValue = 0;

    for (const card of comboCards) {
      const rewardValue = estimateCardRewardForCategory(card, category, amount);
      if (rewardValue > bestRewardValue) {
        bestRewardValue = rewardValue;
        bestCardName = card.cardName;
      }
    }

    const roundedRewardValue = Number(bestRewardValue.toFixed(2));
    totalRewards += roundedRewardValue;
    categoryAssignments.push({
      category,
      cardName: bestCardName,
      amount,
      rewardValue: roundedRewardValue
    });
  }

  const annualFee = Number(
    comboCards
      .reduce((sum, card) => sum + parseAnnualFee(card.annualFeeText), 0)
      .toFixed(2)
  );
  const roundedRewards = Number(totalRewards.toFixed(2));
  const netValue = Number((roundedRewards - annualFee).toFixed(2));

  return {
    id: comboCards.map((card) => card.id).sort().join("+"),
    cardIds: comboCards.map((card) => card.id),
    cardNames: comboCards.map((card) => card.cardName),
    cardCount: comboCards.length,
    annualFee,
    totalRewards: roundedRewards,
    netValue,
    categoryAssignments
  };
}

function buildCardCombinations(cards: CardRewardRecord[], maxCardsPerCombo: number): CardRewardRecord[][] {
  const combinations: CardRewardRecord[][] = [];
  const targetMaxSize = Math.min(Math.max(1, maxCardsPerCombo), cards.length);
  const working: CardRewardRecord[] = [];

  function backtrack(startIndex: number, targetSize: number): void {
    if (working.length === targetSize) {
      combinations.push([...working]);
      return;
    }

    for (let index = startIndex; index < cards.length; index += 1) {
      working.push(cards[index]);
      backtrack(index + 1, targetSize);
      working.pop();
    }
  }

  for (let size = 1; size <= targetMaxSize; size += 1) {
    backtrack(0, size);
  }

  return combinations;
}

function selectPortfolioCandidates(
  cards: CardRewardRecord[],
  profile: AnnualSpendProfile,
  poolSize: number
): CardRewardRecord[] {
  const targetPoolSize = Math.max(4, poolSize);
  const netByCardId = new Map<string, number>();
  const cardById = new Map(cards.map((card) => [card.id, card]));

  for (const card of cards) {
    netByCardId.set(card.id, estimateNetAnnualCardValue(card, profile));
  }

  const rankedByNet = [...cards].sort(
    (left, right) =>
      (netByCardId.get(right.id) ?? Number.NEGATIVE_INFINITY) - (netByCardId.get(left.id) ?? Number.NEGATIVE_INFINITY)
  );

  const categoryWinners = new Set<string>();
  for (const category of STANDARD_CATEGORIES) {
    const amount = profile[category] ?? 0;
    if (amount <= 0) {
      continue;
    }

    const categoryTopCards = cards
      .map((card) => ({
        card,
        rewardValue: estimateCardRewardForCategory(card, category, amount)
      }))
      .filter((entry) => entry.rewardValue > 0)
      .sort((left, right) => right.rewardValue - left.rewardValue)
      .slice(0, 2);

    for (const entry of categoryTopCards) {
      categoryWinners.add(entry.card.id);
    }
  }

  const selected = new Map<string, CardRewardRecord>();
  const rankedCategoryWinners = [...categoryWinners]
    .map((cardId) => cardById.get(cardId))
    .filter((card): card is CardRewardRecord => card != null)
    .sort(
      (left, right) =>
        (netByCardId.get(right.id) ?? Number.NEGATIVE_INFINITY) - (netByCardId.get(left.id) ?? Number.NEGATIVE_INFINITY)
    );

  for (const card of rankedCategoryWinners) {
    selected.set(card.id, card);
  }

  for (const card of rankedByNet) {
    if (selected.size >= targetPoolSize) {
      break;
    }
    selected.set(card.id, card);
  }

  const hardCap = Math.max(targetPoolSize, 16);
  return [...selected.values()]
    .sort(
      (left, right) =>
        (netByCardId.get(right.id) ?? Number.NEGATIVE_INFINITY) - (netByCardId.get(left.id) ?? Number.NEGATIVE_INFINITY)
    )
    .slice(0, hardCap);
}

function dominatesPortfolioPoint(left: PortfolioComboPoint, right: PortfolioComboPoint): boolean {
  const epsilon = 0.01;
  const lowerOrEqualFee = left.annualFee <= right.annualFee + epsilon;
  const higherOrEqualRewards = left.totalRewards + epsilon >= right.totalRewards;
  const strictImprovement = left.annualFee < right.annualFee - epsilon || left.totalRewards > right.totalRewards + epsilon;

  return lowerOrEqualFee && higherOrEqualRewards && strictImprovement;
}

export function buildPortfolioParetoFrontier(
  cards: CardRewardRecord[],
  profile: AnnualSpendProfile = DEFAULT_ANNUAL_SPEND_PROFILE,
  options: PortfolioFrontierOptions = {}
): PortfolioFrontierResult {
  if (cards.length === 0) {
    return {
      points: [],
      frontier: [],
      candidateCardPoolSize: 0,
      maxCardsPerCombo: options.maxCardsPerCombo ?? 4,
      minAnnualFee: 0,
      maxAnnualFee: 0,
      maxRewardsValue: 0
    };
  }

  const maxCardsPerCombo = Math.max(1, options.maxCardsPerCombo ?? 4);
  const candidatePoolSize = Math.max(maxCardsPerCombo, options.candidatePoolSize ?? 12);
  const candidateCards = selectPortfolioCandidates(cards, profile, candidatePoolSize);
  const combos = buildCardCombinations(candidateCards, maxCardsPerCombo);
  const evaluatedPoints = combos.map((comboCards) => evaluatePortfolioCombo(comboCards, profile));

  const uniquePointsByCoordinate = new Map<string, Omit<PortfolioComboPoint, "onParetoFrontier">>();
  for (const point of evaluatedPoints) {
    const key = `${Math.round(point.annualFee * 100)}:${Math.round(point.totalRewards * 100)}`;
    const existing = uniquePointsByCoordinate.get(key);
    if (
      !existing ||
      point.cardCount < existing.cardCount ||
      (point.cardCount === existing.cardCount && point.netValue > existing.netValue)
    ) {
      uniquePointsByCoordinate.set(key, point);
    }
  }

  const uniquePoints = [...uniquePointsByCoordinate.values()]
    .map((point) => ({ ...point, onParetoFrontier: false }))
    .sort(
      (left, right) =>
        left.annualFee - right.annualFee || right.totalRewards - left.totalRewards || left.cardCount - right.cardCount
    );

  for (let index = 0; index < uniquePoints.length; index += 1) {
    const candidate = uniquePoints[index];
    let dominated = false;
    for (let compareIndex = 0; compareIndex < uniquePoints.length; compareIndex += 1) {
      if (index === compareIndex) {
        continue;
      }
      if (dominatesPortfolioPoint(uniquePoints[compareIndex], candidate)) {
        dominated = true;
        break;
      }
    }

    if (!dominated) {
      candidate.onParetoFrontier = true;
    }
  }

  const frontier = uniquePoints
    .filter((point) => point.onParetoFrontier)
    .sort(
      (left, right) =>
        left.annualFee - right.annualFee || right.totalRewards - left.totalRewards || left.cardCount - right.cardCount
    );

  const minAnnualFee = uniquePoints.length > 0 ? Math.min(...uniquePoints.map((point) => point.annualFee)) : 0;
  const maxAnnualFee = uniquePoints.length > 0 ? Math.max(...uniquePoints.map((point) => point.annualFee)) : 0;
  const maxRewardsValue = uniquePoints.length > 0 ? Math.max(...uniquePoints.map((point) => point.totalRewards)) : 0;

  return {
    points: uniquePoints,
    frontier,
    candidateCardPoolSize: candidateCards.length,
    maxCardsPerCombo,
    minAnnualFee,
    maxAnnualFee,
    maxRewardsValue
  };
}

/**
 * Recommend an optimal credit card portfolio for a given spend profile.
 * Assigns each category to the best card and ranks cards by contribution.
 */
export function recommendPortfolio(
  cards: CardRewardRecord[],
  profile: AnnualSpendProfile,
  maxCards = 5
): PortfolioRecommendation {
  const categoryAssignments: PortfolioCategoryAssignment[] = [];
  const cardContributions = new Map<string, { value: number; categories: PortfolioCardRecommendation["categories"] }>();

  for (const category of STANDARD_CATEGORIES) {
    const amount = profile[category] ?? 0;
    if (amount <= 0) continue;

    const best = getBestCardForPurchase(cards, category, amount);
    if (!best) {
      categoryAssignments.push({ category, cardName: "No card", amount, rewardValue: 0 });
      continue;
    }

    categoryAssignments.push({
      category,
      cardName: best.cardName,
      amount,
      rewardValue: best.estimatedRewardValue
    });

    const existing = cardContributions.get(best.cardId) ?? { value: 0, categories: [] };
    existing.value += best.estimatedRewardValue;
    existing.categories.push({
      category,
      amount,
      rewardValue: best.estimatedRewardValue,
      rateText: best.matchedRule.rateText
    });
    cardContributions.set(best.cardId, existing);
  }

  // Build candidate cards with net value (rewards - fee)
  const candidates: PortfolioCardRecommendation[] = [...cardContributions.entries()].map(([cardId, contrib]) => {
    const card = cards.find((c) => c.id === cardId)!;
    const fee = parseAnnualFee(card.annualFeeText);
    return {
      card,
      netValue: contrib.value - fee,
      categories: contrib.categories
    };
  });

  // Only recommend cards with positive net value; rank by net value
  const portfolioCards = candidates
    .filter((p) => p.netValue > 0)
    .sort((a, b) => b.netValue - a.netValue)
    .slice(0, maxCards);

  // If no cards have positive net, fall back to best no-fee cards that earn rewards,
  // or if none exist, the single least-negative option
  const noFeeEarners = candidates
    .filter((p) => parseAnnualFee(p.card.annualFeeText) === 0 && p.netValue >= 0)
    .sort((a, b) => b.netValue - a.netValue)
    .slice(0, maxCards);

  const finalCards =
    portfolioCards.length > 0
      ? portfolioCards
      : noFeeEarners.length > 0
        ? noFeeEarners
        : candidates.sort((a, b) => b.netValue - a.netValue).slice(0, 1);

  const totalProjectedValue = finalCards.reduce((sum, p) => sum + p.netValue, 0);
  const totalFees = finalCards.reduce((sum, p) => sum + parseAnnualFee(p.card.annualFeeText), 0);

  // Only show category assignments for cards we're actually recommending
  const recommendedCardNames = new Set(finalCards.map((p) => p.card.cardName));
  const filteredAssignments = categoryAssignments.filter(
    (a) => a.cardName !== "No card" && recommendedCardNames.has(a.cardName)
  );

  return {
    cards: finalCards,
    totalProjectedValue,
    totalFees,
    categoryAssignments: filteredAssignments
  };
}
