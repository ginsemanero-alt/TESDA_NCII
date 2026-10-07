import { useEffect } from "react";
import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";

import { ChapterId } from "@/resistor/lib/experience";
import { useLab } from "@/resistor/store";

gsap.registerPlugin(ScrollTrigger);

/**
 * Watches the chapter steps (elements with data-chapter / data-step) and
 * records which one the student is reading. The 3D camera and the 2D bench
 * both follow the store, so scroll drives the stage without either one
 * knowing about the other.
 */
export function useChapterTracking(): void {
  const stage = useLab((s) => s.stage);

  useEffect(() => {
    const { setActiveChapter, setFocusedBand, setInteractive } = useLab.getState();
    // On phones the stage covers the top of the screen, so the reading line
    // sits lower.
    const compact = window.matchMedia("(max-width: 767px)").matches;
    const start = compact ? "top 80%" : "top 58%";
    const end = compact ? "bottom 70%" : "bottom 42%";

    const steps = Array.from(document.querySelectorAll<HTMLElement>("#lab-chapters [data-chapter]"));

    const triggers = steps.map((element) =>
      ScrollTrigger.create({
        trigger: element,
        start,
        end,
        onToggle: ({ isActive }) => {
          if (!isActive) return;
          const chapter = element.dataset.chapter as ChapterId;
          const step = element.dataset.step;
          setActiveChapter(chapter);
          setFocusedBand(chapter === "colorcode" && step !== undefined ? Number(step) : null);
          setInteractive(chapter === "build");
        },
      }),
    );

    // Layout shifts when the stage mode changes; recompute positions.
    const refresh = window.setTimeout(() => ScrollTrigger.refresh(), 120);

    return () => {
      window.clearTimeout(refresh);
      triggers.forEach((trigger) => trigger.kill());
    };
  }, [stage]);
}

/** Scrolls a chapter into the reading position. Used by the chapter buttons. */
export function goToChapter(chapter: ChapterId): void {
  const element = document.querySelector<HTMLElement>(`#lab-chapters [data-chapter="${chapter}"]`);
  if (!element) return;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  element.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "center" });
  const focusTarget = element.querySelector<HTMLElement>("h3");
  focusTarget?.setAttribute("tabindex", "-1");
  focusTarget?.focus({ preventScroll: true });
}
