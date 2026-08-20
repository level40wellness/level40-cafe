import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ScrollReveal } from "@/components/scroll-reveal";
import { formatBlogDate } from "@/lib/blog";
import { HERO_IMG } from "@/lib/images";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { getBlogPost, getBlogPosts } from "@/server/queries/blog";

type Props = { params: Promise<{ slug: string }> };

/** See the note in menu/page.tsx. */
export const revalidate = 300;

/**
 * Prerenders every live post at build time. Anything published later is
 * rendered on first request and then cached, so new posts do not 404.
 */
export async function generateStaticParams() {
  const posts = await getBlogPosts();
  return posts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  // params is a Promise in Next 16 — synchronous access was removed.
  const { slug } = await params;
  const post = await getBlogPost(slug);

  if (!post) return { title: "Post not found" };

  return {
    title: `${post.title} — Level 40 Journal`,
    description: post.excerpt,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      title: `${post.title} — Level 40 Journal`,
      description: post.excerpt,
      url: `${SITE_URL}/blog/${post.slug}`,
      images: post.images[0] ? [post.images[0]] : undefined,
    },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = await getBlogPost(slug);

  // getBlogPost returns null for hidden posts too, so an unpublished draft
  // 404s rather than rendering.
  if (!post) notFound();

  const paragraphs = (post.content ?? post.excerpt)
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph.length > 0);
  const [cover, ...gallery] = post.images;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.excerpt,
    datePublished: post.publishedAt.toISOString().slice(0, 10),
    image: post.images.length > 0 ? post.images : undefined,
    url: `${SITE_URL}/blog/${post.slug}`,
    author: {
      "@type": post.author ? "Person" : "Organization",
      name: post.author ?? SITE_NAME,
    },
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

      {/* The post's cover doubles as the banner, dimmed by .page-hero's
          gradient like every other page header. */}
      <section
        className="page-hero"
        style={{ backgroundImage: `url('${cover ?? HERO_IMG.chef}')` }}
      >
        <div className="inner">
          <span className="eyebrow center">Journal</span>
          <h1>{post.title}</h1>
          <p>{post.excerpt}</p>
          <div className="journal-hero-meta">
            <time dateTime={post.publishedAt.toISOString()}>
              {formatBlogDate(post.publishedAt)}
            </time>
            {post.author && (
              <>
                <i>✦</i>
                <span>By {post.author}</span>
              </>
            )}
          </div>
        </div>
      </section>

      <section className="block">
        <div className="wrap">
          <article className="journal-article reveal">
            {post.hashtags.length > 0 && (
              <p className="journal-article-tags">
                {post.hashtags.map((tag) => (
                  <span key={tag}>#{tag}</span>
                ))}
              </p>
            )}

            {paragraphs.map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}

            {gallery.length > 0 && (
              <div className="journal-gallery">
                {gallery.map((image) => (
                  <div
                    key={image}
                    className="journal-gallery-img"
                    style={{ backgroundImage: `url('${image}')` }}
                  />
                ))}
              </div>
            )}
          </article>

          <div className="center-link reveal">
            <Link href="/blog" className="btn btn-dark">
              ← Back to the journal
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
