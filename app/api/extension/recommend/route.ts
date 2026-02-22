import { NextRequest, NextResponse } from "next/server";
import { getCleanRewardCards } from "@/lib/rewards/data";
import { getBestCardForPurchase } from "@/lib/rewards/scoring";
import { resolvePurchaseCategory } from "@/lib/extension/merchant-category";
import { getAccessTokenFromRequest, getUserFromAccessToken, hasSupabaseServerConfig, supabaseRest } from "@/lib/supabase/server";

const CORS_HEADERS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "POST,OPTIONS",
  "access-control-allow-headers": "content-type,authorization"
};

type RecommendBody = {
  merchant?: string;
  hostname?: string;
  amount?: number | string;
  category?: string;
  walletCardIds?: string[];
};

type UserWalletRow = {
  card_id: string;
};

const USER_WALLET_TABLE = process.env.SUPABASE_USER_WALLET_TABLE ?? "user_wallet_cards";

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

async function walletIdsFromAccount(request: NextRequest): Promise<string[]> {
  if (!hasSupabaseServerConfig()) {
    return [];
  }

  const accessToken = getAccessTokenFromRequest(request);
  if (!accessToken) {
    return [];
  }

  const user = await getUserFromAccessToken(accessToken);
  if (!user) {
    return [];
  }

  const userId = encodeURIComponent(user.id);
  const rows = await supabaseRest<UserWalletRow[]>(
    `${USER_WALLET_TABLE}?user_id=eq.${userId}&select=card_id`,
    undefined,
    accessToken
  );

  return rows.map((row) => row.card_id).filter(Boolean);
}

export async function POST(request: NextRequest) {
  const body = ((await request.json().catch(() => ({}))) ?? {}) as RecommendBody;
  const cards = await getCleanRewardCards(2000);
  let walletCardIds = Array.isArray(body.walletCardIds)
    ? body.walletCardIds.map((value) => String(value).trim()).filter(Boolean)
    : [];

  if (walletCardIds.length === 0) {
    walletCardIds = await walletIdsFromAccount(request);
  }

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
