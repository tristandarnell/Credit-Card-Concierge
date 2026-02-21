import type { StandardCategory } from "@/lib/rewards/categories";

export type RewardUnit = "percent_cashback" | "x_points" | "x_miles" | "unknown";
export type CardSegment = "personal" | "business";

export type RewardRule = {
  category: StandardCategory;
  rateText: string;
  rateValue: number | null;
  unit: RewardUnit;
  capText?: string;
  notes?: string;
};

export type RotatingCategoryDetail = {
  period: string;
  rateText: string | null;
  categories: StandardCategory[];
  sourceText: string;
};

export type CardRewardSource = {
  id: string;
  issuer: string;
  cardName: string;
  network?: string;
  cardSegment?: CardSegment;
  popularityRank?: number | null;
  cardUrl: string;
};

export type CardRewardRecord = {
  id: string;
  issuer: string;
  cardName: string;
  network?: string;
  cardSegment: CardSegment;
  popularityRank: number | null;
  country: "US";
  cardUrl: string;
  lastFetchedAt: string;
  annualFeeText: string | null;
  introOfferText: string | null;
  rotatingCategoryProgram: boolean;
  rotatingCategories: RotatingCategoryDetail[];
  rewardRules: RewardRule[];
  notes: string[];
  confidenceScore: number;
  fetchStatus: "ok" | "error";
  fetchError: string | null;
};

export type RewardCollectionOutput = {
  generatedAt: string | null;
  country: "US";
  records: CardRewardRecord[];
  failures: Array<{
    id: string;
    cardUrl: string;
    error: string;
  }>;
};
