/**
 * DC solver for the circuit workbench: nodal analysis, one conductance matrix,
 * dense Gaussian elimination with partial pivoting.
 *
 * Every part reduces to conductances and current sources, so no branch
 * unknowns are needed:
 *  - resistor, closed switch: a conductance
 *  - battery, supply: an ideal source behind its internal resistance, as a
 *    Norton pair (so a short circuit is a large current, not a singular matrix)
 *  - LED: off = open; on = a conductance 1/rs plus a current source of Vf/rs
 *    (a forward voltage drop behind rs); on/off is iterated until consistent
 *  - voltmeter 10 MΩ, ammeter 0.01 Ω; ohmmeter and continuity tester are
 *    answered separately with a test current and the sources switched off
 *
 * app/Simulations/Circuit/Solver.php does exactly the same, in the same order,
 * and tests/fixtures/circuit-vectors.json (worked by hand) checks both.
 */

import { GMIN, LED, METER, PARTS, SOURCE, SWITCH } from "./parts";
import { CircuitDoc, ElementResult, Flag, MeterReading, Part, SolveResult } from "./types";

interface Context {
  doc: CircuitDoc;
  /** Net index of every pin key. */
  net: Map<string, number>;
  netCount: number;
  /** Net index → unknown index, or -1 for an island's reference net. */
  unknown: number[];
  unknownCount: number;
}

const netOf = (ctx: Context, part: Part, pin: string): number => ctx.net.get(`${part.id}.${pin}`) as number;

/** The voltage a source part is set to. */
export function sourceVolts(part: Part): number {
  return part.type === "battery" ? 9 : part.value ?? 0;
}

function find(parent: number[], i: number): number {
  while (parent[i] !== i) {
    parent[i] = parent[parent[i]];
    i = parent[i];
  }
  return i;
}

function union(parent: number[], a: number, b: number): void {
  const ra = find(parent, a);
  const rb = find(parent, b);
  // The smaller root wins, so net numbering is the same in the PHP twin.
  if (ra < rb) parent[rb] = ra;
  else if (rb < ra) parent[ra] = rb;
}

function buildContext(doc: CircuitDoc): Context {
  const keys: string[] = [];
  for (const part of doc.parts) for (const pin of PARTS[part.type].pins) keys.push(`${part.id}.${pin}`);
  const index = new Map(keys.map((key, i) => [key, i]));

  const pinParent = keys.map((_, i) => i);
  for (const wire of doc.wires) {
    const a = index.get(`${wire.from.part}.${wire.from.pin}`);
    const b = index.get(`${wire.to.part}.${wire.to.pin}`);
    if (a !== undefined && b !== undefined) union(pinParent, a, b);
  }

  // Nets are numbered in order of first appearance among the pins.
  const netByRoot = new Map<number, number>();
  const net = new Map<string, number>();
  keys.forEach((key, i) => {
    const root = find(pinParent, i);
    if (!netByRoot.has(root)) netByRoot.set(root, netByRoot.size);
    net.set(key, netByRoot.get(root) as number);
  });
  const netCount = netByRoot.size;

  // Islands: nets joined by any two-pin part, whatever its state.
  const islandParent = Array.from({ length: netCount }, (_, i) => i);
  for (const part of doc.parts) {
    if (PARTS[part.type].pins.length === 2) {
      const [p, q] = PARTS[part.type].pins;
      union(islandParent, net.get(`${part.id}.${p}`) as number, net.get(`${part.id}.${q}`) as number);
    }
  }

  // Each island's reference: the negative terminal of its first source, else its lowest net.
  const reference = new Map<number, number>();
  for (const part of doc.parts) {
    if (part.type === "battery" || part.type === "supply") {
      const root = find(islandParent, net.get(`${part.id}.-`) as number);
      if (!reference.has(root)) reference.set(root, net.get(`${part.id}.-`) as number);
    }
  }
  for (let n = 0; n < netCount; n++) {
    const root = find(islandParent, n);
    if (!reference.has(root)) reference.set(root, n);
  }
  const refs = new Set(reference.values());

  const unknown: number[] = [];
  let unknownCount = 0;
  for (let n = 0; n < netCount; n++) unknown.push(refs.has(n) ? -1 : unknownCount++);

  return { doc, net, netCount, unknown, unknownCount };
}

