"use client";

import { useEffect } from "react";

/**
 * The brand CSS animates elements marked `.reveal` once they gain `.in`. The
 * source app repeated this IntersectionObserver in every page component; here
 * it is one client component the server-rendered pages can drop in, so the
 * pages themselves stay Server Components.
 */
export function ScrollReveal({ threshold = 0.1 }: { threshold?: number }) {
  useEffect(() => {
    const targets = document.querySelectorAll(".reveal");

    // Without IntersectionObserver, reveal everything rather than hiding it.
    if (!("IntersectionObserver" in window)) {
      targets.forEach((element) => element.classList.add("in"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add("in");
          observer.unobserve(entry.target);
        }
      },
      { threshold },
    );

    targets.forEach((element) => observer.observe(element));

    return () => observer.disconnect();
  }, [threshold]);

  return null;
}
