// Minimal email sender via Resend (free tier, no card). Key-gated; returns
// false when unconfigured. Get a key at https://resend.com and set
// RESEND_API_KEY. From-address defaults to Resend's shared onboarding sender,
// which can email the account owner without domain verification.

export async function sendEmail(
  to: string,
  subject: string,
  html: string,
): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key || !to) return false;
  const from = process.env.ALERT_FROM || "Social Arbitrage <onboarding@resend.dev>";
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to, subject, html }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
