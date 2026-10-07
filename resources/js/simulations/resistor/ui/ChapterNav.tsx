import clsx from "clsx";

import { ChapterId } from "@/resistor/lib/experience";
import { goToChapter } from "@/resistor/hooks/useChapterTracking";
import { useLab } from "@/resistor/store";

export const CHAPTER_TITLES: { id: ChapterId; title: string }[] = [
  { id: "intro", title: "The part" },
  { id: "colorcode", title: "Colour code" },
  { id: "measure", title: "Measure it" },
  { id: "circuit", title: "Current" },
  { id: "ohmslaw", title: "Ohm's law" },
  { id: "build", title: "Build your own" },
];

/** Jump links for keyboard users and anyone who does not want to scroll. */
export default function ChapterNav() {
  const active = useLab((s) => s.activeChapter);

  return (
    <nav aria-label="Lab chapters" className="border-t border-chalk/10 px-3 py-2 md:px-10" data-ui>
      <ol className="flex gap-1 overflow-x-auto [scrollbar-width:none]">
        {CHAPTER_TITLES.map((chapter, index) => (
          <li key={chapter.id} className="flex-none">
            <button
              type="button"
              onClick={() => goToChapter(chapter.id)}
              aria-current={active === chapter.id ? "step" : undefined}
              className={clsx(
                "flex min-h-10 items-center gap-2 rounded-full px-3 text-[13px] font-semibold whitespace-nowrap transition-colors",
                active === chapter.id ? "bg-chalk/10 text-chalk" : "text-sage hover:text-chalk",
              )}
            >
              <span className="font-mono text-[11px] text-copper-lt">{String(index + 1).padStart(2, "0")}</span>
              {chapter.title}
            </button>
          </li>
        ))}
        <li className="flex-none">
          <button
            type="button"
            onClick={() => document.getElementById("lab-checkpoints")?.scrollIntoView({ behavior: "smooth", block: "start" })}
            className="flex min-h-10 items-center gap-2 rounded-full px-3 text-[13px] font-semibold whitespace-nowrap text-copper-lt hover:text-chalk"
          >
            Checkpoints →
          </button>
        </li>
      </ol>
    </nav>
  );
}
