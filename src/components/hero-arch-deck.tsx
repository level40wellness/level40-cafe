"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { HeroPillArt, type HeroPill } from "@/components/hero-pill-art";

const INTERVAL_MS = 3600;
const SWIPE_PX = 40;
/** Only the phone layout shows the deck; elsewhere it is display:none. */
const DECK_QUERY = "(max-width: 760px)";

/**
 * Phone hero: the concept CTA with a slide counter, then the hero tiles fanned
 * out as an arch of cards that advances on its own. Tapping a side card brings
 * it forward, tapping the front card opens its page, and a sideways swipe
 * steps through the deck.
 */
export function HeroArchDeck({
  pills,
  ctaHref,
}: {
  pills: HeroPill[];
  ctaHref: string;
}) {
  const router = useRouter();
  const n = pills.length;
  const [active, setActive] = useState(0);
  // Bumped on every manual pick so the autoplay timer and the progress fill
  // restart even when the picked card is already the active one.
  const [cycle, setCycle] = useState(0);
  const [autoplay, setAutoplay] = useState(false);
  const touchX = useRef<number | null>(null);

  useEffect(() => {
    const deck = window.matchMedia(DECK_QUERY);
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setAutoplay(deck.matches && !calm.matches);
    sync();
    deck.addEventListener("change", sync);
    calm.addEventListener("change", sync);
    return () => {
      deck.removeEventListener("change", sync);
      calm.removeEventListener("change", sync);
    };
  }, []);

  useEffect(() => {
    if (!autoplay) return;
    const timer = setTimeout(
      () => setActive((current) => (current + 1) % n),
      INTERVAL_MS,
    );
    return () => clearTimeout(timer);
  }, [active, cycle, autoplay, n]);

  const pick = (index: number) => {
    setActive(((index % n) + n) % n);
    setCycle((value) => value + 1);
  };

  const pad = (value: number) => String(value).padStart(2, "0");

  return (
    <div className="l40-deck-wrap">
      <div
        className="l40-deck-cta l40-deck-rise"
        style={{ animationDelay: "0.7s" }}
      >
        <Link href={ctaHref} className="l40-deck-btn">
          Our concept
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M5 12h14" />
            <path d="M13 6l6 6-6 6" />
          </svg>
        </Link>
        <span className="l40-deck-count" aria-live="polite">
          {pad(active + 1)} / {pad(n)}
        </span>
      </div>

      <div
        className="l40-deck l40-deck-rise"
        style={{ animationDelay: "0.85s" }}
        onTouchStart={(event) => {
          touchX.current = event.touches[0]?.clientX ?? null;
        }}
        onTouchEnd={(event) => {
          const start = touchX.current;
          touchX.current = null;
          const end = event.changedTouches[0]?.clientX;
          if (start === null || end === undefined) return;
          const dx = end - start;
          if (Math.abs(dx) >= SWIPE_PX) pick(active + (dx < 0 ? 1 : -1));
        }}
      >
        {pills.map((pill, index) => {
          // Signed distance from the front card, wrapped so the deck loops.
          let d = index - active;
          if (d > n / 2) d -= n;
          if (d < -n / 2) d += n;
          const ad = Math.abs(d);
          const scale = ad === 0 ? 1 : ad === 1 ? 0.84 : 0.7;

          return (
            <button
              key={pill.label}
              type="button"
              className="l40-deck-card"
              aria-label={
                ad === 0 ? `Open ${pill.label}` : `Show ${pill.label}`
              }
              tabIndex={ad > 1 ? -1 : 0}
              onClick={() => (ad === 0 ? router.push(pill.href) : pick(index))}
              style={{
                transform: `translateX(${d * 120}px) translateY(${ad * 14}px) rotate(${d * 4}deg) scale(${scale})`,
                filter:
                  ad === 0
                    ? `drop-shadow(0 26px 24px ${pill.tone})`
                    : `brightness(${ad === 1 ? 0.9 : 0.8}) drop-shadow(0 10px 14px rgba(43, 31, 23, 0.18))`,
                opacity: ad === 0 ? 1 : ad === 1 ? 0.95 : 0,
                zIndex: 10 - ad,
              }}
            >
              <span className="l40-deck-frame">
                <HeroPillArt pill={pill} className="l40-deck-img" />
              </span>
            </button>
          );
        })}
      </div>

      <div className="l40-deck-foot">
        <div className="l40-deck-caps">
          {pills.map((pill, index) => {
            const d = index - active;
            return (
              <p
                key={pill.label}
                className="l40-deck-cap"
                aria-hidden={d !== 0}
                style={{
                  opacity: d === 0 ? 1 : 0,
                  transform:
                    d === 0 ? "none" : `translateY(${d > 0 ? 10 : -10}px)`,
                }}
              >
                {pill.label}
              </p>
            );
          })}
        </div>
        <div className="l40-deck-progress" aria-hidden="true">
          {pills.map((pill, index) => (
            <div key={pill.label} className="l40-deck-bar">
              {index < active && <div className="l40-deck-bar-done" />}
              {index === active && (
                <div
                  key={`${active}-${cycle}`}
                  className={
                    autoplay ? "l40-deck-bar-fill" : "l40-deck-bar-done"
                  }
                  style={{ animationDuration: `${INTERVAL_MS}ms` }}
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
