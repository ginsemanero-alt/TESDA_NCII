import clsx from "clsx";

import ResistorDrawing from "@/resistor/ui/ResistorDrawing";
import { ampsText, bandsForValue, FLAG_TEXT, MODE_NAME, ohmsText, readingDisplay, voltsText, wattsText } from "../lib/format";
import { LED, LIMITS, PARTS, RESISTOR_VALUES } from "../lib/parts";
import { sourceVolts } from "../lib/solver";
import { FlagKind, LedColor, MeterMode, Part } from "../lib/types";
import { useBench } from "../store";

const MODES: MeterMode[] = ["V", "A", "ohm", "cont"];

const MODE_HELP: Record<MeterMode, string> = {
  V: "Volts: put the probes across a part, red (V) on the side closer to the battery's +.",
  A: "Amps: break the circuit and put the meter in the gap, in series. Never across a source.",
  ohm: "Ohms: the circuit must be switched off. Probes across the part you are testing.",
  cont: "Continuity: beeps when the path between the probes is under 50 Ω. Circuit off.",
};

function Row({ label, value, tone }: { label: string; value: string; tone?: "bad" | "good" }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-chalk/8 py-1.5 text-[13px] last:border-b-0">
      <dt className="text-sage">{label}</dt>
      <dd className={clsx("lab-readout m-0 text-right", tone === "bad" ? "text-fail-lt" : tone === "good" ? "text-pass-lt" : "text-chalk")}>{value}</dd>
    </div>
  );
}

function Flags({ flags }: { flags: FlagKind[] }) {
  if (flags.length === 0) return null;
  return (
    <ul className="m-0 mt-3 grid gap-1.5 p-0" role="alert">
      {flags.map((flag) => (
        <li key={flag} className="rounded-xl bg-fail/20 px-3 py-2 text-[12.5px] font-semibold text-fail-lt">
          {FLAG_TEXT[flag]}
        </li>
      ))}
    </ul>
  );
}

const button = "min-h-10 rounded-xl border border-chalk/15 px-3 text-[13px] font-semibold text-chalk hover:border-copper-lt";

export default function Inspector() {
  const doc = useBench((s) => s.doc);
  const result = useBench((s) => s.result);
  const selection = useBench((s) => s.selection);
  const act = useBench.getState;

  const part = selection?.kind === "part" ? doc.parts.find((p) => p.id === selection.id) : undefined;

  if (!part) return <Summary />;

  const el = result.elements[part.id];
  const flags = result.flags.filter((f) => f.part === part.id).map((f) => f.kind);
  const wiredPins = new Set(doc.wires.flatMap((w) => [`${w.from.part}.${w.from.pin}`, `${w.to.part}.${w.to.pin}`]));
  const open = PARTS[part.type].pins.filter((pin) => !wiredPins.has(`${part.id}.${pin}`));

  return (
    <section aria-label={`Details of ${part.id}`} className="rounded-[1.75rem] border border-chalk/12 bg-board/70 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="m-0 font-mono text-[11px] tracking-[0.12em] text-copper-lt uppercase">{part.id}</p>
          <h4 className="m-0 mt-1 text-[1.15rem] font-black tracking-tight text-chalk">{PARTS[part.type].label}</h4>
        </div>
        <div className="flex gap-1.5">
          <button type="button" className={button} onClick={() => act().rotatePart(part.id)} title="Turn 90° (R)">
            Turn
          </button>
          <button type="button" className={clsx(button, "hover:border-fail-lt")} onClick={() => act().deleteSelection()} title="Remove (Delete)">
            Remove
          </button>
        </div>
      </div>
      <p className="m-0 mt-2 text-[12.5px] leading-snug text-sage">{PARTS[part.type].note}</p>

      <Editor part={part} />

      {el && part.type !== "junction" && part.type !== "meter" && (
        <dl className="m-0 mt-3">
          <Row label="Voltage across" value={voltsText(el.v)} />
          <Row label="Current through" value={ampsText(el.i)} />
          {part.type === "resistor" && <Row label="Power" value={`${wattsText(el.p)} of 250 mW`} tone={el.p > LIMITS.resistor.watts ? "bad" : undefined} />}
          {part.type === "led" && <Row label="State" value={el.on ? "Lit" : "Off"} tone={el.on ? "good" : undefined} />}
          {(part.type === "battery" || part.type === "supply") && <Row label="Power delivered" value={wattsText(-el.p)} />}
        </dl>
      )}

      <Flags flags={flags} />

      {open.length > 0 && part.type !== "junction" && (
        <p className="m-0 mt-3 text-[12.5px] text-caution-lt">
          Not connected yet: pin {open.join(", ")}. A part only works once both pins are wired.
        </p>
      )}
    </section>
  );
}

