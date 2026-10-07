/**
 * Are the 12 band paints distinguishable from each other, for typical vision
 * and the three common colour-vision deficiencies? Reports the CIEDE2000
 * difference of every pair, simulated with the Machado et al. (2009) matrices
 * at full severity. Pairs below the threshold are flagged; they still carry a
 * text label everywhere in the lab, which is the real safeguard.
 *
 *   npm run check:colors
 */

import { BAND_COLORS, BandColor } from "../resources/js/simulations/resistor/lib/resistor";

type RGB = [number, number, number];

const toLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const toSrgb = (c: number) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);

function hexToLinear(hex: string): RGB {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => toLinear(v / 255)) as RGB;
}

const MACHADO: Record<string, number[][]> = {
  protanopia: [
    [0.152286, 1.052583, -0.204868],
    [0.114503, 0.786281, 0.099216],
    [-0.003882, -0.048116, 1.051998],
  ],
  deuteranopia: [
    [0.367322, 0.860646, -0.227968],
    [0.280085, 0.672501, 0.047413],
    [-0.01182, 0.04294, 0.968881],
  ],
  tritanopia: [
    [1.255528, -0.076749, -0.178779],
    [-0.078411, 0.930809, 0.147602],
    [0.004733, 0.691367, 0.3039],
  ],
};

function simulate(rgb: RGB, matrix?: number[][]): RGB {
  if (!matrix) return rgb;
  return matrix.map((row) => Math.min(1, Math.max(0, row[0] * rgb[0] + row[1] * rgb[1] + row[2] * rgb[2]))) as RGB;
}

function toLab([r, g, b]: RGB): RGB {
  // Linear sRGB → XYZ (D65) → CIELAB.
  const x = (0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047;
  const y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const z = (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883;
  const f = (t: number) => (t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116);
  return [116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))];
}

/** CIEDE2000, Sharma et al. (2005). */
function deltaE2000([L1, a1, b1]: RGB, [L2, a2, b2]: RGB): number {
  const rad = Math.PI / 180;
  const C1 = Math.hypot(a1, b1);
  const C2 = Math.hypot(a2, b2);
  const Cm = (C1 + C2) / 2;
  const G = 0.5 * (1 - Math.sqrt(Cm ** 7 / (Cm ** 7 + 25 ** 7)));
  const a1p = (1 + G) * a1;
  const a2p = (1 + G) * a2;
  const C1p = Math.hypot(a1p, b1);
  const C2p = Math.hypot(a2p, b2);
  const h = (a: number, b: number) => (a === 0 && b === 0 ? 0 : ((Math.atan2(b, a) / rad) + 360) % 360);
  const h1p = h(a1p, b1);
  const h2p = h(a2p, b2);
  const dLp = L2 - L1;
  const dCp = C2p - C1p;
  let dhp = 0;
  if (C1p * C2p !== 0) {
    dhp = h2p - h1p;
    if (dhp > 180) dhp -= 360;
    else if (dhp < -180) dhp += 360;
  }
  const dHp = 2 * Math.sqrt(C1p * C2p) * Math.sin((dhp / 2) * rad);
  const Lpm = (L1 + L2) / 2;
  const Cpm = (C1p + C2p) / 2;
  let hpm = h1p + h2p;
  if (C1p * C2p !== 0) {
    if (Math.abs(h1p - h2p) > 180) hpm = h1p + h2p < 360 ? (h1p + h2p + 360) / 2 : (h1p + h2p - 360) / 2;
    else hpm = (h1p + h2p) / 2;
  }
  const T = 1 - 0.17 * Math.cos((hpm - 30) * rad) + 0.24 * Math.cos(2 * hpm * rad) + 0.32 * Math.cos((3 * hpm + 6) * rad) - 0.2 * Math.cos((4 * hpm - 63) * rad);
  const dTheta = 30 * Math.exp(-(((hpm - 275) / 25) ** 2));
  const Rc = 2 * Math.sqrt(Cpm ** 7 / (Cpm ** 7 + 25 ** 7));
  const Sl = 1 + (0.015 * (Lpm - 50) ** 2) / Math.sqrt(20 + (Lpm - 50) ** 2);
  const Sc = 1 + 0.045 * Cpm;
  const Sh = 1 + 0.015 * Cpm * T;
  const Rt = -Math.sin(2 * dTheta * rad) * Rc;
  return Math.sqrt((dLp / Sl) ** 2 + (dCp / Sc) ** 2 + (dHp / Sh) ** 2 + Rt * (dCp / Sc) * (dHp / Sh));
}

/** Below this the pair is hard to tell apart at a glance on a small band. */
const THRESHOLD = 10;
const colors = Object.keys(BAND_COLORS) as BandColor[];
const visions = ["typical", "protanopia", "deuteranopia", "tritanopia"] as const;
let flagged = 0;

for (const vision of visions) {
  const lab = Object.fromEntries(colors.map((c) => [c, toLab(simulate(hexToLinear(BAND_COLORS[c].hex), MACHADO[vision]))])) as Record<BandColor, RGB>;
  const pairs: { pair: string; de: number }[] = [];
  for (let i = 0; i < colors.length; i++) {
    for (let j = i + 1; j < colors.length; j++) {
      pairs.push({ pair: `${colors[i]}/${colors[j]}`, de: deltaE2000(lab[colors[i]], lab[colors[j]]) });
    }
  }
  pairs.sort((a, b) => a.de - b.de);
  const close = pairs.filter((p) => p.de < THRESHOLD);
  flagged += vision === "typical" ? close.length : 0;
  console.log(`\n${vision.padEnd(13)} closest: ${pairs.slice(0, 5).map((p) => `${p.pair} ${p.de.toFixed(1)}`).join(", ")}`);
  if (close.length) console.log(`  below ΔE ${THRESHOLD}: ${close.map((p) => p.pair).join(", ")}`);
  const watch = ["brown/red", "red/orange", "brown/orange", "grey/silver", "grey/white", "white/silver"]
    .map((name) => pairs.find((p) => p.pair === name || p.pair === name.split("/").reverse().join("/")))
    .filter(Boolean)
    .map((p) => `${p!.pair} ${p!.de.toFixed(1)}`);
  console.log(`  watched pairs: ${watch.join(", ")}`);
}

console.log(
  `\n${flagged === 0 ? "✓" : "✗"} typical vision: ${flagged} pair(s) under ΔE2000 ${THRESHOLD}. ` +
    "Colour-deficient pairs are reported, not failed: every band also shows its colour name as text.",
);
// Silver is a metallic material in 3D and a gradient swatch in 2D; its flat
// base colour is only part of how it is told apart from grey.
process.exit(flagged === 0 ? 0 : 1);

// Keep toSrgb referenced for readers who want to print simulated hex values.
void toSrgb;
