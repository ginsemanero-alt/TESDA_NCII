import { useLab } from "@/resistor/store";
import { formatOhms, readBands } from "@/resistor/lib/resistor";
import ResistorDrawing from "@/resistor/ui/ResistorDrawing";
import { meterDisplay } from "@/resistor/lib/meter";

/**
 * The light stage: no WebGL, no downloads, a few kilobytes of SVG. It shows
 * the same part and the same meter reading as the 3D bench and follows the
 * chapter the student is reading.
 */
export default function Bench2D() {
  const bands = useLab((s) => s.bands);
  const focused = useLab((s) => s.focusedBand);
  const hovered = useLab((s) => s.hoveredBand);
  const chapter = useLab((s) => s.activeChapter);
  const reading = useLab((s) => s.reading);
  const value = readBands(bands);
  const display = meterDisplay(reading);
  const showMeter = chapter === "measure" || chapter === "build";

  return (
    <div className="lab-graticule absolute inset-0 flex flex-col items-center justify-center gap-4 p-5">
      <p className="absolute top-4 left-5 font-mono text-[11px] tracking-[0.12em] text-sage uppercase">Light 2D bench</p>

      <ResistorDrawing
        bands={bands}
        focused={focused ?? hovered}
        className="w-full max-w-[560px]"
        title="The resistor on the bench"
      />

      <div className="flex flex-wrap items-center justify-center gap-3">
        <span className="lab-readout rounded-full bg-chalk/10 px-4 py-1.5 text-[15px] text-chalk">
          {formatOhms(value.ohms)} {value.tolerance !== null && `± ${value.tolerance}%`}
        </span>
        {showMeter && (
          <span className="lab-lcd inline-flex items-baseline gap-1.5 rounded-lg px-3 py-1.5 text-[18px]" aria-hidden>
            {display.digits} <small className="text-[12px] font-semibold">{display.unit}</small>
          </span>
        )}
      </div>
    </div>
  );
}
