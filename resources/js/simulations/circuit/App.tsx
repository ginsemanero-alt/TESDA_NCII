import { Component, lazy, ReactNode, Suspense, useEffect, useRef, useState } from "react";
import clsx from "clsx";

import { detectCapabilities } from "@/resistor/lib/capabilities";
import Segmented from "@/resistor/ui/Segmented";
import Challenges from "./Challenges";
import { parseDoc } from "./lib/doc";
import { BenchConfig } from "./lib/config";
import { EXAMPLES } from "./lib/examples";
import { loadSavedDoc, saveDoc, useBench } from "./store";
import Connections from "./ui/Connections";
import Inspector from "./ui/Inspector";
import Palette from "./ui/Palette";
import Workspace from "./ui/Workspace";

type Mode = "free" | "challenges";
type View = "schematic" | "3d";

// The 3D bench (three.js) is only downloaded when a student opens it.
const Bench3D = lazy(() => import("./three/Bench3D"));

/** If the 3D bench cannot start (no WebGL after all, a lost context), say so and go back to the schematic. */
class Bench3DBoundary extends Component<{ onFail: () => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onFail();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

const tool = "min-h-10 rounded-full border border-chalk/18 px-4 text-[13px] font-semibold text-chalk transition-colors hover:border-copper-lt disabled:opacity-35 disabled:hover:border-chalk/18";

export default function App({ config }: { config: BenchConfig }) {
  const [mode, setMode] = useState<Mode>("free");
  const [view, setView] = useState<View>("schematic");
  const [caps] = useState(() => detectCapabilities());
  const past = useBench((s) => s.past.length);
  const future = useBench((s) => s.future.length);
  const parts = useBench((s) => s.doc.parts.length);
  const showValues = useBench((s) => s.showValues);
  const message = useBench((s) => s.message);
  const act = useBench.getState;
  const file = useRef<HTMLInputElement>(null);

  // Free build remembers itself in this browser. Challenge circuits are never saved here.
  useEffect(() => {
    if (mode !== "free") return;
    return useBench.subscribe((state, previous) => {
      if (state.doc !== previous.doc) saveDoc(state.doc);
    });
  }, [mode]);

  const chooseMode = (next: Mode) => {
    if (next === mode) return;
    if (next === "free") act().load(loadSavedDoc());
    setMode(next);
  };

  const exportCircuit = () => {
    const blob = new Blob([JSON.stringify(act().doc, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "my-circuit.json";
    link.click();
    URL.revokeObjectURL(url);
  };

  const importCircuit = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const chosen = event.target.files?.[0];
    event.target.value = "";
    if (!chosen) return;
    try {
      const parsed = parseDoc(JSON.parse(await chosen.text()));
      if ("doc" in parsed) act().load(parsed.doc);
      else act().setMessage(`That file is not a circuit this workbench can open: ${parsed.error}`);
    } catch {
      act().setMessage("That file could not be read as a circuit.");
    }
  };

  const clear = () => {
    if (parts === 0 || window.confirm("Remove every part and wire from the board? You can undo this.")) act().clear();
  };

  return (
    <div className="lab-graticule overflow-clip rounded-[var(--radius-stage)] shadow-[0_24px_48px_-16px_rgba(12,25,20,.45)] md:rounded-[var(--radius-stage-lg)]">
      <header className="px-5 pt-7 pb-4 md:px-12 md:pt-11 md:pb-5">
        <p className="font-mono text-[11px] tracking-[0.14em] text-copper-lt uppercase">ELC724202 · ELC724205 · ELC311201 · Simulation</p>
        <h2 className="mt-2 text-[clamp(2.2rem,6.5vw,5rem)] leading-[0.86] font-black tracking-[-0.035em] text-chalk uppercase">Circuit workbench</h2>
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-sage">
          An open bench. Pick a part and tap the board, or drag it. Draw a wire from one pin to another. The circuit runs as you build it: tap a part to read its voltage and current, or add the multimeter and measure.
        </p>
        <div className="mt-5" data-ui>
          <Segmented
            label="Workbench mode"
            value={mode}
            onChange={(v) => chooseMode(v as Mode)}
            options={[
              { value: "free", label: "Free build" },
              { value: "challenges", label: "Challenges", disabled: config.challenges.length === 0 },
            ]}
          />
        </div>
      </header>

      <div className="grid gap-4 px-4 pb-6 md:px-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="grid min-w-0 gap-3">
          <div className="flex flex-wrap items-center gap-3" data-ui>
            <Segmented
              label="Bench view"
              value={view}
              onChange={(v) => setView(v as View)}
              options={[
                { value: "schematic", label: "Schematic" },
                { value: "3d", label: "3D bench", disabled: !caps.webgl, hint: caps.webgl ? undefined : "This device cannot show 3D" },
              ]}
            />
            {!caps.webgl && <span className="text-[12.5px] text-sage">3D needs WebGL, which this browser does not have.</span>}
          </div>

          {view === "schematic" && <Palette />}

          <div className="flex flex-wrap items-center gap-2" data-ui role="toolbar" aria-label="Board tools">
            <button type="button" className={tool} onClick={() => act().undo()} disabled={past === 0}>
              Undo
            </button>
            <button type="button" className={tool} onClick={() => act().redo()} disabled={future === 0}>
              Redo
            </button>
            <button type="button" className={clsx(tool, showValues && "border-copper-lt bg-copper/20")} aria-pressed={showValues} onClick={() => act().setShowValues(!showValues)}>
              Show readings
            </button>
            {mode === "free" && (
              <>
                <label className="sr-only" htmlFor="circuit-example">
                  Load an example
                </label>
                <select
                  id="circuit-example"
                  value=""
                  onChange={(e) => {
                    const example = EXAMPLES.find((x) => x.id === e.target.value);
                    if (example) act().load(example.doc);
                  }}
                  className={clsx(tool, "bg-board")}
                >
                  <option value="">Load an example…</option>
                  {EXAMPLES.map((example) => (
                    <option key={example.id} value={example.id}>
                      {example.title}
                    </option>
                  ))}
                </select>
                <button type="button" className={tool} onClick={exportCircuit} disabled={parts === 0}>
                  Save file
                </button>
                <button type="button" className={tool} onClick={() => file.current?.click()}>
                  Open file
                </button>
                <input ref={file} type="file" accept="application/json,.json" className="hidden" onChange={importCircuit} />
                <button type="button" className={tool} onClick={clear} disabled={parts === 0}>
                  Clear
                </button>
              </>
            )}
          </div>

          {view === "schematic" ? (
            <Workspace />
          ) : (
            <div
              className="relative h-[400px] w-full overflow-hidden rounded-[1.75rem] border border-chalk/12 bg-board-2 md:h-[min(68vh,620px)] md:min-h-[340px]"
              role="group"
              aria-label="3D bench: the same circuit as the schematic, laid out on a board. Use the schematic to change it."
              data-bench3d
            >
              <Bench3DBoundary
                onFail={() => {
                  setView("schematic");
                  act().setMessage("The 3D bench could not start on this device, so the schematic is shown instead.");
                }}
              >
                <Suspense fallback={<p className="absolute inset-0 grid place-items-center text-[14px] text-sage">Loading the 3D bench…</p>}>
                  <Bench3D caps={caps} />
                </Suspense>
              </Bench3DBoundary>
              <p className="pointer-events-none absolute bottom-3 left-3 max-w-[70%] rounded-full bg-board/85 px-3 py-1 text-[12px] text-sage">
                Drag to turn, scroll to zoom, right-drag to move. Tap a part to inspect it. Edit in the schematic.
              </p>
            </div>
          )}

          {message && (
            <p role="status" className="m-0 rounded-2xl bg-caution/20 px-4 py-2.5 text-[13px] text-caution-lt">
              {message}
            </p>
          )}
        </div>

        <div className="grid min-w-0 content-start gap-3">
          <Inspector />
          <Connections />
        </div>
      </div>

      {mode === "free" && (
        <div className="border-t border-chalk/10 px-5 py-6 md:px-12">
          <p className="m-0 max-w-3xl text-[13.5px] leading-relaxed text-sage">
            Free build is yours to experiment in: nothing here is graded or sent to your instructor, and it is saved in this browser only. When you are ready, switch to <strong className="text-chalk">Challenges</strong> for the recorded tasks.
          </p>
        </div>
      )}

      {mode === "challenges" && (
        <div className="border-t border-chalk/10 bg-board px-5 py-8 md:px-12 md:py-10">
          <Challenges config={config} />
        </div>
      )}
    </div>
  );
}
