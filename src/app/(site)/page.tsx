import type { Metadata } from "next";
import Link from "next/link";

import { AddToCart } from "@/components/add-to-cart";
import { IntroCarousel } from "@/components/intro-carousel";
import { PosterPager } from "@/components/poster-pager";
import { ScrollReveal } from "@/components/scroll-reveal";
import { WhatsAppFloat } from "@/components/whatsapp-float";
import { formatBlogDate } from "@/lib/blog";
import { formatFils } from "@/lib/format";
import { HERO_IMG } from "@/lib/images";
import {
  getMealPlans,
  getMenu,
  getShopProducts,
} from "@/server/queries/catalog";
import { getBlogPosts } from "@/server/queries/blog";
import { getTeamMembers } from "@/server/queries/team";

export const metadata: Metadata = {
  title: "Level 40 — More Than a Café | Dubai's First Wellness Integrated Café",
  description:
    "A place where exceptional coffee, functional nutrition, movement, and community come together — specialty coffee, high-protein vegetarian dining, meal plans, online yoga, and wellness retail in one destination.",
  alternates: { canonical: "/" },
};

/** See the note in menu/page.tsx — the landing page shows live catalog data too. */
export const revalidate = 300;

const ECOSYSTEM: Array<{
  title: string;
  description: string;
  /** optional "A • B • C" line of focus areas shown under the description */
  tags?: string;
}> = [
  {
    title: "Healthy Dining",
    description:
      "Nourishing, flavour-led vegetarian food designed for everyday wellness — from breakfast and power bowls to wholesome mains, smoothies, healthy treats to pre and post workout drinks.",
  },
  {
    title: "Specialty Coffee",
    description:
      "Thoughtfully sourced and expertly crafted coffee for coffee lovers, from your morning espresso to wellness-inspired favourites.",
  },
  {
    title: "Personalized Nutrition",
    description:
      "Nutritionist-guided programs informed by your health profile, lifestyle and relevant biomarkers, with personalized meal plans for your individual wellness goals.",
    tags: "Diabetes • Weight Management • PCOS • Cholesterol • Longevity Plans",
  },
  {
    title: "Holistic Yoga",
    description:
      "Guided yoga, mobility, breathwork and mindful movement — available through personalized and group wellness experiences.",
  },
  {
    title: "NEAT by Nicky",
    description:
      "A curated wellness retail experience featuring premium activewear, yoga essentials, accessories and lifestyle products.",
  },
  {
    title: "Community & Experiences",
    description:
      "Wellness workshops, expert talks, yoga experiences, social gatherings and curated events designed to bring our community together.",
  },
];

