/**
 * Every tuned number for the 3D bench. One scene unit is one millimetre, so
 * the part, the breadboard and the multimeter sit at their real relative sizes.
 * The GLB builder (scripts/build-resistor-glb.mjs) and the framing check
 * (scripts/frame-check.ts) import the same constants.
 */

export type Vec3 = [number, number, number];

/* ------------------------------------------------------------------ */
/* The part: a 1/4 W carbon-film axial resistor                        */
/* ------------------------------------------------------------------ */

/**
 * The part loads from public/simulations/resistor/models/resistor.glb, built by
 * scripts/build-resistor-glb.ts from lib/resistorGeometry. Set false to build
 * the identical geometry at runtime instead (no download, slightly more CPU).
 */
export const USE_GLB_MODEL = true;

export const ASSET_PATHS = {
  model: "models/resistor.glb",
  hdri: "hdr/studio_small_09_768.hdr",
  mediapipeWasm: "mediapipe/wasm",
  handModel: "mediapipe/hand_landmarker.task",
} as const;

/**
 * Real proportions: body 6.3 mm long, Ø2.4 mm over the end caps and slightly
 * waisted in the middle (the "dog-bone"), 0.55 mm tinned-copper leads, about
 * 28 mm end to end before forming. The part's axis is local +Y, first band
 * nearest +Y, as RESISTOR.md documents for the GLB.
 */
export const RESISTOR = {
  bodyLength: 6.3,
  capRadius: 1.2,
  waistRadius: 1.0,
  /** Length of each end cap before the waist starts. */
  capLength: 1.35,
  /** Rounded shoulder where the cap meets the lead. */
  shoulder: 0.42,
  leadRadius: 0.275,
  /** Straight run out of the body before the 90° bend. */
  leadStraight: 1.03,
  bendRadius: 0.9,
  /** Formed leg length below the bend. */
  leadDrop: 8.5,
  /** Hole pitch the formed part fits: four holes on a 2.54 mm grid. */
  holeSpan: 10.16,
} as const;

/** Radius of the body at height y along its axis (y = 0 is the middle). */
export function bodyRadiusAt(y: number): number {
  const half = RESISTOR.bodyLength / 2;
  const fromEnd = half - Math.abs(y);
  if (fromEnd <= 0) return 0;
  if (fromEnd < RESISTOR.shoulder) {
    // Rounded shoulder: a quarter ellipse from the lead out to the cap.
    const t = fromEnd / RESISTOR.shoulder;
    return RESISTOR.leadRadius + (RESISTOR.capRadius - RESISTOR.leadRadius) * Math.sqrt(1 - (1 - t) * (1 - t));
  }
  if (fromEnd < RESISTOR.capLength) return RESISTOR.capRadius;
  // Smooth step down from cap to waist over 0.6 mm.
  const t = Math.min((fromEnd - RESISTOR.capLength) / 0.6, 1);
  const s = t * t * (3 - 2 * t);
  return RESISTOR.capRadius - (RESISTOR.capRadius - RESISTOR.waistRadius) * s;
}

/** Axial centre and width of each painted band, in mm, first band nearest +Y. */
export const BAND_LAYOUT = [
  { y: 2.12, width: 0.62 },
  { y: 1.18, width: 0.6 },
  { y: 0.28, width: 0.6 },
  { y: -2.05, width: 0.56 },
] as const;

/* ------------------------------------------------------------------ */
/* The bench                                                           */
/* ------------------------------------------------------------------ */

export const PITCH = 2.54;

/**
 * A half-size solderless breadboard. The board's top face is y = 0; the bench
 * mat it stands on is at MAT_Y. Hole x = (column - 15) × pitch.
 */
export const BREADBOARD = {
  width: 84,
  depth: 55,
  height: 9.5,
  columns: 30,
  color: "#ece9df",
} as const;

export const MAT_Y = -BREADBOARD.height;

export const holeX = (column: number) => (column - 15) * PITCH;

