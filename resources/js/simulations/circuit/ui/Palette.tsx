import { useRef } from "react";
import clsx from "clsx";

import { PARTS } from "../lib/parts";
import { PartType } from "../lib/types";
import { useBench } from "../store";
import { board } from "./Workspace";

const ORDER: PartType[] = ["battery", "supply", "resistor", "led", "switch", "junction", "meter"];

/** A tiny picture of each part, so the palette shows the symbol the board will draw. */
function Icon({ type }: { type: PartType }) {
  const stroke = { fill: "none", stroke: "currentColor", strokeWidth: 2.2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  return (
    <svg viewBox="-44 -26 88 52" className="h-8 w-14 flex-none" aria-hidden>
      {type === "resistor" && (
        <g {...stroke}>
          <path d="M -40 0 H -30 M 30 0 H 40" />
          <rect x={-30} y={-9} width={60} height={18} rx={2} />
        </g>
      )}
      {type === "battery" && (
        <g {...stroke}>
          <path d="M -40 0 H -8 M 8 0 H 40 M -8 -16 V 16" />
          <path d="M 8 -9 V 9" strokeWidth={5} />
        </g>
      )}
      {type === "supply" && (
        <g {...stroke}>
          <path d="M -40 0 H -20 M 20 0 H 40" />
          <circle r={20} />
          <text y={6} textAnchor="middle" fontSize={17} fill="currentColor" stroke="none" fontFamily="IBM Plex Mono, monospace">
            V
          </text>
        </g>
      )}
      {type === "led" && (
        <g {...stroke}>
          <path d="M -40 0 H -12 M 14 0 H 40 M 14 -14 V 14 M -12 -14 L -12 14 L 14 0 Z" />
          <path d="M 2 -18 L 10 -26 M 10 -14 L 18 -22" strokeWidth={1.6} />
        </g>
      )}
      {type === "switch" && (
        <g {...stroke}>
          <path d="M -40 0 H -14 M 14 0 H 40 M -14 0 L 10 -20" />
          <circle cx={-14} r={3} fill="currentColor" />
          <circle cx={14} r={3} fill="currentColor" />
        </g>
      )}
      {type === "junction" && <circle r={6} fill="currentColor" />}
      {type === "meter" && (
        <g {...stroke}>
          <rect x={-18} y={-22} width={36} height={44} rx={5} />
          <rect x={-12} y={-17} width={24} height={13} rx={2} />
          <circle cx={-7} cy={10} r={3} />
          <circle cx={7} cy={10} r={3} />
        </g>
      )}
    </svg>
  );
}

/**
 * The parts strip. Tap a part and then tap the board, or press and drag it onto
 * the board. With a keyboard: Enter picks a part, then Enter on the board drops it in
 * the middle of the view (Esc cancels).
 */
export default function Palette() {
  const placing = useBench((s) => s.placing);
  const setPlacing = useBench((s) => s.setPlacing);
  const press = useRef<{ type: PartType; x: number; y: number; id: number } | null>(null);

  const onPointerDown = (type: PartType) => (event: React.PointerEvent<HTMLButtonElement>) => {
    press.current = { type, x: event.clientX, y: event.clientY, id: event.pointerId };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerUp = (type: PartType) => (event: React.PointerEvent<HTMLButtonElement>) => {
    const start = press.current;
    press.current = null;
    if (!start || start.id !== event.pointerId) return;
    event.currentTarget.releasePointerCapture(event.pointerId);

    if (Math.hypot(event.clientX - start.x, event.clientY - start.y) > 10) {
      // Dragged: drop where the pointer was released, if that is over the board.
      const world = board.toWorld?.(event.clientX, event.clientY);
      if (world) useBench.getState().addPart(type, world[0], world[1]);
      return;
    }
    setPlacing(placing === type ? null : type);
  };

  return (
    <div role="group" aria-label="Parts" className="flex gap-2 overflow-x-auto pb-1">
      {ORDER.map((type) => (
        <button
          key={type}
          type="button"
          aria-pressed={placing === type}
          title={PARTS[type].note}
          onPointerDown={onPointerDown(type)}
          onPointerUp={onPointerUp(type)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              setPlacing(placing === type ? null : type);
            }
          }}
          style={{ touchAction: "none" }}
          className={clsx(
            "flex min-h-12 flex-none items-center gap-2 rounded-2xl border px-3 text-left text-[13px] font-semibold transition-colors",
            placing === type ? "border-copper-lt bg-copper/20 text-chalk" : "border-chalk/15 text-chalk/85 hover:border-chalk/40 hover:text-chalk",
          )}
        >
          <Icon type={type} />
          <span className="whitespace-nowrap">{PARTS[type].label}</span>
        </button>
      ))}
    </div>
  );
}
