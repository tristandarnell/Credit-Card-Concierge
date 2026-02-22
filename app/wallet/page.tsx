"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/auth-provider";

type CatalogCard = {
  id: string;
  issuer: string;
  cardName: string;
  cardSegment: "personal" | "business";
  network: string | null;
};

type WalletEntry = {
  walletEntryId: string;
  cardId: string;
  cardName: string;
  issuer: string;
  cardSegment: "personal" | "business";
  network: string | null;
  createdAt: string;
  updatedAt: string;
};

function authHeaders(accessToken: string): HeadersInit {
  return {
    Authorization: `Bearer ${accessToken}`,
    "content-type": "application/json"
  };
}

export default function WalletPage() {
  const { user, isLoading, isConfigured, getAccessToken } = useAuth();
  const [cards, setCards] = useState<CatalogCard[]>([]);
  const [wallet, setWallet] = useState<WalletEntry[]>([]);
  const [query, setQuery] = useState("");
  const [selectedCardId, setSelectedCardId] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  const filteredCards = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return cards;
    }

    return cards.filter((card) =>
      `${card.cardName} ${card.issuer} ${card.id}`.toLowerCase().includes(normalized)
    );
  }, [cards, query]);

  const loadCatalog = useCallback(async () => {
    const response = await fetch("/api/extension/cards?limit=4000", { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Could not load card catalog (${response.status}).`);
    }
    const payload = (await response.json()) as { cards?: CatalogCard[] };
    const nextCards = Array.isArray(payload.cards) ? payload.cards : [];
    setCards(nextCards);
    if (!selectedCardId && nextCards.length > 0) {
      setSelectedCardId(nextCards[0].id);
    }
  }, [selectedCardId]);

  const loadWallet = useCallback(async () => {
    const token = getAccessToken();
    if (!token) {
      setWallet([]);
      return;
    }

    const response = await fetch("/api/user/wallet", {
      method: "GET",
      headers: authHeaders(token),
      cache: "no-store"
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(body || `Could not load wallet (${response.status}).`);
    }

    const payload = (await response.json()) as { wallet?: WalletEntry[] };
    setWallet(Array.isArray(payload.wallet) ? payload.wallet : []);
  }, [getAccessToken]);

  useEffect(() => {
    loadCatalog().catch((err) => {
      setError(err instanceof Error ? err.message : "Could not load cards.");
    });
  }, [loadCatalog]);

  useEffect(() => {
    if (!user) {
      setWallet([]);
      return;
    }

    loadWallet().catch((err) => {
      setError(err instanceof Error ? err.message : "Could not load wallet.");
    });
  }, [loadWallet, user]);

  async function addSelectedCard() {
    const token = getAccessToken();
    if (!token) {
      setError("Sign in first.");
      return;
    }
    if (!selectedCardId) {
      setError("Choose a card first.");
      return;
    }

    setIsBusy(true);
    setStatus(null);
    setError(null);

    try {
      const response = await fetch("/api/user/wallet", {
        method: "POST",
        headers: authHeaders(token),
        body: JSON.stringify({ cardId: selectedCardId })
      });

      if (!response.ok) {
        const body = await response.text();
        throw new Error(body || `Save failed (${response.status}).`);
      }

      await loadWallet();
      setStatus("Card saved to your wallet.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save card.");
    } finally {
      setIsBusy(false);
    }
  }

  async function removeCard(cardId: string) {
    const token = getAccessToken();
    if (!token) {
      setError("Sign in first.");
      return;
    }

    setIsBusy(true);
    setStatus(null);
    setError(null);
    try {
      const response = await fetch("/api/user/wallet", {
        method: "DELETE",
        headers: authHeaders(token),
        body: JSON.stringify({ cardId })
      });

      if (!response.ok) {
        const body = await response.text();
        throw new Error(body || `Delete failed (${response.status}).`);
      }

      await loadWallet();
      setStatus("Card removed from your wallet.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not remove card.");
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <section className="section section-tight">
      <h1>My Wallet</h1>
      <p className="muted" style={{ marginTop: "-0.4rem", marginBottom: "1rem" }}>
        Save your active cards once. Recommendations and extension calls can use this wallet automatically.
      </p>

      {!isConfigured ? (
        <div className="panel">
          <p>Supabase auth is not configured yet.</p>
          <p className="muted" style={{ marginTop: "0.5rem" }}>
            Add <code>NEXT_PUBLIC_SUPABASE_URL</code>, <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code>,{" "}
            <code>SUPABASE_SERVICE_ROLE_KEY</code> to <code>.env.local</code>.
          </p>
        </div>
      ) : null}

      {isConfigured && isLoading ? (
        <div className="panel">
          <p>Loading session...</p>
        </div>
      ) : null}

      {isConfigured && !isLoading && !user ? (
        <div className="panel">
          <p>You need to sign in to use saved wallet sync.</p>
          <div style={{ marginTop: "0.75rem" }}>
            <Link className="btn btn-primary" href="/login">
              Go to Login
            </Link>
          </div>
        </div>
      ) : null}

      {isConfigured && !isLoading && user ? (
        <>
          <div className="panel" style={{ marginBottom: "1rem" }}>
            <label style={{ display: "block", marginBottom: "0.6rem" }}>
              Search card catalog
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by card or issuer"
                style={{ width: "100%", marginTop: "0.3rem" }}
              />
            </label>

            <label style={{ display: "block", marginBottom: "0.8rem" }}>
              Add card
              <select
                value={selectedCardId}
                onChange={(event) => setSelectedCardId(event.target.value)}
                style={{ width: "100%", marginTop: "0.3rem" }}
              >
                {filteredCards.map((card) => (
                  <option key={card.id} value={card.id}>
                    {card.cardName} — {card.issuer}
                  </option>
                ))}
              </select>
            </label>

            <button type="button" className="btn btn-primary" onClick={addSelectedCard} disabled={isBusy}>
              {isBusy ? "Saving..." : "Save to My Wallet"}
            </button>
          </div>

          <div className="panel">
            <h3 style={{ marginBottom: "0.75rem" }}>Saved cards ({wallet.length})</h3>
            {wallet.length === 0 ? <p className="muted">No cards saved yet.</p> : null}
            {wallet.length > 0 ? (
              <ul className="compact-list" style={{ paddingLeft: "1rem" }}>
                {wallet.map((entry) => (
                  <li key={entry.walletEntryId} style={{ marginBottom: "0.6rem" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.8rem" }}>
                      <span>
                        <strong>{entry.cardName}</strong> · {entry.issuer}
                      </span>
                      <button type="button" className="btn btn-secondary" onClick={() => removeCard(entry.cardId)} disabled={isBusy}>
                        Remove
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </>
      ) : null}

      {status ? (
        <p style={{ marginTop: "0.75rem", color: "var(--success)" }} aria-live="polite">
          {status}
        </p>
      ) : null}

      {error ? (
        <p style={{ marginTop: "0.75rem", color: "var(--danger)" }} aria-live="polite">
          {error}
        </p>
      ) : null}
    </section>
  );
}
