import Dashboard from "./Dashboard";

export default function Home() {
  return (
    <main className="shell">
      <header className="hero">
        <h1>Social Arbitrage</h1>
        <p>
          Spot consumer trends going vertical on social — TikTok virality, rising
          Google searches — <em>before</em> they show up in a company&apos;s
          revenue. Track the signal in the months before earnings and decide
          whether to position before the print.
        </p>
      </header>

      <section className="howto">
        <h2>How to use this</h2>
        <ol>
          <li>
            <strong>Scan the list.</strong> Each card is a public company tied to
            a consumer product you&apos;re watching. Sort by{" "}
            <em>trend momentum</em> to surface products accelerating right now.
          </li>
          <li>
            <strong>Read the run-up.</strong> The sparkline is ~12 months of
            search/social interest. You want the line bending <em>up</em> into
            the earnings date — that&apos;s demand the Street may not have priced.
          </li>
          <li>
            <strong>Mind the countdown.</strong> The right column shows days to
            the next earnings — your deadline to form a view. Inside ~30 days it
            turns amber.
          </li>
          <li>
            <strong>Log your call.</strong> Set conviction and move a name from{" "}
            <em>Watching</em> → <em>Positioned</em> → <em>Passed</em> as you act.
            Filter chips hide statuses you&apos;re done with.
          </li>
        </ol>
      </section>

      <Dashboard />

      <footer className="foot">
        <span>
          Seeded with classic social-arbitrage names. Connect live data via{" "}
          <code>lib/trends.ts</code> (Google Trends), an earnings API, and Apify
          for social volume.
        </span>
        <span className="brand">deployed on Vercel</span>
      </footer>
    </main>
  );
}
