import OpportunityTable from "./OpportunityTable";

export default function Home() {
  return (
    <main className="shell">
      <header className="hero">
        <h1>Arbitrage</h1>
        <p>
          Cross-exchange opportunity scanner. Buy low on one venue, sell high on
          another — spreads shown net of taker fees on both legs.
        </p>
      </header>

      <OpportunityTable />

      <footer className="foot">
        <span>
          Data is a synthetic feed for demonstration. Swap{" "}
          <code>lib/feed.ts</code> for live exchange APIs to go real.
        </span>
        <span className="brand">deployed on Vercel</span>
      </footer>
    </main>
  );
}
