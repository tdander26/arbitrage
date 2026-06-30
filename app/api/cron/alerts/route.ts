import { NextRequest, NextResponse } from "next/server";
import { SEED } from "@/lib/seed";
import { getNextEarnings } from "@/lib/earnings";
import { daysBetween } from "@/lib/enrich";
import { sendEmail } from "@/lib/email";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Daily earnings-reminder email for the tracked universe. Uses only Finnhub
// (cached) — no SerpApi cost — so it's free to run daily. Alerts on names
// reporting within the next 3 days. Wire RESEND_API_KEY + ALERT_EMAIL; schedule
// via vercel.json crons.
//
// Note: server-side, so it covers the seeded universe (your localStorage custom
// names aren't visible without a DB).
const WINDOW_DAYS = 3;

export async function GET(req: NextRequest) {
  // Only allow Vercel Cron (sets x-vercel-cron) or a matching CRON_SECRET.
  const secret = process.env.CRON_SECRET;
  const authed =
    req.headers.get("x-vercel-cron") !== null ||
    (secret && req.headers.get("authorization") === `Bearer ${secret}`);
  if (!authed) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const to = process.env.ALERT_EMAIL;
  if (!to) {
    return NextResponse.json({ skipped: "ALERT_EMAIL not set" });
  }

  const now = new Date();
  const soon: { ticker: string; company: string; date: string; days: number }[] =
    [];
  for (const o of SEED) {
    const live = await getNextEarnings(o.ticker, now);
    const date = live?.date ?? o.earningsDate;
    const days = daysBetween(now, date);
    if (days >= 0 && days <= WINDOW_DAYS) {
      soon.push({ ticker: o.ticker, company: o.company, date, days });
    }
  }

  if (soon.length === 0) {
    return NextResponse.json({ sent: false, reason: "nothing within window" });
  }

  soon.sort((a, b) => a.days - b.days);
  const rows = soon
    .map(
      (s) =>
        `<li><strong>${s.ticker}</strong> (${s.company}) — ${
          s.days === 0 ? "today" : `in ${s.days} day${s.days > 1 ? "s" : ""}`
        }, ${s.date}</li>`,
    )
    .join("");
  const html = `<h2>Earnings coming up</h2><ul>${rows}</ul>
    <p>Review the signal before each print: <a href="https://arbitrage-lyart.vercel.app">open the tracker</a>.</p>`;

  const ok = await sendEmail(
    to,
    `Earnings in the next ${WINDOW_DAYS} days: ${soon.map((s) => s.ticker).join(", ")}`,
    html,
  );
  return NextResponse.json({ sent: ok, count: soon.length });
}
