import Chapter from "@/resistor/ui/Chapter";
import { useLab } from "@/resistor/store";
import { formatOhms, readBands } from "@/resistor/lib/resistor";

/**
 * TR ELC311202 "Prepare and interpret technical drawing", PC 1.3: identify and
 * interpret the symbols used in a drawing. The bench on the stage and the
 * schematic here are the same circuit; the student matches part to symbol.
 */
export default function CurrentFlow() {
  const bands = useLab((s) => s.bands);
  const value = readBands(bands);

  return (
    <Chapter id="circuit" number={4} title="The circuit and its symbol" tr="ELC311202 · symbols · ELC724205 · 2.4.1">
      <p>
        Power is back on. Current leaves the battery's + terminal, runs through the red jumper, crosses the resistor,
        and returns through the black jumper to −. The same loop, drawn as a schematic:
      </p>

      <figure className="m-0 mt-5 rounded-2xl border border-chalk/12 bg-paper p-4 text-ink">
        <svg viewBox="0 0 320 170" className="w-full" role="img" aria-labelledby="lab-schematic-title lab-schematic-desc">
          <title id="lab-schematic-title">Schematic of the bench circuit</title>
          <desc id="lab-schematic-desc">
            A 9 volt battery, symbol B1, is connected in a single loop with a resistor, symbol R1. An arrow shows
            conventional current leaving the positive terminal.
          </desc>
          <g fill="none" stroke="#0C120F" strokeWidth="2" strokeLinejoin="round">
            {/* Loop */}
            <path d="M60 120 V40 H120" />
            <path d="M200 40 H260 V120" />
            <path d="M260 120 H178" />
            <path d="M142 120 H60" />
            {/* Resistor, IEC rectangle */}
            <rect x="120" y="30" width="80" height="20" fill="#FFFDF9" />
            {/* Battery: long plate +, short plate − */}
            <path d="M178 100 V140" />
            <path d="M164 108 V132" strokeWidth="5" />
            <path d="M156 100 V140" />
            <path d="M142 108 V132" strokeWidth="5" />
          </g>
          <g fill="#0C120F" fontFamily="IBM Plex Mono, monospace" fontSize="12">
            <text x="160" y="22" textAnchor="middle">R1 {formatOhms(value.ohms)}</text>
            <text x="160" y="160" textAnchor="middle">B1 9 V</text>
            <text x="186" y="104">+</text>
            <text x="128" y="104">−</text>
          </g>
          {/* Conventional current arrow */}
          <g stroke="#8A5228" fill="#8A5228" strokeWidth="1.6">
            <path d="M268 100 V60" fill="none" />
            <path d="M263 66 L268 56 L273 66 Z" />
          </g>
          <text x="276" y="84" fontFamily="IBM Plex Mono, monospace" fontSize="11" fill="#8A5228">I</text>
        </svg>
        <figcaption className="mt-2 text-[12.5px] text-ink-2">
          R1 is drawn as the IEC rectangle; US drawings use a zig-zag for the same part. The long plate of the battery is +.
        </figcaption>
      </figure>

      <p className="mt-5 text-[13.5px]">
        Switch the stage to <strong className="text-chalk">Explain</strong> to see the current's path drawn on the real
        bench. The current is the same everywhere in the loop: the resistor sets how much flows.
      </p>
    </Chapter>
  );
}
