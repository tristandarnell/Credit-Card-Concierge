import { NextRequest, NextResponse } from "next/server";
import { getCleanRewardCards } from "@/lib/rewards/data";
import { getBestCardForPurchase } from "@/lib/rewards/scoring";
import { resolvePurchaseCategory } from "@/lib/extension/merchant-category";

const CORS_HEADERS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "POST,OPTIONS",
  "access-control-allow-headers": "content-type"
};

type RecommendBody = {
  merchant?: string;
  hostname?: string;
  amount?: number | string;
  category?: string;
  walletCardIds?: string[];
};

function parseAmount(input: unknown): number {
  if (typeof input === "number" && Number.isFinite(input)) {
    return Math.max(1, input);
  }

  if (typeof input === "string") {
    const numeric = Number(input.replace(/[^\d.]+/g, ""));
    if (Number.isFinite(numeric) && numeric > 0) {
      return numeric;
    }
  }

  return 100;
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(request: NextRequest) {
  const body = ((await request.json().catch(() => ({}))) ?? {}) as RecommendBody;
  const cards = await getCleanRewardCards(2000);
  const walletCardIds = Array.isArray(body.walletCardIds)
    ? body.walletCardIds.map((value) => String(value).trim()).filter(Boolean)
    : [];

  const walletCards =
    walletCardIds.length > 0 ? cards.filter((card) => walletCardIds.includes(card.id)) : cards;

  const category = resolvePurchaseCategory({
    explicitCategory: body.category,
    merchant: body.merchant,
    hostname: body.hostname
  });
  const amount = parseAmount(body.amount);
  const recommendation = getBestCardForPurchase(walletCards, category, amount);

  return NextResponse.json(
    {
      merchant: body.merchant ?? null,
      hostname: body.hostname ?? null,
      category,
      amount,
      walletCardCount: walletCards.length,
      recommendation: recommendation
        ? {
            cardId: recommendation.cardId,
            cardName: recommendation.cardName,
            issuer: recommendation.issuer,
            estimatedRewardValue: recommendation.estimatedRewardValue,
            matchedRule: recommendation.matchedRule
          }
        : null
    },
    { headers: CORS_HEADERS }
  );
}

