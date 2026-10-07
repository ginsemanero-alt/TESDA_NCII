import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import clsx from "clsx";

import { Capabilities, detectCapabilities, initialMode, rememberMode, StageMode } from "./lib/capabilities";
import { LabConfig } from "./lib/config";
import { useLab } from "./store";
import { useChapterTracking } from "./hooks/useChapterTracking";
import Segmented from "./ui/Segmented";
import StageBoundary from "./ui/StageBoundary";
import ChapterNav from "./ui/ChapterNav";
import Bench2D from "./bench2d/Bench2D";
import Intro from "./chapters/Intro";
import ColorCode from "./chapters/ColorCode";
import Measure from "./chapters/Measure";
import CurrentFlow from "./chapters/CurrentFlow";
import OhmsLaw from "./chapters/OhmsLaw";
import Build from "./chapters/Build";
import Checkpoints from "./Checkpoints";

// three.js, R3F and the scene only download when this renders.
const Stage3D = lazy(() => import("./three/Stage3D"));

type Props = { config: LabConfig };

export default function App({ config }: Props) {
  const caps = useMemo<Capabilities>(() => detectCapabilities(), []);
  const stage = useLab((s) => s.stage);
  const setStage = useLab((s) => s.setStage);
  const view = useLab((s) => s.view);
  const setView = useLab((s) => s.setView);
  const highQuality = useLab((s) => s.highQuality);
  const setHighQuality = useLab((s) => s.setHighQuality);
  const [stageError, setStageError] = useState<string | null>(null);

  useEffect(() => {
    setStage(initialMode(caps));
  }, [caps, setStage]);

  useChapterTracking();

  const chooseStage = (mode: StageMode) => {
    setStage(mode);
    rememberMode(mode);
    if (mode === "3d") setStageError(null);
  };

  const units = "ELC724205 · ELC311201";

  return (
    <div className="lab-graticule overflow-clip rounded-[var(--radius-stage)] shadow-[0_24px_48px_-16px_rgba(12,25,20,.45)] md:rounded-[var(--radius-stage-lg)]">
      {/* Hero */}
      <header className="relative px-5 pt-7 pb-5 md:px-12 md:pt-11 md:pb-7">
        <p className="font-mono text-[11px] tracking-[0.14em] text-copper-lt uppercase">{units} · Simulation</p>
        <h2 className="mt-2 text-[clamp(2.4rem,7vw,5.4rem)] leading-[0.86] font-black tracking-[-0.035em] text-chalk uppercase">
          Resistor lab
        </h2>
        <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-sage">
          A real 1/4 W carbon-film resistor on a bench. Read its bands, test it with the multimeter, and work
          out the current. Scroll the chapters; the checkpoints at the end are recorded.
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-3" data-ui>
          <Segmented
            label="Stage"
            value={stage}
            onChange={(v) => chooseStage(v as StageMode)}
            options={[
              { value: "3d", label: "3D bench", disabled: !caps.webgl, hint: caps.webgl ? undefined : "WebGL is not available on this browser" },
              { value: "2d", label: "Light 2D" },
            ]}
          />
          {stage === "3d" && (
            <Segmented
              label="View"
              value={view}
              onChange={(v) => setView(v as "realistic" | "explain")}
              options={[
                { value: "realistic", label: "Realistic" },
                { value: "explain", label: "Explain" },
              ]}
            />
          )}
          {stage === "3d" && caps.highQualityAllowed && (
            <label className="flex min-h-10 cursor-pointer items-center gap-2 rounded-full border border-chalk/15 px-4 text-[13px] font-semibold text-chalk/85">
              <input
                type="checkbox"
                className="size-4 accent-copper"
                checked={highQuality}
                onChange={(e) => setHighQuality(e.target.checked)}
              />
              High quality
            </label>
          )}
        </div>

        {caps.lowPower && stage === "2d" && caps.webgl && (
          <p className="mt-3 text-[12.5px] text-sage">
            Started in the light 2D bench because this device looks low on memory or data. Switch to 3D any time.
          </p>
        )}
        {stageError && (
          <p role="alert" className="mt-3 rounded-xl bg-caution/20 px-4 py-3 text-[13px] text-caution-lt">
            {stageError}
          </p>
        )}
      </header>

      <ChapterNav />

      <div className="grid gap-0 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] md:gap-8 md:px-8 md:pb-8">
        {/* Stage: sticky beside the chapters on desktop, above them on phones. */}
        <div className="sticky top-[var(--header-h,58px)] z-10 self-start md:top-[calc(var(--header-h,58px)+16px)]">
          <div
            className={clsx(
              "relative h-[42vh] min-h-[260px] w-full overflow-hidden bg-board-2 md:h-[min(74vh,640px)] md:rounded-[2rem]",
              "border-y border-chalk/10 md:border",
            )}
          >
            {stage === "3d" ? (
              <StageBoundary
                onError={(message) => {
                  setStageError(message);
                  chooseStage("2d");
                }}
              >
                <Suspense fallback={<StageLoading />}>
                  <Stage3D config={config} caps={caps} />
                </Suspense>
              </StageBoundary>
            ) : (
              <Bench2D />
            )}
          </div>
        </div>

        <div id="lab-chapters" className="relative px-5 pb-4 md:px-0">
          <Intro />
          <ColorCode />
          <Measure />
          <CurrentFlow />
          <OhmsLaw />
          <Build caps={caps} config={config} />
        </div>
      </div>

      <Checkpoints config={config} />
    </div>
  );
}

function StageLoading() {
  return (
    <div className="absolute inset-0 grid place-items-center text-center" role="status">
      <div>
        <p className="text-sm font-semibold text-chalk">Loading the 3D bench…</p>
        <p className="mt-1 text-xs text-sage">About 1.5 MB, once. The chapters work while it loads.</p>
      </div>
    </div>
  );
}
