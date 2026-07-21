import type { Metadata } from "next";
import { Calendar } from "lucide-react";

import { SITE_NAME, SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Journal",
  description: "Recipes, stories and updates from the Level 40 kitchen.",
  alternates: { canonical: "/blog" },
  openGraph: {
    title: "Journal — Level 40 Café Dubai",
    description: "Recipes, stories and updates from the Level 40 kitchen.",
    url: `${SITE_URL}/blog`,
  },
};

const POSTS = [
  {
    title: "Why saffron is our most expensive obsession",
    excerpt:
      "A small story about a small spice — and the farmers in Kashmir who grow it.",
    date: "Jun 24, 2026",
    published: "2026-06-24",
    category: "Kitchen Notes",
  },
  {
    title: "Inside the Ramadan menu — five chef's notes",
    excerpt: "From the slow-cooked lamb shoulder to the rose-cardamom crème.",
    date: "Mar 03, 2026",
    published: "2026-03-03",
    category: "Seasonal",
  },
  {
    title: "Designing a brass-and-marble room",
    excerpt:
      "How we worked with Studio Layla to shape our second dining room.",
    date: "Feb 12, 2026",
    published: "2026-02-12",
    category: "The Room",
  },
  {
    title: "Five ways to drink Arabic coffee",
    excerpt: "A short field guide to gahwa, karak, and our house blend.",
    date: "Jan 28, 2026",
    published: "2026-01-28",
    category: "Coffee",
  },
  {
    title: "On the QR code at your table",
    excerpt: "Why scanning to order is a feature, not a compromise.",
    date: "Jan 09, 2026",
    published: "2026-01-09",
    category: "Notes",
  },
  {
    title: "Building a menu around dates",
    excerpt: "Khalas, Medjool, Ajwa — the three dates we use most, and why.",
    date: "Dec 17, 2025",
    published: "2025-12-17",
    category: "Pantry",
  },
] as const;

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Blog",
  name: "Level 40 Journal",
  url: `${SITE_URL}/blog`,
  blogPost: POSTS.map((post) => ({
    "@type": "BlogPosting",
    headline: post.title,
    datePublished: post.published,
    author: { "@type": "Organization", name: SITE_NAME },
  })),
};

export default function BlogPage() {
  return (
    <>
      <script
        type="application/ld+json"
        // Content is a literal defined above, not user input.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <section className="border-b border-border page-header-decor py-20 sm:py-24">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <p className="text-[11px] uppercase tracking-[0.2em] text-brass">
            Journal
          </p>
          <h1 className="mt-3 font-display text-5xl sm:text-6xl">
            Stories from the kitchen.
          </h1>
          <p className="mt-5 text-muted-foreground">
            Recipes, design notes and small obsessions, written by the people who
            cook for you.
          </p>
        </div>
      </section>

      <section className="bg-background py-16">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 sm:px-6 md:grid-cols-2 lg:grid-cols-3 lg:px-8">
          {POSTS.map((post) => (
            <article
              key={post.title}
              className="group flex flex-col rounded-2xl border border-border bg-card p-7 transition hover:border-brass"
            >
              <p className="text-[11px] uppercase tracking-[0.2em] text-brass">
                {post.category}
              </p>
              <h2 className="mt-3 font-display text-2xl leading-tight">
                {post.title}
              </h2>
              <p className="mt-3 flex-1 text-sm text-muted-foreground">
                {post.excerpt}
              </p>
              <div className="mt-6 flex items-center justify-between border-t border-border pt-4 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  <time dateTime={post.published}>{post.date}</time>
                </span>
              </div>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
