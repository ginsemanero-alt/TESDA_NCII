/**
 * Runs every circuit in tests/fixtures/circuit-vectors.json through the
 * browser solver. The PHP solver runs the same file (tests/Unit/CircuitSolverTest.php),
 * so a passing run on both sides means the workbench and the grader agree.
 * Also checks the document parser. Exit code 1 on any mismatch.
 *
 *   npm run check:circuit
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { parseDoc } from "../resources/js/simulations/circuit/lib/doc";
import { resistanceBetween, solve } from "../resources/js/simulations/circuit/lib/solver";

type Tolerance = { rel: number; abs: number };
type Expect = {
  elements?: Record<string, Partial<Record<"v" | "i" | "p", number>>>;
  meters?: Record<string, { value?: number | null; fault?: string; beep?: boolean }>;
  flags: { part: string; kind: string }[];
};
type Vectors = { tolerance: Tolerance; cases: { name: string; doc: unknown; tolerance?: Tolerance; expect: Expect }[] };

const vectors: Vectors = JSON.parse(readFileSync(resolve(process.cwd(), "tests/fixtures/circuit-vectors.json"), "utf8"));
const failures: string[] = [];
let checks = 0;

function expect(condition: boolean, message: string) {
  checks++;
  if (!condition) failures.push(message);
}

const close = (actual: number, wanted: number, tol: Tolerance) => Math.abs(actual - wanted) <= Math.max(tol.abs, Math.abs(wanted) * tol.rel);

for (const item of vectors.cases) {
  const tol = item.tolerance ?? vectors.tolerance;
  const parsed = parseDoc(item.doc);
  if (!("doc" in parsed)) {
    expect(false, `${item.name}: the document does not parse: ${parsed.error}`);
    continue;
  }
  const result = solve(parsed.doc);

  for (const [id, wanted] of Object.entries(item.expect.elements ?? {})) {
    const got = result.elements[id];
    if (!got) {
      expect(false, `${item.name}: no result for ${id}`);
      continue;
    }
    for (const key of ["v", "i", "p"] as const) {
      const w = wanted[key];
      if (w !== undefined) expect(close(got[key], w, tol), `${item.name}: ${id}.${key} = ${got[key]}, expected ${w}`);
    }
  }

  for (const [id, wanted] of Object.entries(item.expect.meters ?? {})) {
    const got = result.meters[id];
    if (!got) {
      expect(false, `${item.name}: no reading for ${id}`);
      continue;
    }
    if (wanted.value === null) expect(got.value === null, `${item.name}: ${id} should have no reading, got ${got.value}`);
    else if (wanted.value !== undefined) expect(got.value !== null && close(got.value, wanted.value, tol), `${item.name}: ${id} reads ${got.value}, expected ${wanted.value}`);
    if (wanted.fault !== undefined) expect(got.fault === wanted.fault, `${item.name}: ${id} fault ${got.fault}, expected ${wanted.fault}`);
    if (wanted.beep !== undefined) expect(got.beep === wanted.beep, `${item.name}: ${id} beep ${got.beep}, expected ${wanted.beep}`);
  }

  const asKey = (f: { part: string; kind: string }) => `${f.part}:${f.kind}`;
  const got = result.flags.map(asKey).sort().join(",");
  const wanted = item.expect.flags.map(asKey).sort().join(",");
  expect(got === wanted, `${item.name}: flags [${got}], expected [${wanted}]`);
}

// resistanceBetween() is what grades "equivalent resistance" challenges on the server.
{
  const parsed = parseDoc({
    parts: [
      { id: "R1", type: "resistor", value: 330 },
      { id: "R2", type: "resistor", value: 470 },
    ],
    wires: [{ id: "w1", from: { part: "R1", pin: "b" }, to: { part: "R2", pin: "a" } }],
  });
  if ("doc" in parsed) {
    const ohms = resistanceBetween(parsed.doc, "R1.a", "R2.b");
    expect(close(ohms, 800, { rel: 1e-5, abs: 1e-9 }), `resistanceBetween series = ${ohms}, expected 800`);
    expect(resistanceBetween(parsed.doc, "R1.a", "Nope.x") === Number.POSITIVE_INFINITY, "resistanceBetween with an unknown pin is infinite");
  }
}

// The parser rejects what the server would reject.
const bad: [string, unknown][] = [
  ["not an object", 5],
  ["unknown part type", { parts: [{ id: "X1", type: "transistor" }], wires: [] }],
  ["duplicate part name", { parts: [{ id: "R1", type: "resistor", value: 100 }, { id: "R1", type: "resistor", value: 100 }], wires: [] }],
  ["resistor of 0 ohm", { parts: [{ id: "R1", type: "resistor", value: 0 }], wires: [] }],
  ["supply of 40 V", { parts: [{ id: "V1", type: "supply", value: 40 }], wires: [] }],
  ["LED with no colour", { parts: [{ id: "D1", type: "led" }], wires: [] }],
  ["wire to a missing part", { parts: [{ id: "R1", type: "resistor", value: 100 }], wires: [{ id: "w1", from: { part: "R1", pin: "a" }, to: { part: "R9", pin: "a" } }] }],
  ["wire to a missing pin", { parts: [{ id: "R1", type: "resistor", value: 100 }], wires: [{ id: "w1", from: { part: "R1", pin: "a" }, to: { part: "R1", pin: "z" } }] }],
  ["wire from a pin to itself", { parts: [{ id: "R1", type: "resistor", value: 100 }], wires: [{ id: "w1", from: { part: "R1", pin: "a" }, to: { part: "R1", pin: "a" } }] }],
  ["bad part name", { parts: [{ id: "1; DROP", type: "junction" }], wires: [] }],
  ["string where a number belongs", { parts: [{ id: "R1", type: "resistor", value: "330" }], wires: [] }],
  ["switch with a text state", { parts: [{ id: "S1", type: "switch", closed: "yes" }], wires: [] }],
  ["too many parts", { parts: Array.from({ length: 41 }, (_, i) => ({ id: `J${i}`, type: "junction" })), wires: [] }],
];
for (const [name, doc] of bad) expect("error" in parseDoc(doc), `the parser should reject: ${name}`);

if (failures.length > 0) {
  console.error(`✗ ${failures.length} of ${checks} checks failed:\n  ${failures.join("\n  ")}`);
  process.exit(1);
}
console.log(`✓ ${checks} checks passed: the browser solver matches the hand-worked vectors, and the parser rejects bad documents.`);
