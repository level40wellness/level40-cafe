import type { Metadata } from "next";
import { Cormorant_Garamond, Fraunces, Inter, Jost } from "next/font/google";

import { Toaster } from "sonner";

import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { SITE_URL } from "@/lib/site";
import { cn } from "@/lib/utils";

/**
 * The source app pulled these from a Google Fonts <link>, which blocks render
 * on a third-party round trip. Self-hosted here with the same weights and axes.
 */
const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-cormorant",
  display: "swap",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--font-fraunces",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jost = Jost({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  variable: "--font-jost",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Level 40 — Modern Café in Dubai",
    template: "%s — Level 40",
  },
  description:
    "Level 40 is a modern Dubai café — chef-driven Arabian cuisine, dine-in QR ordering, and pickup.",
  authors: [{ name: "Level 40 Café" }],
  openGraph: {
    type: "website",
    siteName: "Level 40 Café",
    locale: "en_AE",
  },
  twitter: { card: "summary_large_image" },
};

/**
 * Deliberately minimal: fonts, theme and the toast portal, nothing else.
 *
 * The site header, footer and cart drawer live in (site)/layout.tsx instead. A
 * nested layout can only add to its parent, never remove from it, so leaving
 * the chrome here would have painted a storefront header across every admin
 * screen with no way to opt out.
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      // Next 16 no longer overrides scroll-behavior during navigation. Without
      // this, level40.css's `html{scroll-behavior:smooth}` makes every route
      // change animate its scroll to top.
      data-scroll-behavior="smooth"
      className={cn(
        cormorant.variable,
        fraunces.variable,
        inter.variable,
        jost.variable,
      )}
    >
      <body>
        <ThemeProvider>
          {children}
          <Toaster position="bottom-right" richColors />
        </ThemeProvider>
      </body>
    </html>
  );
}
