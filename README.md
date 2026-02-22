# CreditCard Concierge Frontend

Professional, modern Next.js frontend for a credit-card concierge product that:

- accepts statement uploads,
- shows personalized card recommendations,
- suggests the best card per purchase.

## Stack

- Next.js App Router
- TypeScript
- Plain CSS (clean, neutral design system)

## Run locally

1. Install dependencies:

```bash
npm install
```

2. Start dev server:

```bash
npm run dev
```

3. Open `http://localhost:3000`

## Pages

- `/` Home and product overview
- `/cards` Browse clean card records with filters
- `/review` Review queue for low-quality/non-card rows
- `/upload` Statement upload workflow UI
- `/recommendations` Ranked recommendation view
- `/optimizer` Per-purchase optimization + autofill preview
- `/extension` Browser extension setup page
- `/login` Account sign-in/sign-up
- `/wallet` User-saved wallet cards (synced to Supabase per account)

## Browser Extension (Checkout Autofill MVP)

Extension source lives in `extension/`.

Features:
- Detect checkout context (merchant + amount)
- Ask app API for best card from user wallet
- Autofill compatible credit-card form fields on page

Load in Chrome:

1. Open `chrome://extensions`
2. Enable Developer mode
3. Click **Load unpacked**
4. Select the `extension` folder
5. Open extension **Options**
6. Set App Base URL (`http://localhost:3000` for local dev)
7. Load card catalog and add wallet cards
8. Use extension popup on checkout pages

## Notes

The app now reads reward data from Supabase when env vars are present, with local fallback to `data/rewards/cards.us.json`.

Set these for live data:

```bash
export SUPABASE_URL="https://<project-ref>.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="<service-role-key>"
export NEXT_PUBLIC_SUPABASE_URL="https://<project-ref>.supabase.co"
export NEXT_PUBLIC_SUPABASE_ANON_KEY="<anon-key>"
```

Apply wallet/account schema in Supabase SQL editor:

- `supabase/schema/rewards.sql`
- `supabase/schema/user_wallet.sql`

## Rewards Data Pipeline (US)

This repo now includes a low-cost rewards collection pipeline for major US issuers.

- Source registry: `data/rewards/sources.us.json`
- Discovery config: `data/rewards/discovery.us.json`
- Discovered sources cache: `data/rewards/sources.discovered.us.json`
- Discovery report: `data/rewards/discovery-report.us.json`
- Manual overrides: `data/rewards/overrides.us.json`
- Generated dataset: `data/rewards/cards.us.json`
- Collector script: `scripts/collect-rewards.mjs`
- Supabase sync script: `scripts/sync-rewards-to-supabase.mjs`
- Supabase schema: `supabase/schema/rewards.sql`
- Clean-data view: `public.credit_card_rewards_clean` (created by schema SQL)

Run data collection:

```bash
npm run rewards:collect
```

Run discovery only (no card-page scraping):

```bash
npm run rewards:discover
```

Optional raw HTML snapshot output:

```bash
SAVE_RAW_HTML=1 npm run rewards:collect
```

Large crawl example:

```bash
ENABLE_DISCOVERY=1 ENABLE_SITEMAP_DISCOVERY=1 MAX_DISCOVERED_SOURCES=3000 MAX_FETCH_SOURCES=1200 npm run rewards:collect
```

Faster large crawl:

```bash
FETCH_CONCURRENCY=12 DISCOVERY_CONCURRENCY=10 HOST_CONCURRENCY=2 HOST_MIN_DELAY_MS=350 REQUEST_DELAY_MS=40 npm run rewards:collect
```

NerdWallet-focused discovery pass:

```bash
DISCOVERY_ONLY=1 DISCOVERY_SOURCE_FILTER=nerdwallet npm run rewards:collect
```

NerdWallet-only crawl + scrape (recommended fast path):

```bash
NERDWALLET_ONLY=1 ENABLE_DISCOVERY=1 ENABLE_SITEMAP_DISCOVERY=0 NERDWALLET_CRAWL_MAX_PAGES=300 NERDWALLET_CRAWL_DEPTH=4 OUTPUT_REQUIRE_REWARD_RULES=1 MIN_CONFIDENCE_SCORE=0.45 npm run rewards:collect
```

Throttle-safe tuning (recommended defaults for reliability):

```bash
MAX_FETCH_RETRIES=4 RETRY_BACKOFF_BASE_MS=700 RETRY_BACKOFF_MAX_MS=20000 RETRY_JITTER_MS=350 HOST_CONCURRENCY=2 HOST_MIN_DELAY_MS=300 TARGET_BUSINESS_SHARE=0.3 npm run rewards:collect
```

Very large crawl (for thousands of cards if discovery sources support it):

```bash
ENABLE_DISCOVERY=1 ENABLE_SITEMAP_DISCOVERY=1 MAX_DISCOVERED_SOURCES=12000 MAX_FETCH_SOURCES=5000 MAX_SITEMAP_CHILDREN=300 FETCH_CONCURRENCY=10 REQUEST_DELAY_MS=60 npm run rewards:collect
```

Sync dataset to Supabase:

```bash
export SUPABASE_URL="https://<project-ref>.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="<service-role-key>"
npm run rewards:sync
```

Sync all records (including lower-confidence rows) instead of high-quality-only:

```bash
SYNC_ONLY_HIGH_QUALITY=0 npm run rewards:sync
```

Audit rewards data quality (reads Supabase if env vars are set, else local JSON):

```bash
npm run rewards:audit
```

Monthly refresh automation is set up in:

- `.github/workflows/rewards-refresh.yml`
