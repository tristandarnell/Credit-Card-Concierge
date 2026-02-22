import { NextRequest, NextResponse } from "next/server";
import { getCleanRewardCards } from "@/lib/rewards/data";

const CORS_HEADERS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,OPTIONS",
  "access-control-allow-headers": "content-type"
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim().toLowerCase() ?? "";
  const limitParam = Number(request.nextUrl.searchParams.get("limit") ?? 500);
  const limit = Math.max(1, Math.min(2000, Number.isFinite(limitParam) ? Math.floor(limitParam) : 500));

  const cards = await getCleanRewardCards(2000);
  const filtered = query
    ? cards.filter((card) =>
        `${card.id} ${card.issuer} ${card.cardName} ${card.cardSegment}`.toLowerCase().includes(query)
      )
    : cards;

  const payload = filtered.slice(0, limit).map((card) => ({
    id: card.id,
    issuer: card.issuer,
    cardName: card.cardName,
    cardSegment: card.cardSegment,
    network: card.network ?? null
  }));

  return NextResponse.json(
    {
      count: payload.length,
      cards: payload
    },
    { headers: CORS_HEADERS }
  );
}

