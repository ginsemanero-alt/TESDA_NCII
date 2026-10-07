/**
 * Checks the browser's colour-code maths against the same vectors the PHP
 * grader is tested with (tests/fixtures/resistor-vectors.json), plus the
 * client grading rules and the meter display. Exit code 1 on any mismatch.
 *
 *   npm run check:resistor
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { ALLOWED_COLORS, BandSet, dissipatedPower, readBands, solveOhmsLaw } from "../resources/js/simulations/resistor/lib/resistor";
import { bandsFor, Checkpoint, grade, near, NUMERIC_TOLERANCE, score } from "../resources/js/simulations/resistor/lib/checkpoints";
import { measure, meterDisplay, withinTolerance } from "../resources/js/simulations/resistor/lib/meter";

type Vectors = {
  bands: { bands: BandSet; ohms: number; tolerance: number; min: number; max: number }[];
  allowed: Record<string, string[]>;
  current: { volts: number; ohms: number; amps: number }[];
  power: { amps: number; ohms: number; watts: number }[];
};

const vectors: Vectors = JSON.parse(readFileSync(resolve(process.cwd(), "tests/fixtures/resistor-vectors.json"), "utf8"));
const failures: string[] = [];
let checks = 0;

function expect(condition: boolean, message: string) {
  checks++;
  if (!condition) failures.push(message);
}

for (const v of vectors.bands) {
  const value = readBands(v.bands);
  const label = v.bands.join("-");
  expect(near(value.ohms, v.ohms, 1e-9), `${label}: ohms ${value.ohms} ≠ ${v.ohms}`);
  expect(value.tolerance === v.tolerance, `${label}: tolerance ${value.tolerance} ≠ ${v.tolerance}`);
  expect(near(value.min, v.min, 1e-9), `${label}: min ${value.min} ≠ ${v.min}`);
  expect(near(value.max, v.max, 1e-9), `${label}: max ${value.max} ≠ ${v.max}`);
}

for (const [position, colors] of Object.entries(vectors.allowed)) {
  expect(JSON.stringify(ALLOWED_COLORS[Number(position)]) === JSON.stringify(colors), `allowed colours for band ${position} differ`);
}

for (const v of vectors.current) {
  const amps = solveOhmsLaw({ voltage: v.volts, current: 0, resistance: v.ohms }, "current").current;
  expect(near(amps, v.amps, 1e-12), `I for ${v.volts} V / ${v.ohms} Ω: ${amps} ≠ ${v.amps}`);
}

for (const v of vectors.power) {
  const watts = dissipatedPower({ voltage: 0, current: v.amps, resistance: v.ohms });
  expect(near(watts, v.watts, 1e-12), `P for ${v.amps} A in ${v.ohms} Ω: ${watts} ≠ ${v.watts}`);
}

// Grading mirrors ResistorLab.php.
const set: Checkpoint[] = [
  { id: "c1", type: "read", unit: "", bands: ["yellow", "violet", "red", "gold"] },
  { id: "c2", type: "bands", unit: "", ohms: 330, tolerance: 5 },
  { id: "c3", type: "role", unit: "", bands: ["brown", "black", "red", "gold"], role: 3 },
  { id: "c4", type: "current", unit: "", volts: 9, ohms: 330 },
  { id: "c5", type: "tolerance", unit: "", bands: ["brown", "black", "red", "gold"], measured: 1080 },
];
const right = {
  c1: { ohms: 4.7 * 1e3 },
  c2: { bands: bandsFor(330, 5)! as unknown as string[] },
  c3: { band: 3 },
  c4: { amps: 27.3 * 1e-3 },
  c5: { within: false },
} as never;
expect(score(set, right) === 5, "all-correct set should score 5");
expect(grade(set[3], { amps: 0.273 }) === false, "a slipped prefix must be wrong");
expect(grade(set[3], { amps: 0.0273 * (1 + NUMERIC_TOLERANCE * 0.9) }) === true, "inside numeric tolerance must be right");
expect(grade(set[0], { ohms: 47 }) === false, "47 Ω for 4.7 kΩ must be wrong");

// Meter behaviour.
expect(meterDisplay(4712).digits === "4.712" && meterDisplay(4712).unit === "kΩ", "4712 Ω displays as 4.712 kΩ");
expect(meterDisplay(598.7).digits === "598.7" && meterDisplay(598.7).unit === "Ω", "598.7 Ω displays as 598.7 Ω");
expect(meterDisplay(998.7).digits === "0.999" && meterDisplay(998.7).unit === "kΩ", "998.7 Ω autoranges to 0.999 kΩ, as a 6000-count meter does");
expect(meterDisplay(82e9).digits === "O.L", "82 GΩ is over range");
for (let i = 0; i < 500; i++) {
  const bands: BandSet = ["yellow", "violet", "red", i % 2 ? "gold" : "silver"];
  const reading = measure(bands);
  expect(withinTolerance(bands, reading), `measure() left tolerance: ${reading}`);
  expect(reading !== readBands(bands).ohms, "measure() should never read exactly nominal");
}

if (failures.length > 0) {
  console.error(`✗ ${failures.length} of ${checks} checks failed:\n  ${failures.join("\n  ")}`);
  process.exit(1);
}
console.log(`✓ ${checks} checks passed: browser colour code, Ohm's law, grading and meter agree with the shared vectors.`);
