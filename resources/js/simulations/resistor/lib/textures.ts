/**
 * Textures drawn at runtime on a canvas instead of downloaded: the ceramic's
 * colour, roughness and bump variation, the band edges, the brushed leads, the
 * breadboard's holes and print, the ESD mat and the multimeter face. Zero bytes
 * over the network, deterministic (seeded), and sized down on low-power
 * devices.
 */

import * as THREE from "three";

import { mulberry32 } from "./resistorGeometry";
import { BREADBOARD, holeX, PITCH, ROW_Z } from "./experience";

/* ------------------------------------------------------------------ */
/* Noise                                                               */
/* ------------------------------------------------------------------ */

/** Tileable value noise, fractal, in [0, 1]. */
function makeNoise(seed: number, cellsX: number, cellsY: number) {
  const random = mulberry32(seed);
  const grid = new Float32Array((cellsX + 1) * (cellsY + 1));
  for (let i = 0; i < grid.length; i++) grid[i] = random();
  const at = (x: number, y: number) => grid[(y % (cellsY + 1)) * (cellsX + 1) + (x % cellsX)];
  return (u: number, v: number) => {
    const x = u * cellsX;
    const y = v * cellsY;
    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const fx = x - x0;
    const fy = y - y0;
    const sx = fx * fx * (3 - 2 * fx);
    const sy = fy * fy * (3 - 2 * fy);
    const a = at(x0, y0);
    const b = at(x0 + 1, y0);
    const c = at(x0, y0 + 1);
    const d = at(x0 + 1, y0 + 1);
    return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
  };
}

function fractal(seed: number, octaves: number, baseCells: number) {
  const layers = Array.from({ length: octaves }, (_, i) => makeNoise(seed + i * 17, baseCells * 2 ** i, baseCells * 2 ** i));
  return (u: number, v: number) => {
    let total = 0;
    let weight = 0;
    let amplitude = 1;
    for (const layer of layers) {
      total += layer(u, v) * amplitude;
      weight += amplitude;
      amplitude *= 0.5;
    }
    return total / weight;
  };
}

function canvas(width: number, height: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const element = document.createElement("canvas");
  element.width = width;
  element.height = height;
  const context = element.getContext("2d");
  if (!context) throw new Error("2D canvas unavailable");
  return [element, context];
}

function texture(element: HTMLCanvasElement, color: boolean, anisotropy = 4): THREE.CanvasTexture {
  const result = new THREE.CanvasTexture(element);
  result.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  result.wrapS = THREE.RepeatWrapping;
  result.wrapT = THREE.ClampToEdgeWrapping;
  result.anisotropy = anisotropy;
  result.needsUpdate = true;
  return result;
}

/* ------------------------------------------------------------------ */
/* The part                                                            */
/* ------------------------------------------------------------------ */

export interface CeramicTextures {
  map: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
}

/**
 * Matte tan lacquer over ceramic. u runs around the body, v along it. Colour
 * drifts slightly along the length (the lacquer is dipped, not sprayed), with
 * fine mottling and the odd speck.
 */
export function createCeramicTextures(size: number): CeramicTextures {
  const width = size;
  const height = size / 2;
  const fine = fractal(11, 4, 12);
  const broad = fractal(29, 2, 3);

  const [colorCanvas, colorCtx] = canvas(width, height);
  const [roughCanvas, roughCtx] = canvas(width, height);
  const [bumpCanvas, bumpCtx] = canvas(width, height);
  const colorData = colorCtx.createImageData(width, height);
  const roughData = roughCtx.createImageData(width, height);
  const bumpData = bumpCtx.createImageData(width, height);
  const specks = mulberry32(5);

  for (let y = 0; y < height; y++) {
    const v = y / height;
    // A faint warm-to-cool drift end to end.
    const drift = (v - 0.5) * 0.05;
    for (let x = 0; x < width; x++) {
      const u = x / width;
      const n = fine(u, v * 0.5);
      const b = broad(u, v * 0.5);
      const shade = 0.93 + n * 0.1 + (b - 0.5) * 0.06;
      const i = (y * width + x) * 4;

      // Base #CDAE83, the light tan of a carbon-film body's lacquer.
      colorData.data[i] = Math.min(255, 205 * shade * (1 + drift));
      colorData.data[i + 1] = Math.min(255, 174 * shade);
      colorData.data[i + 2] = Math.min(255, 131 * shade * (1 - drift));
      colorData.data[i + 3] = 255;

      const rough = 150 + n * 70 + (b - 0.5) * 30;
      roughData.data[i] = roughData.data[i + 1] = roughData.data[i + 2] = rough;
      roughData.data[i + 3] = 255;

      const bump = 120 + n * 90;
      bumpData.data[i] = bumpData.data[i + 1] = bumpData.data[i + 2] = bump;
      bumpData.data[i + 3] = 255;
    }
  }

  // A few darker specks in the lacquer.
  for (let s = 0; s < size / 14; s++) {
    const x = Math.floor(specks() * width);
    const y = Math.floor(specks() * height);
    const i = (y * width + x) * 4;
    colorData.data[i] *= 0.82;
    colorData.data[i + 1] *= 0.8;
    colorData.data[i + 2] *= 0.78;
  }

  colorCtx.putImageData(colorData, 0, 0);
  roughCtx.putImageData(roughData, 0, 0);
  bumpCtx.putImageData(bumpData, 0, 0);

  return { map: texture(colorCanvas, true), roughnessMap: texture(roughCanvas, false), bumpMap: texture(bumpCanvas, false) };
}

