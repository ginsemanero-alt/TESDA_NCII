/**
 * World-space layout of the bench, computed once from experience.ts: where the
 * jumpers, battery leads and meter probes run, and the closed current loop the
 * Explain-mode arrows follow. Shared by the scene, the arrows and the framing
 * check so they cannot disagree.
 */

import * as THREE from "three";

import {
  BATTERY,
  BREADBOARD,
  holeX,
  MAT_Y,
  MULTIMETER,
  RESISTOR,
  RESISTOR_HEIGHT,
  RESISTOR_ROW_Z,
  ROW_Z,
} from "./experience";

const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

/** Columns the resistor's legs sit in. */
export const LEG_COLUMNS = [13, 17] as const;

/** A jumper wire: up out of one hole, a low arch, down into the other. */
export function jumperPath(from: [number, number], to: [number, number], height = 5): THREE.CatmullRomCurve3 {
  const [x0, z0] = from;
  const [x1, z1] = to;
  const mid = v((x0 + x1) / 2, height + 1.2, (z0 + z1) / 2);
  return new THREE.CatmullRomCurve3(
    [v(x0, -3, z0), v(x0, 0.4, z0), v(x0 + (x1 - x0) * 0.12, height, z0 + (z1 - z0) * 0.12), mid, v(x1 - (x1 - x0) * 0.12, height, z1 - (z1 - z0) * 0.12), v(x1, 0.4, z1), v(x1, -3, z1)],
    false,
    "centripetal",
  );
}

export const RED_JUMPER = jumperPath([holeX(9), ROW_Z.topPlus], [holeX(LEG_COLUMNS[0]), ROW_Z.a]);
export const BLACK_JUMPER = jumperPath([holeX(21), ROW_Z.topMinus], [holeX(LEG_COLUMNS[1]), ROW_Z.a]);

/** Battery terminals on the +x face of the PP3, which lies on its side. */
export const BATTERY_CENTER = v(BATTERY.position[0], MAT_Y + BATTERY.size[1] / 2, BATTERY.position[2]);
export const BATTERY_FACE_X = BATTERY_CENTER.x + BATTERY.size[0] / 2;
export const TERMINAL_PLUS = v(BATTERY_FACE_X + 3, BATTERY_CENTER.y, BATTERY_CENTER.z - 6.35);
export const TERMINAL_MINUS = v(BATTERY_FACE_X + 3, BATTERY_CENTER.y, BATTERY_CENTER.z + 6.35);

/** The snap clip, attached to the terminals or lying loose beside the battery. */
export const SNAP_ATTACHED = v(BATTERY_FACE_X + 6, BATTERY_CENTER.y, BATTERY_CENTER.z);
export const SNAP_LOOSE = v(BATTERY_FACE_X - 2, MAT_Y + 4, BATTERY_CENTER.z + 26);

export function batteryLeadPath(snap: THREE.Vector3, offsetZ: number, hole: [number, number]): THREE.CatmullRomCurve3 {
  const start = v(snap.x + 5, snap.y, snap.z + offsetZ);
  const [hx, hz] = hole;
  // Down to the mat, along it to the board's left edge, up and over the edge
  // (never through the board), then into the rail hole.
  const edge = -BREADBOARD.width / 2;
  return new THREE.CatmullRomCurve3(
    [
      start,
      v(start.x + 4, MAT_Y + 1.4, start.z),
      v(edge - 6, MAT_Y + 1.2, (start.z + hz) / 2),
      v(edge - 2.5, MAT_Y + 4, hz),
      v(edge - 1.5, 2.6, hz),
      v(edge + 3, 3.6, hz),
      v(hx - 2.5, 3.2, hz),
      v(hx, 0.4, hz),
      v(hx, -3, hz),
    ],
    false,
    "centripetal",
  );
}

export const RAIL_HOLES = {
  plus: [holeX(3), ROW_Z.topPlus] as [number, number],
  minus: [holeX(4), ROW_Z.topMinus] as [number, number],
};

/* ------------------------------------------------------------------ */
/* The resistor's legs, in world space once inserted                  */
/* ------------------------------------------------------------------ */

/** A point on a leg (side +1 = left/first band, -1 = right) at a height above the board. */
export function legWorldPoint(side: 1 | -1, height: number): THREE.Vector3 {
  // Local +Y maps to world -X once the part is laid flat.
  const x = -side * (RESISTOR.holeSpan / 2);
  return v(x, height, RESISTOR_ROW_Z);
}

