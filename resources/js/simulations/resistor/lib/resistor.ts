/**
 * Resistor domain logic: the IEC 60062 colour code and Ohm's law.
 * Pure functions only — no React, no Three.js. Everything the UI and the 3D
 * scene display is derived from here so the two can never disagree.
 */

export type BandColor =
  | "black"
  | "brown"
  | "red"
  | "orange"
  | "yellow"
  | "green"
  | "blue"
  | "violet"
  | "grey"
  | "white"
  | "gold"
  | "silver";

export interface BandColorSpec {
  /** Human readable name, used in the UI. */
  label: string;
  /** Physical paint colour of the band. */
  hex: string;
  /** Significant digit, or null when the colour cannot encode a digit. */
  digit: number | null;
  /** Decimal multiplier, or null when the colour cannot encode one. */
  multiplier: number | null;
  /** Tolerance in percent, or null when the colour cannot encode one. */
  tolerance: number | null;
  /** True for very dark paints that need a light label in the UI. */
  dark: boolean;
}

/*
 * Paint colours are tuned to read like lacquer bands under neutral (D65)
 * light, not screen primaries: brown and red sit apart in lightness as well as
 * hue, white is a warm off-white paint, grey is matte and darker than silver.
 * Gold and silver are base colours for a metallic-pigment material in 3D.
 * Digits, multipliers and tolerances are the IEC 60062 values and must not
 * change; app/Simulations/Resistor/ColorCode.php mirrors them.
 * scripts/check-band-colors.ts reports the ΔE2000 between every pair, with and
 * without simulated colour-vision deficiency.
 */
export const BAND_COLORS: Record<BandColor, BandColorSpec> = {
  black: { label: "Black", hex: "#1a1a1c", digit: 0, multiplier: 1, tolerance: null, dark: true },
  brown: { label: "Brown", hex: "#5e3a1f", digit: 1, multiplier: 10, tolerance: 1, dark: true },
  red: { label: "Red", hex: "#c22a1f", digit: 2, multiplier: 100, tolerance: 2, dark: false },
  orange: { label: "Orange", hex: "#ec7a1e", digit: 3, multiplier: 1_000, tolerance: null, dark: false },
  yellow: { label: "Yellow", hex: "#f2cb2c", digit: 4, multiplier: 10_000, tolerance: null, dark: false },
  green: { label: "Green", hex: "#2e8a46", digit: 5, multiplier: 100_000, tolerance: 0.5, dark: false },
  blue: { label: "Blue", hex: "#2858b8", digit: 6, multiplier: 1_000_000, tolerance: 0.25, dark: true },
  violet: { label: "Violet", hex: "#76409f", digit: 7, multiplier: 10_000_000, tolerance: 0.1, dark: true },
  grey: { label: "Grey", hex: "#7c7e80", digit: 8, multiplier: 100_000_000, tolerance: 0.05, dark: false },
  white: { label: "White", hex: "#efece4", digit: 9, multiplier: 1_000_000_000, tolerance: null, dark: false },
  gold: { label: "Gold", hex: "#b38b3a", digit: null, multiplier: 0.1, tolerance: 5, dark: false },
  silver: { label: "Silver", hex: "#b4b8bc", digit: null, multiplier: 0.01, tolerance: 10, dark: false },
};

/** Bands painted with metallic pigment rather than plain lacquer. */
export const METALLIC_BANDS: ReadonlySet<BandColor> = new Set(["gold", "silver"]);

/** A classic four-band axial resistor. */
export type BandSet = readonly [BandColor, BandColor, BandColor, BandColor];

export const BAND_ROLES = [
  { title: "First digit", detail: "The first significant figure of the value." },
  { title: "Second digit", detail: "The second significant figure." },
  { title: "Multiplier", detail: "How many times to multiply the two digits by ten." },
  { title: "Tolerance", detail: "How far the real value may drift from the printed one." },
] as const;

/** The resistor the experience teaches with: brown, black, red, gold — 1 kΩ ±5%. */
export const DEFAULT_BANDS: BandSet = ["brown", "black", "red", "gold"];