/** Brand-story rail near the foot of the page — one tile per concept. */
const GALLERY_IMAGES = [
  "/images/chef-plating.jpg", // healthy dining
  "/images/menu/bev-2.jpg", // specialty coffee
  "/images/meal-plan-box.jpeg", // meal plans
  "/images/shop/life-activewear-1.jpg", // holistic yoga
  "/images/shop/life-accessories-1.jpg", // retail — mats & accessories
  "/images/interior.jpg", // community & workshops
  "/images/menu/des-1.jpg", // healthy treats
  "/images/shop/life-wellness-1.jpg", // wellness rituals
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
  const [menu, shopProducts, teamMembers, mealPlans, journalPosts] =
    await Promise.all([
      getMenu(),
      getShopProducts(),
      getTeamMembers(),
      getMealPlans(),
      // The two newest live posts — the rest live on /blog.
      getBlogPosts(2),
    ]);

  // The signature programme plus the everyday one make the best storefront
  // pair; fall back to the first two plans if either is renamed.
  const planPicks = [
    mealPlans.find((plan) => plan.name === "Level 40 Integrated Meal Plan"),
    mealPlans.find((plan) => plan.name === "Standard Meal Plan"),
  ].filter((plan) => plan !== undefined);
  const homePlans = planPicks.length === 2 ? planPicks : mealPlans.slice(0, 4);

  const allMenuItems = menu.flatMap((category) => category.products);
  // "Chef's picks" were two hardcoded ids in the source. Taking the first two
  // signature items keeps it data-driven, so an admin edit is reflected here.
  // Only items with a photo qualify — a bare-background card breaks the row.
  // Signatures come first; if fewer than four of them have photos, top the
  // row up from the rest of the menu.
  const signatureItems =
    menu.find((c) => c.slug === "signatures")?.products ?? [];
  const picks = [
    ...signatureItems,
    ...allMenuItems.filter((item) => !signatureItems.includes(item)),
  ]
    .filter((item) => item.imagePath)
    .slice(0, 4);
  const shopPicks = shopProducts.slice(0, 4);

  const heroPills: Array<{
    image: string;
    label: string;
    href: string;
    /** background-position for the pill crop; defaults to center */
    position?: string;
  }> = [
    {
      image: allMenuItems[0]?.imagePath ?? HERO_IMG.dish1,
      label: "Healthy Dining & Specialty Coffee",
      href: "/menu",
    },
    { image: HERO_IMG.yoga, label: "Holistic Yoga", href: "/services" },
    {
      image: HERO_IMG.mealPlan,
      // The branded bag and box sit on the left of the photo; the tall pill
      // crop must anchor there or the logo gets cut off.
      position: "20% 50%",
      label: "Nutritionist Guided Meal Plans",
      href: "/subscription",
    },
    {
      image: HERO_IMG.cafeInterior,
      label: "Community & Workshops",
      href: "/about",
    },
    {
      image: HERO_IMG.retail,
      label: "Neat by Nicky Retail",
      href: "/shop",
    },
  ];

  return (
    <>
      <ScrollReveal threshold={0.12} />
      <WhatsAppFloat />

      <section className="l40-hero">
        <div className="l40-hero-in">
          <div className="l40-hero-copy">
            <span className="eyebrow">Welcome to Level 40 — UAE&apos;s</span>
            <h1 className="l40-hero-h1">
              FIRST
              <br />
              WELLNESS
              <br />
              <span className="amp">INTEGRATED</span>
              <br />
              <span className="accent">CAFÉ.</span>
            </h1>
            {/* <p className="l40-hero-lead">
              A place where exceptional coffee, functional nutrition,
              <br />
              movement, and community come together.
            </p> */}
            <div className="l40-hero-cta">
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
                  style={{
                    backgroundImage: `url('${pill.image}')`,
                    backgroundPosition: pill.position ?? "center",
                  }}
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
            <span key={`${item.title}-${index}`}>
              {item.title}
              <i style={{ marginLeft: "2.4rem" }}>✦</i>
            </span>
          ))}
        </div>
      </div>

      <section className="intro">
        <IntroCarousel
          tag="One thoughtfully curated destination"
          slides={[
            {
              image: allMenuItems[0]?.imagePath ?? HERO_IMG.dish1,
              label: "Healthy Dining",
            },
            { image: "/images/menu/bev-1.jpg", label: "Specialty Coffee" },
            {
              image: HERO_IMG.mealPlan,
              label: "Personalized Nutrition",
            },
            { image: HERO_IMG.yoga, label: "Holistic Yoga" },
            { image: HERO_IMG.retail, label: "NEAT by Nicky" },
            {
              image: HERO_IMG.cafeInterior,
              label: "Community & Experiences",
            },
          ]}
        />
        <div className="txtcol reveal">
          <span className="eyebrow">About Level 40</span>
          <h2>
            Your wellness journey
            <br />
            starts here.
          </h2>
          <p>
            Level 40 was created with one simple belief —{" "}
            <strong>wellness should come together, not be fragmented</strong>.
            Level 40 brings{" "}
            <strong>
              healthy dining, curated meal plans, holistic yoga and wellness
              retail
            </strong>{" "}
            under one destination.
          </p>
          <p>
            Our café and wellness kitchen offers thoughtfully crafted{" "}
            <strong>
              breakfast, lunch, dinner, smoothies, functional beverages,
              specialty coffee, pre-workout and post-workout drinks
            </strong>{" "}
            with a focus on nutrition, quality ingredients and great taste.
          </p>
          <p>
            Alongside, our personalized wellness programs combine{" "}
            <strong>
              nutritionist guidance, biomarker-informed meal plans and yoga
            </strong>
            , designed to support individual goals including{" "}
            <strong>Diabetes, Weight Management, PCOS and Longevity</strong>.
          </p>
          <p>
            Whether you come to eat, move, seek guidance or simply enjoy the
            space, Level 40 makes wellness easier to become part of your
            everyday life.
          </p>
          <p>
            <strong>Eat Well. Move Well. Live Well.</strong>
          </p>
          <div className="sig">— Welcome to Level 40.</div>
        </div>
      </section>

      <section className="block">
        <div className="wrap">
          <div className="sec-head reveal">
            <span className="eyebrow center">What you&apos;ll discover</span>
            <h2>Our Ecosystem</h2>
            <p>
              More than a café, Level 40 brings together food, movement,
              personalized nutrition and wellness in one integrated destination
              — designed to make healthier living part of your everyday life.
            </p>
          </div>
          <div className="ways">
            {ECOSYSTEM.map((item, index) => (
              <div key={item.title} className="way reveal">
                <div className="num">{String(index + 1).padStart(2, "0")}</div>
                <div className="ln" />
                <h3>{item.title}</h3>
                <p>{item.description}</p>
                {item.tags && <p className="way-tags">{item.tags}</p>}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="block menu-sec">
        <div className="wrap">
          <div className="sec-head reveal">
            <span className="eyebrow center">
              High-protein vegetarian dining
            </span>
            <h2>Level 40&apos;s Exclusive</h2>
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
        <PosterPager
          className="reveal"
          slides={[
            {
              image: "/images/why-level-40/whylevel40-panel-1.jpeg",
              alt: "Nourish to Flourish — café and wellness kitchen",
            },
            {
              image: "/images/why-level-40/whylevel40-panel-2.jpeg",
              alt: "Move to Transform — yoga, mobility and wellness",
            },
            {
              image: "/images/why-level-40/whylevel40-panel-3.jpeg",
              alt: "Guided to Your Best — guidance, plans and products",
            },
            {
              image: "/images/why-level-40/whylevel40.jpeg",
              alt: "Wellness works better together",
            },
          ]}
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
        </div>
      </section>

      {/* <section className="block">
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
      </section> */}

      <section className="block">
        <div className="wrap">
          <div className="sec-head reveal">
            <span className="eyebrow center">
              Neat by Nicky wellness retail
            </span>
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
                    <span className="price">
                      {formatFils(product.priceFils)}
                    </span>
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
            <span className="eyebrow center">Nutritionist guided</span>
            <h2>Explore Meal Plans</h2>
            <p>
              Biomarker-informed programmes built around your goals — from
              everyday balance to condition-specific nutrition, made fresh at
              Level 40.
            </p>
            <Link href="/contact" className="consult-line reveal">
              Consult our consultant — a one-on-one session to find the plan
              that fits you →
            </Link>
          </div>

          <div className="tiers two">
            {homePlans.map((plan) => {
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
                    {plan.features.slice(0, 4).map((feature) => (
                      <li key={feature}>{feature}</li>
                    ))}
                  </ul>
                  <Link href="/subscription" className="btn btn-gold">
                    View this plan
                  </Link>
                </div>
              );
            })}
          </div>

          <div className="center-link reveal">
            <Link href="/subscription" className="btn btn-dark">
              Explore all meal plans
            </Link>
          </div>
        </div>
      </section>

      {journalPosts.length > 0 && (
        <section className="block journal-sec">
          <div className="wrap">
            <div className="sec-head reveal">
              <span className="eyebrow center">From our journal</span>
              <h2>Wellness stories &amp; notes</h2>
              <p>
                Ideas, recipes and small rituals from the Level 40 kitchen —
                written to make everyday wellness feel simple.
              </p>
            </div>

            <div className="journal-grid">
              {journalPosts.map((post) => (
                <Link
                  key={post.id}
                  href={`/blog/${post.slug}`}
                  className="journal-card reveal"
                >
                  <div
                    className="journal-cover"
                    style={
                      post.images[0]
                        ? { backgroundImage: `url('${post.images[0]}')` }
                        : undefined
                    }
                  />
                  <div className="journal-body">
                    <div className="journal-meta">
                      <span>{formatBlogDate(post.publishedAt)}</span>
                      {post.hashtags[0] && (
                        <span className="journal-tag">#{post.hashtags[0]}</span>
                      )}
                    </div>
                    <h3>{post.title}</h3>
                    <p>{post.excerpt}</p>
                    <span className="journal-read">Read the story →</span>
                  </div>
                </Link>
              ))}
            </div>

            <div className="center-link reveal">
              <Link href="/blog" className="btn btn-dark">
                Read all stories
              </Link>
            </div>
          </div>
        </section>
      )}

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
          {teamMembers.length > 0 && (
            <div className="team-grid">
              {teamMembers.map((member) => (
                <div key={member.id} className="team-card reveal">
                  <div
                    className="team-photo"
                    style={
                      member.imagePath
                        ? { backgroundImage: `url('${member.imagePath}')` }
                        : undefined
                    }
                  />
                  <h3>{member.name}</h3>
                  <span className="team-role">{member.designation}</span>
                  {member.bio && <p>{member.bio}</p>}
                </div>
              ))}
            </div>
          )}
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
                community. From wellness workshops and educational talks to yoga
                sessions and social gatherings, we bring people together through
                shared experiences that inspire healthier, happier living.
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
            <span className="eyebrow">
              Every experience, designed with intention
            </span>
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
        {/* Brand-story rail: about four tiles visible, drifting continuously.
            The list renders twice so the loop is seamless, like the marquee. */}
        <div className="gallery">
          <div className="gallery-track">
            {[...GALLERY_IMAGES, ...GALLERY_IMAGES].map((image, index) => (
              <div
                key={`${image}-${index}`}
                className="g"
                style={{ backgroundImage: `url('${image}')` }}
              />
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
