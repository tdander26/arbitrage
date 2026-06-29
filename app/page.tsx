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

      <details className="howto collapsible">
        <summary>How to use this ▾</summary>
        <ol>
          <li>
            <strong>Scan the list.</strong> Each card is a public company tied to
            a consumer product. Sort by <em>Signal</em> to surface the best setups
            (accelerating search + reliable beats).
          </li>
          <li>
            <strong>Read the run-up.</strong> The sparkline is ~12 months of real
            search interest. You want it bending <em>up</em> into the earnings
            date — demand the Street may not have priced.
          </li>
          <li>
            <strong>Mind the countdown.</strong> Days to the next earnings is your
            deadline to form a view; inside ~30 days it turns amber.
          </li>
          <li>
            <strong>Log your call.</strong> Tap the status to move a name{" "}
            <em>Watching</em> → <em>Positioned</em> → <em>Passed</em>. Marking it
            Positioned snapshots the Signal so you can track how the call ages.
          </li>
        </ol>
      </details>

      <Dashboard />

      <details className="howto risk collapsible">
        <summary>⚠ Edge &amp; risk — read this ▾</summary>
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
      </details>

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
