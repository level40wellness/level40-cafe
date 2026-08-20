/**
 * Shared by the admin form and the server action so both sides normalise a
 * hashtag field the same way: "#HighProtein, wellness  #Coffee" →
 * ["highprotein", "wellness", "coffee"].
 */
export function parseHashtags(raw: string): string[] {
  const tags = raw
    .split(/[\s,]+/)
    .map((tag) => tag.replace(/^#+/, "").toLowerCase())
    .filter((tag) => tag.length > 0);
  return [...new Set(tags)];
}

export const MAX_HASHTAGS = 8;
export const MAX_BLOG_IMAGES = 4;

/** "2026-08-20T…" → "Aug 20, 2026", rendered the same on server and client. */
export function formatBlogDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}
