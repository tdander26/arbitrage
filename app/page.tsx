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

      <section className="howto risk">
        <h2>Edge &amp; risk — read this</h2>
        <ul>
          <li>
            <strong>The edge is being early, not being right about the
            product.</strong> Value comes from acting while the trend is
            <em> accelerating</em> and before the Street notices. A high but flat
            signal is usually already priced in.
          </li>
          <li>
            <strong>Confirm the trade, don&apos;t take the signal on faith.</strong>{" "}
            Cross-check search with TikTok volume and the company&apos;s beat
            history. A viral product on a company that rarely beats is a weak
            setup.
          </li>
          <li>
            <strong>Mind IV crush on options.</strong> If you express this with
            options, implied volatility is highest right before earnings and
            collapses after — you can be right on direction and still lose. Size
            for it or use the stock.
          </li>
          <li>
            <strong>Size small, spread your shots.</strong> Most individual setups
            fail; the strategy works across many small, uncorrelated bets — not
            one big conviction trade.
          </li>
          <li>
            <strong>Log outcomes.</strong> Move names through Watching →
            Positioned → Passed and review whether your signal actually predicted
            the beat. That feedback loop is the real edge over time.
          </li>
        </ul>
        <p className="disclaimer">
          For research and personal tracking only — not investment advice. Social
          and search trends are noisy leading indicators, not guarantees;
          markets price in information you can&apos;t see. Trade your own risk.
        </p>
      </section>

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
