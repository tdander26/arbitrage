export default function Home() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        gap: "1rem",
        padding: "2rem",
      }}
    >
      <h1 style={{ fontSize: "3rem", margin: 0, letterSpacing: "-0.03em" }}>
        Arbitrage
      </h1>
      <p style={{ color: "var(--muted)", fontSize: "1.1rem", margin: 0 }}>
        Opportunity tracking dashboard — coming soon.
      </p>
      <span
        style={{
          marginTop: "0.5rem",
          color: "var(--accent)",
          fontSize: "0.9rem",
          fontFamily: "ui-monospace, monospace",
        }}
      >
        deployed on Vercel
      </span>
    </main>
  );
}
