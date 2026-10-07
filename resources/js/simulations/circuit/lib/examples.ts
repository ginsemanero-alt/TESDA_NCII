import { CircuitDoc } from "./types";

/**
 * Starting circuits for Free build. Laid out on the 20-unit grid so wires meet
 * pins squarely; a rotated multimeter has its jacks on a side, so the meter
 * sits on the side its wires leave from (no wire runs across the other jack).
 */

export interface Example {
  id: string;
  title: string;
  about: string;
  doc: CircuitDoc;
}

const w = (id: string, from: string, to: string) => {
  const [fp, fpin] = from.split(".");
  const [tp, tpin] = to.split(".");
  return { id, from: { part: fp, pin: fpin }, to: { part: tp, pin: tpin } };
};

export const EXAMPLES: Example[] = [
  {
    id: "led",
    title: "LED with a resistor",
    about: "A 9 V battery, a switch, a 330 Ω resistor and a red LED in one loop. Try 10 Ω or flip the LED around.",
    doc: {
      parts: [
        { id: "B1", type: "battery", x: -160, y: 0, rot: 90, value: 9 },
        { id: "R1", type: "resistor", x: -60, y: -80, rot: 0, value: 330 },
        { id: "D1", type: "led", x: 60, y: -80, rot: 0, color: "red" },
        { id: "S1", type: "switch", x: 160, y: 0, rot: 90, closed: true },
      ],
      wires: [w("w1", "B1.+", "R1.a"), w("w2", "R1.b", "D1.a"), w("w3", "D1.k", "S1.a"), w("w4", "S1.b", "B1.-")],
    },
  },
  {
    id: "divider",
    title: "Voltage divider",
    about: "Two 10 kΩ resistors share 9 V. The meter reads the voltage across the lower one.",
    doc: {
      parts: [
        { id: "B1", type: "battery", x: 160, y: 0, rot: 90, value: 9 },
        { id: "R1", type: "resistor", x: 0, y: -40, rot: 90, value: 10000 },
        { id: "R2", type: "resistor", x: 0, y: 40, rot: 90, value: 10000 },
        { id: "M1", type: "meter", x: -170, y: 30, rot: 270, mode: "V" },
      ],
      wires: [w("w1", "B1.+", "R1.a"), w("w2", "R1.b", "R2.a"), w("w3", "R2.b", "B1.-"), w("w4", "M1.v", "R2.a"), w("w5", "M1.com", "R2.b")],
    },
  },
  {
    id: "parallel",
    title: "Resistors in parallel",
    about: "Two 1 kΩ resistors side by side. The meter is on ohms: no battery, so it can read.",
    doc: {
      parts: [
        { id: "R1", type: "resistor", x: 0, y: -40, rot: 90, value: 1000 },
        { id: "R2", type: "resistor", x: 80, y: -40, rot: 90, value: 1000 },
        { id: "M1", type: "meter", x: -170, y: -10, rot: 270, mode: "ohm" },
      ],
      wires: [w("w1", "R1.a", "R2.a"), w("w2", "R1.b", "R2.b"), w("w3", "M1.v", "R1.a"), w("w4", "M1.com", "R1.b")],
    },
  },
];