/** Row z positions: a–e above the centre channel, f–j below, rails outside. */
export const ROW_Z: Record<string, number> = {
  a: -13.97, b: -11.43, c: -8.89, d: -6.35, e: -3.81,
  f: 3.81, g: 6.35, h: 8.89, i: 11.43, j: 13.97,
  topPlus: -21.59, topMinus: -19.05, bottomMinus: 19.05, bottomPlus: 21.59,
};

/** Height of the body's axis above the board top, floating and inserted. */
export const RESISTOR_HEIGHT = { floating: 15, inserted: 2.3 } as const;

/** The part's legs go into row e, columns 13 and 17 (10.16 mm apart). */
export const RESISTOR_ROW_Z = ROW_Z.e;

export const BATTERY = {
  /** A PP3 9 V battery lying on its side, terminals towards +x. x/z only; it rests on the mat. */
  size: [48.5, 17.5, 26.5] as Vec3,
  position: [-74, 0, -6] as Vec3,
} as const;

export const MULTIMETER = {
  /** Width, height, length of a pocket DMM in its holster. x/z position only; it rests on the mat. */
  size: [76, 24, 150] as Vec3,
  position: [86, 0, 18] as Vec3,
  /** Yaw towards the student, radians. */
  yaw: -0.32,
  /** Tilt from the rear stand, radians. */
  tilt: 0.14,
} as const;

/* ------------------------------------------------------------------ */
/* Chapters and camera                                                 */
/* ------------------------------------------------------------------ */

export type ChapterId = "intro" | "colorcode" | "measure" | "circuit" | "ohmslaw" | "build";

export interface SceneTargets {
  /** 0 floating above the board, 1 pushed into it. */
  insert: number;
  /** Battery and its leads: 0 hidden (power removed), 1 connected. */
  power: number;
  /** Probes on the leads and the meter reading. */
  probes: number;
  /** Self-rotation and float while the part is in the air. */
  drift: number;
  /** Per-band highlight. Only drawn in Explain mode. */
  band0: number;
  band1: number;
  band2: number;
  band3: number;
}

/** Every keyframe sets every scene value, so arriving from any chapter lands in the same state. */
export interface CameraKeyframe {
  pos: Vec3;
  target: Vec3;
  /** What the framing check requires to be fully in frame. */
  subject: "body" | "part" | "board" | "circuit" | "bench";
  scene: SceneTargets;
}

export interface Chapter {
  id: ChapterId;
  /** One keyframe per step; colorcode steps through the four bands. */
  keyframes: CameraKeyframe[];
}

const FLOAT = RESISTOR_HEIGHT.floating;

/** World x of band i once the part is laid flat (local +Y maps to world -X). */
export const bandWorldX = (index: number) => -BAND_LAYOUT[index].y;

export const SCENE_START: SceneTargets = {
  insert: 0,
  power: 0,
  probes: 0,
  drift: 1,
  band0: 0,
  band1: 0,
  band2: 0,
  band3: 0,
};

/**
 * Macro-photo moves: a three-quarter hero, slow dolly along the bands, then
 * pull back to the bench as the part goes into the board.
 */
