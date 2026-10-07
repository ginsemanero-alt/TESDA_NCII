import { useId } from "react";

import { BAND_LAYOUT, RESISTOR, bodyRadiusAt } from "@/resistor/lib/experience";
import { BAND_COLORS, BandColor, METALLIC_BANDS } from "@/resistor/lib/resistor";

type Props = {
  bands: readonly BandColor[];
  focused?: number | null;
  /** Interactive pick of a band, e.g. for the "which band is…" checkpoint. */
  onPick?: (index: number) => void;
  picked?: number | null;
  showLabels?: boolean;
  className?: string;
  title?: string;
};

/**
 * A to-scale side view of the part, drawn from the same profile and band
 * layout as the 3D model. Used by the 2D bench and the checkpoints, so a
 * student without WebGL still reads a realistic resistor.
 */
export default function ResistorDrawing({
  bands,
  focused = null,
  onPick,
  picked = null,
  showLabels = true,
  className,
  title = "Resistor",
}: Props) {
  const uid = useId().replace(/:/g, "");
  const half = RESISTOR.bodyLength / 2;
  const lead = 6;
  const steps = 64;

  // Outline of the body, left to right. Local +Y (first band) is on the left.
  const top: string[] = [];
  const bottom: string[] = [];
  for (let i = 0; i <= steps; i++) {
    const y = half - (i / steps) * RESISTOR.bodyLength;
    const x = -y;
    const r = bodyRadiusAt(Math.abs(y) >= half ? Math.sign(y) * (half - 1e-6) : y);
    top.push(`${x.toFixed(3)},${(-r).toFixed(3)}`);
    bottom.unshift(`${x.toFixed(3)},${r.toFixed(3)}`);
  }
  const body = `M ${top.join(" L ")} L ${bottom.join(" L ")} Z`;
  const width = RESISTOR.bodyLength + lead * 2;
  // Bands 1–3 sit about 1 mm apart, closer than a word is wide: fan the
  // labels out evenly under the part, each joined to its band by a leader.
  const labelSpace = showLabels ? 3.8 : 0.6;
  const labelX = (index: number) => -width / 2 + (width / 4) * (index + 0.5);

  return (
    <svg
      viewBox={`${-width / 2} ${-2.2} ${width} ${4.4 + labelSpace}`}
      className={className}
      role="img"
      aria-label={`${title}: bands ${bands.map((b) => BAND_COLORS[b].label).join(", ")}`}
    >
      <defs>
        <linearGradient id={`body-${uid}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#efe0bf" />
          <stop offset="0.35" stopColor="#dcc69c" />
          <stop offset="1" stopColor="#a98f63" />
        </linearGradient>
        <linearGradient id={`lead-${uid}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#e9eaea" />
          <stop offset="0.5" stopColor="#a9abad" />
          <stop offset="1" stopColor="#6e7173" />
        </linearGradient>
        <linearGradient id={`metal-${uid}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.55" />
          <stop offset="0.45" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.35" />
        </linearGradient>
        <linearGradient id={`shade-${uid}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.28" />
          <stop offset="0.4" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.32" />
        </linearGradient>
        <clipPath id={`clip-${uid}`}>
          <path d={body} />
        </clipPath>
      </defs>

      <rect x={-width / 2} y={-RESISTOR.leadRadius} width={width} height={RESISTOR.leadRadius * 2} rx={RESISTOR.leadRadius} fill={`url(#lead-${uid})`} />
      <path d={body} fill={`url(#body-${uid})`} />

      <g clipPath={`url(#clip-${uid})`}>
        {BAND_LAYOUT.map(({ y, width: w }, index) => {
          const color = bands[index];
          const x = -y - w / 2;
          return (
            <g key={index}>
              <rect
                x={x}
                y={-2}
                width={w}
                height={4}
                fill={BAND_COLORS[color].hex}
                onClick={onPick ? () => onPick(index) : undefined}
                style={onPick ? { cursor: "pointer" } : undefined}
              />
              {METALLIC_BANDS.has(color) && <rect x={x} y={-2} width={w} height={4} fill={`url(#metal-${uid})`} pointerEvents="none" />}
            </g>
          );
        })}
        <rect x={-half} y={-2} width={RESISTOR.bodyLength} height={4} fill={`url(#shade-${uid})`} pointerEvents="none" />
      </g>

      {BAND_LAYOUT.map(({ y, width: w }, index) => {
        const active = focused === index || picked === index;
        if (!active) return null;
        const r = bodyRadiusAt(y);
        return <rect key={index} x={-y - w / 2 - 0.12} y={-r - 0.18} width={w + 0.24} height={(r + 0.18) * 2} rx={0.2} fill="none" stroke="#E0AE7E" strokeWidth={0.12} />;
      })}

      {showLabels &&
        BAND_LAYOUT.map(({ y }, index) => (
          <g key={index}>
            <polyline points={`${-y},${bodyRadiusAt(y) + 0.15} ${-y},${bodyRadiusAt(y) + 0.55} ${labelX(index)},${2.55}`} fill="none" stroke="#9FAEA2" strokeWidth={0.05} />
            <text x={labelX(index)} y={3.45} textAnchor="middle" fontSize={0.72} fontFamily="IBM Plex Mono, monospace" fill={focused === index ? "#E0AE7E" : "#C9D2C8"}>
              {BAND_COLORS[bands[index]].label}
            </text>
          </g>
        ))}

      {onPick &&
        BAND_LAYOUT.map(({ y, width: w }, index) => (
          <rect
            key={`hit-${index}`}
            x={-y - Math.max(w, 0.9) / 2}
            y={-2}
            width={Math.max(w, 0.9)}
            height={4}
            fill="transparent"
            onClick={() => onPick(index)}
            style={{ cursor: "pointer" }}
          />
        ))}
    </svg>
  );
}
