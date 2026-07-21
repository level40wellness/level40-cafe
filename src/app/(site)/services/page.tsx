import type { Metadata } from "next";
import Link from "next/link";
import {
  CalendarHeart,
  Coffee,
  Gift,
  QrCode,
  Truck,
  Utensils,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Services",
  description:
    "Dine-in, QR table ordering, pickup, private events, gifting and catering.",
  alternates: { canonical: "/services" },
};

const SERVICES = [
  {
    icon: Utensils,
    title: "Dine-In",
    body: "Reserve a table in our marble-and-brass dining room. Lunch, dinner, late-night sweets.",
  },
  {
    icon: QrCode,
    title: "Scan & Order",
    body: "Every table carries a QR code. Browse, customise and pay from your phone — no waiting.",
  },
  {
    icon: Truck,
    title: "Pickup",
    body: "Order ahead from anywhere in Dubai. Ready in roughly 45 minutes, packaged with care.",
  },
  {
    icon: CalendarHeart,
    title: "Private Events",
    body: "Buy out a corner or the whole room for birthdays, brand dinners and intimate weddings.",
  },
  {
    icon: Coffee,
    title: "Coffee Programme",
    body: "A small-batch coffee bar with Arabic gahwa, saffron karak and seasonal espresso.",
  },
  {
    icon: Gift,
    title: "Gifting & Hampers",
    body: "Hand-built hampers of dates, sweets and spice tins for Ramadan, Eid and personal gifting.",
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
            Six ways to enjoy Level 40.
          </h1>
          <p className="mt-5 text-lg text-muted-foreground">
            From a quiet espresso to a fifty-guest dinner — we are designed
            around how Dubai wants to eat.
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
