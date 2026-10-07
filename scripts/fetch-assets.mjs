/**
 * Puts the lab's third-party runtime assets under public/simulations/resistor
 * so the school's server hosts everything itself (no CDN at run time).
 * Sources and licences are recorded in docs/ASSETS.md.
 *
 *   npm run assets          (also runs after `npm install`)
 *
 * 1. MediaPipe Tasks Vision WASM: copied from node_modules (Apache-2.0).
 * 2. hand_landmarker.task: downloaded once from Google's model bucket
 *    (Apache-2.0). Skipped quietly when offline; hand control then reports
 *    that it cannot start, and everything else still works.
 * 3. Studio Small 09 HDRI (CC0, Poly Haven): downloaded once at 1k, then
 *    downsampled to 768 × 384 to stay under the 1.5 MB budget.
 *
 * Steps 2 and 3 only need the internet the first time; the results can be
 * committed or copied to an offline server like any other public file.
 */

import { copyFileSync, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const base = resolve(root, "public/simulations/resistor");

const HAND_MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";
const HDRI_URL = "https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/studio_small_09_1k.hdr";
const HDRI_OUT = resolve(base, "hdr/studio_small_09_768.hdr");
const HDRI_SIZE = [768, 384];

function log(message) {
  console.log(`[assets] ${message}`);
}

async function download(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url} → HTTP ${response.status}`);
  return new Uint8Array(await response.arrayBuffer());
}

/* 1. MediaPipe WASM ---------------------------------------------------- */
function copyMediapipe() {
  const source = resolve(dirname(require.resolve("@mediapipe/tasks-vision")), "wasm");
  const target = resolve(base, "mediapipe/wasm");
  mkdirSync(target, { recursive: true });
  // The module variants are not used by FilesetResolver.forVisionTasks().
  for (const file of ["vision_wasm_internal.js", "vision_wasm_internal.wasm", "vision_wasm_nosimd_internal.js", "vision_wasm_nosimd_internal.wasm"]) {
    const from = resolve(source, file);
    const to = resolve(target, file);
    if (!existsSync(to) || statSync(to).size !== statSync(from).size) copyFileSync(from, to);
  }
  log("MediaPipe WASM in place");
}

/* 2. Hand model ---------------------------------------------------------- */
async function fetchHandModel() {
  const target = resolve(base, "mediapipe/hand_landmarker.task");
  if (existsSync(target)) return log("hand_landmarker.task already present");
  try {
    writeFileSync(target, await download(HAND_MODEL_URL));
    log("hand_landmarker.task downloaded");
  } catch (error) {
    log(`hand model not downloaded (${error.message}); hand control will be unavailable until it is`);
  }
}

/* 3. HDRI -------------------------------------------------------------- */
function encodeRGBE(r, g, b) {
  const max = Math.max(r, g, b);
  if (max < 1e-32) return [0, 0, 0, 0];
  const exponent = Math.ceil(Math.log2(max));
  const scale = 256 / 2 ** exponent;
  return [Math.min(255, Math.floor(r * scale)), Math.min(255, Math.floor(g * scale)), Math.min(255, Math.floor(b * scale)), exponent + 128];
}

async function fetchHdri() {
  if (existsSync(HDRI_OUT)) return log("HDRI already present");

  let source;
  try {
    source = await download(HDRI_URL);
  } catch (error) {
    log(`HDRI not downloaded (${error.message}); the 3D bench will fail to light until it is`);
    return;
  }

  const THREE = await import("three");
  const { RGBELoader } = await import("three/examples/jsm/loaders/RGBELoader.js");
  const loader = new RGBELoader().setDataType(THREE.FloatType);
  const parsed = loader.parse(source.buffer);
  const { width, height, data } = parsed;

  // Box-filter down to the target size.
  const [outW, outH] = HDRI_SIZE;
  const body = new Uint8Array(outW * outH * 4);
  const sx = width / outW;
  const sy = height / outH;
  for (let y = 0; y < outH; y++) {
    for (let x = 0; x < outW; x++) {
      let r = 0, g = 0, b = 0, n = 0;
      for (let yy = Math.floor(y * sy); yy < Math.floor((y + 1) * sy); yy++) {
        for (let xx = Math.floor(x * sx); xx < Math.floor((x + 1) * sx); xx++) {
          const i = (yy * width + xx) * 4;
          r += data[i]; g += data[i + 1]; b += data[i + 2]; n++;
        }
      }
      body.set(encodeRGBE(r / n, g / n, b / n), (y * outW + x) * 4);
    }
  }

  const header = new TextEncoder().encode(
    `#?RADIANCE\n# Studio Small 09 by Sergej Majboroda, Poly Haven, CC0. Downsampled to ${outW}x${outH}.\nFORMAT=32-bit_rle_rgbe\n\n-Y ${outH} +X ${outW}\n`,
  );
  mkdirSync(dirname(HDRI_OUT), { recursive: true });
  const out = new Uint8Array(header.length + body.length);
  out.set(header, 0);
  out.set(body, header.length);
  writeFileSync(HDRI_OUT, out);
  log(`HDRI written (${(out.length / 1024 / 1024).toFixed(2)} MB)`);
}

copyMediapipe();
await fetchHandModel();
await fetchHdri();

// Keep a note next to the files so nobody wonders where they came from.
const note = resolve(base, "README.txt");
if (!existsSync(note) || !readFileSync(note, "utf8").includes("ASSETS.md")) {
  writeFileSync(note, "Runtime assets for the resistor lab. Sources and licences: docs/ASSETS.md.\nRebuild with `npm run assets` and `npm run build:model`.\n");
}
