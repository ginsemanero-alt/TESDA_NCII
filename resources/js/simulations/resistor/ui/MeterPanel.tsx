import clsx from "clsx";

import { meterDisplay, measure, withinTolerance } from "@/resistor/lib/meter";
import { formatOhms, readBands } from "@/resistor/lib/resistor";
import { useLab } from "@/resistor/store";

type Props = { className?: string };

/**
 * The multimeter readout and the Measure action, as an HTML panel. It drives
 * the same reading the 3D meter shows on its LCD, so both stages agree.
 */
export default function MeterPanel({ className }: Props) {
  const bands = useLab((s) => s.bands);
  const reading = useLab((s) => s.reading);
  const setReading = useLab((s) => s.setReading);
  const value = readBands(bands);
  const display = meterDisplay(reading);
  const ok = reading !== null && withinTolerance(bands, reading);

  return (
    <div className={clsx("rounded-[1.75rem] border border-chalk/12 bg-board/70 p-4", className)} data-ui>
      <div className="flex items-stretch gap-3">
        <div className="lab-lcd flex min-w-0 flex-1 items-baseline justify-end gap-2 rounded-xl px-4 py-3" aria-live="polite" aria-atomic="true">
          <span className="sr-only">Multimeter reads</span>
          <span className="text-[clamp(1.8rem,4.6vw,2.6rem)] leading-none font-medium">{display.digits}</span>
          <span className="text-[15px] font-semibold">{display.unit}</span>
        </div>
        <button
          type="button"
          onClick={() => setReading(measure(bands))}
          className="min-h-12 flex-none rounded-2xl bg-copper px-5 text-[14px] font-bold text-card hover:bg-copper-dk"
        >
          {reading === null ? "Measure" : "Measure again"}
        </button>
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-[12.5px]">
        <dt className="text-sage">Printed value</dt>
        <dd className="lab-readout m-0 text-right text-chalk">
          {formatOhms(value.ohms)} {value.tolerance !== null && `± ${value.tolerance}%`}
        </dd>
        <dt className="text-sage">Good if it reads</dt>
        <dd className="lab-readout m-0 text-right text-chalk">
          {formatOhms(value.min)} – {formatOhms(value.max)}
        </dd>
      </dl>

      {reading !== null && (
        <p
          className={clsx(
            "mt-3 inline-flex items-center gap-2 rounded-full px-3 py-1 text-[12.5px] font-bold",
            ok ? "bg-pass/25 text-pass-lt" : "bg-fail/25 text-fail-lt",
          )}
        >
          <span aria-hidden className="size-2 rounded-full bg-current" />
          {ok ? "Within tolerance: the part is good" : "Outside tolerance: record it as faulty"}
        </p>
      )}
    </div>
  );
}
