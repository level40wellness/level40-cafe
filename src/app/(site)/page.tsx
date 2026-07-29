import type { Metadata } from "next";
import Link from "next/link";

import { AddToCart } from "@/components/add-to-cart";
import { ScrollReveal } from "@/components/scroll-reveal";
import { formatFils } from "@/lib/format";
import { HERO_IMG } from "@/lib/images";
import { getMenu, getShopProducts } from "@/server/queries/catalog";

export const metadata: Metadata = {
  title: "Level 40 — More Than a Café | Dubai's First Wellness Integrated Café",
  description:
    "A place where exceptional coffee, functional nutrition, movement, and community come together — specialty coffee, high-protein vegetarian dining, meal plans, online yoga, and wellness retail in one destination.",
  alternates: { canonical: "/" },
};

/** See the note in menu/page.tsx — the landing page shows live catalog data too. */
export const revalidate = 300;

const ECOSYSTEM = [
  "Specialty Coffee",
  "High-Protein Vegetarian Dining",
  "Personalised Integrated Meal Plans",
  "Online Yoga",
  "Neat by Nicky Wellness Retail",
  "Community Events & Workshops",
];

const WHY_LEVEL_40 = [
  "One destination for modern wellness",
  "Premium ingredients and thoughtfully crafted experiences",
  "Science-backed nutrition with real-world practicality",
  "Designed around balance — not restriction",
  "Beautiful spaces you'll actually want to spend time in",
];

