"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * One-shot scroll-reveal runner. Mounted once at the layout level (so
 * it survives soft navigation), but the effect rebinds on every route
 * change — Next App Router replaces page DOM under the layout without
 * remounting the layout itself, so an observer captured on first mount
 * holds dead references to the previous page's elements while the new
 * page's elements stay un-observed at opacity:0 forever.
 *
 * `usePathname` in the dep array forces the effect to re-query every
 * `[data-reveal]:not(.is-revealed)` element after each route change.
 * Already-revealed elements are skipped so we don't pay an observer
 * subscription on content the user has already seen.
 *
 * After firing for a given element we unobserve it — scrolling back up
 * (or visiting a section twice) won't blink. Respects
 * `prefers-reduced-motion`: under that pref every fresh reveal element
 * is marked immediately so the page lays out as if the motion had
 * already run.
 */
export function ScrollRevealRunner() {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Only target elements that haven't been revealed yet — important
    // when the same layout is reused across routes, since previously-
    // revealed elements (from another page or another visit) shouldn't
    // get re-observed nor reset.
    const targets = document.querySelectorAll<HTMLElement>(
      "[data-reveal]:not(.is-revealed)",
    );
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
  }, [pathname]);

  return null;
}
