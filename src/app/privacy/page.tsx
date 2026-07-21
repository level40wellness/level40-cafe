import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How Level 40 Café collects, uses and protects your personal information.",
  alternates: { canonical: "/privacy" },
};

/**
 * PLACEHOLDER — describes what the application actually does today, so the
 * Google OAuth consent screen has a real URL to point at. It is not legal
 * advice and has not been reviewed. The client must have this checked against
 * UAE data protection law (Federal Decree-Law No. 45 of 2021) before launch,
 * and must fill in the bracketed values.
 */
export default function PrivacyPage() {
  return (
    <section className="block">
      <div className="wrap" style={{ maxWidth: "48rem" }}>
        <span className="eyebrow">Legal</span>
        <h1>Privacy Policy</h1>
        <p>
          <em>Last updated: 21 July 2026. This policy is a draft pending legal review.</em>
        </p>

        <h2>Who we are</h2>
        <p>
          Level 40 Café, Continents Tower, District 13, Al Barsha South Fourth,
          Jumeirah Village Circle, Dubai, United Arab Emirates. For any privacy
          question, contact <a href="mailto:hello@level40wellness.com">hello@level40wellness.com</a>.
        </p>

        <h2>What we collect</h2>
        <ul>
          <li>
            <b>Account details</b> — your name, email address and, if you provide
            one, a phone number. If you sign in with Google we receive your name,
            email address and profile picture from Google.
          </li>
          <li>
            <b>Order details</b> — the items you order, your table or pickup
            preference, and the totals charged.
          </li>
          <li>
            <b>Technical data</b> — the IP address and browser user agent
            attached to your sign-in session, used to keep your account secure.
          </li>
        </ul>
        <p>
          We do not receive or store your card details. Payments are handled by
          our payment provider, and card data passes from your browser directly
          to them.
        </p>

        <h2>Why we use it</h2>
        <p>
          To create and secure your account, to take and fulfil your orders, to
          issue tax invoices as UAE law requires, and to reply when you contact
          us. We do not sell your personal information.
        </p>

        <h2>How long we keep it</h2>
        <p>
          Account information is kept while your account is open. Order and
          invoice records are kept for as long as UAE tax law requires us to
          retain them.
        </p>

        <h2>Your rights</h2>
        <p>
          You may ask us for a copy of your data, ask us to correct it, or ask us
          to delete your account. Email{" "}
          <a href="mailto:hello@level40wellness.com">hello@level40wellness.com</a>{" "}
          and we will respond within 30 days.
        </p>

        <h2>Cookies</h2>
        <p>
          We use a single cookie to keep you signed in. It is required for the
          site to work and is not used for advertising or tracking.
        </p>
      </div>
    </section>
  );
}
