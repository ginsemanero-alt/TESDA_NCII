import { ReactNode } from "react";
import clsx from "clsx";

import { ChapterId } from "@/resistor/lib/experience";

type Props = {
  id: ChapterId;
  number: number;
  title: string;
  /** TR reference shown as a small tag, e.g. "ELC724205 · 2.4.4". */
  tr: string;
  children: ReactNode;
  /** Set when the chapter is split into steps; each step tracks itself. */
  stepped?: boolean;
  className?: string;
};

/**
 * One chapter of the lab. Its height gives the scroll room the camera needs to
 * settle; on phones it is just its content, because the stage sits above.
 */
export default function Chapter({ id, number, title, tr, children, stepped = false, className }: Props) {
  return (
    <section
      aria-labelledby={`lab-${id}-title`}
      {...(stepped ? {} : { "data-chapter": id })}
      className={clsx("border-b border-chalk/10 py-10 last:border-b-0 md:min-h-[78vh] md:py-[18vh]", className)}
    >
      <p className="font-mono text-[11px] tracking-[0.12em] text-copper-lt uppercase">
        {String(number).padStart(2, "0")} · {tr}
      </p>
      <h3 id={`lab-${id}-title`} className="mt-2 text-[clamp(1.8rem,3.6vw,2.9rem)] leading-[0.92] font-black tracking-[-0.025em] text-chalk uppercase outline-none">
        {title}
      </h3>
      <div className="mt-5 text-[15px] leading-relaxed text-sage">{children}</div>
    </section>
  );
}
