import type { Metadata } from "next";
import Image from "next/image";

import { HERO_IMG } from "@/lib/images";

export const metadata: Metadata = {
  title: "Gallery",
  description:
    "A look inside Level 40 — dishes, room, and the small details that make us.",
  alternates: { canonical: "/gallery" },
};

const ITEMS = [
  { src: HERO_IMG.table, alt: "Signature table spread", span: "md:col-span-2 md:row-span-2" },
  { src: HERO_IMG.dish1, alt: "Saffron lamb skewers", span: "" },
  { src: HERO_IMG.interior, alt: "Café interior", span: "md:col-span-2" },
  { src: HERO_IMG.chef, alt: "Chef plating a dish", span: "" },
  { src: HERO_IMG.cafeInterior, alt: "Dining room at dusk", span: "" },
  { src: HERO_IMG.interior, alt: "Banquette seating", span: "md:col-span-2" },
] as const;

export default function GalleryPage() {
  return (
    <>
      <section className="border-b border-border page-header-decor py-20 sm:py-24">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <p className="text-[11px] uppercase tracking-[0.2em] text-brass">
            Gallery
          </p>
          <h1 className="mt-3 font-display text-5xl sm:text-6xl">
            A room, a table, a moment.
          </h1>
          <p className="mt-5 text-muted-foreground">
            Small frames from the café — taken between services.
          </p>
        </div>
      </section>

      <section className="bg-background py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid auto-rows-[220px] gap-4 sm:grid-cols-2 md:grid-cols-4">
            {ITEMS.map((item, index) => (
              <figure
                key={`${item.src}-${index}`}
                className={`relative overflow-hidden rounded-2xl ${item.span}`}
              >
                <Image
                  src={item.src}
                  alt={item.alt}
                  fill
                  sizes="(min-width: 768px) 50vw, 100vw"
                  className="object-cover transition duration-700 hover:scale-105"
                  priority={index === 0}
                />
              </figure>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