/** Fine lengthwise scratches for tinned copper wire (u along the lead). */
export function createLeadRoughness(): THREE.CanvasTexture {
  const width = 512;
  const height = 64;
  const [element, context] = canvas(width, height);
  const data = context.createImageData(width, height);
  const random = mulberry32(77);
  const rows = Array.from({ length: height }, () => random());
  const blotch = fractal(91, 3, 6);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const value = 92 + rows[y] * 60 + blotch(x / width, y / height) * 50;
      const i = (y * width + x) * 4;
      data.data[i] = data.data[i + 1] = data.data[i + 2] = value;
      data.data[i + 3] = 255;
    }
  }
  context.putImageData(data, 0, 0);
  const result = texture(element, false);
  result.wrapT = THREE.RepeatWrapping;
  return result;
}

/* ------------------------------------------------------------------ */
/* The bench                                                           */
/* ------------------------------------------------------------------ */

/** Top face of the breadboard: holes, the centre channel, rails, print. */
export function createBreadboardTexture(pxPerMm: number): THREE.CanvasTexture {
  const width = Math.round(BREADBOARD.width * pxPerMm);
  const height = Math.round(BREADBOARD.depth * pxPerMm);
  const [element, context] = canvas(width, height);
  const toX = (mm: number) => (mm + BREADBOARD.width / 2) * pxPerMm;
  const toY = (mm: number) => (mm + BREADBOARD.depth / 2) * pxPerMm;

  context.fillStyle = BREADBOARD.color;
  context.fillRect(0, 0, width, height);

  // Faint moulding texture.
  const grain = fractal(3, 3, 20);
  const img = context.getImageData(0, 0, width, height);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * 4;
      const g = (grain(x / width, y / height) - 0.5) * 10;
      img.data[i] += g;
      img.data[i + 1] += g;
      img.data[i + 2] += g;
    }
  }
  context.putImageData(img, 0, 0);

  // Centre channel.
  context.fillStyle = "rgba(60, 58, 52, .22)";
  context.fillRect(0, toY(-1.1), width, 2.2 * pxPerMm);

  // Rail stripes: red +, blue −.
  context.lineWidth = Math.max(1, 0.45 * pxPerMm);
  const stripe = (z: number, color: string) => {
    context.strokeStyle = color;
    context.beginPath();
    context.moveTo(toX(-38), toY(z));
    context.lineTo(toX(38), toY(z));
    context.stroke();
  };
  stripe(ROW_Z.topPlus - 2.1, "#c8352b");
  stripe(ROW_Z.topMinus + 2.1, "#2d5fae");
  stripe(ROW_Z.bottomMinus - 2.1, "#2d5fae");
  stripe(ROW_Z.bottomPlus + 2.1, "#c8352b");

  const hole = (x: number, z: number) => {
    const s = 1.0 * pxPerMm;
    context.fillStyle = "#3b3a36";
    context.fillRect(toX(x) - s / 2, toY(z) - s / 2, s, s);
    context.fillStyle = "rgba(255,255,255,.35)";
    context.fillRect(toX(x) - s / 2, toY(z) + s / 2, s, Math.max(1, 0.12 * pxPerMm));
  };

  const terminalRows = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j"];
  for (let column = 1; column <= BREADBOARD.columns; column++) {
    for (const row of terminalRows) hole(holeX(column), ROW_Z[row]);
  }
  // Rails come in groups of five with gaps.
  for (let column = 2; column <= BREADBOARD.columns - 1; column++) {
    if ((column - 2) % 6 === 5) continue;
    for (const row of ["topPlus", "topMinus", "bottomMinus", "bottomPlus"]) hole(holeX(column), ROW_Z[row]);
  }

  // Row letters and every fifth column number, as moulded into the plastic.
  context.fillStyle = "rgba(70, 68, 62, .75)";
  context.font = `${1.4 * pxPerMm}px "IBM Plex Mono", monospace`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  for (const row of terminalRows) {
    context.fillText(row, toX(holeX(0) - 0.4), toY(ROW_Z[row]));
    context.fillText(row, toX(holeX(31) + 0.4), toY(ROW_Z[row]));
  }
  for (let column = 1; column <= BREADBOARD.columns; column += column === 1 ? 4 : 5) {
    context.fillText(String(column), toX(holeX(column)), toY(ROW_Z.a - 1.9));
    context.fillText(String(column), toX(holeX(column)), toY(ROW_Z.j + 1.9));
  }
  context.font = `${1.6 * pxPerMm}px "IBM Plex Mono", monospace`;
  context.fillStyle = "#c8352b";
  context.fillText("+", toX(-39.6), toY(ROW_Z.topPlus));
  context.fillStyle = "#2d5fae";
  context.fillText("−", toX(-39.6), toY(ROW_Z.topMinus));

  const result = texture(element, true, 8);
  result.wrapS = THREE.ClampToEdgeWrapping;
  return result;
}

