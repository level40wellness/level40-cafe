import "server-only";
import { and, desc, eq, sql } from "drizzle-orm";

import { db } from "@/db";
import { blogPosts } from "@/db/schema";
import { requireAdmin } from "@/server/guards";

const publicColumns = {
  id: blogPosts.id,
  title: blogPosts.title,
  slug: blogPosts.slug,
  excerpt: blogPosts.excerpt,
  content: blogPosts.content,
  images: blogPosts.images,
  hashtags: blogPosts.hashtags,
  author: blogPosts.author,
  publishedAt: blogPosts.publishedAt,
};

/** Live posts for the public site, newest first. `limit` for the homepage. */
export async function getBlogPosts(limit?: number) {
  const query = db
    .select(publicColumns)
    .from(blogPosts)
    .where(eq(blogPosts.active, true))
    .orderBy(desc(blogPosts.publishedAt), desc(blogPosts.createdAt));

  return limit === undefined ? query : query.limit(limit);
}

export type BlogPost = Awaited<ReturnType<typeof getBlogPosts>>[number];

/** One live post by slug, for /blog/[slug]. */
export async function getBlogPost(slug: string) {
  const [post] = await db
    .select(publicColumns)
    .from(blogPosts)
    .where(
      and(
        eq(blogPosts.active, true),
        sql`lower(${blogPosts.slug}) = ${slug.toLowerCase()}`,
      ),
    )
    .limit(1);

  return post ?? null;
}

/** Everything, including hidden posts, for the admin console. */
export async function getAdminBlogPosts() {
  await requireAdmin();

  return db
    .select({
      ...publicColumns,
      active: blogPosts.active,
    })
    .from(blogPosts)
    .orderBy(desc(blogPosts.publishedAt), desc(blogPosts.createdAt));
}

export type AdminBlogPost = Awaited<
  ReturnType<typeof getAdminBlogPosts>
>[number];
