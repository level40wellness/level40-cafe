import Link from "next/link";

/**
 * Placeholder. The real landing page is ported in step 2d alongside the
 * database-driven menu and shop.
 */
export default function HomePage() {
  return (
    <section className="page-hero">
      <div className="wrap">
        <span className="eyebrow">Jumeirah Village Circle · Dubai</span>
        <h1>
          A modern café with <em>Arabian warmth</em>
        </h1>
        <p className="lead">
          Chef-driven seasonal cooking, a wellness retail edit, and meal plans
          delivered across Dubai.
        </p>
        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
          <Link className="btn" href="/menu">
            View the menu
          </Link>
          <Link className="btn" href="/shop">
            Shop
          </Link>
        </div>
      </div>
    </section>
  );
}
