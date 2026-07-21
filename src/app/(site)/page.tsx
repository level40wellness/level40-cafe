import type { Metadata } from "next";
import Link from "next/link";

import { AddToCart } from "@/components/add-to-cart";
import { ScrollReveal } from "@/components/scroll-reveal";
import { formatFils } from "@/lib/format";
import { HERO_IMG } from "@/lib/images";
import { getMenu, getShopProducts } from "@/server/queries/catalog";

export const metadata: Metadata = {
  title: "Level 40 — Nourish & Move | Dubai Café + Yoga Shop",
  description:
    "Chef-driven Arabian cuisine, meal plans, and curated yoga & wellness essentials — one home for a healthier life in Dubai.",
  alternates: { canonical: "/" },
};

/** See the note in menu/page.tsx — the landing page shows live catalog data too. */
export const revalidate = 300;

export default async function HomePage() {
  const [menu, shopProducts] = await Promise.all([
    getMenu(),
    getShopProducts(),
  ]);

  const allMenuItems = menu.flatMap((category) => category.products);
  // "Chef's picks" were two hardcoded ids in the source. Taking the first two
  // signature items keeps it data-driven, so an admin edit is reflected here.
  const picks = (menu.find((c) => c.slug === "signatures")?.products ?? allMenuItems).slice(0, 2);
  const shopPicks = shopProducts.slice(0, 10);

  const heroPills = [
    { image: allMenuItems[0]?.imagePath ?? HERO_IMG.dish1, label: "Cafe", href: "/menu" },
    { image: HERO_IMG.chef, label: "Online Yoga", href: "/services" },
    { image: HERO_IMG.table, label: "Meal Plans", href: "/subscription" },
    { image: HERO_IMG.interior, label: "Community", href: "/about" },
    { image: shopPicks[0]?.imagePath ?? HERO_IMG.cafeInterior, label: "NeatByNicky Retail", href: "/shop" },
  ];

  return (
    <>
      <ScrollReveal threshold={0.12} />

      <section className="l40-hero">
        <div className="l40-hero-in">
          <div className="l40-hero-copy">
            <span className="eyebrow">
              Dubai&apos;s first wellness-integrated café
            </span>
            <h1 className="l40-hero-h1">
              WELLNESS
              <br />
              MADE <span className="accent">SIMPLE,</span>
              <br />
              BEAUTIFUL
              <br />
              <span className="amp">&amp;</span>
              <br />
              INTEGRATED.
            </h1>
            <p className="l40-hero-lead">
              Cafe. Meal Plans. Yoga. Community. Retail.
              <br />
              All working together for a better you.
            </p>
            <div className="l40-hero-cta">
              <Link href="/menu" className="l40-btn-primary">
                Explore Our World
              </Link>
              <Link href="/about" className="l40-btn-ghost">
                Our Concept →
              </Link>
            </div>
          </div>

          <div className="l40-hero-pills">
            {heroPills.map((pill, index) => (
              <Link
                key={pill.label}
                href={pill.href}
                className="l40-pill"
                style={{ animationDelay: `${index * 90}ms` }}
              >
                <div
                  className="l40-pill-img"
                  style={{ backgroundImage: `url('${pill.image}')` }}
                />
                <span className="l40-pill-label">{pill.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <div className="marquee">
        <div className="marquee-track">
          <span>Saffron &amp; Cardamom</span>
          <i>✦</i>
          <span>Slow-Cooked Mandi</span>
          <i>✦</i>
          <span>Cold-Pressed Rituals</span>
          <i>✦</i>
          <span>Yoga &amp; Wellness</span>
          <i>✦</i>
          <span>Weekly Meal Plans</span>
          <i>✦</i>
          <span>Saffron &amp; Cardamom</span>
          <i>✦</i>
          <span>Slow-Cooked Mandi</span>
          <i>✦</i>
          <span>Cold-Pressed Rituals</span>
          <i>✦</i>
          <span>Yoga &amp; Wellness</span>
          <i>✦</i>
          <span>Weekly Meal Plans</span>
          <i>✦</i>
        </div>
      </div>

      <section className="intro">
        <div
          className="imgcol"
          style={{ backgroundImage: `url('${HERO_IMG.chef}')` }}
        >
          <span className="tag">Plated by hand, every service</span>
        </div>
        <div className="txtcol reveal">
          <span className="eyebrow">Our philosophy</span>
          <h2>
            A quiet luxury,
            <br />
            rooted in ritual.
          </h2>
          <p>
            Level 40 began with a simple belief — that how we eat and how we move
            are one and the same practice. We honour Arabian hospitality with
            seasonal, chef-driven cooking and a room made for slowing down.
          </p>
          <p>
            From the first pour of cardamom coffee to the last unhurried breath
            on the mat, everything here is designed to nourish.
          </p>
          <div className="sig">— The Level 40 house</div>
        </div>
      </section>

      <section className="block">
        <div className="wrap">
          <div className="sec-head reveal">
            <span className="eyebrow center">The Level 40 way</span>
            <h2>Three ways to experience us</h2>
            <p>However you like to dine, we&apos;ve made it effortless and unhurried.</p>
          </div>
          <div className="ways">
            <div className="way reveal">
              <div className="num">01</div>
              <div className="ln" />
              <h3>Scan at your table</h3>
              <p>
                Each table carries a discreet QR code. Scan, browse and order
                without leaving your seat.
              </p>
            </div>
            <div className="way reveal">
              <div className="num">02</div>
              <div className="ln" />
              <h3>Crafted by chefs</h3>
              <p>
                Seasonal Arabian classics reimagined with modern technique and
                the finest local produce.
              </p>
            </div>
            <div className="way reveal">
              <div className="num">03</div>
              <div className="ln" />
              <h3>Ready in ~45 min</h3>
              <p>
                Order ahead for pickup. We&apos;ll have it ready — hot,
                considered and packaged with care.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="block menu-sec">
        <div className="wrap">
          <div className="sec-head reveal">
            <span className="eyebrow center">From the kitchen</span>
            <h2>Chef&apos;s picks this week</h2>
            <p>A short, seasonal list that changes with the market.</p>
          </div>
          <div className="picks">
            {picks.map((item) => (
              <div
                key={item.id}
                className="dish reveal"
                style={
                  item.imagePath
                    ? { backgroundImage: `url('${item.imagePath}')` }
                    : undefined
                }
              >
                <div className="body">
                  <h3>{item.name}</h3>
                  <p>{item.description}</p>
                  <div className="row">
                    <span className="price">{formatFils(item.priceFils)}</span>
                    <AddToCart
                      productId={item.id}
                      name={item.name}
                      priceFils={item.priceFils}
                      imagePath={item.imagePath}
                      label="Add to order"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="center-link reveal">
            <Link href="/menu" className="btn btn-gold">
              Explore full menu
            </Link>
          </div>
        </div>
      </section>

      <section className="block">
        <div className="wrap">
          <div className="sec-head reveal">
            <span className="eyebrow center">Shop the practice</span>
            <h2>Yoga &amp; wellness essentials</h2>
            <p>Chosen with the same care we put on the plate.</p>
          </div>
          <div className="shop-grid">
            {shopPicks.map((product) => (
              <div key={product.id} className="prod reveal in">
                <Link href={`/shop/${product.id}`} aria-label={product.name}>
                  <div
                    className="ph"
                    style={
                      product.imagePath
                        ? { backgroundImage: `url('${product.imagePath}')` }
                        : { backgroundColor: "var(--cream-2)" }
                    }
                  >
                    {product.categoryName ? (
                      <span className="badge">{product.categoryName}</span>
                    ) : null}
                  </div>
                </Link>
                <div className="info">
                  <h3>
                    <Link href={`/shop/${product.id}`}>{product.name}</Link>
                  </h3>
                  {product.description && <p>{product.description}</p>}
                  <div className="row">
                    <span className="price">{formatFils(product.priceFils)}</span>
                    <AddToCart
                      productId={product.id}
                      name={product.name}
                      priceFils={product.priceFils}
                      imagePath={product.imagePath}
                      inStock={product.inStock}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="center-link reveal">
            <Link href="/shop" className="btn btn-dark">
              See all products
            </Link>
          </div>
        </div>
      </section>

      <section
        className="interior"
        style={{ backgroundImage: `url('${HERO_IMG.interior}')` }}
      >
        <div className="wrap">
          <div className="card reveal">
            <span className="eyebrow">A room with a soul</span>
            <h2>Brass, marble, and the perfume of cardamom.</h2>
            <p>
              Our dining room is a quiet escape from the boulevard — deep emerald
              banquettes, hand-poured brass lights, and a soundtrack tuned for
              unhurried conversation. Stay for a coffee. Stay for the evening.
            </p>
            <Link href="/contact" className="btn btn-gold">
              Reserve a table
            </Link>
          </div>
        </div>
      </section>

      <section style={{ padding: 0 }}>
        <div className="gallery">
          <div
            className="g reveal"
            style={{ backgroundImage: `url('${HERO_IMG.dish1}')` }}
          />
          <div
            className="g reveal"
            style={{ backgroundImage: `url('${HERO_IMG.chef}')` }}
          />
          <div
            className="g reveal"
            style={{ backgroundImage: `url('${HERO_IMG.cafeInterior}')` }}
          />
          <div
            className="g reveal"
            style={{ backgroundImage: `url('${HERO_IMG.table}')` }}
          />
        </div>
      </section>

      <section className="plan">
        <div
          className="imgcol reveal"
          style={{ backgroundImage: `url('${HERO_IMG.dish1}')` }}
        />
        <div className="txt reveal">
          <span className="eyebrow">Eat well, every day</span>
          <h2>Weekly meal plans, delivered with care</h2>
          <ul className="plan-list">
            <li>
              <span className="tk">✦</span>
              <div>
                <h4>Chef-designed menus</h4>
                <p>A rotating week of balanced, clean Arabian-inspired dishes.</p>
              </div>
            </li>
            <li>
              <span className="tk">✦</span>
              <div>
                <h4>Flexible &amp; skippable</h4>
                <p>Pause, swap or skip any week — no lock-in, no fuss.</p>
              </div>
            </li>
            <li>
              <span className="tk">✦</span>
              <div>
                <h4>Portioned for your goals</h4>
                <p>Nourishing macros tuned to how you eat and move.</p>
              </div>
            </li>
          </ul>
          <Link href="/subscription" className="btn btn-gold">
            Explore meal plans · from AED 349/wk
          </Link>
        </div>
      </section>
    </>
  );
}