/** A grey-green anti-static mat with a faint woven texture. */
export function createMatTexture(): { map: THREE.CanvasTexture; roughnessMap: THREE.CanvasTexture } {
  const size = 512;
  const [colorCanvas, colorCtx] = canvas(size, size);
  const [roughCanvas, roughCtx] = canvas(size, size);
  const colorData = colorCtx.createImageData(size, size);
  const roughData = roughCtx.createImageData(size, size);
  const n = fractal(41, 4, 8);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const v = n(x / size, y / size);
      const weave = ((x >> 1) + (y >> 1)) % 2 === 0 ? 1 : 0.97;
      const i = (y * size + x) * 4;
      colorData.data[i] = (58 + v * 10) * weave;
      colorData.data[i + 1] = (74 + v * 10) * weave;
      colorData.data[i + 2] = (70 + v * 9) * weave;
      colorData.data[i + 3] = 255;
      roughData.data[i] = roughData.data[i + 1] = roughData.data[i + 2] = 210 + v * 40;
      roughData.data[i + 3] = 255;
    }
  }
  colorCtx.putImageData(colorData, 0, 0);
  roughCtx.putImageData(roughData, 0, 0);
  const map = texture(colorCanvas, true, 8);
  const roughnessMap = texture(roughCanvas, false, 8);
  for (const t of [map, roughnessMap]) {
    t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(6, 6);
  }
  return { map, roughnessMap };
}

/**
 * Multimeter front: dark face, dial legend and jack labels. 4 px per mm on a
 * 72 × 140 mm face. The LCD is a separate, live texture.
 */
export function createMeterFaceTexture(): THREE.CanvasTexture {
  const ppm = 6;
  const width = 72 * ppm;
  const height = 140 * ppm;
  const [element, context] = canvas(width, height);

  context.fillStyle = "#26292b";
  context.fillRect(0, 0, width, height);

  // LCD bezel.
  context.fillStyle = "#151718";
  context.fillRect(6 * ppm, 8 * ppm, 60 * ppm, 30 * ppm);

  context.fillStyle = "#e9e5d8";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.font = `600 ${3.6 * ppm}px "Archivo", Arial, sans-serif`;
  context.fillText("DIGITAL MULTIMETER", width / 2, 44 * ppm);

  // Dial legend around the selector at (36, 78) mm.
  const cx = 36 * ppm;
  const cy = 78 * ppm;
  context.strokeStyle = "rgba(233,229,216,.5)";
  context.lineWidth = 0.4 * ppm;
  context.beginPath();
  context.arc(cx, cy, 25 * ppm, 0, Math.PI * 2);
  context.stroke();
  const labels = ["OFF", "V⎓", "V~", "Ω", "•))", "A", "mA"];
  context.font = `600 ${3.4 * ppm}px "Archivo", Arial, sans-serif`;
  labels.forEach((label, i) => {
    const angle = -Math.PI / 2 + (i - 3) * 0.55;
    context.fillStyle = label === "Ω" ? "#f2c94c" : "#e9e5d8";
    context.fillText(label, cx + Math.cos(angle) * 30 * ppm, cy + Math.sin(angle) * 30 * ppm);
  });

  // Jacks.
  context.font = `600 ${3 * ppm}px "Archivo", Arial, sans-serif`;
  context.fillStyle = "#e9e5d8";
  context.fillText("10A", 14 * ppm, 128 * ppm);
  context.fillText("COM", 36 * ppm, 128 * ppm);
  context.fillStyle = "#e86b5a";
  context.fillText("VΩmA", 58 * ppm, 128 * ppm);

  const result = texture(element, true, 8);
  result.wrapS = THREE.ClampToEdgeWrapping;
  return result;
}

