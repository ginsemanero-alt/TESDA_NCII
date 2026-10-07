import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { BODY, boundsOf, elbow, GRID, pinPosition, snap, wirePath } from "../lib/geometry";
import { FLAG_TAG, ampsText, voltsText } from "../lib/format";
import { PARTS } from "../lib/parts";
import { FlagKind, MeterMode, Part, PinRef } from "../lib/types";
import { useBench } from "../store";
import { COPPER, INK, labelFor, MeterSymbol, symbolFor } from "./Symbols";

/**
 * The board. An SVG canvas with pan and zoom, a 20-unit grid, parts you drag,
 * and wires you draw pin to pin (press on a pin and drag to another pin, or
 * tap one pin and then another). Everything solves live after each change.
 *
 * Touch first: a part from the palette can be tapped and then dropped with a
 * tap, a wire can be made with two taps, and two fingers pinch to zoom.
 */

/** Lets the palette turn a screen position into a board position when a part is dropped. */
export const board = {
  toWorld: null as null | ((clientX: number, clientY: number) => [number, number] | null),
};

type View = { x: number; y: number; k: number };

type Drag =
  | { kind: "part"; id: string; dx: number; dy: number; startX: number; startY: number; moved: boolean }
  | { kind: "pan"; startX: number; startY: number; view: View }
  | { kind: "wire"; startX: number; startY: number }
  | null;

const pinId = (ref: PinRef) => `${ref.part}.${ref.pin}`;
const MIN_K = 0.35;
const MAX_K = 2.6;

function parsePin(value: string | null | undefined): PinRef | null {
  if (!value) return null;
  const dot = value.indexOf(".");
  return dot < 0 ? null : { part: value.slice(0, dot), pin: value.slice(dot + 1) };
}

