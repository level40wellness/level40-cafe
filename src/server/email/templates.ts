import "server-only";

import { env } from "@/env";

/**
 * Hand-written HTML rather than a rendering framework: three templates do not
 * justify the dependency, and email clients need table layout and inline
 * styles regardless, which is most of what such a framework buys you.
 *
 * Brand hexes are copied from src/styles/level40.css. They cannot reference the
 * CSS custom properties there — no mail client resolves var().
 */
const BRAND = {
  cream: "#F7F2E8",
  espresso: "#2C1E14",
  gold: "#D4A843",
  goldSoft: "#E4C97E",
  ink: "#3A2E24",
  cocoa: "#7A5A43",
} as const;

/**
 * Names arrive from a signup form, so they are attacker-controlled. Unescaped,
 * a name is an injection point into an email we send under our own domain —
 * which is the most credible place a phishing link could possibly sit.
 */
function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

type LayoutInput = {
  /** Shown in the inbox preview line, before the reader opens anything. */
  preheader: string;
  heading: string;
  body: string;
};

function layout({ preheader, heading, body }: LayoutInput) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<title>${escapeHtml(heading)}</title>
</head>
<body style="margin:0;padding:0;background:${BRAND.cream};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${BRAND.cream};padding:32px 16px;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background:#ffffff;border:1px solid #E8DFCB;">

<tr><td style="background:${BRAND.espresso};padding:28px 32px;text-align:center;">
<div style="font-family:Georgia,'Times New Roman',serif;font-size:26px;color:${BRAND.cream};letter-spacing:.02em;">level 40</div>
<div style="font-family:Helvetica,Arial,sans-serif;font-size:9px;letter-spacing:.34em;text-transform:uppercase;color:${BRAND.gold};margin-top:6px;">Caf&eacute; &middot; Dubai</div>
</td></tr>

<tr><td style="padding:36px 32px 32px;font-family:Helvetica,Arial,sans-serif;color:${BRAND.ink};font-size:15px;line-height:1.7;">
<h1 style="margin:0 0 20px;font-family:Georgia,'Times New Roman',serif;font-size:24px;font-weight:normal;color:${BRAND.espresso};">${escapeHtml(heading)}</h1>
${body}
</td></tr>

