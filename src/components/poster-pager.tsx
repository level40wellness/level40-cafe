"use client";

import { useRef, useState } from "react";

const SWIPE_THRESHOLD_PX = 40;
/** Must match the .deck-card transition duration in level40.css. */
const LEAVE_ANIMATION_MS = 500;

type Slide = { image: string; alt?: string };

/**
 * Card-deck pager: the active poster shows in full at readable width with
 * the remaining posters stacked behind it like playing cards. Clicking (or
 * tapping) the deck swipes the top card away to reveal the next; a left
 * swipe does the same and a right swipe brings the previous card back.
 */
export function PosterPager({
  slides,
  className,
}: {
  slides: Slide[];
  className?: string;
}) {
  const [active, setActive] = useState(0);
  const [leaving, setLeaving] = useState<number | null>(null);
  const dragStartX = useRef<number | null>(null);
  const animating = useRef(false);

  const next = () => {
    if (animating.current) return;
    animating.current = true;
    setLeaving(active);
    setActive((active + 1) % slides.length);
    setTimeout(() => {
      setLeaving(null);
      animating.current = false;
    }, LEAVE_ANIMATION_MS);
  };

  // No fly-away needed backwards: the previous card simply glides from the
  // back of the stack to the front via the depth transition.
  const prev = () => {
    if (animating.current) return;
    setActive((active - 1 + slides.length) % slides.length);
  };

  return (
    <div className={`pp${className ? ` ${className}` : ""}`}>
      <div
        className="deck"
        role="button"
        tabIndex={0}
        aria-label="Show next poster"
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            next();
          }
        }}
        onPointerDown={(event) => {
          dragStartX.current = event.clientX;
        }}
        onPointerCancel={() => {
          dragStartX.current = null;
        }}
        onPointerUp={(event) => {
          if (dragStartX.current === null) return;
          const deltaX = event.clientX - dragStartX.current;
          dragStartX.current = null;
          if (deltaX <= -SWIPE_THRESHOLD_PX) next();
          else if (deltaX >= SWIPE_THRESHOLD_PX) prev();
          else next(); // plain click / tap
        }}
      >
        {slides.map((slide, index) => {
          const depth = (index - active + slides.length) % slides.length;
          return (
            <div
              key={slide.image}
              className={`deck-card${index === leaving ? " is-leaving" : ""}`}
              style={
                {
                  "--d": depth,
                  zIndex:
                    index === leaving
                      ? slides.length + 1
                      : slides.length - depth,
                } as React.CSSProperties
              }
              aria-hidden={depth !== 0}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={slide.image} alt={slide.alt ?? ""} draggable={false} />
            </div>
          );
        })}
      </div>

      <div className="pp-dots" role="tablist" aria-label="Posters">
        {slides.map((slide, index) => (
          <button
            key={slide.image}
            type="button"
            role="tab"
            aria-selected={index === active}
            aria-label={slide.alt ?? `Poster ${index + 1}`}
            className={`pp-dot${index === active ? " is-active" : ""}`}
            onClick={() => setActive(index)}
          />
        ))}
      </div>
    </div>
  );
}