/* ------------------------------------------------------------------ */
/* The multimeter                                                      */
/* ------------------------------------------------------------------ */

const meterMatrix = new THREE.Matrix4().compose(
  v(MULTIMETER.position[0], MAT_Y + MULTIMETER.size[1] / 2, MULTIMETER.position[2]),
  new THREE.Quaternion().setFromEuler(new THREE.Euler(MULTIMETER.tilt, MULTIMETER.yaw, 0, "YXZ")),
  v(1, 1, 1),
);

export const METER_MATRIX = meterMatrix;

/** Face coordinates in mm (0,0 top-left of the 72 × 140 face) to world space. */
export function meterFacePoint(fx: number, fy: number, above = 0): THREE.Vector3 {
  return v(fx - 36, MULTIMETER.size[1] / 2 + 0.6 + above, fy - 70).applyMatrix4(meterMatrix);
}

export const JACKS = {
  com: meterFacePoint(36, 120, 1),
  volts: meterFacePoint(58, 120, 1),
};

/* ------------------------------------------------------------------ */
/* Probes                                                              */
/* ------------------------------------------------------------------ */

export interface ProbePose {
  tip: THREE.Vector3;
  /** Unit vector from the tip towards the handle. */
  direction: THREE.Vector3;
  /** End of the handle where the cable leaves. */
  tail: THREE.Vector3;
  cable: THREE.CatmullRomCurve3;
}

const TIP_LENGTH = 12;
const HANDLE_LENGTH = 72;

function probePose(side: 1 | -1, jack: THREE.Vector3): ProbePose {
  const tip = legWorldPoint(side, 1.1).add(v(0, 0, 0.45));
  const direction = v(-side * 0.42, 0.5, 0.76).normalize();
  const tail = tip.clone().addScaledVector(direction, TIP_LENGTH + HANDLE_LENGTH);
  const cable = new THREE.CatmullRomCurve3(
    [
      tail,
      tail.clone().addScaledVector(direction, 14),
      v(tail.x + (jack.x - tail.x) * 0.35, MAT_Y + 3, tail.z + 26),
      v(jack.x - 6, MAT_Y + 2, jack.z + 22),
      v(jack.x, jack.y + 8, jack.z + 6),
      jack,
    ],
    false,
    "centripetal",
  );
  return { tip, direction, tail, cable };
}

/** Black on the first-band leg into COM, red on the other into VΩ. */
export const PROBES = {
  black: probePose(1, JACKS.com),
  red: probePose(-1, JACKS.volts),
  tipLength: TIP_LENGTH,
  handleLength: HANDLE_LENGTH,
};

/* ------------------------------------------------------------------ */
/* The current loop (conventional current, + to −)                     */
/* ------------------------------------------------------------------ */

function sample(curve: THREE.Curve<THREE.Vector3>, count: number, reverse = false): THREE.Vector3[] {
  const points = curve.getSpacedPoints(count);
  return reverse ? points.reverse() : points;
}

/**
 * + terminal → red lead → + rail → red jumper → left leg → across the body →
 * right leg → black jumper → − rail → black lead → − terminal. Arrows ride
 * just above the wires so they read as annotations, not as parts.
 */
export function currentLoop(): THREE.CatmullRomCurve3 {
  const lift = v(0, 1.6, 0);
  const plusLead = batteryLeadPath(SNAP_ATTACHED, -3, RAIL_HOLES.plus);
  const minusLead = batteryLeadPath(SNAP_ATTACHED, 3, RAIL_HOLES.minus);
  const body = RESISTOR_HEIGHT.inserted;

  const points = [
    ...sample(plusLead, 24),
    v(RAIL_HOLES.plus[0], 0.5, RAIL_HOLES.plus[1]),
    v(holeX(9), 0.5, ROW_Z.topPlus),
    ...sample(RED_JUMPER, 18).slice(1, -1),
    v(holeX(LEG_COLUMNS[0]), 0.5, ROW_Z.e),
    legWorldPoint(1, body),
    legWorldPoint(-1, body),
    v(holeX(LEG_COLUMNS[1]), 0.5, ROW_Z.e),
    ...sample(BLACK_JUMPER, 18, true).slice(1, -1),
    v(holeX(21), 0.5, ROW_Z.topMinus),
    v(RAIL_HOLES.minus[0], 0.5, RAIL_HOLES.minus[1]),
    ...sample(minusLead, 24, true),
  ].map((p) => p.clone().add(lift));

  return new THREE.CatmullRomCurve3(points, false, "centripetal");
}
