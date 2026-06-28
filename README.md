# Arbitrage

Cross-exchange arbitrage opportunity scanner. Quotes the same asset across
multiple venues, then finds the best buy-low/sell-high pair **net of taker
fees** on both legs.

Built with Next.js 15 (App Router) and deployed on Vercel.

## How it works

- `lib/arbitrage.ts` — pure logic: given bid/ask + fees per venue, find the most
  profitable cross-venue spread for a symbol.
- `lib/feed.ts` — market feed. Currently a **synthetic** feed so the app runs
  with no API keys; swap it for real exchange APIs to go live.
- `app/api/opportunities` — JSON endpoint that scans all markets on each request.
- `app/` — live dashboard that polls the endpoint every few seconds.

## Develop

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build
```

## Going live

Replace the synthetic quotes in `lib/feed.ts` with real exchange data (e.g.
Binance/Coinbase/Kraken REST or websocket APIs). The scanning logic and UI need
no changes — they consume the `Quote[]` shape.