function gauss(a: number[][], b: number[]): number[] {
  const n = b.length;
  for (let k = 0; k < n; k++) {
    let pivot = k;
    let max = Math.abs(a[k][k]);
    for (let i = k + 1; i < n; i++) {
      const value = Math.abs(a[i][k]);
      if (value > max) {
        max = value;
        pivot = i;
      }
    }
    if (pivot !== k) {
      const row = a[k];
      a[k] = a[pivot];
      a[pivot] = row;
      const rhs = b[k];
      b[k] = b[pivot];
      b[pivot] = rhs;
    }
    const d = a[k][k];
    for (let i = k + 1; i < n; i++) {
      const f = a[i][k] / d;
      if (f === 0) continue;
      for (let j = k; j < n; j++) a[i][j] -= f * a[k][j];
      b[i] -= f * b[k];
    }
  }
  const x = new Array<number>(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    let sum = b[i];
    for (let j = i + 1; j < n; j++) sum -= a[i][j] * x[j];
    x[i] = sum / a[i][i];
  }
  return x;
}

interface Config {
  /** Sources drive the circuit. Off for an ohmmeter test. */
  powered: boolean;
  /** LED conducting, by part id. */
  ledOn: Map<string, boolean>;
  /** An extra test current pushed into one net and out of another. */
  test?: { into: number; outOf: number; amps: number };
}

/** Net voltages (reference nets are 0). */
function solveNets(ctx: Context, config: Config): number[] {
  const n = ctx.unknownCount;
  const g: number[][] = Array.from({ length: n }, () => new Array<number>(n).fill(0));
  const rhs = new Array<number>(n).fill(0);

  const conduct = (a: number, b: number, siemens: number) => {
    const ia = ctx.unknown[a];
    const ib = ctx.unknown[b];
    if (ia >= 0) g[ia][ia] += siemens;
    if (ib >= 0) g[ib][ib] += siemens;
    if (ia >= 0 && ib >= 0) {
      g[ia][ib] -= siemens;
      g[ib][ia] -= siemens;
    }
  };
  const inject = (net: number, amps: number) => {
    const i = ctx.unknown[net];
    if (i >= 0) rhs[i] += amps;
  };

  for (const part of ctx.doc.parts) {
    switch (part.type) {
      case "resistor":
        conduct(netOf(ctx, part, "a"), netOf(ctx, part, "b"), 1 / (part.value as number));
        break;
      case "switch":
        if (part.closed) conduct(netOf(ctx, part, "a"), netOf(ctx, part, "b"), 1 / SWITCH.closedOhms);
        break;
      case "battery":
      case "supply": {
        const plus = netOf(ctx, part, "+");
        const minus = netOf(ctx, part, "-");
        const r = SOURCE[part.type].r;
        conduct(plus, minus, 1 / r);
        if (config.powered) {
          const amps = sourceVolts(part) / r;
          inject(plus, amps);
          inject(minus, -amps);
        }
        break;
      }
      case "led":
        if (config.ledOn.get(part.id)) {
          const a = netOf(ctx, part, "a");
          const k = netOf(ctx, part, "k");
          const siemens = 1 / LED.rs;
          conduct(a, k, siemens);
          const amps = siemens * LED[part.color as "red" | "green"].vf;
          inject(a, amps);
          inject(k, -amps);
        }
        break;
      case "meter":
        if (part.mode === "V") conduct(netOf(ctx, part, "com"), netOf(ctx, part, "v"), 1 / METER.voltmeterOhms);
        else if (part.mode === "A") conduct(netOf(ctx, part, "com"), netOf(ctx, part, "v"), 1 / METER.ammeterOhms);
        break;
      default:
        break;
    }
  }

  if (config.test) {
    inject(config.test.into, config.test.amps);
    inject(config.test.outOf, -config.test.amps);
  }

  for (let net = 0; net < ctx.netCount; net++) {
    const i = ctx.unknown[net];
    if (i >= 0) g[i][i] += GMIN;
  }

  const x = n > 0 ? gauss(g, rhs) : [];
  return Array.from({ length: ctx.netCount }, (_, net) => (ctx.unknown[net] >= 0 ? x[ctx.unknown[net]] : 0));
}

