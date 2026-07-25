"use client";

import Image from "next/image";
import { useState } from "react";

/**
 * Product image gallery: one large main image with a thumbnail strip beneath.
 * Clicking a thumbnail promotes it to the main image. With a single image it
 * renders just the main frame (no strip); with none, an empty placeholder that
 * keeps the page layout intact.
 */
export function ProductGallery({ images, name }: { images: string[]; name: string }) {
  const [active, setActive] = useState(0);

  // Guard against a stale index if the list ever changes under the component.
  const current = Math.min(active, Math.max(images.length - 1, 0));

  if (images.length === 0) {
    return (
      <div className="relative aspect-square overflow-hidden rounded-2xl border border-border bg-secondary" />
    );
  }

  return (
    <div>
      <div className="relative aspect-square overflow-hidden rounded-2xl border border-border bg-secondary">
        <Image
          src={images[current]}
          alt={name}
          fill
          sizes="(min-width: 1024px) 50vw, 100vw"
          className="object-cover"
          priority
        />
      </div>

      {images.length > 1 && (
        <div className="mt-3 flex flex-wrap gap-3">
          {images.map((src, index) => (
            <button
              key={`${src}-${index}`}
              type="button"
              onClick={() => setActive(index)}
              aria-label={`Show image ${index + 1} of ${images.length}`}
              aria-current={index === current}
              className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border transition ${
                index === current
                  ? "border-brass ring-1 ring-brass"
                  : "border-border hover:border-brass/60"
              }`}
            >
              <Image src={src} alt="" fill sizes="64px" className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
