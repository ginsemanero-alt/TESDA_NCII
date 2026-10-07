import { LedColor, Part, PartType } from "./types";

/**
 * Electrical definitions of the parts. The numbers are mirrored in
 * app/Simulations/Circuit/Solver.php; tests/fixtures/circuit-vectors.json is
 * checked against both, so a change here must be made there too.
 */

export interface PartDef {
  label: string;
  /** Pin names in drawing order. */
  pins: readonly string[];
  /** One line for the palette and the inspector. */
  note: string;
}

export const PARTS: Record<PartType, PartDef> = {
  battery: { label: "9 V battery", pins: ["+", "-"], note: "A 9 V alkaline battery. About 1.5 Ω inside, so a short circuit draws about 6 A." },
  supply: { label: "Bench supply", pins: ["+", "-"], note: "Adjustable 0 to 15 V. About 0.2 Ω inside." },
  resistor: { label: "Resistor", pins: ["a", "b"], note: "1/4 W carbon film. Burns up above 0.25 W." },
  led: { label: "LED", pins: ["a", "k"], note: "Anode (a) to the positive side, cathode (k) to the negative. Needs a resistor." },
  switch: { label: "Switch", pins: ["a", "b"], note: "SPST. Click it to open or close." },
  junction: { label: "Junction", pins: ["j"], note: "A point to join several wires." },
  meter: { label: "Multimeter", pins: ["com", "v"], note: "COM is the black probe, V is the red. Choose V, A, Ω or continuity." },
};

/** Preferred resistor values: the E12 series, two digits times a power of ten. */
export const E12 = [10, 12, 15, 18, 22, 27, 33, 39, 47, 56, 68, 82] as const;

/** Every E12 value from 10 Ω to 1 MΩ, for pickers and challenge generation. */
export const RESISTOR_VALUES: number[] = (() => {
  const values: number[] = [];
  for (let power = 0; power <= 4; power++) for (const base of E12) values.push(base * 10 ** power);
  values.push(100_000, 120_000, 150_000, 180_000, 220_000, 270_000, 330_000, 390_000, 470_000, 560_000, 680_000, 820_000, 1_000_000);
  return values;
})();

export const LIMITS = {
  maxParts: 40,
  maxWires: 100,
  resistor: { min: 1, max: 10_000_000, watts: 0.25 },
  supply: { min: 0, max: 15 },
  battery: { volts: 9 },
} as const;

export const SOURCE = {
  /** Internal resistance, ohms. */
  battery: { r: 1.5, maxAmps: 0.5 },
  supply: { r: 0.2, maxAmps: 1 },
} as const;

export const LED = {
  red: { vf: 1.9, maxAmps: 0.03 },
  green: { vf: 2.1, maxAmps: 0.03 },
  /** Dynamic resistance once conducting, ohms. */
  rs: 5,
  /** A comfortable operating current, amperes. */
  ratedAmps: 0.02,
  /** Reverse voltage that damages it, volts. */
  reverseVolts: 5,
} as const satisfies Record<string, unknown>;

export const SWITCH = { closedOhms: 0.01 } as const;

export const METER = {
  voltmeterOhms: 10_000_000,
  ammeterOhms: 0.01,
  /** Ammeter fuse, amperes. */
  fuseAmps: 0.4,
  /** An ohmmeter sees more than this across its probes: the circuit is live. */
  liveVolts: 0.05,
  /** Continuity beeps below this, ohms. */
  beepOhms: 50,
  /** Test current an ohmmeter pushes, amperes. */
  testAmps: 1e-3,
} as const;

/** Tiny conductance from every net to its island's reference so floating nets stay solvable (siemens). */
export const GMIN = 1e-12;

export function defaultsFor(type: PartType): Partial<Part> {
  switch (type) {
    case "battery":
      return { value: 9 };
    case "supply":
      return { value: 9 };
    case "resistor":
      return { value: 330 };
    case "led":
      return { color: "red" as LedColor };
    case "switch":
      return { closed: true };
    case "meter":
      return { mode: "V" };
    default:
      return {};
  }
}
