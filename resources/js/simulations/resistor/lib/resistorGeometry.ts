/**
 * Geometry of the 1/4 W resistor, in millimetres, axis along local +Y, first
 * band nearest +Y. One source of truth for:
 *  - scripts/build-resistor-glb.ts, which writes public/.../resistor.glb, and
 *  - the runtime fallback when USE_GLB_MODEL is false.
 *
 * Imperfections are deliberate and deterministic (seeded): bands a hair off
 * square and unevenly wide, legs not perfectly straight after forming.
 */

import * as THREE from "three";

import { BAND_LAYOUT, RESISTOR, bodyRadiusAt } from "./experience";

/** Small deterministic PRNG so the GLB is reproducible byte for byte. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const HALF = RESISTOR.bodyLength / 2;

/** Axial UVs: v runs 0 → 1 from -Y to +Y end of the body, u around. */
function axialUVs(geometry: THREE.BufferGeometry, from: number, to: number): void {
  const position = geometry.getAttribute("position");
  const uv = geometry.getAttribute("uv");
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i);
    const y = position.getY(i);
    const z = position.getZ(i);
    const angle = Math.atan2(x, z);
    uv.setXY(i, (angle / (Math.PI * 2) + 1) % 1, (y - from) / (to - from));
  }
  uv.needsUpdate = true;
}

export function createBodyGeometry(radialSegments = 96, profileSamples = 160): THREE.BufferGeometry {
  const points: THREE.Vector2[] = [];
  for (let i = 0; i <= profileSamples; i++) {
    // Denser sampling at the shoulders, where the curvature is.
    const t = i / profileSamples;
    const eased = 0.5 - 0.5 * Math.cos(Math.PI * t);
    const y = -HALF + (t * 0.4 + eased * 0.6) * RESISTOR.bodyLength;
    const clampedY = Math.max(-HALF + 1e-4, Math.min(HALF - 1e-4, y));
    points.push(new THREE.Vector2(bodyRadiusAt(clampedY), clampedY));
  }
  const geometry = new THREE.LatheGeometry(points, radialSegments);
  axialUVs(geometry, -HALF, HALF);
  geometry.computeVertexNormals();
  return geometry;
}

/**
 * A band as a thin painted shell that follows the body's own profile, so it
 * wraps the dog-bone curvature instead of floating as a cylinder. Raised a few
 * hundredths of a millimetre, like a lacquer stripe.
 */
export function createBandGeometry(index: number, seed = 60062): THREE.BufferGeometry {
  const random = mulberry32(seed + index * 101);
  const layout = BAND_LAYOUT[index];
  const width = layout.width * (0.96 + random() * 0.08);
  const centre = layout.y + (random() - 0.5) * 0.08;
  const lift = 0.028 + random() * 0.01;
  const from = centre - width / 2;
  const to = centre + width / 2;

  const samples = 18;
  const points: THREE.Vector2[] = [];
  for (let i = 0; i <= samples; i++) {
    const y = from + (i / samples) * (to - from);
    // Paint thins towards the band edges: a soft rounded top, not a step.
    const edge = Math.sin((i / samples) * Math.PI);
    points.push(new THREE.Vector2(bodyRadiusAt(y) + lift * (0.35 + 0.65 * Math.sqrt(edge)), y));
  }

  const geometry = new THREE.LatheGeometry(points, 96);
  axialUVs(geometry, from, to);

  // Hand-painted bands are never quite square to the axis.
  const tilt = (random() - 0.5) * THREE.MathUtils.degToRad(1.4);
  geometry.translate(0, -centre, 0);
  geometry.applyMatrix4(new THREE.Matrix4().makeRotationX(tilt));
  geometry.translate(0, centre, 0);

  geometry.computeVertexNormals();
  return geometry;
}

/** Path of one formed lead: out of the body, a 90° bend, then down the leg. */
export function leadPath(side: 1 | -1, seed = 4242): THREE.CatmullRomCurve3 {
  const random = mulberry32(seed + (side > 0 ? 7 : 13));
  const points: THREE.Vector3[] = [];
  const start = side * (HALF - 0.6);
  const bendStart = side * (HALF + RESISTOR.leadStraight);
  const r = RESISTOR.bendRadius;

  // Inside the body to the start of the bend.
  for (let i = 0; i <= 4; i++) {
    points.push(new THREE.Vector3(0, start + ((bendStart - start) * i) / 4, 0));
  }
  // Quarter bend towards local -X (which becomes "down" once laid flat).
  for (let i = 1; i <= 10; i++) {
    const a = (i / 10) * (Math.PI / 2);
    points.push(new THREE.Vector3(-r + r * Math.cos(a), bendStart + side * r * Math.sin(a), 0));
  }
  // The leg: a slight lean and a faint kink partway down, as formed by hand.
  const lean = (random() - 0.5) * 0.08;
  const kinkAt = 0.45 + random() * 0.2;
  const kink = (random() - 0.5) * 0.09;
  const legTop = new THREE.Vector3(-r, bendStart + side * r, 0);
  for (let i = 1; i <= 16; i++) {
    const t = i / 16;
    const down = t * RESISTOR.leadDrop;
    const kinkOffset = t > kinkAt ? (t - kinkAt) * kink * RESISTOR.leadDrop : 0;
    points.push(new THREE.Vector3(legTop.x - down, legTop.y + side * (lean * down + kinkOffset), (random() - 0.5) * 0.02));
  }

  return new THREE.CatmullRomCurve3(points, false, "centripetal");
}

export function createLeadGeometry(side: 1 | -1): THREE.BufferGeometry {
  const geometry = new THREE.TubeGeometry(leadPath(side), 160, RESISTOR.leadRadius, 14, false);
  return geometry;
}

/** Where a lead's leg ends, in the part's local space. Probes touch above this. */
export function legPoint(side: 1 | -1, along: number): THREE.Vector3 {
  return leadPath(side).getPointAt(along);
}

export interface ResistorParts {
  body: THREE.BufferGeometry;
  leads: [THREE.BufferGeometry, THREE.BufferGeometry];
  bands: THREE.BufferGeometry[];
}

export function createResistorParts(): ResistorParts {
  return {
    body: createBodyGeometry(),
    leads: [createLeadGeometry(1), createLeadGeometry(-1)],
    bands: BAND_LAYOUT.map((_, index) => createBandGeometry(index)),
  };
}
