/**
 * Builds public/simulations/resistor/models/resistor.glb from the same
 * geometry the runtime uses (resources/js/simulations/resistor/lib/
 * resistorGeometry.ts). Meshes are named body, lead_0, lead_1, band_0 … band_3,
 * axis along +Y, units in millimetres. Meshopt-compressed, so no decoder is
 * fetched from a CDN (unlike Draco).
 *
 *   npm run build:model
 */

import { mkdirSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { Document, NodeIO, Primitive } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { meshopt, weld, dedup, prune } from "@gltf-transform/functions";
import { MeshoptEncoder } from "meshoptimizer";
import * as THREE from "three";

import { createResistorParts } from "../resources/js/simulations/resistor/lib/resistorGeometry";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const out = resolve(root, "public/simulations/resistor/models/resistor.glb");

function addMesh(document: Document, name: string, geometry: THREE.BufferGeometry, color: [number, number, number, number], metallic: number, roughness: number) {
  const buffer = document.getRoot().listBuffers()[0];
  const indexed = geometry.index ? geometry : geometry.toNonIndexed();

  const accessor = (array: Float32Array | Uint32Array | Uint16Array, type: "VEC3" | "VEC2" | "SCALAR") =>
    document.createAccessor().setArray(array).setType(type).setBuffer(buffer);

  const primitive = document
    .createPrimitive()
    .setMode(Primitive.Mode.TRIANGLES)
    .setAttribute("POSITION", accessor(new Float32Array(indexed.getAttribute("position").array), "VEC3"))
    .setAttribute("NORMAL", accessor(new Float32Array(indexed.getAttribute("normal").array), "VEC3"))
    .setAttribute("TEXCOORD_0", accessor(new Float32Array(indexed.getAttribute("uv").array), "VEC2"))
    .setMaterial(
      document
        .createMaterial(name)
        .setBaseColorFactor(color)
        .setMetallicFactor(metallic)
        .setRoughnessFactor(roughness),
    );

  if (indexed.index) {
    primitive.setIndices(accessor(new Uint32Array(indexed.index.array), "SCALAR"));
  }

  const mesh = document.createMesh(name).addPrimitive(primitive);
  return document.createNode(name).setMesh(mesh);
}

async function main() {
  const parts = createResistorParts();
  const document = new Document();
  document.createBuffer();
  const scene = document.createScene("resistor");

  // Base colours are placeholders: the lab repaints bands from the colour code
  // and applies its own ceramic and tinned-copper materials at load time.
  scene.addChild(addMesh(document, "body", parts.body, [0.71, 0.6, 0.43, 1], 0, 0.62));
  scene.addChild(addMesh(document, "lead_0", parts.leads[0], [0.78, 0.78, 0.76, 1], 1, 0.36));
  scene.addChild(addMesh(document, "lead_1", parts.leads[1], [0.78, 0.78, 0.76, 1], 1, 0.36));
  parts.bands.forEach((geometry, index) => {
    scene.addChild(addMesh(document, `band_${index}`, geometry, [0.5, 0.5, 0.5, 1], 0, 0.4));
  });

  await MeshoptEncoder.ready;
  await document.transform(weld(), dedup(), prune(), meshopt({ encoder: MeshoptEncoder, level: "high" }));

  mkdirSync(dirname(out), { recursive: true });
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ "meshopt.encoder": MeshoptEncoder });
  await io.write(out, document);

  const size = statSync(out).size;
  console.log(`Wrote ${out} (${(size / 1024).toFixed(1)} KB)`);
  if (size > 1.5 * 1024 * 1024) {
    console.error("Over the 1.5 MB model budget.");
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
