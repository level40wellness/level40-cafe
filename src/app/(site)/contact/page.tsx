import type { Metadata } from "next";

import { ContactForm } from "@/components/contact-form";
import { ScrollReveal } from "@/components/scroll-reveal";
import { HERO_IMG } from "@/lib/images";
import { MAP_QUERY } from "@/lib/site";
import { getMenu } from "@/server/queries/catalog";

export const metadata: Metadata = {
  title: "Contact",
  description: "Reservations, events and enquiries at Level 40 Café Dubai.",
  alternates: { canonical: "/contact" },
};

/** Revalidated like /menu so the banner follows menu photo changes. */
export const revalidate = 300;

/** Menu dish shown in the banner; falls back to the interior if it is renamed. */
const HERO_DISH = "Korean Tofu Scramble Bowl";

export default async function ContactPage() {
  const menu = await getMenu();
  const heroImage =
    menu
      .flatMap((category) => category.products)
      .find((item) => item.name === HERO_DISH)?.imagePath ??
    HERO_IMG.cafeInterior;

  return (
    <>
      <ScrollReveal threshold={0.08} />

      <section
        className="page-hero"
        style={{ backgroundImage: `url('${heroImage}')` }}
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
              <p>+971 55 739 2980</p>
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
