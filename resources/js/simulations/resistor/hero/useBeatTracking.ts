import { useEffect } from "react";

import { ChapterId } from "@/resistor/lib/experience";
import { useLab } from "@/resistor/store";

/** Hero copy beats (data-hero-beat in landing.blade.php) mapped to the lab's camera chapters. */
const CHAPTER_FOR_BEAT: Record<string, ChapterId> = {
  intro: "intro",
  colorcode: "colorcode",
  measure: "measure",
  circuit: "circuit",
};

/**
 * Watches the beats scrolling over the pinned stage and tells the camera rig
 * which chapter to show. A thin band across the middle of the viewport decides
 * the active beat, so exactly one is current at a time. The beats are plain
 * HTML rendered by Blade, so the page reads fine without any of this.
 */
export function useBeatTracking(): void {
  useEffect(() => {
    const beats = Array.from(document.querySelectorAll<HTMLElement>("[data-hero-beat]"));
    if (beats.length === 0) return;

    const { setActiveChapter, setFocusedBand } = useLab.getState();

    const apply = (element: HTMLElement) => {
      const chapter = CHAPTER_FOR_BEAT[element.dataset.heroBeat ?? "intro"] ?? "intro";
      setActiveChapter(chapter);
      setFocusedBand(chapter === "colorcode" ? Number(element.dataset.step ?? 0) : null);
    };

    apply(beats[0]);

    if (!("IntersectionObserver" in window)) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) if (entry.isIntersecting) apply(entry.target as HTMLElement);
      },
      { rootMargin: "-45% 0px -45% 0px", threshold: 0 },
    );
    beats.forEach((beat) => observer.observe(beat));
    return () => observer.disconnect();
  }, []);
}
