import type { Metadata } from "next";

/** A "use client" page cannot export metadata, so it lives here. */
export const metadata: Metadata = {
  title: "Your Cart",
  description:
    "Review your Level 40 order — adjust quantities and continue to checkout for dine-in or pickup in Dubai.",
  alternates: { canonical: "/cart" },
};

export default function CartLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
