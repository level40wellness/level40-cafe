import type { Metadata } from "next";
import Link from "next/link";
import {
  Coffee,
  Flower2,
  Salad,
  ShoppingBag,
  Truck,
  Utensils,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Services",
  description:
    "Healthy dining, specialty coffee, pickup & delivery, nutritionist-guided meal plans, holistic yoga and NEAT by Nicky wellness retail — Level 40's services in Dubai.",
  alternates: { canonical: "/services" },
};

const SERVICES = [
  {
    icon: Utensils,
    title: "Healthy Dining",
    body: "High-protein vegetarian breakfasts, power bowls and wholesome mains — dine in and order from the QR code at your table.",
  },
  {
    icon: Coffee,
    title: "Specialty Coffee",
    body: "Thoughtfully sourced, expertly crafted — from your morning espresso to functional, wellness-inspired favourites.",
  },
  {
    icon: Truck,
    title: "Pickup & Delivery",
    body: "Order ahead from anywhere in Dubai — call +971 56 454 8896 and your meal is packaged with care, ready when you are.",
  },
  {
    icon: Salad,
    title: "Nutritionist-Guided Meal Plans",
    body: "Biomarker-informed programmes for Diabetes, Weight Management, PCOS, Cholesterol and Longevity — made fresh daily.",
  },
  {
    icon: Flower2,
    title: "Holistic Yoga",
    body: "Guided yoga, mobility, breathwork and mindful movement, through personalized and group wellness experiences.",
  },
  {
    icon: ShoppingBag,
    title: "NEAT by Nicky Retail",
    body: "A curated wellness retail experience — premium activewear, yoga essentials, accessories and lifestyle products.",
  },
] as const;

export default function ServicesPage() {
  return (
    <>
      <section className="border-b border-border page-header-decor py-20 sm:py-24">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <p className="text-[11px] uppercase tracking-[0.2em] text-brass">
            Services
          </p>
          <h1 className="mt-3 font-display text-5xl text-balance sm:text-6xl">
            Six ways to live well at Level 40.
          </h1>
          <p className="mt-5 text-lg text-muted-foreground">
            From a quiet espresso to a fully guided wellness programme — we are
            designed around how Dubai wants to live well.
          </p>
        </div>
      </section>

      <section className="bg-background py-20">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 sm:px-6 md:grid-cols-2 lg:grid-cols-3 lg:px-8">
          {SERVICES.map(({ icon: Icon, title, body }) => (
            <div
              key={title}
              className="rounded-2xl border border-border bg-card p-7 transition hover:border-brass"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-brass">
                <Icon className="h-5 w-5" />
              </div>
              <h2 className="mt-5 font-display text-2xl">{title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {body}
              </p>
            </div>
          ))}
        </div>

        <div className="mx-auto mt-16 max-w-3xl px-4 text-center sm:px-6">
          <h2 className="font-display text-3xl">Ready to order?</h2>
          <Link
            href="/menu"
            className="mt-6 inline-flex h-12 items-center justify-center rounded-full bg-primary px-8 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Browse Menu
          </Link>
        </div>
      </section>
    </>
  );
}