const NUMBERS_THAT_MATTER = [
  { value: "100%", label: "Vegetarian" },
  { value: "High-Protein", label: "Focused" },
  { value: "One", label: "Integrated Wellness Destination" },
  { value: "Countless", label: "Everyday Transformations" },
];

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
    { image: allMenuItems[0]?.imagePath ?? HERO_IMG.dish1, label: "Specialty Coffee & Dining", href: "/menu" },
    { image: HERO_IMG.chef, label: "Online Yoga", href: "/services" },
    { image: HERO_IMG.table, label: "Meal Plans", href: "/subscription" },
    { image: HERO_IMG.interior, label: "Community & Workshops", href: "/about" },
    { image: shopPicks[0]?.imagePath ?? HERO_IMG.cafeInterior, label: "Neat by Nicky Retail", href: "/shop" },
  ];

  return (
    <>
      <ScrollReveal threshold={0.12} />

      <section className="l40-hero">
        <div className="l40-hero-in">
          <div className="l40-hero-copy">
            <span className="eyebrow">
              Welcome to Level 40 — Dubai&apos;s first wellness integrated café
            </span>
            <h1 className="l40-hero-h1">
              MORE
              <br />
              THAN
              <br />
              <span className="amp">A</span>
              <br />
              <span className="accent">CAFÉ.</span>
            </h1>
            <p className="l40-hero-lead">
              A place where exceptional coffee, functional nutrition,
              <br />
              movement, and community come together.
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
          {[...ECOSYSTEM, ...ECOSYSTEM].map((item, index) => (
            <span key={`${item}-${index}`}>
              {item}
              <i style={{ marginLeft: "2.4rem" }}>✦</i>
            </span>
          ))}
        </div>
      </div>

      <section className="intro">
        <div
          className="imgcol"
          style={{ backgroundImage: `url('${HERO_IMG.chef}')` }}
        >
          <span className="tag">One thoughtfully curated destination</span>
        </div>
        <div className="txtcol reveal">
          <span className="eyebrow">About Level 40</span>
          <h2>
            A new way to
            <br />
            experience wellness.
          </h2>
          <p>
            We created Level 40 because we saw a gap in the way people
            experience wellness. Healthy living has become fragmented — your
            coffee in one place, nutritious meals somewhere else, fitness in
            another, wellness products online, and expert guidance scattered
            everywhere.
          </p>
          <p>
            We believed there had to be a better way. Level 40 brings wellness
            together in one thoughtfully curated destination, making it easier
            to eat well, move well, connect, and enjoy the journey.
          </p>
          <p>
            Because wellness shouldn&apos;t feel like another task on your
            to-do list. It should simply become part of your lifestyle.
          </p>
          <div className="sig">— The Level 40 house</div>
        </div>
      </section>

      <section className="block">
        <div className="wrap">
          <div className="sec-head reveal">
            <span className="eyebrow center">What you&apos;ll discover</span>
            <h2>Our ecosystem</h2>
            <p>
              Whether you&apos;re stopping by for your morning coffee, looking
              for nourishing high-protein vegetarian meals, beginning your
              wellness journey, or simply enjoying the atmosphere — every
              experience at Level 40 is designed with intention.
            </p>
          </div>
          <div className="ways">
            {ECOSYSTEM.map((item, index) => (
              <div key={item} className="way reveal">
                <div className="num">{String(index + 1).padStart(2, "0")}</div>
                <div className="ln" />
                <h3>{item}</h3>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="block menu-sec">
        <div className="wrap">
          <div className="sec-head reveal">
            <span className="eyebrow center">High-protein vegetarian dining</span>
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

      <section className="plan">
        <div
          className="imgcol reveal"
          style={{ backgroundImage: `url('${HERO_IMG.table}')` }}
        />
        <div className="txt reveal">
          <span className="eyebrow">Why Level 40?</span>
          <h2>Wellness, made part of your lifestyle</h2>
          <ul className="plan-list">
            {WHY_LEVEL_40.map((reason) => (
              <li key={reason}>
                <span className="tk">✓</span>
                <div>
                  <h4>{reason}</h4>
                </div>
              </li>
            ))}
          </ul>
          <Link href="/about" className="btn btn-gold">
            Discover our concept
          </Link>
        </div>
      </section>

      <section className="block">
        <div className="wrap">
          <div className="sec-head reveal">
            <span className="eyebrow center">The numbers that matter</span>
            <h2>What we stand for</h2>
          </div>
          <div
            className="stats reveal"
            style={{
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              borderTop: "none",
              marginTop: 0,
              paddingTop: 0,
            }}
          >
            {NUMBERS_THAT_MATTER.map((stat) => (
              <div key={stat.label} className="stat">
                <b>{stat.value}</b>
                <span>{stat.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="block">
        <div className="wrap">
          <div className="sec-head reveal">
            <span className="eyebrow center">Neat by Nicky wellness retail</span>
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

      <section className="block">
        <div className="wrap">
          <div className="sec-head reveal">
            <span className="eyebrow center">The people behind Level 40</span>
            <h2>Meet the team</h2>
            <p>
              Level 40 brings together nutrition professionals, culinary
              experts, wellness specialists, yoga instructors, and hospitality
              professionals with one shared purpose — to make healthy living
              simpler, more enjoyable, and accessible to everyone.
            </p>
          </div>
          <div className="ways">
            <div className="way reveal">
              <div className="num">✦</div>
              <div className="ln" />
              <h3>Built on trust</h3>
              <p>
                Every menu, wellness programme, and recommendation is
                thoughtfully developed using evidence-informed nutrition
                principles and a practical approach to healthy living. We
                believe in progress over perfection, balance over extremes, and
                creating habits that are sustainable for everyday life.
              </p>
            </div>
            <div className="way reveal">
              <div className="num">✦</div>
              <div className="ln" />
              <h3>Our community</h3>
              <p>
                Level 40 is more than a destination — it&apos;s a growing
                community. From wellness workshops and educational talks to
                yoga sessions and social gatherings, we bring people together
                through shared experiences that inspire healthier, happier
                living.
              </p>
            </div>
            <div className="way reveal">
              <div className="num">✦</div>
              <div className="ln" />
              <h3>Our partners</h3>
              <p>
                We&apos;re proud to collaborate with trusted wellness
                professionals, nutrition experts, fitness instructors, local
                producers, and brands that share our vision for better living.
              </p>
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
            <span className="eyebrow">Every experience, designed with intention</span>
            <h2>Eat well. Move well. Connect. Enjoy the journey.</h2>
            <p>
              Stop by for your morning coffee, stay for a nourishing meal, join
              a workshop, or simply enjoy the atmosphere. Beautiful spaces
              you&apos;ll actually want to spend time in.
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
    </>
  );
}
