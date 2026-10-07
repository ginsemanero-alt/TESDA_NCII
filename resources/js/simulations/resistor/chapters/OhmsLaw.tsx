import { useEffect, useState } from "react";
import clsx from "clsx";

import AnimatedNumber from "@/resistor/ui/AnimatedNumber";
import Chapter from "@/resistor/ui/Chapter";
import { useLab } from "@/resistor/store";
import {
  dissipatedPower,
  formatAmps,
  formatOhms,
  formatVolts,
  formatWatts,
  OhmsLawVariable,
  readBands,
  solveOhmsLaw,
} from "@/resistor/lib/resistor";
import { clamp, sceneInput } from "@/resistor/lib/sceneState";

type Field = {
  key: OhmsLawVariable;
  label: string;
  symbol: string;
  /** Sliders for current and resistance are logarithmic: decades matter, not steps. */
  log: boolean;
  min: number;
  max: number;
  step: number;
  format: (value: number) => string;
};

const FIELDS: Field[] = [
  { key: "voltage", label: "Voltage", symbol: "V", log: false, min: 0, max: 24, step: 0.1, format: formatVolts },
  { key: "current", label: "Current", symbol: "I", log: true, min: 1e-5, max: 0.5, step: 0.01, format: formatAmps },
  { key: "resistance", label: "Resistance", symbol: "R", log: true, min: 10, max: 1e6, step: 0.01, format: formatOhms },
];

/** Rating of the 1/4 W part on the bench. */
const POWER_RATING = 0.25;
/** Current at which the Explain-mode flow arrows run at their designed speed. */
const REFERENCE_CURRENT = 0.012;

const toSlider = (field: Field, value: number) => (field.log ? Math.log10(clamp(value, field.min, field.max)) : value);
const fromSlider = (field: Field, position: number) => (field.log ? 10 ** position : position);

/**
 * TR ELC311201 "Perform mensuration and calculation" (PC 2.3–2.4, 2.6: the
 * four operations, unit conversion, reading to the instrument's accuracy) and
 * ELC724205 2.4.9 "Analyzing simple circuit using ohms and power law".
 */
export default function OhmsLaw() {
  const bands = useLab((s) => s.bands);
  const [solveFor, setSolveFor] = useState<OhmsLawVariable>("current");
  const [inputs, setInputs] = useState({ voltage: 9, current: 0.009, resistance: 1000 });

  const solved = solveOhmsLaw(inputs, solveFor);
  const power = dissipatedPower(solved);
  const overRated = Number.isFinite(power) && power > POWER_RATING;
  const solvedCurrent = solved.current;

  useEffect(() => {
    sceneInput.currentScale = Number.isFinite(solvedCurrent) ? clamp(solvedCurrent / REFERENCE_CURRENT, 0.15, 3.5) : 1;
  }, [solvedCurrent]);

  const update = (key: OhmsLawVariable, value: number) => setInputs((previous) => ({ ...previous, [key]: value }));

  return (
    <Chapter id="ohmslaw" number={5} title="Ohm's law" tr="ELC311201 · PC 2.3–2.6 · ELC724205 · 2.4.9">
      <p className="lab-readout text-[1.9rem] font-semibold text-copper-lt">V = I × R</p>
      <p className="mt-2">
        Pick the value to solve for and move the other two. Watch the prefix change: 0.009 A is written 9 mA.
      </p>

      <div className="mt-6 rounded-[1.75rem] border border-chalk/12 bg-board/70 p-5" data-ui>
        <fieldset className="m-0 border-0 p-0">
          <legend className="p-0 text-[13px] text-sage">Solve for</legend>
          <div className="mt-2 flex gap-2">
            {FIELDS.map((field) => (
              <button
                key={field.key}
                type="button"
                onClick={() => setSolveFor(field.key)}
                aria-pressed={solveFor === field.key}
                className={clsx(
                  "min-h-10 flex-1 rounded-xl border px-3 text-[13px] font-semibold transition-colors",
                  solveFor === field.key ? "border-copper-lt bg-copper/20 text-copper-lt" : "border-chalk/15 text-sage hover:text-chalk",
                )}
              >
                {field.label}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="mt-5 grid gap-5">
          {FIELDS.map((field) => {
            const isSolved = solveFor === field.key;
            const value = solved[field.key];
            return (
              <div key={field.key}>
                <div className="flex items-baseline justify-between gap-4">
                  <label htmlFor={`ohms-${field.key}`} className={clsx("text-[13px]", isSolved ? "text-copper-lt" : "text-sage")}>
                    <span className="lab-readout mr-2 font-semibold">{field.symbol}</span>
                    {field.label}
                  </label>
                  <output htmlFor={`ohms-${field.key}`} className={clsx("lab-readout text-[1.5rem] font-semibold", isSolved ? "text-copper-lt" : "text-chalk")}>
                    <AnimatedNumber value={value} format={field.format} />
                  </output>
                </div>
                {isSolved ? (
                  <p className="mt-2 text-[12px] text-sage/80">Calculated from the other two.</p>
                ) : (
                  <input
                    id={`ohms-${field.key}`}
                    type="range"
                    min={toSlider(field, field.min)}
                    max={toSlider(field, field.max)}
                    step={field.step}
                    value={toSlider(field, inputs[field.key])}
                    aria-valuetext={field.format(inputs[field.key])}
                    onChange={(event) => update(field.key, fromSlider(field, Number(event.target.value)))}
                    className="lab-range mt-3"
                  />
                )}
              </div>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => update("resistance", readBands(bands).ohms)}
          disabled={solveFor === "resistance"}
          className="mt-4 min-h-10 rounded-xl border border-chalk/15 px-3 text-[13px] font-semibold text-chalk hover:border-copper-lt disabled:opacity-40"
        >
          Use my resistor ({formatOhms(readBands(bands).ohms)})
        </button>

        <div className="mt-5 flex items-baseline justify-between gap-3 border-t border-chalk/10 pt-4">
          <span className="text-[13px] text-sage">Heat in the resistor, P = I²R</span>
          <span className="lab-readout text-[1.15rem] font-semibold text-chalk">
            <AnimatedNumber value={power} format={formatWatts} />
          </span>
        </div>
        <p
          className={clsx(
            "mt-2 inline-flex items-center gap-2 rounded-full px-3 py-1 text-[12.5px] font-bold",
            overRated ? "bg-fail/25 text-fail-lt" : "bg-pass/25 text-pass-lt",
          )}
          aria-live="polite"
        >
          <span aria-hidden className="size-2 rounded-full bg-current" />
          {overRated ? "Over 0.25 W: this part would overheat. Use a bigger resistor or a 1/2 W part." : "Within the 0.25 W rating"}
        </p>
      </div>
    </Chapter>
  );
}