/** Colours a band is allowed to take, per position. */
export const ALLOWED_COLORS: Record<number, BandColor[]> = {
  0: (Object.keys(BAND_COLORS) as BandColor[]).filter(
    (c) => BAND_COLORS[c].digit !== null && BAND_COLORS[c].digit !== 0,
  ),
  1: (Object.keys(BAND_COLORS) as BandColor[]).filter((c) => BAND_COLORS[c].digit !== null),
  2: (Object.keys(BAND_COLORS) as BandColor[]).filter((c) => BAND_COLORS[c].multiplier !== null),
  3: (Object.keys(BAND_COLORS) as BandColor[]).filter((c) => BAND_COLORS[c].tolerance !== null),
};

/** What a single band contributes to the printed value, as shown in the UI. */
export function bandContribution(index: number, color: BandColor): string {
  const spec = BAND_COLORS[color];
  if (index < 2) return spec.digit === null ? "—" : String(spec.digit);
  if (index === 2) {
    if (spec.multiplier === null) return "—";
    return spec.multiplier >= 1
      ? `× ${spec.multiplier.toLocaleString("en-US")}`
      : `× ${spec.multiplier}`;
  }
  return spec.tolerance === null ? "—" : `± ${spec.tolerance}%`;
}

export interface ResistorValue {
  /** Nominal resistance in ohms. */
  ohms: number;
  /** Tolerance in percent, null when the fourth band cannot encode one. */
  tolerance: number | null;
  /** Lowest resistance still inside tolerance. */
  min: number;
  /** Highest resistance still inside tolerance. */
  max: number;
}

export function readBands(bands: BandSet): ResistorValue {
  const d1 = BAND_COLORS[bands[0]].digit ?? 0;
  const d2 = BAND_COLORS[bands[1]].digit ?? 0;
  const multiplier = BAND_COLORS[bands[2]].multiplier ?? 1;
  const tolerance = BAND_COLORS[bands[3]].tolerance;

  const ohms = (d1 * 10 + d2) * multiplier;
  const spread = tolerance === null ? 0 : (ohms * tolerance) / 100;

  return { ohms, tolerance, min: ohms - spread, max: ohms + spread };
}

const SI_STEPS = [
  { factor: 1e9, suffix: "G" },
  { factor: 1e6, suffix: "M" },
  { factor: 1e3, suffix: "k" },
  { factor: 1, suffix: "" },
  { factor: 1e-3, suffix: "m" },
  { factor: 1e-6, suffix: "µ" },
] as const;

/** Formats a number with an SI prefix, trimming trailing zeros. */
export function formatSI(value: number, unit: string, significant = 3): string {
  if (!Number.isFinite(value)) return `— ${unit}`;
  if (value === 0) return `0 ${unit}`;

  const magnitude = Math.abs(value);
  const step = SI_STEPS.find((s) => magnitude >= s.factor) ?? SI_STEPS[SI_STEPS.length - 1];
  const scaled = value / step.factor;
  const decimals = Math.max(0, significant - Math.floor(Math.log10(Math.abs(scaled))) - 1);

  return `${trimZeros(scaled.toFixed(Math.min(decimals, 3)))} ${step.suffix}${unit}`;
}

function trimZeros(text: string): string {
  return text.includes(".") ? text.replace(/\.?0+$/, "") : text;
}

export const formatOhms = (ohms: number) => formatSI(ohms, "Ω");
export const formatVolts = (volts: number) => formatSI(volts, "V");
export const formatAmps = (amps: number) => formatSI(amps, "A");
export const formatWatts = (watts: number) => formatSI(watts, "W");

export type OhmsLawVariable = "voltage" | "current" | "resistance";

export interface OhmsLawState {
  /** Volts. */
  voltage: number;
  /** Amperes. */
  current: number;
  /** Ohms. */
  resistance: number;
}

/**
 * Recomputes whichever quantity is being solved for, from the other two.
 * Real arithmetic — V = I × R, I = V / R, R = V / I.
 */
export function solveOhmsLaw(state: OhmsLawState, solveFor: OhmsLawVariable): OhmsLawState {
  switch (solveFor) {
    case "voltage":
      return { ...state, voltage: state.current * state.resistance };
    case "current":
      return {
        ...state,
        current: state.resistance === 0 ? Infinity : state.voltage / state.resistance,
      };
    case "resistance":
      return {
        ...state,
        resistance: state.current === 0 ? Infinity : state.voltage / state.current,
      };
  }
}

/** Power dissipated by the resistor, P = I² × R. */
export function dissipatedPower(state: OhmsLawState): number {
  return state.current * state.current * state.resistance;
}
