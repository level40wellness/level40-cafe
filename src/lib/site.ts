/**
 * Canonical origin, used for metadataBase, canonicals, JSON-LD, sitemap and
 * robots. The source app hardcoded https://level40.lovable.app in several
 * places, which would have shipped wrong canonicals on the new domain.
 *
 * Set BETTER_AUTH_URL to the production origin at deploy time; it already has
 * to be correct for OAuth callbacks, so there is one value to get right rather
 * than two that can drift.
 */
export const SITE_URL = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";

export const SITE_NAME = "Level 40 Café";

/**
 * One map target for the whole site — the contact page's embed and the
 * footer's directions link both point here, so they cannot drift.
 */
export const MAP_QUERY =
  "Continents+Tower+District+13+Al+Barsha+South+Fourth+Jumeirah+Village+Circle+Dubai";

export const MAP_DIRECTIONS_URL = `https://www.google.com/maps/dir/?api=1&destination=${MAP_QUERY}`;
