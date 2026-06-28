import type { Metadata } from "next";
import "./globals.css";
import QueryProvider from "@/components/QueryProvider";
import Nav from "@/components/Nav";

export const metadata: Metadata = {
  title: "Social Arbitrage Dashboard",
  description: "Social chatter → search trends → earnings signals for trading decisions.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <QueryProvider>
          <Nav />
          <main className="max-w-6xl mx-auto px-5 py-6">{children}</main>
          <footer className="max-w-6xl mx-auto px-5 py-8 text-xs text-muted">
            Heuristic decision-support tool — not financial advice. Signals are
            indicative, not predictive.
          </footer>
        </QueryProvider>
      </body>
    </html>
  );
}
