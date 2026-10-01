"use client";

import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
} from "react";

type StepIcon = "flask" | "steth" | "bowl" | "lotus" | "dumb" | "trend";

/** The journey from the founders' whiteboard: assess → guide → nourish → move → measure. */
const STEPS: Array<{
  title: string;
  detail: string;
  /** Path, badge and card border colour. */
  color: string;
  /** Number colour on the badge. */
  ink: string;
  /** Icon stroke on the card. */
  iconInk: string;
  icon: StepIcon;
}> = [
  {
    title: "Assess",
    detail: "Blood tests build your complete health profile",
    color: "#d4a73a",
    ink: "#2e2118",
    iconInk: "#9a7020",
    icon: "flask",
  },
  {
    title: "Nutritionist Consultation",
    detail: "Your goals and biomarkers, reviewed one-on-one",
    color: "#7e8f4e",
    ink: "#ffffff",
    iconInk: "#5d6c33",
    icon: "steth",
  },
  {
    title: "Personalised Meal Plan",
    detail: "Biomarker-informed fresh meals, made daily at Level 40",
    color: "#7a5640",
    ink: "#ffffff",
    iconInk: "#6a4835",
    icon: "bowl",
  },
  {
    title: "Yoga Consultation",
    detail: "Movement guidance matched to your body",
    color: "#e2c26e",
    ink: "#2e2118",
    iconInk: "#9a7a24",
    icon: "lotus",
  },
  {
    title: "Guided Fitness Plan",
    detail: "A routine you can actually keep",
    color: "#5b7236",
    ink: "#ffffff",
    iconInk: "#4a5e2a",
    icon: "dumb",
  },
  {
    title: "Progress",
    detail: "Measurable improvements, tracked with you",
    color: "#2e2118",
    ink: "#ffffff",
    iconInk: "#2e2118",
    icon: "trend",
  },
];

// Odd steps hook over the top of the card, even ones under the bottom, each
// ending in an arrowhead that points at the next step.
const ODD_PATH = "M6 150 V58 Q6 40 24 40 H210";
const EVEN_PATH = "M6 166 V258 Q6 276 24 276 H210";
const ODD_HEAD = "M209 33.5 L221 40 L209 46.5 Z";
const EVEN_HEAD = "M209 269.5 L221 276 L209 282.5 Z";

/** Time for the staggered draw-in to finish before the highlight starts cycling. */
const INTRO_MS = 4200;
const STEP_MS = 3000;

function Icon({ name, color }: { name: StepIcon; color: string }) {
  return (
    <svg
      className="jr-ico"
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {name === "flask" && (
        <>
          <path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.7 3h10.6a2 2 0 0 0 1.7-3l-5-9V3" />
          <path d="M7.4 15h9.2" />
        </>
      )}
      {name === "steth" && (
        <>
          <path d="M5 3H4v5a5 5 0 0 0 10 0V3h-1" />
          <path d="M9 13v1.5a5.5 5.5 0 0 0 11 0V12" />
          <circle cx="20" cy="10" r="2" />
        </>
      )}
      {name === "bowl" && (
        <>
          <path d="M3 11h18a9 9 0 0 1-18 0z" />
          <path d="M13 8c0-2.5 1.8-4.5 4.5-4.5 0 2.6-2 4.5-4.5 4.5z" />
          <path d="M8 11c0-2 1.2-3.6 3-4.2" />
        </>
      )}
      {name === "lotus" && (
        <>
          <path d="M12 20c-4.4 0-8.2-3-9-7 3.2 0 6.2 1.4 9 4.2 2.8-2.8 5.8-4.2 9-4.2-.8 4-4.6 7-9 7z" />
          <path d="M12 17.2c-2.2-2.4-3-5.6-1.8-9.7 1 .9 1.6 1.9 1.8 2.9.2-1 .8-2 1.8-2.9 1.2 4.1.4 7.3-1.8 9.7z" />
        </>
      )}
      {name === "dumb" && (
        <path d="M6.5 6.5v11M17.5 6.5v11M3.5 9.5v5M20.5 9.5v5M6.5 12h11" />
      )}
      {name === "trend" && (
        <>
          <path d="M3 17l6-6 4 4 8-8" />
          <path d="M15 7h6v6" />
        </>
      )}
    </svg>
  );
}