export const CHAPTERS: Chapter[] = [
  {
    id: "intro",
    keyframes: [
      { pos: [6.5, FLOAT + 3.3, 24.3 + RESISTOR_ROW_Z], target: [0, FLOAT - 4.1, RESISTOR_ROW_Z], subject: "part", scene: { insert: 0, drift: 1, power: 0, probes: 0, band0: 0, band1: 0, band2: 0, band3: 0 } },
    ],
  },
  {
    id: "colorcode",
    keyframes: [0, 1, 2, 3].map((band) => ({
      pos: [bandWorldX(band) * 1.13 + 4.3, FLOAT + 5.6, 19.4 + RESISTOR_ROW_Z] as Vec3,
      target: [bandWorldX(band) * 0.6, FLOAT, RESISTOR_ROW_Z] as Vec3,
      subject: "body" as const,
      scene: {
        insert: 0,
        drift: 0,
        power: 0,
        probes: 0,
        band0: band === 0 ? 1 : 0,
        band1: band === 1 ? 1 : 0,
        band2: band === 2 ? 1 : 0,
        band3: band === 3 ? 1 : 0,
      },
    })),
  },
  {
    id: "measure",
    keyframes: [
      {
        pos: [50, 267, 299],
        target: [44, 12, 14],
        subject: "board",
        scene: { insert: 1, drift: 0, power: 0, probes: 1, band0: 0, band1: 0, band2: 0, band3: 0 },
      },
    ],
  },
  {
    id: "circuit",
    keyframes: [
      { pos: [-10, 340, 394], target: [16, 7, 14], subject: "bench", scene: { insert: 1, power: 1, probes: 0, drift: 0, band0: 0, band1: 0, band2: 0, band3: 0 } },
    ],
  },
  {
    id: "ohmslaw",
    keyframes: [
      { pos: [-106, 200, 257], target: [-28, -1, 0], subject: "circuit", scene: { insert: 1, power: 1, probes: 0, drift: 0, band0: 0, band1: 0, band2: 0, band3: 0 } },
    ],
  },
  {
    id: "build",
    keyframes: [
      { pos: [3.2, 11.7, 22.9 + RESISTOR_ROW_Z], target: [0, 1.8, RESISTOR_ROW_Z], subject: "part", scene: { insert: 1, power: 0, probes: 1, drift: 0, band0: 0, band1: 0, band2: 0, band3: 0 } },
    ],
  },
];

export const CAMERA_START: CameraKeyframe = CHAPTERS[0].keyframes[0];

export const INTERACTION = {
  /** Phones see the stage through a smaller, squarer window: back off. */
  compactDistance: 1.0,
  fov: { desktop: 30, compact: 36 },
  /** Seconds a chapter-to-chapter move takes. Slow on purpose. */
  moveSeconds: 2.2,
  cameraDamping: 3.2,
  pointerParallax: 0.6,
  pointerDamping: 2.2,
  orbitDamping: 5,
  dragSpeed: 0.005,
  pitchLimit: 0.7,
  zoomRange: [0.5, 1.6] as const,
} as const;

/**
 * Stages the keyframes were fitted for are about as wide as they are tall. A
 * taller, narrower stage (a phone held upright, a portrait tablet) sees less
 * sideways at the same distance, so the camera backs off by the same ratio to
 * keep the subject's width in frame. Wider stages need nothing: the subjects
 * are wider than tall, so width, not height, is what runs out first.
 */
export const NARROW_ASPECT = 0.95;

export function distanceFactor(aspect: number, compact: boolean, referenceAspect: number = NARROW_ASPECT): number {
  return (compact ? INTERACTION.compactDistance : 1) * Math.max(1, referenceAspect / aspect);
}

/**
 * Landing-page hero layout. The stage is full bleed with the copy laid over
 * it. On a landscape screen at least 900 px wide the copy sits left and the
 * part is pushed right by a fifth of the width; on anything narrower or
 * portrait the copy card sits under the part and the part is pushed up a
 * tenth of the height. HeroStage.tsx applies these and
 * scripts/frame-check.ts verifies them; landing.blade.php's media query must
 * use the same breakpoint.
 */
export const HERO = {
  besideQuery: "(min-width: 900px) and (min-aspect-ratio: 5/4)",
  /**
   * How far the camera backs off. `scale` multiplies every distance; `referenceAspect`
   * is the stage shape the keyframes fit at scale 1 (squarer stages back off in
   * proportion). Beside: the part only has the right half of the stage. Stacked:
   * only the strip above the copy card.
   */
  fit: {
    beside: { scale: 1, referenceAspect: 1.7 },
    stacked: { scale: 1.55, referenceAspect: 0.95 },
  },
  offset: {
    beside: { x: 0.2, y: 0 },
    stacked: { x: 0, y: 0.16 },
  },
} as const;
