import { LIMITS, PARTS } from "./parts";
import { CircuitDoc, LedColor, MeterMode, Part, PartType, Rotation, Wire } from "./types";

/**
 * Parsing and sanity checks for a circuit document, used for loading a saved
 * circuit and for anything that arrives from outside (import, a server
 * round trip). app/Simulations/Circuit/CircuitDocument.php applies the same rules
 * to what students submit, so a circuit that loads here also grades there.
 */

const ID = /^[A-Za-z][A-Za-z0-9_]{0,11}$/;
const TYPES = Object.keys(PARTS) as PartType[];
const MODES: MeterMode[] = ["V", "A", "ohm", "cont"];
const COLORS: LedColor[] = ["red", "green"];
const ROTATIONS = [0, 90, 180, 270];

export type ParseResult = { doc: CircuitDoc } | { error: string };

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);
const isFiniteNumber = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);

export function parseDoc(raw: unknown): ParseResult {
  if (!isObject(raw) || !Array.isArray(raw.parts) || !Array.isArray(raw.wires)) return { error: "A circuit needs a parts list and a wires list." };
  if (raw.parts.length > LIMITS.maxParts) return { error: `At most ${LIMITS.maxParts} parts.` };
  if (raw.wires.length > LIMITS.maxWires) return { error: `At most ${LIMITS.maxWires} wires.` };

  const parts: Part[] = [];
  const ids = new Set<string>();

  for (const entry of raw.parts) {
    if (!isObject(entry)) return { error: "A part is malformed." };
    const { id, type } = entry;
    if (typeof id !== "string" || !ID.test(id)) return { error: "A part has an invalid name." };
    if (ids.has(id)) return { error: `Two parts are both called ${id}.` };
    if (typeof type !== "string" || !TYPES.includes(type as PartType)) return { error: `${id} is not a known part.` };
    ids.add(id);

    const part: Part = {
      id,
      type: type as PartType,
      x: isFiniteNumber(entry.x) ? entry.x : 0,
      y: isFiniteNumber(entry.y) ? entry.y : 0,
      rot: (ROTATIONS.includes(entry.rot as number) ? entry.rot : 0) as Rotation,
    };

    if (part.type === "resistor") {
      if (!isFiniteNumber(entry.value) || entry.value < LIMITS.resistor.min || entry.value > LIMITS.resistor.max) return { error: `${id} needs a value from 1 Ω to 10 MΩ.` };
      part.value = entry.value;
    } else if (part.type === "supply") {
      if (!isFiniteNumber(entry.value) || entry.value < LIMITS.supply.min || entry.value > LIMITS.supply.max) return { error: `${id} needs a voltage from 0 to 15 V.` };
      part.value = entry.value;
    } else if (part.type === "battery") {
      part.value = LIMITS.battery.volts;
    } else if (part.type === "led") {
      if (!COLORS.includes(entry.color as LedColor)) return { error: `${id} needs a colour, red or green.` };
      part.color = entry.color as LedColor;
    } else if (part.type === "switch") {
      if (typeof entry.closed !== "boolean") return { error: `${id} needs to be open or closed.` };
      part.closed = entry.closed;
    } else if (part.type === "meter") {
      if (!MODES.includes(entry.mode as MeterMode)) return { error: `${id} needs a mode.` };
      part.mode = entry.mode as MeterMode;
    }

    parts.push(part);
  }

  const wires: Wire[] = [];
  const wireIds = new Set<string>();

  for (const entry of raw.wires) {
    if (!isObject(entry) || !isObject(entry.from) || !isObject(entry.to)) return { error: "A wire is malformed." };
    const { id } = entry;
    if (typeof id !== "string" || !ID.test(id) || wireIds.has(id)) return { error: "A wire has an invalid or repeated name." };
    wireIds.add(id);

    for (const end of [entry.from, entry.to]) {
      const part = parts.find((p) => p.id === end.part);
      if (!part || typeof end.pin !== "string" || !PARTS[part.type].pins.includes(end.pin)) return { error: `Wire ${id} goes to a pin that does not exist.` };
    }
    if (entry.from.part === entry.to.part && entry.from.pin === entry.to.pin) return { error: `Wire ${id} starts and ends on the same pin.` };

    wires.push({
      id,
      from: { part: entry.from.part as string, pin: entry.from.pin as string },
      to: { part: entry.to.part as string, pin: entry.to.pin as string },
    });
  }

  return { doc: { parts, wires } };
}