/* ------------------------------------------------------------------ */
/* The LCD                                                             */
/* ------------------------------------------------------------------ */

const SEGMENTS: Record<string, string> = {
  "0": "abcdef",
  "1": "bc",
  "2": "abdeg",
  "3": "abcdg",
  "4": "bcfg",
  "5": "acdfg",
  "6": "acdefg",
  "7": "abc",
  "8": "abcdefg",
  "9": "abcdfg",
  "-": "g",
  O: "abcdef",
  L: "def",
  " ": "",
};

function drawDigit(context: CanvasRenderingContext2D, char: string, x: number, y: number, w: number, h: number, on: string, off: string) {
  const t = w * 0.17;
  const half = h / 2;
  const segs: Record<string, [number, number, number, number]> = {
    a: [x + t, y, w - 2 * t, t],
    b: [x + w - t, y + t, t, half - 1.5 * t],
    c: [x + w - t, y + half + t / 2, t, half - 1.5 * t],
    d: [x + t, y + h - t, w - 2 * t, t],
    e: [x, y + half + t / 2, t, half - 1.5 * t],
    f: [x, y + t, t, half - 1.5 * t],
    g: [x + t, y + half - t / 2, w - 2 * t, t],
  };
  const lit = SEGMENTS[char] ?? "";
  for (const [name, [sx, sy, sw, sh]] of Object.entries(segs)) {
    context.fillStyle = lit.includes(name) ? on : off;
    // Slight italic skew like a real LCD.
    context.save();
    context.transform(1, 0, -0.08, 1, (sy + sh / 2 - y) * 0.08, 0);
    context.fillRect(sx, sy, sw, sh);
    context.restore();
  }
}

export interface LcdTexture {
  texture: THREE.CanvasTexture;
  draw: (digits: string, unit: string) => void;
}

/** A reflective twisted-nematic LCD, redrawn whenever the reading changes. */
export function createLcdTexture(): LcdTexture {
  const width = 480;
  const height = 220;
  const [element, context] = canvas(width, height);
  const result = texture(element, true, 8);
  result.wrapS = THREE.ClampToEdgeWrapping;

  const draw = (digits: string, unit: string) => {
    const gradient = context.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, "#c5cfb2");
    gradient.addColorStop(1, "#aab595");
    context.fillStyle = gradient;
    context.fillRect(0, 0, width, height);

    const on = "#1b2217";
    const off = "rgba(27, 34, 23, .07)";
    const chars = digits.replace(".", "");
    const dot = digits.indexOf(".");
    const cellW = 78;
    const cellH = 132;
    const startX = width - 34 - 4 * (cellW + 14) - 70;
    const padded = chars.padStart(4, " ").slice(-4);
    for (let i = 0; i < 4; i++) {
      drawDigit(context, padded[i], startX + i * (cellW + 14), 34, cellW, cellH, on, off);
    }
    if (dot > 0) {
      const index = 4 - (chars.length - dot);
      context.fillStyle = on;
      context.fillRect(startX + index * (cellW + 14) - 12, 34 + cellH - 14, 12, 14);
    }

    context.fillStyle = on;
    context.font = `700 40px "Archivo", Arial, sans-serif`;
    context.textAlign = "right";
    context.textBaseline = "alphabetic";
    context.fillText(unit, width - 18, 34 + cellH);
    context.font = `600 22px "Archivo", Arial, sans-serif`;
    context.textAlign = "left";
    context.fillText("AUTO", 18, 32);
    result.needsUpdate = true;
  };

  draw("----", "Ω");
  return { texture: result, draw };
}

export const LCD_ASPECT = 480 / 220;

/** Hole position helper re-exported for the scene. */
export const holeAt = (column: number, row: string): [number, number] => [holeX(column), ROW_Z[row]];
export { PITCH };
