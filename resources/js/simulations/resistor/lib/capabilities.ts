/**
 * What this device can comfortably run. The lab defaults to the light 2D bench
 * when WebGL is missing or the machine looks like a low-end shared PC or a
 * phone on data saver; the student can still switch to 3D by hand.
 */

export interface Capabilities {
  webgl: boolean;
  lowPower: boolean;
  compact: boolean;
  reducedMotion: boolean;
  /** Webcam hand control is offered on desktop and tablet only, never phones. */
  handTracking: boolean;
  /** The High quality option (sharper textures and shadows) is only offered here. */
  highQualityAllowed: boolean;
}

function hasWebGL(): boolean {
  try {
    const canvas = document.createElement("canvas");
    const context =
      canvas.getContext("webgl2") ??
      canvas.getContext("webgl") ??
      canvas.getContext("experimental-webgl");
    return context !== null;
  } catch {
    return false;
  }
}

export function detectCapabilities(): Capabilities {
  const nav = navigator as Navigator & {
    deviceMemory?: number;
    connection?: { saveData?: boolean; effectiveType?: string };
  };

  const cores = nav.hardwareConcurrency ?? 4;
  const memory = nav.deviceMemory ?? 4;
  const saveData = nav.connection?.saveData === true;
  const slowLink = ["slow-2g", "2g"].includes(nav.connection?.effectiveType ?? "");
  const compact = window.matchMedia("(max-width: 767px)").matches;
  const coarseOnly = window.matchMedia("(pointer: coarse)").matches && !window.matchMedia("(pointer: fine)").matches;
  const webgl = hasWebGL();
  const lowPower = cores <= 2 || memory <= 2 || saveData || slowLink;

  return {
    webgl,
    lowPower,
    compact,
    reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    handTracking: webgl && !compact && !(coarseOnly && window.innerWidth < 900),
    highQualityAllowed: webgl && !lowPower && !compact,
  };
}

const PREFERENCE_KEY = "epas.simulations.resistor.mode";

export type StageMode = "3d" | "2d";

export function initialMode(caps: Capabilities): StageMode {
  if (!caps.webgl) return "2d";
  try {
    const saved = window.localStorage.getItem(PREFERENCE_KEY);
    if (saved === "3d" || saved === "2d") return saved;
  } catch {
    // Storage blocked on a shared computer: fall through to the default.
  }
  return caps.lowPower ? "2d" : "3d";
}

export function rememberMode(mode: StageMode): void {
  try {
    window.localStorage.setItem(PREFERENCE_KEY, mode);
  } catch {
    // Not important enough to surface.
  }
}
