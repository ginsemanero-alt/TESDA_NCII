/**
 * The digital multimeter on the bench (TR ELC724205 2.4.6, "Measuring
 * resistance using VOM"). Real parts never read exactly their printed value,
 * so a measurement lands somewhere inside the tolerance band, and the display
 * autoranges like a common 6000-count meter.
 */

import { BandSet, readBands } from "./resistor";

export interface MeterDisplay {
  /** Digits as the LCD shows them, e.g. "4.712" or "O.L". */
  digits: string;
  /** Range annunciator: "Ω", "kΩ" or "MΩ". */
  unit: string;
}

const RANGES = [
  { limit: 600, factor: 1, unit: "Ω", decimals: 1 },
  { limit: 6e3, factor: 1e3, unit: "kΩ", decimals: 3 },
  { limit: 60e3, factor: 1e3, unit: "kΩ", decimals: 2 },
  { limit: 600e3, factor: 1e3, unit: "kΩ", decimals: 1 },
  { limit: 6e6, factor: 1e6, unit: "MΩ", decimals: 3 },
  { limit: 60e6, factor: 1e6, unit: "MΩ", decimals: 2 },
] as const;

export function meterDisplay(ohms: number | null): MeterDisplay {
  if (ohms === null || !Number.isFinite(ohms)) return { digits: "----", unit: "Ω" };

  const range = RANGES.find((r) => ohms < r.limit);
  if (!range) return { digits: "O.L", unit: "MΩ" };

  return { digits: (ohms / range.factor).toFixed(range.decimals), unit: range.unit };
}

/**
 * A plausible reading for this part: within ±80% of its tolerance, so it
 * always passes, but never exactly nominal. `random` is injectable for tests.
 */
export function measure(bands: BandSet, random: () => number = Math.random): number {
  const value = readBands(bands);
  const tolerance = (value.tolerance ?? 5) / 100;
  let offset = (random() * 2 - 1) * tolerance * 0.8;
  // A reading of exactly nominal teaches the wrong lesson.
  if (Math.abs(offset) < tolerance * 0.08) offset = tolerance * 0.12 * (offset < 0 ? -1 : 1);
  return value.ohms * (1 + offset);
}

/** Whether a reading is inside the part's tolerance band. */
export function withinTolerance(bands: BandSet, ohms: number): boolean {
  const value = readBands(bands);
  return ohms >= value.min && ohms <= value.max;
}
