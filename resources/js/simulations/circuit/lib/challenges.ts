import { CircuitDoc } from "./types";

/** What the server issues. Mirrors app/Simulations/Circuit/CircuitSandbox.php; contains no answers. */
export type ChallengeType = "build_led" | "measure_voltage" | "measure_current" | "ohms_law" | "troubleshoot" | "parallel";

export interface Challenge {
  id: string;
  type: ChallengeType;
  /** TESDA unit code the challenge belongs to. */
  unit: string;
  /** The circuit the student starts from (all but ohms_law). */
  doc?: CircuitDoc;
  volts?: number;
  ohms?: number;
  color?: "red" | "green";
  min?: number;
  max?: number;
  r1?: number;
  r2?: number;
  /** measure_voltage: the resistor to measure ("R1" or "R2"); parallel: the resistance to reach (ohms). */
  target?: string | number;
  symptom?: string;
  options?: { value: string; label: string }[];
}

export const TITLES: Record<ChallengeType, string> = {
  build_led: "Light the LED",
  measure_voltage: "Measure a voltage",
  measure_current: "Measure a current",
  ohms_law: "Work out the current",
  troubleshoot: "Find the fault",
  parallel: "Build a parallel pair",
};

/** What a wrong answer is nudged towards, without giving the answer away. */
export const HINTS: Record<ChallengeType, string> = {
  build_led: "The LED needs a resistor in series. R = (supply − LED drop) ÷ the current you want. Check the LED current in the panel.",
  measure_voltage: "A voltmeter goes across the part, not in the loop. Red (V) on the side closer to the battery's +. Is the dial on V?",
  measure_current: "An ammeter goes in series: break the loop and put the meter in the gap, red toward the +. Check the prefix: 0.019 A is 19 mA.",
  ohms_law: "I = V ÷ R. Mind the prefix: 0.0273 A is 27.3 mA.",
  troubleshoot: "Both parts count: name the cause, and repair the circuit until the LED glows at the right current with nothing overheating.",
  parallel: "Two resistors in parallel: R = (R1 × R2) ÷ (R1 + R2). The pair must share both ends. Measure with the meter on Ω, circuit unpowered.",
};

/** Prefixes a student can pick when typing a number, with their factor to the base unit. */
export const UNITS = {
  volts: [
    { label: "V", factor: 1 },
    { label: "mV", factor: 1e-3 },
  ],
  amps: [
    { label: "A", factor: 1 },
    { label: "mA", factor: 1e-3 },
    { label: "µA", factor: 1e-6 },
  ],
  ohms: [
    { label: "Ω", factor: 1 },
    { label: "kΩ", factor: 1e3 },
    { label: "MΩ", factor: 1e6 },
  ],
} as const;

/** Which quantity (and answer key) a typed-answer challenge asks for. */
export const TYPED: Partial<Record<ChallengeType, { key: "volts" | "amps" | "ohms"; units: keyof typeof UNITS; label: string }>> = {
  measure_voltage: { key: "volts", units: "volts", label: "The meter reads" },
  measure_current: { key: "amps", units: "amps", label: "The meter reads" },
  ohms_law: { key: "amps", units: "amps", label: "Current" },
  parallel: { key: "ohms", units: "ohms", label: "The meter reads" },
};

export const EMPTY_DOC: CircuitDoc = { parts: [], wires: [] };

export const sameDoc = (a: CircuitDoc | undefined, b: CircuitDoc | undefined): boolean => JSON.stringify(a ?? EMPTY_DOC) === JSON.stringify(b ?? EMPTY_DOC);

/** The prompt shown on a challenge card. */
export function promptFor(c: Challenge): string {
  const mA = (a?: number) => `${((a ?? 0) * 1000).toFixed(0)}`;
  switch (c.type) {
    case "build_led":
      return `Build a circuit that lights the ${c.color} LED (D1) from the ${c.volts} V supply (V1) at ${mA(c.min)} to ${mA(c.max)} mA. Add a resistor and wire everything up. Leave the supply voltage alone.`;
    case "measure_voltage":
      return `Wire the multimeter (M1, on volts) across ${c.target}, then type the voltage it reads.`;
    case "measure_current":
      return "The loop is closed by a plain wire between R1 and R2. Take that wire out, put the multimeter (M1, on amps) in the gap, and type the current it reads.";
    case "ohms_law":
      return `A ${c.volts} V supply is connected across a ${c.ohms} Ω resistor. How much current flows? Work it out; no circuit needed.`;
    case "troubleshoot":
      return `${c.symptom} Choose the most likely cause, then fix the circuit on the board so the LED glows at ${mA(c.min)} to ${mA(c.max)} mA.`;
    case "parallel":
      return `R1 is ${c.r1} Ω. Add a second resistor R2 in parallel with it so the pair measures ${c.target} Ω. Wire the meter (M1, on Ω) across R1 and type its reading.`;
  }
}
