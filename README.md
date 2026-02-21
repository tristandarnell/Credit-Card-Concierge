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