export default function Workspace() {
  const doc = useBench((s) => s.doc);
  const result = useBench((s) => s.result);
  const selection = useBench((s) => s.selection);
  const placing = useBench((s) => s.placing);
  const wireFrom = useBench((s) => s.wireFrom);
  const showValues = useBench((s) => s.showValues);
  const fitTick = useBench((s) => s.fitTick);
  const act = useBench.getState;

  const frame = useRef<HTMLDivElement>(null);
  const svg = useRef<SVGSVGElement>(null);
  const [view, setView] = useState<View>({ x: 0, y: 0, k: 1 });
  const viewRef = useRef(view);
  viewRef.current = view;
  const drag = useRef<Drag>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef(0);
  const [cursor, setCursor] = useState<[number, number] | null>(null);

  const flagsByPart = useMemo(() => {
    const map = new Map<string, FlagKind[]>();
    for (const flag of result.flags) map.set(flag.part, [...(map.get(flag.part) ?? []), flag.kind]);
    return map;
  }, [result.flags]);

  const wired = useMemo(() => {
    const set = new Set<string>();
    for (const wire of doc.wires) {
      set.add(pinId(wire.from));
      set.add(pinId(wire.to));
    }
    return set;
  }, [doc.wires]);

  const toWorld = useCallback((clientX: number, clientY: number): [number, number] | null => {
    const element = svg.current;
    if (!element) return null;
    const rect = element.getBoundingClientRect();
    if (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) return null;
    const v = viewRef.current;
    return [(clientX - rect.left - v.x) / v.k, (clientY - rect.top - v.y) / v.k];
  }, []);

  useEffect(() => {
    board.toWorld = toWorld;
    return () => {
      board.toWorld = null;
    };
  }, [toWorld]);

  /** Fits everything on the board into the frame. */
  const fit = useCallback(() => {
    const element = frame.current;
    if (!element) return;
    const { width, height } = element.getBoundingClientRect();
    const b = boundsOf(useBench.getState().doc.parts);
    const k = Math.max(MIN_K, Math.min(1.4, Math.min(width / b.width, height / b.height)));
    setView({ k, x: width / 2 - (b.x + b.width / 2) * k, y: height / 2 - (b.y + b.height / 2) * k });
  }, []);

  useEffect(() => {
    fit();
  }, [fit, fitTick]);

  useEffect(() => {
    const element = frame.current;
    if (!element || !("ResizeObserver" in window)) return;
    const observer = new ResizeObserver(() => {
      if (!drag.current) fit();
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [fit]);

  const zoomAt = useCallback((factor: number, cx?: number, cy?: number) => {
    const element = frame.current;
    if (!element) return;
    const rect = element.getBoundingClientRect();
    const px = cx ?? rect.width / 2;
    const py = cy ?? rect.height / 2;
    setView((v) => {
      const k = Math.max(MIN_K, Math.min(MAX_K, v.k * factor));
      const ratio = k / v.k;
      return { k, x: px - (px - v.x) * ratio, y: py - (py - v.y) * ratio };
    });
  }, []);

  // Ctrl or trackpad-pinch wheel zooms; a plain wheel always scrolls the page.
  useEffect(() => {
    const element = svg.current;
    if (!element) return;
    const onWheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      const rect = element.getBoundingClientRect();
      zoomAt(Math.exp(-event.deltaY * 0.0025), event.clientX - rect.left, event.clientY - rect.top);
    };
    element.addEventListener("wheel", onWheel, { passive: false });
    return () => element.removeEventListener("wheel", onWheel);
  }, [zoomAt]);

  /* ------------------------------------------------------------------ */

  const onPointerDown = (event: React.PointerEvent<SVGSVGElement>) => {
    const target = event.target as Element;
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    svg.current?.setPointerCapture(event.pointerId);

    if (pointers.current.size === 2) {
      // A second finger turns the gesture into a pinch.
      const [a, b] = Array.from(pointers.current.values());
      pinch.current = Math.hypot(a.x - b.x, a.y - b.y);
      drag.current = null;
      return;
    }

    const state = act();
    const world = toWorld(event.clientX, event.clientY);

    const chip = target.closest<SVGElement>("[data-meter]");
    if (chip) {
      const [id, mode] = (chip.dataset.meter ?? "").split(":");
      state.setMeterMode(id, mode as MeterMode);
      state.select({ kind: "part", id });
      return;
    }

    const pinEl = target.closest<SVGElement>("[data-pin]");
    if (pinEl) {
      const pin = parsePin(pinEl.dataset.pin);
      if (!pin) return;
      if (state.wireFrom && state.wireFrom.part + "." + state.wireFrom.pin !== pinId(pin)) {
        // Second tap of a tap-tap wire.
        state.connect(state.wireFrom, pin);
        drag.current = null;
        return;
      }
      state.setWireFrom(pin);
      state.select(null);
      drag.current = { kind: "wire", startX: event.clientX, startY: event.clientY };
      if (world) setCursor(world);
      return;
    }

    const partEl = target.closest<SVGElement>("[data-part]");
    if (partEl && world) {
      const id = partEl.dataset.part as string;
      const part = state.doc.parts.find((p) => p.id === id);
      if (part) {
        state.select({ kind: "part", id });
        state.setWireFrom(null);
        drag.current = { kind: "part", id, dx: part.x - world[0], dy: part.y - world[1], startX: event.clientX, startY: event.clientY, moved: false };
        return;
      }
    }

    const wireEl = target.closest<SVGElement>("[data-wire]");
    if (wireEl) {
      state.select({ kind: "wire", id: wireEl.dataset.wire as string });
      state.setWireFrom(null);
      return;
    }

    // The empty board.
    if (state.placing && world) {
      state.addPart(state.placing, world[0], world[1]);
      return;
    }
    state.select(null);
    state.setWireFrom(null);
    drag.current = { kind: "pan", startX: event.clientX, startY: event.clientY, view: viewRef.current };
  };

  const onPointerMove = (event: React.PointerEvent<SVGSVGElement>) => {
    if (pointers.current.has(event.pointerId)) pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (pointers.current.size === 2) {
      const [a, b] = Array.from(pointers.current.values());
      const distance = Math.hypot(a.x - b.x, a.y - b.y);
      const rect = svg.current?.getBoundingClientRect();
      if (pinch.current > 0 && rect) zoomAt(distance / pinch.current, (a.x + b.x) / 2 - rect.left, (a.y + b.y) / 2 - rect.top);
      pinch.current = distance;
      return;
    }

    const world = toWorld(event.clientX, event.clientY);
    if (act().wireFrom && world) setCursor(world);

    const d = drag.current;
    if (!d) return;

    if (d.kind === "pan") {
      setView({ ...d.view, x: d.view.x + event.clientX - d.startX, y: d.view.y + event.clientY - d.startY });
    } else if (d.kind === "part" && world) {
      if (!d.moved && Math.hypot(event.clientX - d.startX, event.clientY - d.startY) < 4) return;
      if (!d.moved) {
        d.moved = true;
        act().beginEdit();
      }
      act().movePart(d.id, world[0] + d.dx, world[1] + d.dy);
    }
  };

  const onPointerUp = (event: React.PointerEvent<SVGSVGElement>) => {
    pointers.current.delete(event.pointerId);
    if (pointers.current.size < 2) pinch.current = 0;
    const d = drag.current;
    drag.current = null;
    if (!d) return;

    const state = act();
    if (d.kind === "wire") {
      const over = document.elementFromPoint(event.clientX, event.clientY)?.closest<SVGElement>("[data-pin]");
      const to = parsePin(over?.dataset.pin);
      if (to && state.wireFrom && pinId(to) !== pinId(state.wireFrom)) {
        state.connect(state.wireFrom, to);
      } else if (Math.hypot(event.clientX - d.startX, event.clientY - d.startY) > 8) {
        // Dragged out into empty board: cancel. A short press leaves the wire pending for a second tap.
        state.setWireFrom(null);
      }
    } else if (d.kind === "part" && !d.moved) {
      const part = state.doc.parts.find((p) => p.id === d.id);
      if (part?.type === "switch") state.toggleSwitch(part.id);
    }
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const state = act();
    const sel = state.selection;
    const key = event.key.toLowerCase();
    if ((event.ctrlKey || event.metaKey) && key === "z") {
      event.preventDefault();
      if (event.shiftKey) state.redo();
      else state.undo();
    } else if ((event.ctrlKey || event.metaKey) && key === "y") {
      event.preventDefault();
      state.redo();
    } else if (event.key === "Enter" && state.placing) {
      // Keyboard drop: the picked part lands in the middle of what is on screen.
      event.preventDefault();
      const rect = frame.current?.getBoundingClientRect();
      const v = viewRef.current;
      if (rect) state.addPart(state.placing, (rect.width / 2 - v.x) / v.k, (rect.height / 2 - v.y) / v.k);
    } else if (event.key === "Escape") {
      state.setWireFrom(null);
      state.setPlacing(null);
      state.select(null);
    } else if (sel && (event.key === "Delete" || event.key === "Backspace")) {
      event.preventDefault();
      state.deleteSelection();
    } else if (sel?.kind === "part") {
      const part = state.doc.parts.find((p) => p.id === sel.id);
      if (!part) return;
      if (key === "r") {
        state.rotatePart(part.id);
      } else if (event.key.startsWith("Arrow")) {
        event.preventDefault();
        const step = event.shiftKey ? GRID * 4 : GRID;
        state.beginEdit();
        state.movePart(part.id, part.x + (event.key === "ArrowRight" ? step : event.key === "ArrowLeft" ? -step : 0), part.y + (event.key === "ArrowDown" ? step : event.key === "ArrowUp" ? -step : 0));
      } else if (key === " " && part.type === "switch") {
        event.preventDefault();
        state.toggleSwitch(part.id);
      }
    }
  };

  /* ------------------------------------------------------------------ */

  const renderPart = (part: Part) => {
    const flags = flagsByPart.get(part.id) ?? [];
    const el = result.elements[part.id];
    const selected = selection?.kind === "part" && selection.id === part.id;
    const [hw, hh] = BODY[part.type];
    const turned = part.rot === 90 || part.rot === 270;
    const half = part.type === "meter" ? 82 : turned ? hw : hh;
    const bad = flags.length > 0;
    const props = { part, result, flags };
    // Horizontal parts carry their label above; vertical ones beside, so stacked parts never share a label.
    const side = turned && part.type !== "meter";
    const at = side
      ? { x: part.x + hh + 12, anchor: "start" as const, label: part.y - 2, tag: part.y + 14, values: part.y + 30 }
      : { x: part.x, anchor: "middle" as const, label: part.y - half - 12, tag: part.y - half - 28, values: part.y + half + 18 };

    return (
      <g key={part.id} data-part={part.id} style={{ cursor: "grab" }}>
        {part.type === "meter" ? (
          <g transform={`translate(${part.x} ${part.y})`}>
            <MeterSymbol {...props} />
          </g>
        ) : (
          <g transform={`translate(${part.x} ${part.y}) rotate(${part.rot})`}>
            <rect x={-hw} y={-hh} width={hw * 2} height={hh * 2} fill="transparent" />
            {symbolFor(part, props)}
          </g>
        )}

        {selected && (
          <rect
            x={part.x - (part.type === "meter" ? 68 : turned ? hh : hw) - 4}
            y={part.y - (part.type === "meter" ? 88 : turned ? hw : hh) - 4}
            width={(part.type === "meter" ? 136 : turned ? hh * 2 : hw * 2) + 8}
            height={(part.type === "meter" ? 176 : turned ? hw * 2 : hh * 2) + 8}
            rx={8}
            fill="none"
            stroke={COPPER}
            strokeWidth={1.5}
            strokeDasharray="5 4"
            pointerEvents="none"
          />
        )}

        {part.type !== "junction" && (
          <text x={at.x} y={at.label} textAnchor={at.anchor} fontSize={12} fontFamily="IBM Plex Mono, monospace" fill={bad ? "#f08a7a" : INK} pointerEvents="none">
            {labelFor(part)}
          </text>
        )}
        {bad && (
          <text x={at.x} y={at.tag} textAnchor={at.anchor} fontSize={11} fontWeight={700} fontFamily="IBM Plex Mono, monospace" fill="#f08a7a" pointerEvents="none">
            {flags.map((f) => FLAG_TAG[f]).join(" · ")}
          </text>
        )}
        {showValues && el && part.type !== "junction" && part.type !== "meter" && (
          <text x={at.x} y={at.values} textAnchor={at.anchor} fontSize={11} fontFamily="IBM Plex Mono, monospace" fill={COPPER} pointerEvents="none">
            {ampsText(el.i)} · {voltsText(el.v)}
          </text>
        )}

        {PARTS[part.type].pins.map((pin) => {
          const [px, py] = pinPosition(part, pin);
          const ref = { part: part.id, pin };
          const connected = wired.has(pinId(ref));
          const pending = wireFrom && pinId(wireFrom) === pinId(ref);
          return (
            <g key={pin} data-pin={pinId(ref)} style={{ cursor: "crosshair" }}>
              <circle cx={px} cy={py} r={13} fill="transparent" />
              <circle cx={px} cy={py} r={pending ? 7 : 5} fill={connected ? INK : "#0F2A22"} stroke={pending ? COPPER : INK} strokeWidth={2} pointerEvents="none" />
              <title>{`${part.id} pin ${pin}`}</title>
            </g>
          );
        })}
      </g>
    );
  };

  const wireFromPoint = useMemo(() => {
    if (!wireFrom) return null;
    const part = doc.parts.find((p) => p.id === wireFrom.part);
    return part ? pinPosition(part, wireFrom.pin) : null;
  }, [wireFrom, doc.parts]);

  return (
    <div
      ref={frame}
      className="relative h-[min(68vh,620px)] min-h-[340px] w-full overflow-hidden rounded-[1.75rem] border border-chalk/12 bg-board-2 outline-none focus-visible:ring-2 focus-visible:ring-copper-lt"
      tabIndex={0}
      onKeyDown={onKeyDown}
      role="application"
      aria-label="Circuit board. Drag parts, draw wires between pins. Arrow keys move the selected part, R turns it, Delete removes it."
    >
      <svg
        ref={svg}
        className="absolute inset-0 size-full select-none"
        style={{ touchAction: "none", cursor: placing ? "copy" : "default" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <defs>
          <pattern id="bench-grid" width={GRID * view.k} height={GRID * view.k} patternUnits="userSpaceOnUse" x={view.x} y={view.y}>
            <circle cx={1} cy={1} r={1} fill="#E4E8E0" opacity={0.16} />
          </pattern>
          <radialGradient id="glow-red">
            <stop offset="0" stopColor="#ff5a4a" stopOpacity={0.9} />
            <stop offset="1" stopColor="#ff5a4a" stopOpacity={0} />
          </radialGradient>
          <radialGradient id="glow-green">
            <stop offset="0" stopColor="#4fe38a" stopOpacity={0.9} />
            <stop offset="1" stopColor="#4fe38a" stopOpacity={0} />
          </radialGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#bench-grid)" />

        <g transform={`translate(${view.x} ${view.y}) scale(${view.k})`}>
          {doc.wires.map((wire) => {
            const selected = selection?.kind === "wire" && selection.id === wire.id;
            const d = wirePath(doc, wire);
            return (
              <g key={wire.id} data-wire={wire.id} style={{ cursor: "pointer" }}>
                <path d={d} fill="none" stroke="transparent" strokeWidth={14} />
                <path d={d} fill="none" stroke={selected ? COPPER : "#B9C4BC"} strokeWidth={selected ? 3.5 : 2.5} strokeLinecap="round" strokeLinejoin="round" pointerEvents="none" />
              </g>
            );
          })}

          {wireFromPoint && cursor && <path d={elbow(wireFromPoint[0], wireFromPoint[1], snap(cursor[0]), snap(cursor[1]))} fill="none" stroke={COPPER} strokeWidth={2.5} strokeDasharray="6 5" pointerEvents="none" />}

          {doc.parts.map(renderPart)}
        </g>
      </svg>

      {doc.parts.length === 0 && !placing && (
        <p className="pointer-events-none absolute inset-0 grid place-items-center px-8 text-center text-[14px] text-sage">
          An empty board. Pick a part on the left and tap the board, or load an example above.
        </p>
      )}

      {(placing || wireFrom) && (
        <p role="status" className="pointer-events-none absolute top-3 left-1/2 -translate-x-1/2 rounded-full bg-board/90 px-4 py-1.5 text-[12.5px] font-semibold text-chalk shadow">
          {placing ? `Tap the board to place the ${PARTS[placing].label.toLowerCase()}. Esc cancels.` : "Now tap or drop on another pin. Esc cancels."}
        </p>
      )}

      <div className="absolute right-3 bottom-3 flex gap-1.5" data-ui>
        {[
          { label: "Zoom in", text: "+", run: () => zoomAt(1.25) },
          { label: "Zoom out", text: "−", run: () => zoomAt(0.8) },
          { label: "Fit the circuit on screen", text: "Fit", run: fit },
        ].map((button) => (
          <button
            key={button.label}
            type="button"
            aria-label={button.label}
            onClick={button.run}
            className="grid size-10 place-items-center rounded-full border border-chalk/20 bg-board/85 text-[14px] font-bold text-chalk hover:border-copper-lt"
          >
            {button.text}
          </button>
        ))}
      </div>
    </div>
  );
}
