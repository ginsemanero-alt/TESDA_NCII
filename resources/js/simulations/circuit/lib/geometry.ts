import { Part, PartType, PinRef, Rotation, Wire } from "./types";

/** Board grid, in drawing units. Parts and wires snap to it. */
export const GRID = 20;

export const snap = (value: number): number => Math.round(value / GRID) * GRID;

/**
 * Where each pin sits on a part, before rotation, relative to the part's
 * centre. A two-pin part is 80 units long, so two parts placed end to end on
 * the grid line up pin to pin.
 */
const PIN_OFFSETS: Record<PartType, Record<string, [number, number]>> = {
  battery: { "+": [-40, 0], "-": [40, 0] },
  supply: { "+": [-40, 0], "-": [40, 0] },
  resistor: { a: [-40, 0], b: [40, 0] },
  led: { a: [-40, 0], k: [40, 0] },
  switch: { a: [-40, 0], b: [40, 0] },
  junction: { j: [0, 0] },
  // The meter body is drawn upright; its jacks sit just outside it, on the side the rotation picks.
  meter: { com: [-30, 100], v: [30, 100] },
};

/** Half-width and half-height of a part's body, for selection boxes and hit tests. */
export const BODY: Record<PartType, [number, number]> = {
  battery: [40, 22],
  supply: [40, 24],
  resistor: [40, 16],
  led: [40, 22],
  switch: [40, 24],
  junction: [10, 10],
  meter: [62, 82],
};

/** Rotates an offset clockwise on screen (the SVG y axis points down). */
export function rotate([x, y]: [number, number], rot: Rotation): [number, number] {
  switch (rot) {
    case 90:
      return [-y, x];
    case 180:
      return [-x, -y];
    case 270:
      return [y, -x];
    default:
      return [x, y];
  }
}

export function pinPosition(part: Part, pin: string): [number, number] {
  const offset = PIN_OFFSETS[part.type][pin] ?? [0, 0];
  const [dx, dy] = rotate(offset, part.rot);
  return [part.x + dx, part.y + dy];
}

export function nextRotation(rot: Rotation): Rotation {
  return ((rot + 90) % 360) as Rotation;
}

export function pinRefKey(ref: PinRef): string {
  return `${ref.part}.${ref.pin}`;
}

/**
 * A wire is drawn as a right-angled run: along x to the middle, then along y,
 * then along x again. Simple, readable, and it never needs the student to
 * place bend points.
 */
export function wirePath(doc: { parts: Part[] }, wire: Wire): string {
  const a = doc.parts.find((part) => part.id === wire.from.part);
  const b = doc.parts.find((part) => part.id === wire.to.part);
  if (!a || !b) return "";
  const [ax, ay] = pinPosition(a, wire.from.pin);
  const [bx, by] = pinPosition(b, wire.to.pin);
  return elbow(ax, ay, bx, by);
}

export function elbow(ax: number, ay: number, bx: number, by: number): string {
  if (ax === bx || ay === by) return `M ${ax} ${ay} L ${bx} ${by}`;
  const mx = snap((ax + bx) / 2);
  return `M ${ax} ${ay} L ${mx} ${ay} L ${mx} ${by} L ${bx} ${by}`;
}

/** Bounding box of everything on the board, with a margin; used to fit the view. */
export function boundsOf(parts: Part[], margin = 60): { x: number; y: number; width: number; height: number } {
  if (parts.length === 0) return { x: -200, y: -140, width: 400, height: 280 };
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const part of parts) {
    const [hw, hh] = BODY[part.type];
    // The meter never turns, but its jacks reach 100 units out on whichever side.
    const [w, h] = part.type === "meter" ? [105, 105] : part.rot === 90 || part.rot === 270 ? [hh, hw] : [hw, hh];
    x0 = Math.min(x0, part.x - w);
    y0 = Math.min(y0, part.y - h);
    x1 = Math.max(x1, part.x + w);
    y1 = Math.max(y1, part.y + h);
  }
  return { x: x0 - margin, y: y0 - margin, width: x1 - x0 + margin * 2, height: y1 - y0 + margin * 2 };
}
