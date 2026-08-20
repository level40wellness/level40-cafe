import type { Metadata } from "next";
import Link from "next/link";

import { ScrollReveal } from "@/components/scroll-reveal";
import { HERO_IMG } from "@/lib/images";

export const metadata: Metadata = {
  title: "About",
  description:
    "The story behind Level 40 — UAE's first wellness-integrated café, bringing healthy dining, meal plans, yoga and wellness retail together in Dubai.",
  alternates: { canonical: "/about" },
};

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
            More than <em>a café.</em>
          </h1>
          <p>
            Level 40 was born from a simple belief: wellness should come
            together, not be fragmented — one destination for how you eat,
            move and live.
          </p>
        </div>
      </section>

      <section className="intro">
        <div
          className="imgcol"
          style={{ backgroundImage: `url('${HERO_IMG.interior}')` }}
        >
          <span className="tag">Continents Tower, JVC, Dubai</span>
        </div>
        <div className="txtcol reveal">
          <span className="eyebrow">Built around balance</span>
          <h2>One destination for modern wellness.</h2>
          <p>
            Most of us don&apos;t struggle with wellness for lack of
            information — the pieces are simply scattered. Level 40 brings them
            under one roof: a high-protein vegetarian kitchen and specialty
            coffee bar, nutritionist-guided and biomarker-informed meal plans,
            holistic yoga, and NEAT by Nicky wellness retail.
          </p>
          <p>
            Every menu, programme and product is developed with
            evidence-informed nutrition principles and a practical approach to
            healthy living — progress over perfection, balance over extremes,
            and habits that survive real life. Come for your morning coffee,
            stay for a nourishing meal, join a workshop, or simply enjoy the
            space.
          </p>
          <div className="sig">— Eat Well. Move Well. Live Well.</div>
        </div>
      </section>

      <section className="block">
        <div className="wrap">
          <div className="sec-head reveal">
            <span className="eyebrow center">What we stand for</span>
            <h2>The Level 40 promise</h2>
          </div>
          <div className="ways">
            <div className="way reveal">
              <div className="num">01</div>
              <div className="ln" />
              <h3>Science-backed nutrition</h3>
              <p>
                Evidence-informed, biomarker-guided plans and menus — with
                real-world practicality, not fads.
              </p>
            </div>
            <div className="way reveal">
              <div className="num">02</div>
              <div className="ln" />
              <h3>Made fresh, made honest</h3>
              <p>
                High-protein vegetarian food and specialty coffee, crafted
                daily from premium ingredients.
              </p>
            </div>
            <div className="way reveal">
              <div className="num">03</div>
              <div className="ln" />
              <h3>Balance over extremes</h3>
              <p>
                Designed around balance, not restriction — sustainable habits
                for everyday life.
              </p>
            </div>
          </div>

          <div className="stats reveal">
            <div className="stat">
              <b>100%</b>
              <span>Vegetarian, high-protein focused</span>
            </div>
            <div className="stat">
              <b>One</b>
              <span>Integrated wellness destination</span>
            </div>
            <div className="stat">
              <b>Countless</b>
              <span>Everyday transformations</span>
            </div>
          </div>
        </div>
      </section>

      <section
        className="interior"
        style={{ backgroundImage: `url('${HERO_IMG.interior}')` }}
      >
        <div className="wrap">
          <div className="card reveal">
            <span className="eyebrow">Come and see</span>
            <h2>A space made for wellness — and for lingering.</h2>
            <p>
              Beautiful spaces you&apos;ll actually want to spend time in.
              Stop by for your morning coffee, stay for a nourishing meal,
              join a yoga session or a workshop — and leave a little better
              than you arrived.
            </p>
            <Link href="/contact" className="btn btn-gold">
              Reserve a table
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