export function solve(doc: CircuitDoc): SolveResult {
  const ctx = buildContext(doc);
  const leds = doc.parts.filter((part) => part.type === "led");
  const ledOn = new Map<string, boolean>(leds.map((part) => [part.id, false]));

  let v = solveNets(ctx, { powered: true, ledOn });
  for (let pass = 0; pass < 30; pass++) {
    let changed = false;
    for (const part of leds) {
      const vf = LED[part.color as "red" | "green"].vf;
      const vak = v[netOf(ctx, part, "a")] - v[netOf(ctx, part, "k")];
      const on = ledOn.get(part.id) as boolean;
      if (!on && vak > vf) {
        ledOn.set(part.id, true);
        changed = true;
      } else if (on && vak < vf) {
        ledOn.set(part.id, false);
        changed = true;
      }
    }
    if (!changed) break;
    v = solveNets(ctx, { powered: true, ledOn });
  }

  const elements: Record<string, ElementResult> = {};
  const meters: Record<string, MeterReading> = {};
  const flags: Flag[] = [];

  for (const part of doc.parts) {
    switch (part.type) {
      case "resistor": {
        const vd = v[netOf(ctx, part, "a")] - v[netOf(ctx, part, "b")];
        const i = vd / (part.value as number);
        const p = vd * i;
        elements[part.id] = { v: vd, i, p };
        if (p > 0.25) flags.push({ part: part.id, kind: "overheat" });
        break;
      }
      case "switch": {
        const vd = v[netOf(ctx, part, "a")] - v[netOf(ctx, part, "b")];
        const i = part.closed ? vd / SWITCH.closedOhms : 0;
        elements[part.id] = { v: vd, i, p: vd * i, on: part.closed === true };
        break;
      }
      case "battery":
      case "supply": {
        const vt = v[netOf(ctx, part, "+")] - v[netOf(ctx, part, "-")];
        const def = SOURCE[part.type];
        const i = (sourceVolts(part) - vt) / def.r;
        elements[part.id] = { v: vt, i, p: -(vt * i) };
        if (i > def.maxAmps) flags.push({ part: part.id, kind: "overload" });
        break;
      }
      case "led": {
        const def = LED[part.color as "red" | "green"];
        const vak = v[netOf(ctx, part, "a")] - v[netOf(ctx, part, "k")];
        const on = ledOn.get(part.id) as boolean;
        const i = on ? (vak - def.vf) / LED.rs : 0;
        elements[part.id] = { v: vak, i, p: vak * i, on };
        if (i > def.maxAmps) flags.push({ part: part.id, kind: "burnt" });
        if (vak < -LED.reverseVolts) flags.push({ part: part.id, kind: "reverse" });
        break;
      }
      case "meter": {
        const vd = v[netOf(ctx, part, "v")] - v[netOf(ctx, part, "com")];
        if (part.mode === "V") {
          elements[part.id] = { v: vd, i: vd / METER.voltmeterOhms, p: 0 };
          meters[part.id] = { mode: "V", value: vd };
        } else if (part.mode === "A") {
          const i = vd / METER.ammeterOhms;
          elements[part.id] = { v: vd, i, p: vd * i };
          if (Math.abs(i) > METER.fuseAmps) {
            meters[part.id] = { mode: "A", value: null, fault: "fuse" };
            flags.push({ part: part.id, kind: "fuse" });
          } else {
            meters[part.id] = { mode: "A", value: i };
          }
        } else {
          const mode = part.mode as "ohm" | "cont";
          if (Math.abs(vd) > METER.liveVolts) {
            meters[part.id] = { mode, value: null, fault: "live" };
            elements[part.id] = { v: vd, i: 0, p: 0 };
            flags.push({ part: part.id, kind: "live" });
          } else {
            const off = new Map<string, boolean>(leds.map((led) => [led.id, false]));
            const test = solveNets(ctx, {
              powered: false,
              ledOn: off,
              test: { into: netOf(ctx, part, "v"), outOf: netOf(ctx, part, "com"), amps: METER.testAmps },
            });
            const ohms = (test[netOf(ctx, part, "v")] - test[netOf(ctx, part, "com")]) / METER.testAmps;
            meters[part.id] = mode === "cont" ? { mode, value: ohms, beep: ohms < METER.beepOhms } : { mode, value: ohms };
            elements[part.id] = { v: 0, i: 0, p: 0 };
          }
        }
        break;
      }
      default:
        break;
    }
  }

  const nets: Record<string, number> = {};
  for (let n = 0; n < ctx.netCount; n++) nets[`n${n}`] = v[n];
  const netIds: Record<string, string> = {};
  for (const [key, n] of ctx.net) netIds[key] = `n${n}`;

  return { elements, meters, flags, nets, netOf: netIds };
}

/** Resistance between two pins of an unpowered circuit, by the same test-current method an ohmmeter uses. */
export function resistanceBetween(doc: CircuitDoc, from: string, to: string): number {
  const ctx = buildContext(doc);
  const leds = doc.parts.filter((part) => part.type === "led");
  const a = ctx.net.get(from);
  const b = ctx.net.get(to);
  if (a === undefined || b === undefined) return Number.POSITIVE_INFINITY;
  const test = solveNets(ctx, {
    powered: false,
    ledOn: new Map(leds.map((led) => [led.id, false])),
    test: { into: a, outOf: b, amps: METER.testAmps },
  });
  return (test[a] - test[b]) / METER.testAmps;
}
