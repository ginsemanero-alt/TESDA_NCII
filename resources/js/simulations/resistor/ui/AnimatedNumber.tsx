import { useEffect, useRef } from "react";
import gsap from "gsap";

type Props = {
  value: number;
  /** Stable formatter, a module-level function from lib/resistor. */
  format: (value: number) => string;
  className?: string;
};

/**
 * Counts from the previous value to the new one by writing straight to the DOM
 * node, so a slider drag never re-renders the tree behind it. Screen readers
 * get the final value only, via aria-label.
 */
export default function AnimatedNumber({ value, format, className }: Props) {
  const ref = useRef<HTMLSpanElement>(null);
  const current = useRef(value);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!Number.isFinite(value) || reduced) {
      node.textContent = format(value);
      current.current = value;
      return;
    }

    const state = { value: Number.isFinite(current.current) ? current.current : value };
    const tween = gsap.to(state, {
      value,
      duration: 0.55,
      ease: "power2.out",
      onUpdate: () => {
        current.current = state.value;
        node.textContent = format(state.value);
      },
    });

    return () => {
      tween.kill();
    };
  }, [value, format]);

  return (
    <span ref={ref} className={className} aria-label={format(value)}>
      {format(value)}
    </span>
  );
}
