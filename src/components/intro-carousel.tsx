"use client";

import { useEffect, useRef, useState } from "react";

const AUTO_ADVANCE_MS = 4500;
/** After a manual swipe, hold off auto-advance so the user's pick stays visible. */
const INTERACTION_PAUSE_MS = 8000;
const SWIPE_THRESHOLD_PX = 40;

type Slide = { image: string; label?: string };

export function IntroCarousel({
  slides,
  tag,
  className,
}: {
  slides: Slide[];
  /** Corner ribbon text; omitted → no ribbon. */
  tag?: string;
  /** Extra classes on the root, e.g. "reveal". */
  className?: string;
}) {
  const [active, setActive] = useState(0);
  const dragStartX = useRef<number | null>(null);
  const pausedUntil = useRef(0);

  useEffect(() => {
    const id = setInterval(() => {
      if (Date.now() < pausedUntil.current) return;
      setActive((i) => (i + 1) % slides.length);
    }, AUTO_ADVANCE_MS);
    return () => clearInterval(id);
  }, [slides.length]);

  const goTo = (index: number) => {
    pausedUntil.current = Date.now() + INTERACTION_PAUSE_MS;
    setActive(((index % slides.length) + slides.length) % slides.length);
  };

  const activeLabel = slides[active].label;

  return (
    <div
      className={`imgcol intro-carousel${className ? ` ${className}` : ""}`}
      onPointerDown={(event) => {
        dragStartX.current = event.clientX;
      }}
      onPointerUp={(event) => {
        if (dragStartX.current === null) return;
        const deltaX = event.clientX - dragStartX.current;
        dragStartX.current = null;
        if (Math.abs(deltaX) >= SWIPE_THRESHOLD_PX) {
          goTo(active + (deltaX < 0 ? 1 : -1));
        }
      }}
      onPointerCancel={() => {
        dragStartX.current = null;
      }}
    >
      {slides.map((slide, index) => (
        <div
          key={slide.image}
          className={`ic-slide${index === active ? " is-active" : ""}`}
          style={{ backgroundImage: `url('${slide.image}')` }}
          aria-hidden={index !== active}
        />
      ))}

      {activeLabel && (
        <span className="ic-label" key={activeLabel}>
          {activeLabel}
        </span>
      )}
      {tag && <span className="tag">{tag}</span>}

      <div className="ic-dots" role="tablist" aria-label="Image carousel">
        {slides.map((slide, index) => (
          <button
            key={slide.image}
            type="button"
            role="tab"
            aria-selected={index === active}
            aria-label={slide.label ?? `Slide ${index + 1}`}
            className={`ic-dot${index === active ? " is-active" : ""}`}
            onClick={() => goTo(index)}
          />
        ))}
      </div>
    </div>
  );
}
