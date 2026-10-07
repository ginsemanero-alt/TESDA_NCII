import { create } from "zustand";

import { parseDoc } from "./lib/doc";
import { nextRotation, snap } from "./lib/geometry";
import { defaultsFor, LIMITS } from "./lib/parts";
import { solve } from "./lib/solver";
import { CircuitDoc, MeterMode, Part, PartType, PinRef, SolveResult } from "./lib/types";

const PREFIX: Record<PartType, string> = { battery: "B", supply: "V", resistor: "R", led: "D", switch: "S", junction: "J", meter: "M" };
const HISTORY_LIMIT = 60;
const STORAGE_KEY = "epas.circuit.workbench.v1";

export type Selection = { kind: "part" | "wire"; id: string } | null;

const EMPTY: CircuitDoc = { parts: [], wires: [] };

function nextId(taken: Set<string>, prefix: string): string {
  for (let n = 1; ; n++) {
    const id = `${prefix}${n}`;
    if (!taken.has(id)) return id;
  }
}

const samePin = (a: PinRef, b: PinRef) => a.part === b.part && a.pin === b.pin;

interface State {
  doc: CircuitDoc;
  result: SolveResult;
  selection: Selection;

  /** A part waiting to be dropped on the next tap on the board. */
  placing: PartType | null;
  /** The pin a wire is being drawn from. */
  wireFrom: PinRef | null;

  past: CircuitDoc[];
  future: CircuitDoc[];

  /** Show voltage and current beside every part. */
  showValues: boolean;
  /** A short notice for the student (limits reached, duplicate wire). */
  message: string | null;
  /** Bumped when a whole new circuit is loaded, so the board re-fits the view. */
  fitTick: number;

  setShowValues: (on: boolean) => void;
  setMessage: (message: string | null) => void;
  select: (selection: Selection) => void;
  setPlacing: (type: PartType | null) => void;
  setWireFrom: (pin: PinRef | null) => void;

  /** Replace the whole circuit (load, example, new challenge). Resets history. */
  load: (doc: CircuitDoc) => void;
  clear: () => void;

  addPart: (type: PartType, x: number, y: number) => string;
  /** Call once when a drag starts, so the whole drag is one undo step. */
  beginEdit: () => void;
  movePart: (id: string, x: number, y: number) => void;
  rotatePart: (id: string) => void;
  patchPart: (id: string, patch: Partial<Part>) => void;
  toggleSwitch: (id: string) => void;
  setMeterMode: (id: string, mode: MeterMode) => void;
  deleteSelection: () => void;
  deleteWire: (id: string) => void;
  connect: (a: PinRef, b: PinRef) => boolean;

  undo: () => void;
  redo: () => void;
}

function computed(doc: CircuitDoc): Pick<State, "doc" | "result"> {
  return { doc, result: solve(doc) };
}

export function loadSavedDoc(): CircuitDoc {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY;
    const parsed = parseDoc(JSON.parse(raw));
    return "doc" in parsed ? parsed.doc : EMPTY;
  } catch {
    return EMPTY;
  }
}

export function saveDoc(doc: CircuitDoc): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(doc));
  } catch {
    // Storage can be blocked on a shared computer; the circuit simply is not remembered.
  }
}

