import type { Metadata } from "next";
import Link from "next/link";

import { ScrollReveal } from "@/components/scroll-reveal";
import { formatBlogDate } from "@/lib/blog";
import { HERO_IMG } from "@/lib/images";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { getBlogPosts } from "@/server/queries/blog";

export const metadata: Metadata = {
  title: "Journal",
  description:
    "Wellness stories, recipes and updates from the Level 40 kitchen.",
  alternates: { canonical: "/blog" },
  openGraph: {
    title: "Journal — Level 40 Café Dubai",
    description:
      "Wellness stories, recipes and updates from the Level 40 kitchen.",
    url: `${SITE_URL}/blog`,
  },
};

/** See the note in menu/page.tsx — posts are admin-managed catalog data. */
export const revalidate = 300;

export default async function BlogPage() {
  const posts = await getBlogPosts();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: "Level 40 Journal",
    url: `${SITE_URL}/blog`,
    blogPost: posts.map((post) => ({
      "@type": "BlogPosting",
      headline: post.title,
      datePublished: post.publishedAt.toISOString().slice(0, 10),
      url: `${SITE_URL}/blog/${post.slug}`,
      author: {
        "@type": post.author ? "Person" : "Organization",
        name: post.author ?? SITE_NAME,
      },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        // Built from admin-entered rows rendered through JSON.stringify — not
        // raw user markup.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ScrollReveal threshold={0.08} />

      <section
        className="page-hero"
        style={{ backgroundImage: `url('${HERO_IMG.chef}')` }}
      >
        <div className="inner">
          <span className="eyebrow center">Journal</span>
          <h1>
            Stories from <em>Level 40.</em>
          </h1>
          <p>
            Wellness notes, recipes and small obsessions — written by the
            people who cook, pour and plan for you.
          </p>
        </div>
      </section>

      <section className="block">
        <div className="wrap">
          <div className="sec-head reveal">
            <span className="eyebrow center">Fresh from the kitchen</span>
            <h2>All stories</h2>
            <p>
              Ideas, recipes and small rituals from the Level 40 kitchen —
              written to make everyday wellness feel simple.
            </p>
          </div>

          {posts.length === 0 ? (
            <p className="journal-empty reveal">
              Our first stories are being written — check back soon.
            </p>
          ) : (
            <div className="journal-grid three">
              {posts.map((post) => (
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
          )}
        </div>
      </section>
    </>
  );
}
