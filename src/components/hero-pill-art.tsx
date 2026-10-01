import type { CSSProperties } from "react";

/** One hero tile: shared by the desktop pill row and the mobile arch deck. */
export type HeroPill = {
  image: string;
  /** Two photos split by a splash seam, shown instead of `image`. */
  duo?: [string, string];
  label: string;
  href: string;
  /** background-position for the crop; defaults to center */
  position?: string;
  /** rgba glow cast under the tile when it is the active deck card */
  tone: string;
};

/**
 * The photo fill for a hero tile. `className` carries the shape (tall pill on
 * desktop, rounded card in the mobile deck); the duo variant lays its two
 * photos and splash out in percentages, so it fits either shape.
 */
export function HeroPillArt({
  pill,
  className,
  style,
}: {
  pill: HeroPill;
  className: string;
  style?: CSSProperties;
}) {
  if (!pill.duo) {
    return (
      <div
        className={className}
        style={{
          backgroundImage: `url('${pill.image}')`,
          backgroundPosition: pill.position ?? "center",
          ...style,
        }}
      />
    );
  }

  return (
    <div className={`${className} l40-pill-duo`} style={style}>
      <div
        className="l40-duo-photo l40-duo-b"
        style={{ backgroundImage: `url('${pill.duo[1]}')` }}
      />
      <div className="l40-duo-photo l40-duo-a">
        <div
          className="l40-duo-a-img"
          style={{ backgroundImage: `url('${pill.duo[0]}')` }}
        />
      </div>
      <svg
        className="l40-duo-splash"
        viewBox="0 0 100 40"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path
          className="l40-duo-splash-gold"
          d="M0 21 C14 9 26 27 40 19 S66 7 78 17 S94 25 100 15 L100 25 C90 33 80 23 68 27 S44 35 32 29 S10 25 0 31 Z"
        />
        <path
          className="l40-duo-splash-cream"
          d="M0 23 C14 12 26 28 40 21 S66 10 78 19 S94 26 100 18 L100 22 C90 29 80 21 68 24 S44 31 32 26 S10 23 0 28 Z"
        />
      </svg>
      <span className="l40-duo-drop l40-duo-drop-1" />
      <span className="l40-duo-drop l40-duo-drop-2" />
      <span className="l40-duo-drop l40-duo-drop-3" />
    </div>
  );
}
