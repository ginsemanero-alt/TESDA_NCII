import clsx from "clsx";

import { useLab } from "@/resistor/store";
import { BAND_COLORS, BAND_ROLES, bandContribution, formatOhms, readBands } from "@/resistor/lib/resistor";
import { swatchClass } from "@/resistor/ui/BandPicker";

const DIGITS = ["black", "brown", "red", "orange", "yellow", "green", "blue", "violet", "grey", "white"] as const;

/**
 * TR ELC724205 2.4.4. The chapter is four steps, one per band; the camera
 * moves along the part as each step reaches the reading line.
 */
export default function ColorCode() {
  const bands = useLab((s) => s.bands);
  const focusedBand = useLab((s) => s.focusedBand);
  const value = readBands(bands);

  return (
    <section aria-labelledby="lab-colorcode-title" className="border-b border-chalk/10 py-10 md:py-[14vh]">
      <p className="font-mono text-[11px] tracking-[0.12em] text-copper-lt uppercase">02 · ELC724205 · 2.4.4</p>
      <h3 id="lab-colorcode-title" className="mt-2 text-[clamp(1.8rem,3.6vw,2.9rem)] leading-[0.92] font-black tracking-[-0.025em] text-chalk uppercase outline-none">
        The colour code
      </h3>
      <p className="mt-5 text-[15px] leading-relaxed text-sage">
        Hold the part with the tolerance band, set a little apart, on your right. Read left to right.
      </p>

      <ol className="m-0 mt-6 grid list-none gap-0 p-0">
        {bands.map((color, index) => {
          const spec = BAND_COLORS[color];
          const active = focusedBand === index;
          return (
            <li
              key={index}
              data-chapter="colorcode"
              data-step={index}
              className="py-3 md:min-h-[34vh] md:py-[8vh]"
            >
              <div
                className={clsx(
                  "flex items-center gap-4 rounded-2xl border px-4 py-3 transition-colors duration-500",
                  active ? "border-copper-lt/70 bg-chalk/8" : "border-chalk/10 bg-board/40",
                )}
              >
                <span
                  aria-hidden
                  className={clsx("h-9 w-3.5 flex-none rounded-sm ring-1 ring-black/40", swatchClass(color))}
                  style={{ backgroundColor: spec.hex }}
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-[14px] font-semibold text-chalk">
                    Band {index + 1}: {spec.label}, {BAND_ROLES[index].title.toLowerCase()}
                  </span>
                  <span className="block text-[12.5px] text-sage">{BAND_ROLES[index].detail}</span>
                </span>
                <span className="lab-readout flex-none text-[18px] font-semibold text-copper-lt">{bandContribution(index, color)}</span>
              </div>
            </li>
          );
        })}
      </ol>

      <div className="mt-4 flex items-baseline justify-between rounded-2xl border border-chalk/12 bg-board/70 px-5 py-4" aria-live="polite">
        <span className="text-[13px] text-sage">Reads as</span>
        <span className="lab-readout text-[1.9rem] font-semibold text-chalk">
          {formatOhms(value.ohms)}
          {value.tolerance !== null && <span className="ml-2 text-[1.1rem] text-sage">± {value.tolerance}%</span>}
        </span>
      </div>

      <details className="mt-5 rounded-2xl border border-chalk/10 px-4 py-3 text-[13px]">
        <summary className="cursor-pointer font-semibold text-chalk">Digit chart</summary>
        <ul className="m-0 mt-3 grid list-none grid-cols-2 gap-1.5 p-0 sm:grid-cols-5">
          {DIGITS.map((color) => (
            <li key={color} className="flex items-center gap-2">
              <span aria-hidden className="size-4 rounded-sm ring-1 ring-black/40" style={{ backgroundColor: BAND_COLORS[color].hex }} />
              <span className="lab-readout text-chalk">{BAND_COLORS[color].digit}</span>
              <span className="text-sage">{BAND_COLORS[color].label}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-sage">Tolerance: gold ±5%, silver ±10%, brown ±1%, red ±2%. Gold as a multiplier is ×0.1.</p>
      </details>
    </section>
  );
}
