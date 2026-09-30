import { useEffect, type RefObject } from "react";

/**
 * Adds `.in` to every `.reveal` inside `containerRef` the first time it scrolls into view
 * (threshold 0.12, as in the template), then stops watching it.
 * Without IntersectionObserver everything is revealed at once, so no section stays invisible.
 */
export function useReveal(containerRef: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const els = container.querySelectorAll(".reveal");

    if (typeof IntersectionObserver === "undefined") {
      els.forEach((el) => el.classList.add("in"));
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12 },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [containerRef]);
}
