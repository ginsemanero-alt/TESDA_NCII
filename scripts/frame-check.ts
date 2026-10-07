/**
 * Framing check for the 3D bench (successor to the donor's frame-check.ts).
 *
 * The donor measured overlap between the part and copy columns laid over a
 * full-screen canvas. Here there are two kinds of stage:
 *  - the lab's own box beside (desktop) or above (phone) the chapters, where the
 *    question is whether each keyframe's subject is fully inside the box;
 *  - the landing page's full-bleed hero, where copy is laid over the stage, so
 *    the subject must also stay clear of the copy card (beside it from 1200 px,
 *    above it below that).
 * Camera distance, the hero's picture offset and the breakpoint come from
 * lib/experience.ts, the same constants the app uses. Exit code 1 on any clip
 * or overlap.
 *
 *   npm run check:framing
 */

import * as THREE from "three";

import {
  BATTERY,
  BREADBOARD,
  CHAPTERS,
  INTERACTION,
  HERO,
  MAT_Y,
  RESISTOR,
  RESISTOR_HEIGHT,
  RESISTOR_ROW_Z,
  distanceFactor,
} from "../resources/js/simulations/resistor/lib/experience";
import { JACKS, meterFacePoint } from "../resources/js/simulations/resistor/lib/bench";

type Hero = {
  offset: { x: number; y: number };
  /** Right edge of the copy card, percent of the width (beside layout). */
  copyRight?: number;
  /** Top edge of the copy card per beat, percent of the height (stacked layout). */
  copyTop?: Record<string, number>;
};

type Mode = { name: string; w: number; h: number; compact: boolean; hero?: Hero };

const HEADER = 64; // the landing page's sticky header, px

/** Right edge of the 3D hero's copy card when it sits beside the part. */
function besideCopyRight(viewport: number): number {
  const pad = Math.min(56, Math.max(16, viewport * 0.04));
  return ((pad + Math.min(544, viewport * 0.4)) / viewport) * 100;
}


// Copy card heights when it sits under the part (pill, word, sentence, buttons, toggle; or a short beat), in px.
const STACKED_CARD_PX = { intro: 340, colorcode: 190, measure: 210, circuit: 330 };

function stacked(w: number, h: number): Hero {
  const copyTop: Record<string, number> = {};
  for (const [chapter, px] of Object.entries(STACKED_CARD_PX)) copyTop[chapter] = 100 - (px / h) * 100;
  return { offset: HERO.offset.stacked, copyTop };
}

const MODES: Mode[] = [
  // The lab: 1366×768 laptop (74vh, 1.2fr column), 1440×900 desktop, 390×844 phone (42vh).
  { name: "lab · laptop 1366x768", w: 560, h: 568, compact: false },
  { name: "lab · desktop 1440x900", w: 590, h: 640, compact: false },
  { name: "lab · phone 390x844", w: 390, h: 354, compact: true },
  // The landing hero: full viewport minus the header. Landscape and 900 px+: copy beside the part.
  ...[
    [900, 600],
    [1024, 768],
    [1180, 820],
    [1280, 720],
    [1366, 768],
    [1440, 900],
    [1920, 1080],
  ].map(([w, h]): Mode => ({
    name: `hero · ${w}x${h} (copy beside)`,
    w,
    h: h - HEADER,
    compact: false,
    hero: { offset: HERO.offset.beside, copyRight: besideCopyRight(w) },
  })),
  // Portrait or narrow: the copy card sits under the part.
  ...[
    [768, 1024, false],
    [820, 1180, false],
    [390, 844, true],
    [360, 740, true],
  ].map(([w, h, compact]): Mode => ({
    name: `hero · ${w}x${h} (copy below)`,
    w: w as number,
    h: (h as number) - HEADER,
    compact: compact as boolean,
    hero: stacked(w as number, (h as number) - HEADER),
  })),
];

/** The hero scrolls through these chapters only. */
const HERO_CHAPTERS = new Set(["intro", "colorcode", "measure", "circuit"]);

const MARGIN = 3; // percent of the stage kept clear at each edge

function box(min: THREE.Vector3, max: THREE.Vector3): THREE.Vector3[] {
  const points: THREE.Vector3[] = [];
  for (const x of [min.x, max.x]) for (const y of [min.y, max.y]) for (const z of [min.z, max.z]) points.push(new THREE.Vector3(x, y, z));
  return points;
}