function Editor({ part }: { part: Part }) {
  const act = useBench.getState;
  const result = useBench((s) => s.result);

  if (part.type === "resistor") {
    const values = RESISTOR_VALUES.includes(part.value ?? 0) ? RESISTOR_VALUES : [...RESISTOR_VALUES, part.value ?? 0].sort((a, b) => a - b);
    return (
      <div className="mt-3 grid gap-3">
        <label className="grid gap-1 text-[13px] text-sage">
          Resistance
          <select
            value={part.value}
            onChange={(e) => act().patchPart(part.id, { value: Number(e.target.value) })}
            className="lab-readout min-h-11 rounded-xl border border-chalk/20 bg-board px-3 text-[15px] text-chalk"
          >
            {values.map((v) => (
              <option key={v} value={v}>
                {ohmsText(v)}
              </option>
            ))}
          </select>
        </label>
        <ResistorDrawing bands={bandsForValue(part.value ?? 330)} className="w-full max-w-[300px]" title={`${part.id}, ${ohmsText(part.value ?? 0)}`} />
      </div>
    );
  }

  if (part.type === "supply") {
    return (
      <div className="mt-3">
        <div className="flex items-baseline justify-between text-[13px] text-sage">
          <label htmlFor={`volts-${part.id}`}>Voltage</label>
          <output htmlFor={`volts-${part.id}`} className="lab-readout text-[1.3rem] font-semibold text-chalk">
            {voltsText(sourceVolts(part))}
          </output>
        </div>
        <input
          id={`volts-${part.id}`}
          type="range"
          min={LIMITS.supply.min}
          max={LIMITS.supply.max}
          step={0.1}
          value={part.value ?? 0}
          aria-valuetext={voltsText(part.value ?? 0)}
          onChange={(e) => act().patchPart(part.id, { value: Number(e.target.value) })}
          className="lab-range mt-2"
        />
      </div>
    );
  }

  if (part.type === "led") {
    return (
      <fieldset className="m-0 mt-3 border-0 p-0">
        <legend className="p-0 text-[13px] text-sage">Colour</legend>
        <div className="mt-1.5 flex gap-2">
          {(["red", "green"] as LedColor[]).map((color) => (
            <label key={color} className={clsx("flex min-h-10 whitespace-nowrapcursor-pointer items-center gap-2 rounded-full border px-3 text-[13px] font-semibold", part.color === color ? "border-copper-lt bg-copper/20 text-chalk" : "border-chalk/15 text-sage")}>
              <input type="radio" name={`color-${part.id}`} checked={part.color === color} onChange={() => act().patchPart(part.id, { color })} className="accent-copper" />
              <span aria-hidden className="size-3 rounded-full" style={{ background: color === "red" ? "#ff5a4a" : "#4fe38a" }} />
              {color === "red" ? "Red" : "Green"} · {LED[color].vf} V
            </label>
          ))}
        </div>
        <p className="m-0 mt-2 text-[12px] text-sage">Safe up to {LED.red.maxAmps * 1000} mA. Aim for about {LED.ratedAmps * 1000} mA.</p>
      </fieldset>
    );
  }

  if (part.type === "switch") {
    return (
      <button type="button" aria-pressed={part.closed} className={clsx(button, "mt-3 w-full", part.closed && "border-copper-lt bg-copper/20")} onClick={() => act().toggleSwitch(part.id)}>
        {part.closed ? "Closed: tap to open" : "Open: tap to close"}
      </button>
    );
  }

  if (part.type === "meter") {
    const mode = part.mode ?? "V";
    const d = readingDisplay(mode, result.meters[part.id]);
    return (
      <div className="mt-3 grid gap-3">
        <fieldset className="m-0 border-0 p-0">
          <legend className="p-0 text-[13px] text-sage">Dial</legend>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {MODES.map((m) => (
              <label key={m} className={clsx("flex min-h-10 cursor-pointer items-center gap-2 rounded-full border px-3 text-[13px] font-semibold", mode === m ? "border-copper-lt bg-copper/20 text-chalk" : "border-chalk/15 text-sage")}>
                <input type="radio" name={`mode-${part.id}`} checked={mode === m} onChange={() => act().setMeterMode(part.id, m)} className="accent-copper" />
                {MODE_NAME[m]}
              </label>
            ))}
          </div>
        </fieldset>
        <div className="lab-lcd flex items-baseline justify-end gap-2 rounded-xl px-4 py-2.5" aria-live="polite" aria-atomic="true">
          <span className="sr-only">Meter reads</span>
          <span className="text-[1.8rem] leading-none font-medium">{d.digits}</span>
          <span className="text-[14px] font-semibold">{d.unit}</span>
        </div>
        {d.note && <p className="m-0 text-[12.5px] text-caution-lt">{d.note}</p>}
        <p className="m-0 text-[12.5px] leading-snug text-sage">{MODE_HELP[mode]}</p>
      </div>
    );
  }

  return null;
}

/** Nothing selected: how the whole circuit is doing. */
function Summary() {
  const doc = useBench((s) => s.doc);
  const result = useBench((s) => s.result);

  const sources = doc.parts.filter((p) => p.type === "battery" || p.type === "supply");
  const delivered = sources.reduce((sum, p) => sum - (result.elements[p.id]?.p ?? 0), 0);
  const flags = result.flags;

  return (
    <section aria-label="Circuit summary" className="rounded-[1.75rem] border border-chalk/12 bg-board/70 p-4">
      <p className="m-0 font-mono text-[11px] tracking-[0.12em] text-copper-lt uppercase">Circuit</p>
      <h4 className="m-0 mt-1 text-[1.15rem] font-black tracking-tight text-chalk">Nothing selected</h4>
      <p className="m-0 mt-2 text-[12.5px] leading-snug text-sage">Tap a part to see its voltage, current and power, and to change its value.</p>
      <dl className="m-0 mt-3">
        <Row label="Parts" value={String(doc.parts.length)} />
        <Row label="Wires" value={String(doc.wires.length)} />
        <Row label="Power from sources" value={sources.length ? wattsText(delivered) : "no source yet"} />
      </dl>
      {flags.length > 0 && (
        <ul className="m-0 mt-3 grid gap-1.5 p-0" role="alert">
          {flags.map((flag) => (
            <li key={`${flag.part}-${flag.kind}`} className="rounded-xl bg-fail/20 px-3 py-2 text-[12.5px] font-semibold text-fail-lt">
              {flag.part}: {FLAG_TEXT[flag.kind]}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
