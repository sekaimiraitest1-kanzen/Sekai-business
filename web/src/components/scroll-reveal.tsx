"use client";

import { useEffect } from "react";

/**
 * One-shot scroll-reveal runner. Mounted once at the layout level; finds
 * every element with a `data-reveal` attribute and toggles `.is-revealed`
 * the first time it enters the viewport. After firing, the element is
 * unobserved — scrolling back up shows it as already-revealed (no
 * blink, no double-firing, no listener overhead on long pages).
 *
 * Respects `prefers-reduced-motion`: if the user has it on, every reveal
 * element is marked immediately so the page lays out as if the animation
 * had already run.
 *
 * Trigger threshold: 12% of the element visible OR top edge clearing
 * the bottom 8% of viewport — fires slightly before the element is
 * fully on-screen so the motion lands as the user reads, not after.
 */
export function ScrollRevealRunner() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const targets = document.querySelectorAll<HTMLElement>("[data-reveal]");
    if (targets.length === 0) return;

    const reduce =
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduce) {
      targets.forEach((el) => el.classList.add("is-revealed"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add("is-revealed");
          observer.unobserve(entry.target);
        }
      },
      {
        rootMargin: "0px 0px -8% 0px",
        threshold: 0.12,
      },
    );

    targets.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  return null;
}
