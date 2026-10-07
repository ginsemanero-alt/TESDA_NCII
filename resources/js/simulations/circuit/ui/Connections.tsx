import { useState } from "react";

import { PARTS } from "../lib/parts";
import { PartType } from "../lib/types";
import { useBench } from "../store";

const TYPES = Object.keys(PARTS) as PartType[];

const field = "min-h-11 w-full rounded-xl border border-chalk/20 bg-board px-3 text-[14px] text-chalk";
const action = "min-h-11 rounded-xl border border-chalk/20 px-4 text-[13px] font-semibold text-chalk hover:border-copper-lt disabled:opacity-40";

/**
 * The circuit as text: every part, every wire, and forms to add parts and wires
 * without the canvas. It is the way to build with the keyboard or a screen
 * reader, and a plain way to check exactly what is connected to what.
 */
export default function Connections() {
  const doc = useBench((s) => s.doc);
  const act = useBench.getState;
  const [type, setType] = useState<PartType>("resistor");
  const pins = doc.parts.flatMap((part) => PARTS[part.type].pins.map((pin) => `${part.id}.${pin}`));
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const addPart = () => {
    const n = doc.parts.length;
    act().addPart(type, -160 + (n % 4) * 120, -120 + Math.floor(n / 4) * 100);
  };

  const connect = () => {
    const [fp, fpin] = from.split(".");
    const [tp, tpin] = to.split(".");
    if (fp && tp) act().connect({ part: fp, pin: fpin }, { part: tp, pin: tpin });
  };

  return (
    <details className="rounded-[1.75rem] border border-chalk/12 bg-board/50 px-4 py-3">
      <summary className="cursor-pointer text-[13.5px] font-semibold text-chalk">Parts and connections as text (keyboard and screen reader)</summary>

      <div className="mt-4 grid gap-5">
        <div className="grid gap-2">
          <label htmlFor="conn-type" className="text-[13px] text-sage">
            Add a part
          </label>
          <div className="flex gap-2">
            <select id="conn-type" value={type} onChange={(e) => setType(e.target.value as PartType)} className={field}>
              {TYPES.map((t) => (
                <option key={t} value={t}>
                  {PARTS[t].label}
                </option>
              ))}
            </select>
            <button type="button" className={action} onClick={addPart}>
              Add
            </button>
          </div>
        </div>

        <div>
          <h5 className="m-0 text-[13px] font-semibold text-sage">Parts ({doc.parts.length})</h5>
          <ul className="m-0 mt-2 grid gap-1.5 p-0">
            {doc.parts.map((part) => (
              <li key={part.id} className="flex items-center justify-between gap-2 text-[13px] text-chalk">
                <span>
                  {part.id}: {PARTS[part.type].label}
                  {part.type === "resistor" && `, ${part.value} Ω`}
                  {part.type === "supply" && `, ${part.value} V`}
                  {part.type === "switch" && (part.closed ? ", closed" : ", open")}
                  {part.type === "led" && `, ${part.color}`}
                  {part.type === "meter" && `, ${part.mode}`}
                </span>
                <button type="button" className={action} onClick={() => act().select({ kind: "part", id: part.id })}>
                  Select
                </button>
              </li>
            ))}
            {doc.parts.length === 0 && <li className="text-[13px] text-sage">No parts yet.</li>}
          </ul>
        </div>

        <div>
          <h5 className="m-0 text-[13px] font-semibold text-sage">Wires ({doc.wires.length})</h5>
          <ul className="m-0 mt-2 grid gap-1.5 p-0">
            {doc.wires.map((wire) => (
              <li key={wire.id} className="flex items-center justify-between gap-2 text-[13px] text-chalk">
                <span className="lab-readout">
                  {wire.from.part}.{wire.from.pin} ↔ {wire.to.part}.{wire.to.pin}
                </span>
                <button type="button" className={action} onClick={() => act().deleteWire(wire.id)} aria-label={`Remove the wire from ${wire.from.part} pin ${wire.from.pin} to ${wire.to.part} pin ${wire.to.pin}`}>
                  Remove
                </button>
              </li>
            ))}
            {doc.wires.length === 0 && <li className="text-[13px] text-sage">No wires yet.</li>}
          </ul>
        </div>

        <div className="grid gap-2">
          <p className="m-0 text-[13px] text-sage">Connect two pins</p>
          <div className="flex flex-wrap gap-2">
            <select aria-label="From pin" value={from} onChange={(e) => setFrom(e.target.value)} className={`${field} flex-1`}>
              <option value="">From pin…</option>
              {pins.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
            <select aria-label="To pin" value={to} onChange={(e) => setTo(e.target.value)} className={`${field} flex-1`}>
              <option value="">To pin…</option>
              {pins.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
            <button type="button" className={action} onClick={connect} disabled={!from || !to || from === to}>
              Connect
            </button>
          </div>
        </div>
      </div>
    </details>
  );
}
