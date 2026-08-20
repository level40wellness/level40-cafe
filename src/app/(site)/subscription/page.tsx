import type { Metadata } from "next";
import Link from "next/link";
import {
  Dumbbell,
  FlaskConical,
  Flower2,
  Salad,
  Stethoscope,
  TrendingUp,
} from "lucide-react";

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

/** The journey from the founders' whiteboard: assess → guide → nourish → move → measure. */
const JOURNEY = [
  {
    title: "Assess",
    detail: "Blood tests build your complete health profile",
    icon: FlaskConical,
  },
  {
    title: "Nutritionist Consultation",
    detail: "Your goals and biomarkers, reviewed one-on-one",
    icon: Stethoscope,
  },
  {
    title: "Personalised Meal Plan",
    detail: "Biomarker-informed fresh meals, made daily at Level 40",
    icon: Salad,
  },
  {
    title: "Yoga Consultation",
    detail: "Movement guidance matched to your body",
    icon: Flower2,
  },
  {
    title: "Guided Fitness Plan",
    detail: "A routine you can actually keep",
    icon: Dumbbell,
  },
  {
    title: "Progress",
    detail: "Measurable improvements, tracked with you",
    icon: TrendingUp,
  },
];

/** One brand tone per step, standing in for the reference's rainbow. */
const STEP_COLORS = [
  "var(--gold)",
  "var(--olive)",
  "var(--cocoa)",
  "var(--gold-soft)",
  "var(--olive-deep)",
  "var(--espresso)",
];

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

          {/* Snaking process flow: each card is wrapped by its colour's path,
              diamond number badges alternate above/below, arrows hook into
              the next step — after the reference infographic, in brand tones. */}
          <div className="fp-flow reveal">
            {JOURNEY.map((step, index) => {
              const numberOnTop = index % 2 === 0;
              const Icon = step.icon;
              const number = String(index + 1).padStart(2, "0");
              return (
                <div
                  key={step.title}
                  className={`fp-step ${numberOnTop ? "is-top" : "is-bottom"}`}
                  style={
                    { "--fpc": STEP_COLORS[index] } as React.CSSProperties
                  }
                >
                  <div className="fp-zone">
                    {numberOnTop ? (
                      <span className="fp-num">
                        <i>{number}</i>
                      </span>
                    ) : (
                      <p className="fp-text">{step.detail}</p>
                    )}
                  </div>
                  <div className="fp-card">
                    <Icon size={20} aria-hidden="true" />
                    <h4>{step.title}</h4>
                  </div>
                  <div className="fp-zone">
                    {numberOnTop ? (
                      <p className="fp-text">{step.detail}</p>
                    ) : (
                      <span className="fp-num">
                        <i>{number}</i>
                      </span>
                    )}
                  </div>
                  <span className="fp-wrap" aria-hidden="true" />
                </div>
              );
            })}
          </div>
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
