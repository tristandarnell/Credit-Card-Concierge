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
- `/upload` Statement upload workflow UI
- `/recommendations` Ranked recommendation view
- `/optimizer` Per-purchase optimization + autofill preview

## Notes

This repo currently uses mock data in `lib/mock-data.ts`. Connect your real backend/API by replacing those data sources and wiring form handlers.

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

Monthly refresh automation is set up in:

- `.github/workflows/rewards-refresh.yml`
