import type { Metadata } from "next";
import Link from "next/link";

import { ScrollReveal } from "@/components/scroll-reveal";
import { HERO_IMG } from "@/lib/images";

export const metadata: Metadata = {
  title: "About",
  description: "The story behind Level 40 — a modern Arabian café in Dubai.",
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
            A love letter <em>to the table.</em>
          </h1>
          <p>
            Level 40 was born in 2021 from a simple idea: bring the warmth of an
            Arabian family table into a modern, design-led café.
          </p>
        </div>
      </section>

      <section className="intro">
        <div
          className="imgcol"
          style={{ backgroundImage: `url('${HERO_IMG.interior}')` }}
        >
          <span className="tag">Founded in Downtown Dubai, 2021</span>
        </div>
        <div className="txtcol reveal">
          <span className="eyebrow">Built around hospitality</span>
          <h2>A conversation between the kitchen, the room and the guest.</h2>
          <p>
            Founded in Downtown Dubai, our café celebrates the produce, spices
            and rhythms of the region — reimagined through modern technique and
            an unwavering eye for craft.
          </p>
          <p>
            From the saffron we grind each morning to the marble we chose for our
            tables, every detail is considered. Whether you scan a QR code at
            your table or pick up a meal on your way home, you are part of the
            table we set every day.
          </p>
          <div className="sig">— Warmth, in every detail</div>
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
              <h3>Seasonal &amp; local</h3>
              <p>
                We cook with the region&apos;s finest produce, at the peak of its
                season.
              </p>
            </div>
            <div className="way reveal">
              <div className="num">02</div>
              <div className="ln" />
              <h3>Craft over shortcuts</h3>
              <p>
                Hand-ground spices, slow-cooked mains, and pastry made in-house
                daily.
              </p>
            </div>
            <div className="way reveal">
              <div className="num">03</div>
              <div className="ln" />
              <h3>Effortless hospitality</h3>
              <p>
                Ordering as quiet and easy as a conversation — scan, order,
                relax.
              </p>
            </div>
          </div>

          <div className="stats reveal">
            <div className="stat">
              <b>2021</b>
              <span>Founded in Downtown Dubai</span>
            </div>
            <div className="stat">
              <b>12+</b>
              <span>Awarded dishes on the menu</span>
            </div>
            <div className="stat">
              <b>98%</b>
              <span>Guests return within 60 days</span>
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
            <h2>The room was made for lingering.</h2>
            <p>
              Deep emerald banquettes, hand-poured brass lights, and a soundtrack
              tuned for unhurried conversation. Stay for a coffee. Stay for the
              evening.
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