<tr><td style="background:${BRAND.cream};padding:22px 32px;font-family:Helvetica,Arial,sans-serif;font-size:11px;line-height:1.7;color:${BRAND.cocoa};text-align:center;border-top:1px solid #E8DFCB;">
Level 40 Caf&eacute; &middot; Continents Tower, Jumeirah Village Circle, Dubai<br>
<a href="${env.BETTER_AUTH_URL}" style="color:${BRAND.cocoa};">${env.BETTER_AUTH_URL.replace(/^https?:\/\//, "")}</a>
</td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}

function button(href: string, label: string) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:26px 0;"><tr><td style="background:${BRAND.espresso};">
<a href="${href}" style="display:inline-block;padding:13px 30px;font-family:Helvetica,Arial,sans-serif;font-size:12px;letter-spacing:.16em;text-transform:uppercase;color:${BRAND.goldSoft};text-decoration:none;">${escapeHtml(label)}</a>
</td></tr></table>`;
}

export type RenderedEmail = { subject: string; html: string; text: string };

export function renderWelcomeEmail({ name }: { name: string }): RenderedEmail {
  // Better Auth fills name from the Google profile, but the email/password form
  // only asks for it on signup — so an empty string is a real possibility.
  const firstName = name.trim().split(/\s+/)[0] ?? "";
  const greeting = firstName ? `Hello ${escapeHtml(firstName)},` : "Hello,";
  const menuUrl = `${env.BETTER_AUTH_URL}/menu`;

  return {
    subject: "Welcome to Level 40 Café",
    html: layout({
      preheader: "Your Level 40 account is ready.",
      heading: "Welcome to Level 40",
      body: `
<p style="margin:0 0 16px;">${greeting}</p>
<p style="margin:0 0 16px;">Your account is ready. You can now order for dine-in or pickup, follow an order from the kitchen to your table, and keep every receipt in one place.</p>
${button(menuUrl, "Browse the menu")}
<p style="margin:0;color:${BRAND.cocoa};font-size:13px;">We are on the ground floor of Continents Tower in JVC. Come and say hello.</p>`,
    }),
    text: `${firstName ? `Hello ${firstName},` : "Hello,"}

Your Level 40 Café account is ready. You can now order for dine-in or pickup,
follow an order from the kitchen to your table, and keep every receipt in one
place.

Browse the menu: ${menuUrl}

We are on the ground floor of Continents Tower in JVC. Come and say hello.

Level 40 Café, Continents Tower, Jumeirah Village Circle, Dubai`,
  };
}

const OTP_COPY = {
  "forget-password": {
    subject: "Your Level 40 password reset code",
    heading: "Reset your password",
    lead: "Use this code to set a new password on your Level 40 account.",
    unrequested:
      "If you did not ask to reset your password, you can ignore this email — your password will not change.",
  },
  "email-verification": {
    subject: "Verify your Level 40 email address",
    heading: "Verify your email",
    lead: "Use this code to confirm your email address.",
    unrequested:
      "If you did not create a Level 40 account, you can ignore this email.",
  },
  "sign-in": {
    subject: "Your Level 40 sign-in code",
    heading: "Your sign-in code",
    lead: "Use this code to sign in to your Level 40 account.",
    unrequested:
      "If you did not try to sign in, you can ignore this email — but consider changing your password.",
  },
  // Better Auth emits this type whenever `user.changeEmail` is enabled, which
  // it is not today. Covered anyway because the plugin's type union includes
  // it, so leaving it out would mean an unhandled purpose the moment that
  // feature is switched on — and the failure would be a customer locked out of
  // an address change, discovered in production.
  "change-email": {
    subject: "Confirm your new Level 40 email address",
    heading: "Confirm your new email",
    lead: "Use this code to confirm the new email address on your Level 40 account.",
    unrequested:
      "If you did not ask to change your email address, ignore this email and change your password — someone may have access to your account.",
  },
} as const;

export type OtpPurpose = keyof typeof OTP_COPY;

export function renderOtpEmail({
  purpose,
  otp,
  expiresInMinutes,
}: {
  purpose: OtpPurpose;
  otp: string;
  expiresInMinutes: number;
}): RenderedEmail {
  const copy = OTP_COPY[purpose];

  // Deliberately no link. A password-reset email that contains a clickable URL
  // trains customers to click links in password-reset emails, which is the
  // exact reflex phishing depends on. The code is typed into a page the user
  // already has open.
  return {
    subject: copy.subject,
    html: layout({
      preheader: `${copy.subject} — expires in ${expiresInMinutes} minutes.`,
      heading: copy.heading,
      body: `
<p style="margin:0 0 20px;">${copy.lead}</p>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 20px;"><tr>
<td style="background:${BRAND.cream};border:1px solid ${BRAND.gold};padding:18px 32px;text-align:center;">
<span style="font-family:'Courier New',Courier,monospace;font-size:30px;font-weight:bold;letter-spacing:.26em;color:${BRAND.espresso};">${escapeHtml(otp)}</span>
</td></tr></table>
<p style="margin:0 0 16px;">This code expires in <strong>${expiresInMinutes} minutes</strong>. Never share it with anyone — Level 40 staff will never ask you for it.</p>
<p style="margin:0;color:${BRAND.cocoa};font-size:13px;">${copy.unrequested}</p>`,
    }),
    text: `${copy.lead}

    ${otp}

This code expires in ${expiresInMinutes} minutes. Never share it with anyone —
Level 40 staff will never ask you for it.

${copy.unrequested}

Level 40 Café, Continents Tower, Jumeirah Village Circle, Dubai`,
  };
}
