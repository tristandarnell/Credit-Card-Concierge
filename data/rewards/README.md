# Rewards Data (US)

This folder stores scraped and normalized reward data for major US credit cards.

## Files

- `sources.us.json`: source registry for issuer/card landing pages.
- each source supports `cardSegment` (`personal`/`business`) and `popularityRank` for crawl ordering.
- `discovery.us.json`: discovery seeds for list pages and sitemaps.
- `sources.discovered.us.json`: discovered card URLs from discovery pass.
- `discovery-report.us.json`: per-source discovery stats/errors for each run.
- `overrides.us.json`: manual correction layer keyed by source `id`.
- `cards.us.json`: generated output used by the app and recommendation logic.

## Run collector

```bash
npm run rewards:collect
```

Target specific issuers/cards during fetch (comma-separated substring filter):

```bash
FETCH_SOURCE_FILTER="amex,bank of america,wells fargo" ENABLE_DISCOVERY=0 npm run rewards:collect
```

Optional raw HTML snapshotting:

```bash
SAVE_RAW_HTML=1 npm run rewards:collect
```

Discovery only (skip card-page fetch):

```bash
npm run rewards:discover
```

Fast smoke test with fewer sources:

```bash
SOURCE_LIMIT=3 FETCH_TIMEOUT_MS=5000 npm run rewards:collect
```

Discovery controls:

```bash
ENABLE_DISCOVERY=1 ENABLE_SITEMAP_DISCOVERY=1 MAX_DISCOVERED_SOURCES=3000 MAX_FETCH_SOURCES=1200 npm run rewards:collect
```

Increase throughput on large runs:

```bash
FETCH_CONCURRENCY=12 DISCOVERY_CONCURRENCY=10 HOST_CONCURRENCY=2 HOST_MIN_DELAY_MS=350 REQUEST_DELAY_MS=40 npm run rewards:collect
```

NerdWallet-only discovery:

```bash
DISCOVERY_ONLY=1 DISCOVERY_SOURCE_FILTER=nerdwallet npm run rewards:collect
```

Retry/backoff controls:

```bash
MAX_FETCH_RETRIES=4 RETRY_BACKOFF_BASE_MS=700 RETRY_BACKOFF_MAX_MS=20000 RETRY_JITTER_MS=350 TARGET_BUSINESS_SHARE=0.3 npm run rewards:collect
```

Very large crawl (high-cardinality):

```bash
ENABLE_DISCOVERY=1 ENABLE_SITEMAP_DISCOVERY=1 MAX_DISCOVERED_SOURCES=12000 MAX_FETCH_SOURCES=5000 MAX_SITEMAP_CHILDREN=300 FETCH_CONCURRENCY=10 REQUEST_DELAY_MS=60 npm run rewards:collect
```

## Sync to Supabase

1. Create the table:

```bash
# run SQL from:
supabase/schema/rewards.sql
```

2. Set env vars:

```bash
export SUPABASE_URL="https://<project-ref>.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="<service-role-key>"
export SUPABASE_REWARDS_TABLE="credit_card_rewards"
```

3. Sync:

```bash
npm run rewards:sync
```

To sync every row from `cards.us.json` (including lower-confidence rows), disable sync filtering:

```bash
SYNC_ONLY_HIGH_QUALITY=0 npm run rewards:sync
```

Or run collect + sync:

```bash
npm run rewards:collect-and-sync
```

## Notes

- This is a heuristic extractor designed for a hackathon and low budget.
- Keep a manual review step for any records with `confidenceScore < 0.6`.
- Rotating categories are detected by language patterns and may need manual override.
- If you see noise from third-party pages, tighten include/exclude filters in `discovery.us.json`.
