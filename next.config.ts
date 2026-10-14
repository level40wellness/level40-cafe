import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    /**
     * Blob photos are immutable (each upload gets a random suffix), so an
     * optimised copy can be cached for a long time. The optimizer then fetches
     * the original from Blob about once a month per size instead of every few
     * hours — Blob data transfer is the scarce resource on the Hobby plan.
     */
    minimumCacheTTL: 2678400, // 31 days
    qualities: [75],
    /**
     * Product photos uploaded through the admin console live in Vercel Blob,
     * and next/image refuses any remote host not listed here.
     *
     * The store id forms part of the hostname and is not known until the Blob
     * store exists, so the subdomain is a wildcard. That does mean the
     * optimizer would serve an image from another public Blob store — but
     * reaching it requires writing a URL into our products table, which needs
     * the admin role, so it widens nothing an admin could not already do.
     */
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
        pathname: "/**",
      },
      /**
       * The NeatByNikky product photos are imported by URL and still served from
       * the original WordPress media library. Scoped to the uploads path so the
       * optimizer cannot be pointed at arbitrary paths on the host. Writing one
       * of these URLs into a product needs the admin role, as with Blob above.
       */
      {
        protocol: "https",
        hostname: "www.neatbynicky.com",
        pathname: "/wp-content/uploads/**",
      },
      {
        protocol: "https",
        hostname: "neatbynicky.com",
        pathname: "/wp-content/uploads/**",
      },
    ],
  },
};

export default nextConfig;
