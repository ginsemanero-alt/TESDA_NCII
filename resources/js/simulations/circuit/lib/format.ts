import { meterDisplay } from "@/resistor/lib/meter";
import { BAND_COLORS, BandColor, BandSet } from "@/resistor/lib/resistor";
import { FlagKind, MeterMode, MeterReading } from "./types";

export interface Display {
  /** What the LCD shows, e.g. "8.972" or "O.L". */
  digits: string;
  /** Unit annunciator, e.g. "V", "mA", "kΩ". */
  unit: string;
  /** Short note under the digits: why there is no reading. */
  note?: string;
}

/** A 3½-digit meter autoranges: more decimals when the value is small. */
function volts(value: number): Display {
  const abs = Math.abs(value);
  if (abs < 0.6) return { digits: (value * 1000).toFixed(1), unit: "mV" };
  if (abs < 6) return { digits: value.toFixed(3), unit: "V" };
  if (abs < 60) return { digits: value.toFixed(2), unit: "V" };
  return { digits: value.toFixed(1), unit: "V" };
}

function amps(value: number): Display {
  const abs = Math.abs(value);
  if (abs < 0.00006) return { digits: (value * 1e6).toFixed(1), unit: "µA" };
  if (abs < 0.6) return { digits: (value * 1000).toFixed(2), unit: "mA" };
  return { digits: value.toFixed(3), unit: "A" };
}

export function readingDisplay(mode: MeterMode, reading: MeterReading | undefined): Display {
  if (!reading) return { digits: "----", unit: mode === "V" ? "V" : mode === "A" ? "A" : "Ω" };
  if (reading.fault === "fuse") return { digits: "FuSE", unit: "A", note: "Fuse blown: the meter was put across a source" };
  if (reading.fault === "live") return { digits: "----", unit: "Ω", note: "Circuit is live: switch it off first" };
  if (reading.value === null) return { digits: "----", unit: "" };

  if (mode === "V") return volts(reading.value);
  if (mode === "A") return amps(reading.value);
  const { digits, unit } = meterDisplay(reading.value);
  return { digits, unit };
}

export const MODE_LABEL: Record<MeterMode, string> = { V: "V", A: "A", ohm: "Ω", cont: "•))" };

export const MODE_NAME: Record<MeterMode, string> = {
  V: "Volts",
  A: "Amps",
  ohm: "Ohms",
  cont: "Continuity",
};

export const FLAG_TEXT: Record<FlagKind, string> = {
  overheat: "Overheating: more than 0.25 W",
  burnt: "Burnt out: too much current",
  overload: "Overloaded: this is a short circuit",
  reverse: "Fitted backwards: it blocks the current",
  fuse: "Fuse blown: an ammeter goes in series, never across a source",
  live: "Switch the power off before measuring resistance",
};

/** A short word for the tag drawn on the part itself. */
export const FLAG_TAG: Record<FlagKind, string> = {
  overheat: "HOT",
  burnt: "BURNT",
  overload: "SHORT",
  reverse: "REVERSED",
  fuse: "FUSE",
  live: "LIVE",
};

const SUFFIX = [
  { factor: 1e6, suffix: "M" },
  { factor: 1e3, suffix: "k" },
];

/** 330 → "330 Ω", 4700 → "4.7 kΩ". */
export function ohmsText(ohms: number): string {
  for (const { factor, suffix } of SUFFIX) {
    if (ohms >= factor) return `${Number((ohms / factor).toPrecision(3))} ${suffix}Ω`;
  }
  return `${Number(ohms.toPrecision(3))} Ω`;
}

export function voltsText(value: number): string {
  const d = volts(value);
  return `${d.digits} ${d.unit}`;
}

export function ampsText(value: number): string {
  const d = amps(value);
  return `${d.digits} ${d.unit}`;
}

export function wattsText(value: number): string {
  const abs = Math.abs(value);
  return abs < 1 ? `${(value * 1000).toFixed(1)} mW` : `${value.toFixed(2)} W`;
}

/* ------------------------------------------------------------------ */
/* Resistor colour bands for the inspector picture                     */
/* ------------------------------------------------------------------ */

const COLOR_FOR_DIGIT = (Object.keys(BAND_COLORS) as BandColor[]).reduce<Record<number, BandColor>>((acc, color) => {
  const digit = BAND_COLORS[color].digit;
  if (digit !== null) acc[digit] = color;
  return acc;
}, {});

/**
 * The four bands for a resistor value (5% gold), so the inspector can show the
 * part the student would pick up. Values the code cannot express (not two
 * significant digits) fall back to the nearest below.
 */
export function bandsForValue(ohms: number): BandSet {
  let exponent = Math.floor(Math.log10(ohms)) - 1;
  let digits = Math.round(ohms / 10 ** exponent);
  if (digits >= 100) {
    digits = Math.round(digits / 10);
    exponent += 1;
  }
  if (exponent < -2) {
    exponent = -2;
    digits = Math.max(10, digits);
  }
  const multiplier: BandColor = exponent === -1 ? "gold" : exponent === -2 ? "silver" : COLOR_FOR_DIGIT[Math.max(0, Math.min(9, exponent))];
  return [COLOR_FOR_DIGIT[Math.floor(digits / 10) || 1], COLOR_FOR_DIGIT[digits % 10], multiplier, "gold"];
}
