/**
 * The source app's l40-images.ts pointed at absolute level40.lovable.app CDN
 * URLs, which stop resolving the moment the old deployment goes away. These
 * ship from /public instead.
 */
export const HERO_IMG = {
  table: "/images/hero-table.jpg",
  interior: "/images/interior.jpg",
  cafeInterior: "/images/cafe-interior-hero.jpg",
  dish1: "/images/dish-1.jpg",
  // Was a hotlinked Unsplash photo; we have a licensed local shot.
  chef: "/images/chef-plating.jpg",
} as const;
