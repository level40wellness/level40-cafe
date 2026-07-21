import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "The terms on which Level 40 Café provides this website and its services.",
  alternates: { canonical: "/terms" },
};

/**
 * PLACEHOLDER — see the note in privacy/page.tsx. Needs legal review, and the
 * refund and cancellation terms in particular must match what the business
 * actually intends to honour.
 */
export default function TermsPage() {
  return (
    <section className="block">
      <div className="wrap" style={{ maxWidth: "48rem" }}>
        <span className="eyebrow">Legal</span>
        <h1>Terms of Service</h1>
        <p>
          <em>Last updated: 21 July 2026. These terms are a draft pending legal review.</em>
        </p>

        <h2>Agreement</h2>
        <p>
          By using this website or placing an order, you agree to these terms.
          The site is operated by Level 40 Café, Jumeirah Village Circle, Dubai,
          United Arab Emirates.
        </p>

        <h2>Accounts</h2>
        <p>
          You are responsible for keeping your password secure and for activity
          under your account. Tell us immediately if you believe someone else has
          access to it.
        </p>

        <h2>Orders and prices</h2>
        <p>
          All prices are shown in UAE Dirhams and include VAT at the prevailing
          rate. The total calculated by us at checkout is the amount payable. We
          may decline or cancel an order — for example if an item is unavailable
          or a price was displayed in error — and will refund any amount already
          taken.
        </p>

        <h2>Meal plan subscriptions</h2>
        <p>
          Meal plans renew for the period stated at purchase until you cancel.
          You may cancel at any time; cancellation takes effect at the end of the
          period already paid for.
        </p>

        <h2>Cancellations and refunds</h2>
        <p>
          <b>[To be completed by the client.]</b> Set out the window in which a
          customer may cancel an order, and how refunds are issued.
        </p>

        <h2>Acceptable use</h2>
        <p>
          Do not attempt to disrupt the site, access accounts that are not yours,
          or use it for anything unlawful.
        </p>

        <h2>Liability</h2>
        <p>
          Nothing in these terms limits liability where UAE law does not allow it
          to be limited. Otherwise our liability for any order is limited to the
          amount you paid for it.
        </p>

        <h2>Governing law</h2>
        <p>
          These terms are governed by the laws of the United Arab Emirates and
          the Emirate of Dubai.
        </p>

        <h2>Contact</h2>
        <p>
          <a href="mailto:hello@level40wellness.com">hello@level40wellness.com</a>
        </p>
      </div>
    </section>
  );
}
