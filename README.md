# Social Arbitrage Dashboard

A hub for **social-arbitrage trading research**: surface where social chatter and
Google search interest are accelerating *ahead of* earnings, so you can spot
attention before it shows up in the fundamentals.

The thesis it's built around: social talk (TikTok/X/Reddit) rises first →
Google search interest follows → stronger earnings next quarter → tradeable edge.

> ⚠️ Decision-support heuristic, **not financial advice**. Signals are
> indicative, not predictive.

## What's in it

- **Dashboard** (`/`) — watchlist ranked by a composite **arbitrage score**; add/remove tickers.
- **Per-ticker signal panel** (`/ticker/[symbol]`) — the hero view: social mentions,
  Google Trends, and price overlaid on one 0–100 axis with earnings dates marked,
  plus a transparent score breakdown.
- **Movers** (`/movers`) — where attention is accelerating right now.
- **Earnings** (`/earnings`) — upcoming reports cross-referenced with current score;
  recent reports let you check whether a high pre-earnings signal preceded a beat.

## Quick start

```bash
npm install
npm run dev          # http://localhost:3000
```

Runs immediately on realistic **seed data** — no API keys required.

## Architecture

Every signal layer sits behind a provider interface (`lib/providers/types.ts`)
chosen by env var in `lib/providers/registry.ts`, so data sources are pluggable:

| Layer | `mock` | `cache` (default) | Future live add-on |
|-------|--------|-------------------|--------------------|
| Market / earnings | generated | real, seeded from **Robinhood** | Finnhub/yfinance |
| Google Trends | generated | seeded | google-trends MCP (RapidAPI) |
| Social | generated | seeded | Reddit API (free) / StockTwits |

**Why seeding, not runtime fetch:** the Robinhood (and social/trends) MCP
servers are available to the Claude Code *agent*, not to a deployed app. So
real data is pulled by the agent and cached to `data/cache`, which the app reads.
The `cache` provider falls back to mock for any symbol not yet seeded, so the
dashboard is never empty.

### Seeding real market data from Robinhood

1. In a Claude Code session, ask Claude to fetch — for each watchlist symbol —
   `get_equity_historicals` (interval `day`, ~90d) and `get_earnings_results`,
   saving each raw response to `data/raw/<SYMBOL>.historicals.json` and
   `data/raw/<SYMBOL>.earnings.json`.
2. Run `npm run seed` to normalize those dumps into `data/cache`.

## Scoring

`lib/score/arbitrageScore.ts` — composite of weighted components (weights in
`config/weights.ts`, easy to tune):

```
score = w·social-momentum + w·search-momentum + w·(social↔search correlation) + w·earnings-proximity  → 0–100
```

Momentum is each series' recent window vs. its own baseline, in std-dev units.

## Project layout

```
app/            pages + API routes
components/      UI (SignalChart is the overlay; ScoreBadge/Breakdown; feeds)
lib/providers/   provider interfaces, registry, mock + cache implementations
lib/score/       arbitrage score heuristic
lib/signals.ts   aggregates providers → merged chart + score per ticker
config/weights.ts  tunable score weights
scripts/         seed-from-robinhood.ts (normalizes raw MCP dumps → cache)
data/            watchlist.json, seed/ (demo), cache/ (real), raw/ (MCP dumps)
```

## Deploy

`npm run build` then deploy to Vercel. Set provider env vars in the Vercel
project (default `cache` works with whatever is committed to `data/cache`).
