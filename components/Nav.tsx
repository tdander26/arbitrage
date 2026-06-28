"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Dashboard" },
  { href: "/movers", label: "Movers" },
  { href: "/earnings", label: "Earnings" },
];

export default function Nav() {
  const path = usePathname();
  return (
    <header className="border-b border-border bg-panel/60 backdrop-blur sticky top-0 z-10">
      <div className="max-w-6xl mx-auto px-5 h-14 flex items-center gap-6">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <span className="text-accent">◈</span>
          <span>Social Arbitrage</span>
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          {links.map((l) => {
            const active = l.href === "/" ? path === "/" : path.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`px-3 py-1.5 rounded-lg transition-colors ${
                  active ? "bg-panelHover text-text" : "text-muted hover:text-text"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
