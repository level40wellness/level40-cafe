import type { Metadata } from "next";
import Link from "next/link";

import { JourneyFlow } from "@/components/journey-flow";
import { ScrollReveal } from "@/components/scroll-reveal";
import { formatFils } from "@/lib/format";
import { HERO_IMG } from "@/lib/images";
import { getMealPlans } from "@/server/queries/catalog";

export const metadata: Metadata = {
  title: "Nutritionist-Guided Meal Plans",
  description:
    "Biomarker-informed meal plans from Level 40 — Diabetes, Weight Management, Cholesterol, PCOS, Thyroid and more, guided by nutritionists from assessment to measurable progress.",
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
        style={{ backgroundImage: `url('${HERO_IMG.mealPlan}')` }}
      >
        <div className="inner">
          <span className="eyebrow center">Meal Plans</span>
          <h1>
            Fuel your body, <em>elevate your life.</em>
          </h1>
          <p>
            Nutritionist-guided, biomarker-informed meal plans — made fresh at
            Level 40 for your individual wellness goals.
          </p>
        </div>
      </section>

      <section className="block">
        <div className="wrap">
          <div className="sec-head reveal">
            <span className="eyebrow center">How it works</span>
            <h2>Your journey with us</h2>
            <p>
              Every plan follows the same integrated path — from understanding
              your body to seeing the difference.
            </p>
          </div>

          <JourneyFlow />
        </div>
      </section>

      <section className="block" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="sec-head reveal">
            <span className="eyebrow center">Choose your programme</span>
            <h2>Plans for your goals</h2>
            <p>
              Seven nutritionist-designed programmes — every plan is flexible,
              no lock-in, no fuss.
            </p>
          </div>

          <div className="tiers">
            {plans.map((plan) => {
              const featured = plan.name === "Level 40 Integrated Meal Plan";
              return (
                <div
                  key={plan.id}
                  className={`tier reveal${featured ? " feat" : ""}`}
                >
                  {plan.imageUrl && (
                    <div
                      className="tier-img"
                      role="img"
                      aria-label={plan.name}
                      style={{ backgroundImage: `url('${plan.imageUrl}')` }}
                    />
                  )}
                  {featured && <span className="flag">Signature</span>}
                  <h3>{plan.name}</h3>
                  <div className="cad">
                    {plan.mealsPerWeek} meals ·{" "}
                    {plan.durationWeeks === 1
                      ? "per week"
                      : `per ${plan.durationWeeks} weeks`}
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
              );
            })}
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
