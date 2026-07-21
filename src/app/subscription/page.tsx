import type { Metadata } from "next";
import Link from "next/link";

import { ScrollReveal } from "@/components/scroll-reveal";
import { formatFils } from "@/lib/format";
import { HERO_IMG } from "@/lib/images";
import { getMealPlans } from "@/server/queries/catalog";

export const metadata: Metadata = {
  title: "Meal Plans & Subscriptions",
  description:
    "Book a weekly or monthly chef-curated meal plan from Level 40, delivered across Dubai.",
  alternates: { canonical: "/subscription" },
};

/** See the note in menu/page.tsx. */
export const revalidate = 300;

export default async function SubscriptionPage() {
  const plans = await getMealPlans();

  return (
    <>
      <ScrollReveal threshold={0.08} />

      <section
        className="page-hero"
        style={{ backgroundImage: `url('${HERO_IMG.dish1}')` }}
      >
        <div className="inner">
          <span className="eyebrow center">Meal Plans</span>
          <h1>
            Eat well, <em>every day.</em>
          </h1>
          <p>
            Chef-curated menus delivered across Dubai. Pause, swap or skip any
            week.
          </p>
        </div>
      </section>

      <section className="block">
        <div className="wrap">
          <div className="sec-head reveal">
            <span className="eyebrow center">Choose your rhythm</span>
            <h2>Weekly &amp; monthly plans</h2>
            <p>Every plan is flexible — no lock-in, no fuss.</p>
          </div>

          <div className="tiers">
            {plans.map((plan) => (
              <div key={plan.id} className="tier reveal">
                <h3>{plan.name}</h3>
                <div className="cad">
                  {plan.mealsPerWeek} meals ·{" "}
                  {plan.durationWeeks === 1 ? "per week" : `per ${plan.durationWeeks} weeks`}
                </div>
                <div className="cost">{formatFils(plan.priceFils)}</div>
                {plan.description && <p>{plan.description}</p>}
                <ul>
                  {plan.features.map((feature) => (
                    <li key={feature}>{feature}</li>
                  ))}
                </ul>
                {/*
                  Subscribing needs the payment flow, which arrives in Phase 5.
                  Linking to contact is honest; a dead Subscribe button is not.
                */}
                <Link href="/contact" className="btn btn-gold">
                  Enquire about this plan
                </Link>
              </div>
            ))}
          </div>

          <p
            className="reveal"
            style={{
              textAlign: "center",
              marginTop: "2.5rem",
              color: "var(--cocoa)",
              fontSize: ".85rem",
            }}
          >
            Online subscription checkout is coming soon. In the meantime, get in
            touch and we will set your plan up for you.
          </p>
        </div>
      </section>
    </>
  );
}