export function subjectPoints(subject: string, insert: number): THREE.Vector3[] {
  const height = RESISTOR_HEIGHT.floating + (RESISTOR_HEIGHT.inserted - RESISTOR_HEIGHT.floating) * insert;
  const bodyHalf = RESISTOR.bodyLength / 2;
  const r = RESISTOR.capRadius;
  const legHalf = RESISTOR.holeSpan / 2 + RESISTOR.leadRadius;
  const legDrop = RESISTOR.bendRadius + RESISTOR.leadDrop;
  const z = RESISTOR_ROW_Z;

  const body = box(new THREE.Vector3(-bodyHalf, height - r, z - r), new THREE.Vector3(bodyHalf, height + r, z + r));
  // Inserted legs disappear into the board; only what is above it must be framed.
  const part = box(
    new THREE.Vector3(-legHalf, Math.max(height - legDrop, insert > 0.5 ? 0 : -Infinity), z - r),
    new THREE.Vector3(legHalf, height + r, z + r),
  );
  const board = box(new THREE.Vector3(-BREADBOARD.width / 2, MAT_Y, -BREADBOARD.depth / 2), new THREE.Vector3(BREADBOARD.width / 2, 0, BREADBOARD.depth / 2));
  const meter = [meterFacePoint(8, 10), meterFacePoint(64, 10), JACKS.com, JACKS.volts];
  const battery = box(
    new THREE.Vector3(BATTERY.position[0] - BATTERY.size[0] / 2, MAT_Y, BATTERY.position[2] - BATTERY.size[2] / 2),
    new THREE.Vector3(BATTERY.position[0] + BATTERY.size[0] / 2, MAT_Y + BATTERY.size[1], BATTERY.position[2] + BATTERY.size[2] / 2),
  );

  switch (subject) {
    case "body":
      return body;
    case "part":
      return part;
    case "board":
      return [...part, ...board.filter((p) => p.y === 0), ...meter];
    case "circuit":
      return [...part, ...board, ...battery];
    default:
      return [...board, ...meter, ...battery];
  }
}

function run(): number {
  let problems = 0;

  for (const mode of MODES) {
    const fov = mode.compact ? INTERACTION.fov.compact : INTERACTION.fov.desktop;
    const aspect = mode.w / mode.h;
    const fit = mode.hero ? (mode.hero.copyTop !== undefined ? HERO.fit.stacked : HERO.fit.beside) : undefined;
    const distance = distanceFactor(Math.round(aspect * 20) / 20, mode.compact, fit?.referenceAspect) * (fit?.scale ?? 1);
    const offset = mode.hero?.offset ?? { x: 0, y: 0 };

    console.log(`\n=== ${mode.name}: stage ${mode.w}×${mode.h}, fov ${fov}, distance ×${distance.toFixed(2)} ===`);
    const camera = new THREE.PerspectiveCamera(fov, aspect, 0.5, 2000);
    let insert = 0;

    for (const chapter of CHAPTERS) {
      if (mode.hero && !HERO_CHAPTERS.has(chapter.id)) continue;

      chapter.keyframes.forEach((keyframe, index) => {
        if (keyframe.scene?.insert !== undefined) insert = keyframe.scene.insert;
        const eye = keyframe.pos.map((value, axis) => keyframe.target[axis] + (value - keyframe.target[axis]) * distance);
        camera.position.set(eye[0], eye[1], eye[2]);
        camera.lookAt(...keyframe.target);
        camera.updateMatrixWorld(true);
        camera.updateProjectionMatrix();

        const projected = subjectPoints(keyframe.subject, insert).map((p) => p.clone().project(camera));
        // The hero slides the picture inside the canvas (ViewShift): right by x, up by y.
        const xs = projected.map((p) => (p.x * 0.5 + 0.5) * 100 + offset.x * 100);
        const ys = projected.map((p) => (1 - (p.y * 0.5 + 0.5)) * 100 - offset.y * 100);
        const x0 = Math.min(...xs);
        const x1 = Math.max(...xs);
        const y0 = Math.min(...ys);
        const y1 = Math.max(...ys);
        const behind = projected.some((p) => p.z > 1);
        const clipped = behind || x0 < MARGIN || x1 > 100 - MARGIN || y0 < MARGIN || y1 > 100 - MARGIN;

        let overlap = "";
        if (mode.hero?.copyRight !== undefined && x0 < mode.hero.copyRight) {
          overlap = `overlaps copy (part from ${x0.toFixed(0)}%, copy to ${mode.hero.copyRight.toFixed(0)}%)`;
        }
        const top = mode.hero?.copyTop?.[chapter.id];
        if (top !== undefined && y1 > top) {
          overlap = `overlaps copy (part to ${y1.toFixed(0)}%, copy from ${top}%)`;
        }

        const fill = Math.max(x1 - x0, y1 - y0);
        const verdict = clipped ? "CLIPPED" : overlap ? overlap.toUpperCase() : fill < 25 ? "small" : "ok";
        if (clipped || overlap) problems++;

        console.log(
          `${chapter.id}[${index}] ${keyframe.subject}`.padEnd(24) +
            `x ${x0.toFixed(0)}–${x1.toFixed(0)}%`.padEnd(14) +
            `y ${y0.toFixed(0)}–${y1.toFixed(0)}%`.padEnd(14) +
            `fills ${fill.toFixed(0)}%`.padEnd(12) +
            verdict,
        );
      });
    }
  }

  return problems;
}

// Only run when invoked as a script, so other tools can import subjectPoints().
if (/frame-check/.test(process.argv[1] ?? "")) {
  const problems = run();
  console.log(problems === 0 ? "\n✓ every subject is fully in frame and clear of the copy" : `\n✗ ${problems} keyframe(s) clip their subject or overlap the copy`);
  process.exit(problems === 0 ? 0 : 1);
}
