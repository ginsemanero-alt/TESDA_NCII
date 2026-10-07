import { boundsOf, pinPosition } from "../lib/geometry";
import { CircuitDoc, Part } from "../lib/types";

/**
 * Drawing units to millimetres. At 0.6 the 80-unit pin-to-pin span of a part is
 * 48 mm, the length of a real 9 V battery, so the parts keep believable sizes
 * next to each other.
 */
export const S = 0.6;

/** Height of a binding post's top above the board, mm. */
export const POST_H = 5.5;

export type Vec3 = [number, number, number];

/** Where a part's centre is on the board (the schematic y axis becomes depth). */
export const centreOf = (part: Part): Vec3 => [part.x * S, 0, part.y * S];

/** Top of the binding post a pin is wired to. */
export function postTop(part: Part, pin: string): Vec3 {
  const [x, y] = pinPosition(part, pin);
  return [x * S, POST_H, y * S];
}

export interface BoardBox {
  cx: number;
  cz: number;
  width: number;
  depth: number;
}

/** The project board under the circuit: the parts' extent plus a margin, never smaller than a postcard. */
export function boardBox(doc: CircuitDoc): BoardBox {
  if (doc.parts.length === 0) return { cx: 0, cz: 0, width: 180, depth: 120 };
  const b = boundsOf(doc.parts, 60);
  return {
    cx: (b.x + b.width / 2) * S,
    cz: (b.y + b.height / 2) * S,
    width: Math.max(180, b.width * S),
    depth: Math.max(120, b.height * S),
  };
}
