# Social Arbitrage Tracker

Spot consumer trends going vertical on social — TikTok virality, rising Google
searches for products like *coconut water* — **before** they show up in a public
company's revenue, then review the signal in the months leading up to that
company's earnings date and decide whether to position before the print.

Built with Next.js 15 (App Router) and deployed on Vercel.

## How to use

1. **Scan the list** — each card is a public company tied to a consumer product
   you're watching. Sort by *trend momentum* to surface what's accelerating now.
2. **Read the run-up** — the sparkline is ~12 months of interest. You want it
   bending up into the earnings date.
3. **Mind the countdown** — days-to-earnings is your deadline to form a view; it
   turns amber inside ~30 days.
4. **Log your call** — set conviction and move names Watching → Positioned →
   Passed.

## Data sources

| Signal | Status | How to enable live data |
| --- | --- | --- |
| **Google Trends** (search interest) | Live, keyless | Already wired in `lib/trends.ts`. Hit `/api/trends?keyword=coconut+water`. Best-effort — falls back to seeded data if rate-limited from serverless. |
| **Earnings dates** | Seeded | Set `FINNHUB_API_KEY` (free) to auto-populate from the earnings calendar. |
| **Social volume** (TikTok etc.) | Manual | Set `APIFY_TOKEN` and use Apify's [TikTok Trends Scraper](https://apify.com/clockworks/tiktok-trends-scraper) REST API. |

See `.env.example` for the variables. Add them in Vercel under
**Settings → Environment Variables**.

### MCP for research sessions

For exploring trends interactively with an AI assistant (not the deployed app),
[Trends MCP](https://github.com/trendsmcp/trends-mcp) covers Google Trends +
TikTok + YouTube + Reddit normalized 0–100, and [Apify's MCP](https://github.com/apify/apify-mcp-server)
exposes the TikTok scrapers. MCP powers the assistant; the deployed app uses the
REST APIs above.

## Structure

- `lib/types.ts` — domain model (opportunities, trend series).
- `lib/seed.ts` — seeded social-arbitrage names with sample 12-month trends.
- `lib/trends.ts` — live Google Trends fetch with graceful fallback.
- `lib/enrich.ts` — momentum + days-to-earnings derivations.
- `app/api/opportunities` — the tracked list, enriched and sorted.
- `app/api/trends` — per-keyword trend series.
- `app/` — the dashboard UI.

## Develop

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build
```
