/**
 * Animation state that changes every frame lives here rather than in React
 * state, so scrolling, cursor movement and hand tracking never trigger a
 * re-render. GSAP writes to `sceneAnim`, input handlers write to `sceneInput`,
 * and `useFrame` callbacks read both.
 */

import { CAMERA_START, SCENE_START, SceneTargets, Vec3 } from "./experience";

export const sceneAnim: SceneTargets & {
  camX: number;
  camY: number;
  camZ: number;
  targetX: number;
  targetY: number;
  targetZ: number;
} = {
  ...SCENE_START,
  camX: CAMERA_START.pos[0],
  camY: CAMERA_START.pos[1],
  camZ: CAMERA_START.pos[2],
  targetX: CAMERA_START.target[0],
  targetY: CAMERA_START.target[1],
  targetZ: CAMERA_START.target[2],
};

export type InputSource = "pointer" | "hand";

export const sceneInput = {
  /** Normalised cursor position over the stage, -1 to 1. */
  pointerX: 0,
  pointerY: 0,
  smoothX: 0,
  smoothY: 0,
  /** User-driven orbit around the camera target, in radians. */
  yaw: 0,
  pitch: 0,
  zoom: 1,
  targetYaw: 0,
  targetPitch: 0,
  targetZoom: 1,
  source: "pointer" as InputSource,
  dragging: false,
  /** Speed of the Explain-mode flow arrows, driven by the Ohm's law chapter. */
  currentScale: 1,
};

export function resetOrbit(): void {
  sceneInput.targetYaw = 0;
  sceneInput.targetPitch = 0;
  sceneInput.targetZoom = 1;
}

/** Frame-rate independent damping factor. */
export function damp(delta: number, rate: number): number {
  return 1 - Math.exp(-rate * delta);
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function toVec3(x: number, y: number, z: number): Vec3 {
  return [x, y, z];
}
