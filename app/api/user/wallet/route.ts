import { NextRequest, NextResponse } from "next/server";
import { getCleanRewardCards } from "@/lib/rewards/data";
import { getAccessTokenFromRequest, getUserFromAccessToken, hasSupabaseServerConfig, supabaseRest } from "@/lib/supabase/server";

type WalletRow = {
  wallet_entry_id: string;
  user_id: string;
  card_id: string;
  card_name: string;
  issuer: string;
  card_segment: "personal" | "business" | string;
  network: string | null;
  created_at: string;
  updated_at: string;
};

type WalletPostBody = {
  cardId?: unknown;
};

type WalletDeleteBody = {
  cardId?: unknown;
};

const TABLE = process.env.SUPABASE_USER_WALLET_TABLE ?? "user_wallet_cards";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

function configMissing() {
  return NextResponse.json({ error: "Supabase auth/storage is not configured." }, { status: 500 });
}

async function requireUser(request: NextRequest) {
  if (!hasSupabaseServerConfig()) {
    return { error: configMissing() as NextResponse } as const;
  }

  const token = getAccessTokenFromRequest(request);
  if (!token) {
    return { error: unauthorized() as NextResponse } as const;
  }

  const user = await getUserFromAccessToken(token);
  if (!user) {
    return { error: unauthorized() as NextResponse } as const;
  }

  return { user } as const;
}

function mapWalletRow(row: WalletRow) {
  return {
    walletEntryId: row.wallet_entry_id,
    cardId: row.card_id,
    cardName: row.card_name,
    issuer: row.issuer,
    cardSegment: row.card_segment === "business" ? "business" : "personal",
    network: row.network,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export async function GET(request: NextRequest) {
  const auth = await requireUser(request);
  if ("error" in auth) {
    return auth.error;
  }

  const userId = encodeURIComponent(auth.user.id);
  const rows = await supabaseRest<WalletRow[]>(
    `${TABLE}?user_id=eq.${userId}&select=wallet_entry_id,user_id,card_id,card_name,issuer,card_segment,network,created_at,updated_at&order=updated_at.desc`
  );

  return NextResponse.json({
    count: rows.length,
    wallet: rows.map(mapWalletRow)
  });
}

export async function POST(request: NextRequest) {
  const auth = await requireUser(request);
  if ("error" in auth) {
    return auth.error;
  }

  const body = ((await request.json().catch(() => ({}))) ?? {}) as WalletPostBody;
  const cardId = typeof body.cardId === "string" ? body.cardId.trim() : "";
  if (!cardId) {
    return NextResponse.json({ error: "cardId is required." }, { status: 400 });
  }

  const cards = await getCleanRewardCards(4000);
  const card = cards.find((item) => item.id === cardId);
  if (!card) {
    return NextResponse.json({ error: "Card not found in clean dataset." }, { status: 404 });
  }

  const upsertPayload = {
    user_id: auth.user.id,
    card_id: card.id,
    card_name: card.cardName,
    issuer: card.issuer,
    card_segment: card.cardSegment,
    network: card.network ?? null
  };

  const rows = await supabaseRest<WalletRow[]>(
    `${TABLE}?on_conflict=user_id,card_id`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        Prefer: "resolution=merge-duplicates,return=representation"
      },
      body: JSON.stringify(upsertPayload)
    }
  );

  const saved = rows[0];
  if (!saved) {
    return NextResponse.json({ error: "Could not save wallet entry." }, { status: 500 });
  }

  return NextResponse.json({ walletEntry: mapWalletRow(saved) });
}

export async function DELETE(request: NextRequest) {
  const auth = await requireUser(request);
  if ("error" in auth) {
    return auth.error;
  }

  const body = ((await request.json().catch(() => ({}))) ?? {}) as WalletDeleteBody;
  const cardId = typeof body.cardId === "string" ? body.cardId.trim() : "";
  if (!cardId) {
    return NextResponse.json({ error: "cardId is required." }, { status: 400 });
  }

  const userId = encodeURIComponent(auth.user.id);
  const encodedCardId = encodeURIComponent(cardId);
  const deleted = await supabaseRest<WalletRow[]>(
    `${TABLE}?user_id=eq.${userId}&card_id=eq.${encodedCardId}`,
    {
      method: "DELETE",
      headers: {
        Prefer: "return=representation"
      }
    }
  );

  return NextResponse.json({ deleted: deleted.length > 0 });
}
