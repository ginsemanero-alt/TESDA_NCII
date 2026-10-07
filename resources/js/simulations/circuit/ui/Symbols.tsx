import { LED } from "../lib/parts";
import { rotate } from "../lib/geometry";
import { FLAG_TAG, MODE_LABEL, ohmsText, readingDisplay, voltsText } from "../lib/format";
import { FlagKind, MeterMode, Part, SolveResult } from "../lib/types";

/**
 * Schematic symbols, drawn in the part's own coordinates (pins at ±40 on the
 * x axis) inside a group the workspace rotates. IEC style for the resistor,
 * the usual plates for the battery, a triangle and bar for the LED. Text that
 * must stay readable is drawn with a counter-rotation.
 */

export const INK = "#DDE5DD";
export const COPPER = "#E0AE7E";
const FONT = "IBM Plex Mono, ui-monospace, monospace";

type Props = {
  part: Part;
  result: SolveResult;
  flags: FlagKind[];
};

const stroke = { fill: "none", stroke: INK, strokeWidth: 2.5, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

/** Keeps a label upright however the part is turned. */
function Upright({ rot, x, y, children }: { rot: number; x: number; y: number; children: React.ReactNode }) {
  return <g transform={`translate(${x} ${y}) rotate(${-rot})`}>{children}</g>;
}

export function ResistorSymbol({ part, flags }: Props) {
  const hot = flags.includes("overheat");
  return (
    <g {...stroke}>
      <path d="M -40 0 H -30 M 30 0 H 40" />
      <rect x={-30} y={-9} width={60} height={18} rx={2} fill={hot ? "#8a2a22" : "#0F2A22"} stroke={hot ? "#f08a7a" : INK} />
    </g>
  );
}

export function SourceSymbol({ part }: Props) {
  if (part.type === "supply") {
    return (
      <g {...stroke}>
        <path d="M -40 0 H -20 M 20 0 H 40" />
        <circle r={20} fill="#0F2A22" />
        <Upright rot={part.rot} x={0} y={0}>
          <text y={5} textAnchor="middle" fontSize={15} fontFamily={FONT} fill={INK} stroke="none">
            V
          </text>
        </Upright>
        <Upright rot={part.rot} x={-30} y={-9}>
          <text textAnchor="middle" fontSize={12} fontFamily={FONT} fill={COPPER} stroke="none">
            +
          </text>
        </Upright>
      </g>
    );
  }
  return (
    <g {...stroke}>
      <path d="M -40 0 H -8 M 8 0 H 40" />
      <path d="M -8 -16 V 16" />
      <path d="M 8 -9 V 9" strokeWidth={5} />
      <Upright rot={part.rot} x={-26} y={-12}>
        <text textAnchor="middle" fontSize={13} fontFamily={FONT} fill={COPPER} stroke="none">
          +
        </text>
      </Upright>
    </g>
  );
}

export function LedSymbol({ part, result, flags }: Props) {
  const el = result.elements[part.id];
  const color = part.color === "green" ? "#4fe38a" : "#ff5a4a";
  const burnt = flags.includes("burnt");
  const brightness = el?.on ? Math.min(1, el.i / LED.ratedAmps) : 0;
  return (
    <g {...stroke}>
      <path d="M -40 0 H -12 M 14 0 H 40" />
      {!burnt && brightness > 0 && <circle r={34} cx={1} fill={`url(#glow-${part.color ?? "red"})`} opacity={Math.min(1, 0.25 + brightness * 0.75)} stroke="none" />}
      <path d="M -12 -14 L -12 14 L 14 0 Z" fill={burnt ? "#3a3a3a" : brightness > 0 ? color : "#0F2A22"} fillOpacity={burnt ? 1 : brightness > 0 ? 0.35 + 0.65 * brightness : 1} />
      <path d="M 14 -14 V 14" />
      <path d="M 2 -18 L 10 -28 M 6 -28 H 10 V -24 M 10 -14 L 18 -24 M 14 -24 H 18 V -20" strokeWidth={1.6} opacity={0.8} />
      {burnt && <path d="M -8 -10 L 10 10 M 10 -10 L -8 10" stroke="#f08a7a" strokeWidth={3} />}
    </g>
  );
}

export function SwitchSymbol({ part }: Props) {
  return (
    <g {...stroke}>
      <path d="M -40 0 H -14 M 14 0 H 40" />
      <circle cx={-14} r={3.5} fill={INK} />
      <circle cx={14} r={3.5} fill={INK} />
      <path d={part.closed ? "M -14 0 L 14 0" : "M -14 0 L 10 -20"} stroke={part.closed ? COPPER : INK} strokeWidth={3.5} />
    </g>
  );
}

export function JunctionSymbol() {
  return <circle r={5} fill={INK} />;
}

/* ------------------------------------------------------------------ */
/* Multimeter                                                          */
/* ------------------------------------------------------------------ */

const MODES: MeterMode[] = ["V", "A", "ohm", "cont"];

/**
 * The meter body stays upright whatever the rotation, so its display is always
 * readable; only the two jacks move to the side the wires should leave from.
 * Mode chips along the bottom of the display are buttons (data-meter).
 */
export function MeterSymbol({ part, result, flags }: Props) {
  const mode = part.mode ?? "V";
  const reading = result.meters[part.id];
  const d = readingDisplay(mode, reading);
  const warn = flags.some((f) => f === "fuse" || f === "live");

  const jack = (pin: "com" | "v") => {
    const offset: [number, number] = pin === "com" ? [-30, 100] : [30, 100];
    const [px, py] = rotate(offset, part.rot);
    const edge: [number, number] = part.rot % 180 === 0 ? [px, Math.sign(py) * 82] : [Math.sign(px) * 62, py];
    return { px, py, edge };
  };
  const com = jack("com");
  const volt = jack("v");

  return (
    <g>
      {[
        { j: com, name: "COM", color: "#1f2224" },
        { j: volt, name: "V", color: "#b92b22" },
      ].map(({ j, name, color }) => (
        <g key={name}>
          <path d={`M ${j.edge[0]} ${j.edge[1]} L ${j.px} ${j.py}`} stroke={color === "#1f2224" ? "#8b9390" : "#e86b5a"} strokeWidth={3} />
          <circle cx={j.px} cy={j.py} r={9} fill={color} stroke={INK} strokeWidth={2} />
          {/* Labelled on the side away from the wire: below a downward jack, above the others. */}
          <text x={j.px} y={part.rot === 0 ? j.py + 24 : j.py - 15} textAnchor="middle" fontSize={10} fontFamily={FONT} fill={INK}>
            {name}
          </text>
        </g>
      ))}
      <rect x={-62} y={-82} width={124} height={164} rx={14} fill="#e0a526" />
      <rect x={-54} y={-74} width={108} height={148} rx={8} fill="#26292b" />
      <rect x={-46} y={-66} width={92} height={46} rx={4} fill="#b9c4a6" stroke={warn ? "#f08a7a" : "none"} strokeWidth={2} />
      <text x={40} y={-34} textAnchor="end" fontSize={d.digits.length > 6 ? 17 : 24} fontFamily={FONT} fontWeight={600} fill="#1a2116">
        {d.digits}
      </text>
      <text x={40} y={-24} textAnchor="end" fontSize={10} fontFamily={FONT} fontWeight={700} fill="#1a2116" dy={0}>
        {d.unit}
        {reading?.beep ? "  ♪" : ""}
      </text>
      {MODES.map((m, i) => {
        const x = -40 + i * 27;
        const on = m === mode;
        return (
          <g key={m} data-meter={`${part.id}:${m}`} style={{ cursor: "pointer" }}>
            <rect x={x - 12} y={-12} width={24} height={20} rx={4} fill={on ? COPPER : "#3a3f42"} stroke={on ? "#fff3dc" : "none"} />
            <text x={x} y={3} textAnchor="middle" fontSize={11} fontFamily={FONT} fontWeight={700} fill={on ? "#1a1208" : INK} pointerEvents="none">
              {MODE_LABEL[m]}
            </text>
          </g>
        );
      })}
      <text x={0} y={34} textAnchor="middle" fontSize={9} fontFamily={FONT} fill="#9FAEA2">
        DIGITAL MULTIMETER
      </text>
      {d.note && (
        <text x={0} y={52} textAnchor="middle" fontSize={8.5} fontFamily={FONT} fill="#f0c46a">
          {d.note.length > 28 ? d.note.slice(0, 27) + "…" : d.note}
        </text>
      )}
      <circle cx={0} cy={0} r={0} />
    </g>
  );
}

/** The symbol for a part, by type. The meter is drawn upright, so it is not inside the rotated group. */
export function symbolFor(part: Part, props: Props): React.ReactNode {
  switch (part.type) {
    case "resistor":
      return <ResistorSymbol {...props} />;
    case "battery":
    case "supply":
      return <SourceSymbol {...props} />;
    case "led":
      return <LedSymbol {...props} />;
    case "switch":
      return <SwitchSymbol {...props} />;
    case "junction":
      return <JunctionSymbol />;
    default:
      return null;
  }
}

/** Name and value shown above a part. */
export function labelFor(part: Part): string {
  switch (part.type) {
    case "resistor":
      return `${part.id}  ${ohmsText(part.value ?? 0)}`;
    case "battery":
      return `${part.id}  9 V`;
    case "supply":
      return `${part.id}  ${voltsText(part.value ?? 0)}`;
    case "led":
      return `${part.id}  ${part.color ?? "red"} LED`;
    case "switch":
      return `${part.id}  ${part.closed ? "closed" : "open"}`;
    case "junction":
      return "";
    default:
      return part.id;
  }
}

export { FLAG_TAG };
