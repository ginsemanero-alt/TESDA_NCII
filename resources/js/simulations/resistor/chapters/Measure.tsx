import Chapter from "@/resistor/ui/Chapter";
import MeterPanel from "@/resistor/ui/MeterPanel";

/**
 * TR ELC724205 2.4.6 "Measuring resistance using VOM", 2.4.7 "Testing
 * resistors", and learning outcomes 7.3–7.4: test the component, then judge
 * the result against the criteria (the tolerance band).
 */
export default function Measure() {
  return (
    <Chapter id="measure" number={3} title="Measure it" tr="ELC724205 · 2.4.6 · 2.4.7">
      <p>
        The part is now in the breadboard and the battery is <strong className="text-chalk">disconnected</strong>.
        Never measure resistance with power on: the meter would read the circuit, not the part, and can be damaged.
      </p>
      <ol className="mt-4 grid list-decimal gap-1.5 pl-5 text-[14px]">
        <li>Set the dial to Ω. Black probe in COM, red probe in VΩ.</li>
        <li>Touch one probe to each lead. Keep your fingers off both leads at once.</li>
        <li>Compare the reading with the tolerance range. Inside it, the part passes.</li>
      </ol>
      <MeterPanel className="mt-6" />
      <p className="mt-4 text-[13px]">
        Real parts never read exactly their printed value. Measure a few times: every reading differs a little, and all
        of them should land inside the range.
      </p>
    </Chapter>
  );
}
