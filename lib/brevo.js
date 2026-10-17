/**
 * Minimal Brevo transactional email. The admin panel has no email setup of its own;
 * this uses the same BREVO_API_KEY / BREVO_FROM_EMAIL as the web app.
 * Returns false (and logs) instead of throwing, so an email never blocks an admin action.
 */
export async function sendEmail({ to, subject, html, text }) {
  const apiKey = process.env.BREVO_API_KEY;
  const email = process.env.BREVO_FROM_EMAIL || process.env.EMAIL_FROM;
  if (!apiKey || !email) {
    console.warn("[brevo] BREVO_API_KEY or BREVO_FROM_EMAIL not set; email not sent:", subject);
    return false;
  }
  try {
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { "api-key": apiKey, "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({
        sender: { email, name: process.env.BREVO_FROM_NAME || "Dastiyor" },
        to: [{ email: to }],
        subject,
        htmlContent: html,
        textContent: text,
      }),
    });
    if (!res.ok) console.error("[brevo] send failed:", res.status, await res.text());
    return res.ok;
  } catch (e) {
    console.error("[brevo] send failed:", e);
    return false;
  }
}

export function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
