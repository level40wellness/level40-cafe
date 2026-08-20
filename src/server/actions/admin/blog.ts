"use server";

import { revalidatePath } from "next/cache";
import { eq, ne, and, sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { blogPosts } from "@/db/schema";
import { MAX_BLOG_IMAGES, MAX_HASHTAGS, parseHashtags } from "@/lib/blog";
import { slugify } from "@/lib/product-csv";
import { requireAdmin } from "@/server/guards";
import {
  type ActionResult,
  fromUnknownError,
  fromZodError,
} from "./result";

const postSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(140),
  slug: z
    .string()
    .trim()
    .max(140)
    .regex(/^[a-z0-9-]*$/, "Lowercase letters, numbers and dashes only.")
    .optional(),
  excerpt: z
    .string()
    .trim()
    .min(1, "A short description is required — it is what the cards show.")
    .max(300, "Keep the description under 300 characters."),
  content: z.string().trim().max(20000).optional(),
  images: z
    .array(
      // Uploads are blob URLs, but seeded posts reference /public paths — an
      // admin edit of one must not fail on its existing images.
      z.string().refine((value) => value.startsWith("/") || URL.canParse(value), {
        message: "Upload images rather than typing paths.",
      }),
    )
    .max(MAX_BLOG_IMAGES, `At most ${MAX_BLOG_IMAGES} images.`),
  hashtags: z
    .array(z.string().max(40))
    .max(MAX_HASHTAGS, `At most ${MAX_HASHTAGS} hashtags.`),
  author: z.string().trim().max(80).optional(),
  publishedAt: z.iso.date("Pick a publish date."),
  active: z.coerce.boolean().default(true),
});

function parse(formData: FormData) {
  let images: unknown = [];
  try {
    images = JSON.parse(String(formData.get("images") ?? "[]"));
  } catch {
    // leave [] — the schema reports it if a real value was expected
  }

  return postSchema.safeParse({
    title: formData.get("title"),
    // Optional fields arrive as "" from an empty form control; zod's
    // .optional() accepts undefined but not an empty string.
    slug: formData.get("slug") || undefined,
    excerpt: formData.get("excerpt"),
    content: formData.get("content") || undefined,
    images,
    hashtags: parseHashtags(String(formData.get("hashtags") ?? "")),
    author: formData.get("author") || undefined,
    publishedAt: formData.get("publishedAt"),
    active: formData.get("active") === "on",
  });
}

/**
 * The homepage journal section and /blog are served with ISR
 * (revalidate = 300); without this an admin's change would take up to five
 * minutes to appear.
 */
function revalidateBlog(slug?: string) {
  revalidatePath("/");
  revalidatePath("/blog");
  if (slug) revalidatePath(`/blog/${slug}`);
  revalidatePath("/admin/blog");
}

/** Case-insensitive slug collision check; `excludeId` when editing. */
async function slugTaken(slug: string, excludeId?: string) {
  const clash = sql`lower(${blogPosts.slug}) = ${slug.toLowerCase()}`;
  const [existing] = await db
    .select({ id: blogPosts.id })
    .from(blogPosts)
    .where(excludeId ? and(clash, ne(blogPosts.id, excludeId)) : clash)
    .limit(1);
  return existing !== undefined;
}

export async function createBlogPostAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  try {
    await requireAdmin();

    const parsed = parse(formData);
    if (!parsed.success) return fromZodError(parsed.error);

    const data = parsed.data;
    const slug = data.slug || slugify(data.title);
    if (!slug) {
      return {
        ok: false,
        error: "Please correct the highlighted fields.",
        fieldErrors: { slug: "Could not derive a slug — set one by hand." },
      };
    }
    if (await slugTaken(slug)) {
      return {
        ok: false,
        error: "Please correct the highlighted fields.",
        fieldErrors: { slug: `"${slug}" is already used by another post.` },
      };
    }

    await db.insert(blogPosts).values({
      title: data.title,
      slug,
      excerpt: data.excerpt,
      content: data.content ?? null,
      images: data.images,
      hashtags: data.hashtags,
      author: data.author ?? null,
      publishedAt: new Date(`${data.publishedAt}T00:00:00Z`),
      active: data.active,
    });

    revalidateBlog(slug);
    return { ok: true, message: `Post "${data.title}" added.` };
  } catch (error) {
    return fromUnknownError(error, "Could not add the post.");
  }
}

export async function updateBlogPostAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  try {
    await requireAdmin();

    const id = z.uuid().safeParse(formData.get("id"));
    if (!id.success) return { ok: false, error: "Unknown post." };

    const parsed = parse(formData);
    if (!parsed.success) return fromZodError(parsed.error);

    const data = parsed.data;
    const slug = data.slug || slugify(data.title);
    if (await slugTaken(slug, id.data)) {
      return {
        ok: false,
        error: "Please correct the highlighted fields.",
        fieldErrors: { slug: `"${slug}" is already used by another post.` },
      };
    }

    // Revalidate the old slug's page too, or a renamed post's previous URL
    // keeps serving the stale copy until ISR expires it.
    const [before] = await db
      .select({ slug: blogPosts.slug })
      .from(blogPosts)
      .where(eq(blogPosts.id, id.data));

    const updated = await db
      .update(blogPosts)
      .set({
        title: data.title,
        slug,
        excerpt: data.excerpt,
        content: data.content ?? null,
        images: data.images,
        hashtags: data.hashtags,
        author: data.author ?? null,
        publishedAt: new Date(`${data.publishedAt}T00:00:00Z`),
        active: data.active,
      })
      .where(eq(blogPosts.id, id.data))
      .returning({ id: blogPosts.id });

    if (updated.length === 0) {
      return { ok: false, error: "That post no longer exists." };
    }

    if (before && before.slug !== slug) revalidateBlog(before.slug);
    revalidateBlog(slug);
    return { ok: true, message: `Post "${data.title}" saved.` };
  } catch (error) {
    return fromUnknownError(error, "Could not save the post.");
  }
}

export async function deleteBlogPostAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  try {
    await requireAdmin();

    const id = z.uuid().safeParse(formData.get("id"));
    if (!id.success) return { ok: false, error: "Unknown post." };

    // Report on what was actually removed — a DELETE matching nothing
    // succeeds, so an already-deleted row would otherwise confirm twice.
    const deleted = await db
      .delete(blogPosts)
      .where(eq(blogPosts.id, id.data))
      .returning({ title: blogPosts.title, slug: blogPosts.slug });

    if (deleted.length === 0) {
      return { ok: false, error: "That post no longer exists." };
    }

    revalidateBlog(deleted[0].slug);
    return { ok: true, message: `Post "${deleted[0].title}" removed.` };
  } catch (error) {
    return fromUnknownError(error, "Could not remove the post.");
  }
}
