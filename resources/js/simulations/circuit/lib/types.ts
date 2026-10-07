/**
 * The circuit document: what the workbench edits, saves, sends to the server
 * and what both solvers (this one and app/Simulations/Circuit/Solver.php) read.
 * Geometry (x, y, rot) is only for drawing; electrically a circuit is parts,
 * their pins and the wires between pins.
 */

export type PartType = "battery" | "supply" | "resistor" | "led" | "switch" | "junction" | "meter";

export type LedColor = "red" | "green";

/** V and A read like a digital multimeter's dial; ohm and cont need the circuit unpowered. */
export type MeterMode = "V" | "A" | "ohm" | "cont";

export type Rotation = 0 | 90 | 180 | 270;

export interface Part {
  id: string;
  type: PartType;
  x: number;
  y: number;
  rot: Rotation;
  /** Volts (battery, supply) or ohms (resistor). */
  value?: number;
  color?: LedColor;
  /** Switch position. */
  closed?: boolean;
  mode?: MeterMode;
}

export interface PinRef {
  part: string;
  pin: string;
}

export interface Wire {
  id: string;
  from: PinRef;
  to: PinRef;
}

export interface CircuitDoc {
  parts: Part[];
  wires: Wire[];
}

export const pinKey = (ref: PinRef): string => `${ref.part}.${ref.pin}`;

/* ------------------------------------------------------------------ */
/* Results                                                             */
/* ------------------------------------------------------------------ */

export type FlagKind =
  /** Resistor dissipating more than its rating. */
  | "overheat"
  /** LED carrying more than its maximum current. */
  | "burnt"
  /** Source delivering more than it can: a short circuit. */
  | "overload"
  /** LED with a large reverse voltage across it. */
  | "reverse"
  /** Ammeter carrying more than its fuse allows (usually placed across a source). */
  | "fuse"
  /** Ohmmeter or continuity tester probing a live circuit. */
  | "live";

export interface Flag {
  part: string;
  kind: FlagKind;
}

export interface ElementResult {
  /** Voltage across the part, first pin minus second pin (volts). */
  v: number;
  /** Current through the part, first pin to second pin (amperes); a source reports current out of +. */
  i: number;
  /** Power dissipated (negative for a source delivering power), watts. */
  p: number;
  /** LED conducting, switch closed. */
  on?: boolean;
}

export interface MeterReading {
  mode: MeterMode;
  /** Volts, amperes or ohms. null when the meter cannot read (fuse, live circuit). */
  value: number | null;
  /** Continuity tester sounding. */
  beep?: boolean;
  /** Why value is null. */
  fault?: "fuse" | "live";
}

export interface SolveResult {
  elements: Record<string, ElementResult>;
  meters: Record<string, MeterReading>;
  flags: Flag[];
  /** Voltage of each net relative to its island's reference (reference nets are 0). */
  nets: Record<string, number>;
  /** Net id of every wired pin, for the inspector. */
  netOf: Record<string, string>;
}