const REDUCED_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeReduced(onChange: () => void) {
  const query = window.matchMedia(REDUCED_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

/**
 * "Your journey with us": six steps whose paths draw in one after another
 * once the row scrolls into view, then a highlight walks the steps on a loop.
 * Hovering or focusing a step holds the highlight on it.
 */
export function JourneyFlow() {
  const stageRef = useRef<HTMLOListElement>(null);
  const [inView, setInView] = useState(false);
  const [active, setActive] = useState(-1);
  const [hover, setHover] = useState(false);
  const reduced = useSyncExternalStore(
    subscribeReduced,
    () => window.matchMedia(REDUCED_QUERY).matches,
    () => false,
  );
  // Bumped by "Replay" to restart the intro from scratch.
  const [run, setRun] = useState(0);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          observer.disconnect();
          setInView(true);
        }
      },
      { threshold: 0.25 },
    );
    observer.observe(stage);
    return () => observer.disconnect();
  }, [run]);

  useEffect(() => {
    if (!inView || hover || reduced) return;
    const timer = setTimeout(
      () => setActive((current) => (current + 1) % STEPS.length),
      active === -1 ? INTRO_MS : STEP_MS,
    );
    return () => clearTimeout(timer);
  }, [inView, hover, reduced, active]);

  const pick = (index: number) => {
    setActive(index);
    setHover(true);
  };

  const replay = () => {
    setInView(false);
    setActive(-1);
    setHover(false);
    // A fresh observer on the next run re-arms the intro on the next frame.
    setRun((value) => value + 1);
  };

  return (
    <div className="jr">
      <ol
        key={run}
        ref={stageRef}
        className={`jr-stage${inView ? " is-in" : ""}`}
        onMouseLeave={() => setHover(false)}
      >
        {STEPS.map((step, index) => {
          const odd = index % 2 === 0;
          const number = String(index + 1).padStart(2, "0");
          const isActive = index === active;
          return (
            <li
              key={step.title}
              className={`jr-col ${odd ? "jr-odd" : "jr-even"}${isActive ? " is-active" : ""}`}
              style={
                {
                  "--d": `${0.25 + index * 0.6}s`,
                  "--jc": step.color,
                } as CSSProperties
              }
            >
              <svg
                className="jr-svg"
                width="230"
                height="320"
                viewBox="0 0 230 320"
                aria-hidden="true"
              >
                <path
                  className="jr-line"
                  d={odd ? ODD_PATH : EVEN_PATH}
                  fill="none"
                  stroke={step.color}
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  className="jr-head"
                  d={odd ? ODD_HEAD : EVEN_HEAD}
                  fill={step.color}
                />
              </svg>
              <div className="jr-spark" aria-hidden="true" />
              <div className="jr-dwrap" aria-hidden="true">
                <div className="jr-dia">
                  <span style={{ color: step.ink }}>{number}</span>
                </div>
              </div>
              <div className="jr-card">
                <button
                  type="button"
                  className="jr-cardin"
                  onClick={() => pick(index)}
                  onMouseEnter={() => pick(index)}
                  onFocus={() => pick(index)}
                  onBlur={() => setHover(false)}
                  aria-label={`Step ${number}: ${step.title}`}
                  aria-current={isActive ? "step" : undefined}
                >
                  <Icon name={step.icon} color={step.iconInk} />
                  <span className="jr-title">{step.title}</span>
                </button>
              </div>
              <p className="jr-cap">{step.detail}</p>
            </li>
          );
        })}
      </ol>

      <button type="button" className="jr-replay" onClick={replay}>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M3 12a9 9 0 1 0 3-6.7" />
          <path d="M3 4v5h5" />
        </svg>
        Replay journey
      </button>
    </div>
  );
}
