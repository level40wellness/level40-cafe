import type { Metadata } from "next";

import { ScrollReveal } from "@/components/scroll-reveal";
import { HERO_IMG } from "@/lib/images";

export const metadata: Metadata = {
  title: "About",
  description:
    "About Level 40 — the UAE's first Integrated Wellness Café, bringing healthy dining, curated meal plans, holistic yoga and wellness retail under one destination in Dubai.",
  alternates: { canonical: "/about" },
};

/** The three pillars, verbatim from the brand's About document. */
const PILLARS = [
  {
    title: "Nourish",
    body: "Personalized nutrition guidance and freshly prepared wellness-focused meals.",
  },
  {
    title: "Move",
    body: "Holistic yoga, mobility, breathwork and mindful movement designed to complement an active lifestyle.",
  },
  {
    title: "Live Well",
    body: "Practical, sustainable lifestyle choices that help make wellness part of everyday life.",
  },
];

/**
 * Rendered as the brand's About document, in its original order and emphasis —
 * not remixed into marketing sections. Copy edits are limited to typo fixes.
 */
export default function AboutPage() {
  return (
    <>
      <ScrollReveal />

      <section
        className="page-hero"
        style={{ backgroundImage: `url('${HERO_IMG.table}')` }}
      >
        <div className="inner">
          <span className="eyebrow center">Our Story</span>
          <h1>
            About <em>Level 40.</em>
          </h1>
          <p>
            Founded with a vision to redefine everyday wellness — the UAE&apos;s
            first Integrated Wellness Café.
          </p>
        </div>
      </section>

      <section className="block">
        <div className="wrap">
          <article className="about-doc reveal">
            <p>
              Founded with a vision to redefine everyday wellness,{" "}
              <strong>
                Level 40 is the UAE&apos;s first Integrated Wellness Café
              </strong>
              , bringing healthy dining, curated meal plans, holistic yoga and
              wellness retail under one destination.
            </p>
            <p>
              At Level 40, we believe{" "}
              <strong>wellness should not be fragmented</strong>. Our bodies
              are interconnected parts of the same journey. That is why we have
              created an ecosystem where customers can enjoy nourishing food,
              access professional nutrition guidance, practise yoga and
              discover thoughtfully selected wellness products — all within one
              inspiring community.
            </p>

            <h2>More Than a Healthy Café</h2>
            <p>Level 40 goes beyond serving healthy food.</p>
            <p>
              Our café and wellness kitchen offers thoughtfully crafted{" "}
              <strong>
                breakfast, lunch, dinner, smoothies, functional beverages,
                specialty coffee, pre-workout and post-workout drinks
              </strong>{" "}
              with a focus on nutrition, quality ingredients and great taste.
            </p>
            <p>
              Alongside our everyday café experience, Level 40 offers
              structured, personalized wellness programs designed to support
              individuals managing lifestyle and metabolic health goals
              including:
            </p>
            <p className="doc-programs">
              Diabetes Management • Weight Management • PCOS • Cholesterol
              Control • Longevity Meal Plans
            </p>
            <p>
              Our approach begins with understanding the individual. Through a
              consultation with a qualified nutrition professional, relevant
              health information, lifestyle factors and blood-report biomarkers
              are used to develop a more personalized nutrition and meal plan.
            </p>
            <p>
              Rather than following a generic diet, the objective is simple:{" "}
              <strong>
                create a nutrition approach designed around the individual
              </strong>
              .
            </p>

            <h2>Nutrition. Movement. Lifestyle.</h2>
            <p>
              We believe food alone is only one part of sustainable wellness.
            </p>
            <p>Our programs bring together three fundamental pillars:</p>
            <dl className="doc-pillars">
              {PILLARS.map((pillar) => (
                <div key={pillar.title}>
                  <dt>{pillar.title}</dt>
                  <dd>{pillar.body}</dd>
                </div>
              ))}
            </dl>
            <p>
              This integrated philosophy allows Level 40 to connect
              professional guidance with real-world execution — from knowing
              what to eat to having those meals prepared, incorporating
              movement into your routine and becoming part of a
              wellness-focused community.
            </p>

            <h2>Wellness Meets Lifestyle</h2>
            <p>
              Level 40 is also home to <strong>NEAT by Nicky</strong>, bringing
              wellness beyond food through a curated collection of activewear,
              yoga apparel, yoga mats, accessories and lifestyle products.
            </p>
            <p>
              It creates a unique environment where customers can eat, move,
              discover and connect under one roof.
            </p>

            <h2>Our Philosophy</h2>
            <p>
              We don&apos;t believe wellness should mean extreme diets,
              temporary challenges or one-size-fits-all solutions.
            </p>
            <p>
              We believe in{" "}
              <strong>
                personalization, consistency and sustainable progress
              </strong>
              .
            </p>
            <p>
              Whether you visit us for your morning specialty coffee, a healthy
              lunch, a yoga session, a personalized nutrition program or simply
              to spend time in an uplifting environment, Level 40 is designed
              to make healthier choices easier to incorporate into everyday
              life.
            </p>

            <div className="doc-farewell">
              <p>Eat Well. Move Well. Live Well.</p>
              <p>Welcome to Level 40.</p>
              <p>Your wellness journey starts here.</p>
            </div>
          </article>
        </div>
      </section>
    </>
  );
}