export const useBench = create<State>((set, get) => {
  /** Applies an edit as one undo step. */
  const edit = (change: (doc: CircuitDoc) => CircuitDoc | null) => {
    const { doc, past } = get();
    const next = change(doc);
    if (!next) return;
    set({ ...computed(next), past: [...past, doc].slice(-HISTORY_LIMIT), future: [] });
  };

  const initial = loadSavedDoc();

  return {
    ...computed(initial),
    selection: null,
    placing: null,
    wireFrom: null,
    past: [],
    future: [],
    showValues: false,
    message: null,
    fitTick: 0,

    setShowValues: (showValues) => set({ showValues }),
    setMessage: (message) => set({ message }),
    select: (selection) => set({ selection }),
    setPlacing: (placing) => set({ placing, wireFrom: null }),
    setWireFrom: (wireFrom) => set({ wireFrom }),

    load: (doc) => set({ ...computed(doc), selection: null, placing: null, wireFrom: null, past: [], future: [], message: null, fitTick: get().fitTick + 1 }),
    clear: () => edit((doc) => (doc.parts.length === 0 && doc.wires.length === 0 ? null : { parts: [], wires: [] })),

    addPart: (type, x, y) => {
      const { doc } = get();
      if (doc.parts.length >= LIMITS.maxParts) {
        set({ message: `That is the most parts a circuit can have here (${LIMITS.maxParts}).` });
        return "";
      }
      const id = nextId(new Set(doc.parts.map((p) => p.id)), PREFIX[type]);
      const part: Part = { id, type, x: snap(x), y: snap(y), rot: 0, ...defaultsFor(type) };
      edit((d) => ({ ...d, parts: [...d.parts, part] }));
      set({ selection: { kind: "part", id }, placing: null });
      return id;
    },

    beginEdit: () => {
      const { doc, past } = get();
      set({ past: [...past, doc].slice(-HISTORY_LIMIT), future: [] });
    },
    // Moves skip history: beginEdit() already recorded the state before the drag.
    movePart: (id, x, y) => {
      const { doc } = get();
      const part = doc.parts.find((p) => p.id === id);
      if (!part || (part.x === snap(x) && part.y === snap(y))) return;
      set(computed({ ...doc, parts: doc.parts.map((p) => (p.id === id ? { ...p, x: snap(x), y: snap(y) } : p)) }));
    },
    rotatePart: (id) => edit((d) => ({ ...d, parts: d.parts.map((p) => (p.id === id ? { ...p, rot: nextRotation(p.rot) } : p)) })),
    patchPart: (id, patch) => edit((d) => ({ ...d, parts: d.parts.map((p) => (p.id === id ? { ...p, ...patch } : p)) })),
    toggleSwitch: (id) => edit((d) => ({ ...d, parts: d.parts.map((p) => (p.id === id && p.type === "switch" ? { ...p, closed: !p.closed } : p)) })),
    setMeterMode: (id, mode) => edit((d) => ({ ...d, parts: d.parts.map((p) => (p.id === id && p.type === "meter" ? { ...p, mode } : p)) })),

    deleteSelection: () => {
      const { selection } = get();
      if (!selection) return;
      if (selection.kind === "wire") {
        get().deleteWire(selection.id);
        return;
      }
      edit((d) => ({
        parts: d.parts.filter((p) => p.id !== selection.id),
        wires: d.wires.filter((wire) => wire.from.part !== selection.id && wire.to.part !== selection.id),
      }));
      set({ selection: null });
    },
    deleteWire: (id) => {
      edit((d) => ({ ...d, wires: d.wires.filter((wire) => wire.id !== id) }));
      set({ selection: null });
    },

    connect: (a, b) => {
      const { doc } = get();
      if (samePin(a, b)) return false;
      if (doc.wires.length >= LIMITS.maxWires) {
        set({ message: `That is the most wires a circuit can have here (${LIMITS.maxWires}).` });
        return false;
      }
      const duplicate = doc.wires.some((wire) => (samePin(wire.from, a) && samePin(wire.to, b)) || (samePin(wire.from, b) && samePin(wire.to, a)));
      if (duplicate) {
        set({ message: "Those two pins are already wired together." });
        return false;
      }
      const id = nextId(new Set(doc.wires.map((wire) => wire.id)), "w");
      edit((d) => ({ ...d, wires: [...d.wires, { id, from: a, to: b }] }));
      set({ wireFrom: null, message: null });
      return true;
    },

    undo: () => {
      const { past, future, doc } = get();
      if (past.length === 0) return;
      set({ ...computed(past[past.length - 1]), past: past.slice(0, -1), future: [doc, ...future], selection: null });
    },
    redo: () => {
      const { past, future, doc } = get();
      if (future.length === 0) return;
      set({ ...computed(future[0]), past: [...past, doc], future: future.slice(1), selection: null });
    },
  };
});
