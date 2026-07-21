import type { Metadata } from "next";

import { ContactForm } from "@/components/contact-form";
import { ScrollReveal } from "@/components/scroll-reveal";
import { HERO_IMG } from "@/lib/images";

export const metadata: Metadata = {
  title: "Contact",
  description: "Reservations, events and enquiries at Level 40 Café Dubai.",
  alternates: { canonical: "/contact" },
};

const MAP_QUERY =
  "Continents+Tower+District+13+Al+Barsha+South+Fourth+Jumeirah+Village+Circle+Dubai";

export default function ContactPage() {
  return (
    <>
      <ScrollReveal threshold={0.08} />

      <section
        className="page-hero"
        style={{ backgroundImage: `url('${HERO_IMG.dish1}')` }}
      >
        <div className="inner">
          <span className="eyebrow center">Contact</span>
          <h1>
            Come say <em>hello.</em>
          </h1>
          <p>
            Reservations, private events, press, partnerships — we&apos;d love to
            hear from you.
          </p>
        </div>
      </section>

      <section className="block">
        <div className="wrap">
          <div className="contact-grid">
            <div className="c-card reveal">
              <div className="ic">📍</div>
              <h4>Visit us</h4>
              <p>
                Continents Tower, District 13
                <br />
                Al Barsha South Fourth
                <br />
                Jumeirah Village Circle, Dubai
              </p>
            </div>
            <div className="c-card reveal">
              <div className="ic">📞</div>
              <h4>Call us</h4>
              <p>+971 4 000 0000</p>
            </div>
            <div className="c-card reveal">
              <div className="ic">✉️</div>
              <h4>Email us</h4>
              <p>hello@level40wellness.com</p>
            </div>
            <div className="c-card reveal">
              <div className="ic">🕗</div>
              <h4>Hours</h4>
              <p>
                Open daily
                <br />
                8:00 AM – 12:00 AM
              </p>
            </div>
          </div>

          <div className="sec-head reveal" style={{ marginBottom: "2.5rem" }}>
            <span className="eyebrow center">Drop us a line</span>
            <h2>Send us a note</h2>
          </div>

          <ContactForm />

          <div className="sec-head reveal" style={{ marginBottom: "2rem" }}>
            <span className="eyebrow center">Find us</span>
            <h2>On the map</h2>
            <p>Continents Tower, District 13, JVC, Dubai</p>
          </div>
          <div className="map-wrap reveal">
            <iframe
              title="Level 40 location"
              loading="lazy"
              src={`https://www.google.com/maps?q=${MAP_QUERY}&output=embed`}
            />
          </div>
          <div className="center-link reveal" style={{ marginTop: "2rem" }}>
            <a
              className="btn btn-dark"
              target="_blank"
              rel="noopener noreferrer"
              href={`https://www.google.com/maps/dir/?api=1&destination=${MAP_QUERY}`}
            >
              Get directions
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
