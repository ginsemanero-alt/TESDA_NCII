import Chapter from "@/resistor/ui/Chapter";

const FACTS = [
  { term: "Body", value: "6.3 mm × Ø2.4 mm" },
  { term: "Leads", value: "0.55 mm tinned copper" },
  { term: "Rating", value: "0.25 W" },
  { term: "Polarity", value: "None" },
];

/** TR ELC724205 required knowledge 2.4.4: describe resistance and identify resistors. */
export default function Intro() {
  return (
    <Chapter id="intro" number={1} title="The part" tr="ELC724205 · 2.4.4">
      <p>
        A resistor limits how much current flows in a circuit. Its resistance is measured in ohms (Ω). This is the one
        you will handle most: a 1/4 W carbon-film resistor, a tan ceramic body with a lead at each end, already formed
        to fit the holes of a breadboard.
      </p>
      <dl className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-2xl bg-chalk/10">
        {FACTS.map((fact) => (
          <div key={fact.term} className="bg-board px-4 py-3">
            <dt className="text-[12px] text-sage">{fact.term}</dt>
            <dd className="lab-readout m-0 mt-1 text-[15px] text-chalk">{fact.value}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-5 text-[13.5px]">
        Its value is not printed as numbers. It is painted on the body as four coloured bands. Scroll on to read them.
      </p>
    </Chapter>
  );
}
