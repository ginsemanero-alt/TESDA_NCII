/**
 * Checkpoint shapes issued by app/Simulations/Resistor/ResistorLab.php, and
 * the same grading rules, so the student gets instant feedback. The server
 * regrades every submission with its own copy of these rules; a score that
 * disagrees is refused.
 */

import {
  ALLOWED_COLORS,
  BAND_COLORS,
  BandColor,
  BandSet,
  readBands,
  solveOhmsLaw,
} from "./resistor";

/** Relative error accepted on typed numbers. Mirrors ResistorLab::NUMERIC_TOLERANCE. */
export const NUMERIC_TOLERANCE = 0.02;

export type Checkpoint =
  | { id: string; type: "read"; unit: string; bands: BandSet }
  | { id: string; type: "bands"; unit: string; ohms: number; tolerance: number }
  | { id: string; type: "role"; unit: string; bands: BandSet; role: 0 | 1 | 2 | 3 }
  | { id: string; type: "current"; unit: string; volts: number; ohms: number }
  | { id: string; type: "tolerance"; unit: string; bands: BandSet; measured: number };

export type Answer =
  | { ohms: number }
  | { bands: BandColor[] }
  | { band: number }
  | { amps: number }
  | { within: boolean };

export type Answers = Record<string, Answer | null>;

export function near(actual: number, expected: number, relative: number): boolean {
  if (expected === 0) return Math.abs(actual) <= relative;
  return Math.abs(actual - expected) <= Math.abs(expected) * relative;
}

function isValidBandSet(bands: unknown): bands is BandSet {
  return (
    Array.isArray(bands) &&
    bands.length === 4 &&
    bands.every((color, position) => ALLOWED_COLORS[position].includes(color as BandColor))
  );
}

/** The expected answer, for the "show me" reveal after grading. */
export function expectedFor(checkpoint: Checkpoint): number | boolean | null {
  switch (checkpoint.type) {
    case "read":
      return readBands(checkpoint.bands).ohms;
    case "current":
      return solveOhmsLaw(
        { voltage: checkpoint.volts, current: 0, resistance: checkpoint.ohms },
        "current",
      ).current;
    case "tolerance": {
      const value = readBands(checkpoint.bands);
      return checkpoint.measured >= value.min && checkpoint.measured <= value.max;
    }
    case "role":
      return checkpoint.role;
    case "bands":
      return null;
  }
}

/** True, false, or null when the answer is missing. */
export function grade(checkpoint: Checkpoint, answer: Answer | null | undefined): boolean | null {
  if (!answer) return null;

  switch (checkpoint.type) {
    case "read":
      return "ohms" in answer && near(answer.ohms, readBands(checkpoint.bands).ohms, NUMERIC_TOLERANCE);

    case "bands": {
      if (!("bands" in answer) || !isValidBandSet(answer.bands)) return false;
      const value = readBands(answer.bands);
      return (
        near(value.ohms, checkpoint.ohms, 1e-9) &&
        value.tolerance !== null &&
        near(value.tolerance, checkpoint.tolerance, 1e-9)
      );
    }

    case "role":
      return "band" in answer && answer.band === checkpoint.role;

    case "current":
      return "amps" in answer && near(answer.amps, expectedFor(checkpoint) as number, NUMERIC_TOLERANCE);

    case "tolerance":
      return "within" in answer && answer.within === expectedFor(checkpoint);
  }
}

export function score(checkpoints: Checkpoint[], answers: Answers): number {
  return checkpoints.filter((checkpoint) => grade(checkpoint, answers[checkpoint.id]) === true).length;
}

/** Units a student can type a value in, with their factor to the base unit. */
export const PREFIXES = {
  ohms: [
    { label: "Ω", factor: 1 },
    { label: "kΩ", factor: 1e3 },
    { label: "MΩ", factor: 1e6 },
  ],
  amps: [
    { label: "A", factor: 1 },
    { label: "mA", factor: 1e-3 },
    { label: "µA", factor: 1e-6 },
  ],
} as const;

/** Parses "4.7" or "4,7" into a number; NaN when it is not a plain number. */
export function parseTyped(text: string): number {
  const cleaned = text.trim().replace(",", ".");
  if (!/^\d*\.?\d+$|^\d+\.$/.test(cleaned)) return Number.NaN;
  return Number(cleaned);
}

/** One band set that encodes a value and tolerance, for showing the answer. */
export function bandsFor(ohms: number, tolerance: number): BandSet | null {
  for (const a of ALLOWED_COLORS[0])
    for (const b of ALLOWED_COLORS[1])
      for (const m of ALLOWED_COLORS[2])
        for (const t of ALLOWED_COLORS[3]) {
          const value = readBands([a, b, m, t]);
          if (near(value.ohms, ohms, 1e-9) && value.tolerance !== null && near(value.tolerance, tolerance, 1e-9)) {
            return [a, b, m, t];
          }
        }
  return null;
}

export function bandLabel(color: BandColor): string {
  return BAND_COLORS[color].label;
}
