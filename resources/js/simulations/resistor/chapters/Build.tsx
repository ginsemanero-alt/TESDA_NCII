import { lazy, Suspense } from "react";

import Chapter from "@/resistor/ui/Chapter";
import BandPicker from "@/resistor/ui/BandPicker";
import MeterPanel from "@/resistor/ui/MeterPanel";
import { useLab } from "@/resistor/store";
import { BAND_ROLES } from "@/resistor/lib/resistor";
import { Capabilities } from "@/resistor/lib/capabilities";
import { LabConfig } from "@/resistor/lib/config";
import { resetOrbit } from "@/resistor/lib/sceneState";
import { zoomBy } from "@/resistor/hooks/usePointerControls";

// MediaPipe is only ever imported once the student opts in to hand control.
const HandGestureController = lazy(() => import("@/resistor/ui/HandGestureController"));

type Props = { caps: Capabilities; config: LabConfig };

/** Free practice: repaint the part, measure it, turn it over. Same TR units as chapters 2–3. */
export default function Build({ caps, config }: Props) {
  const bands = useLab((s) => s.bands);
  const setBand = useLab((s) => s.setBand);
  const hoveredBand = useLab((s) => s.hoveredBand);
  const stage = useLab((s) => s.stage);

  return (
    <Chapter id="build" number={6} title="Build your own" tr="ELC724205 · 2.4.4 · 2.4.7">
      <p>
        Repaint any band and the value follows. Then measure the new part. {stage === "3d" && "Drag the stage to turn it."}
      </p>

      <div className="mt-6 rounded-[1.75rem] border border-chalk/12 bg-board/70 p-5" data-ui>
        <BandPicker bands={bands} onChange={setBand} highlight={hoveredBand} idPrefix="build" />
      </div>

      <MeterPanel className="mt-4" />

      {stage === "3d" && (
        <div className="mt-4 flex flex-wrap items-center gap-2" data-ui>
          <button type="button" onClick={() => zoomBy(0.18)} className="min-h-10 rounded-xl border border-chalk/15 px-3 text-[13px] font-semibold text-chalk hover:border-copper-lt">
            Zoom in
          </button>
          <button type="button" onClick={() => zoomBy(-0.18)} className="min-h-10 rounded-xl border border-chalk/15 px-3 text-[13px] font-semibold text-chalk hover:border-copper-lt">
            Zoom out
          </button>
          <button type="button" onClick={resetOrbit} className="min-h-10 rounded-xl border border-chalk/15 px-3 text-[13px] font-semibold text-chalk hover:border-copper-lt">
            Reset view
          </button>
        </div>
      )}

      <p className="mt-4 text-[13px]">
        {hoveredBand === null
          ? "Point at a band on the part to see what it does."
          : `${BAND_ROLES[hoveredBand].title}: ${BAND_ROLES[hoveredBand].detail}`}
      </p>

      {stage === "3d" && caps.handTracking && (
        <div className="mt-6">
          <Suspense fallback={null}>
            <HandGestureController config={config} />
          </Suspense>
        </div>
      )}
    </Chapter>
  );
}
