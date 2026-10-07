import { lazy, Suspense, useSyncExternalStore } from "react";

import { Capabilities } from "@/resistor/lib/capabilities";
import { LabConfig } from "@/resistor/lib/config";
import StageBoundary from "@/resistor/ui/StageBoundary";
import { HERO } from "@/resistor/lib/experience";
import { useBeatTracking } from "./useBeatTracking";

// three.js and the scene are their own chunk, shared with the lab.
const Stage3D = lazy(() => import("@/resistor/three/Stage3D"));

function useBeside(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const list = window.matchMedia(HERO.besideQuery);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    () => window.matchMedia(HERO.besideQuery).matches,
    () => false,
  );
}

type Props = {
  config: LabConfig;
  caps: Capabilities;
  /** Called when the 3D stage cannot start; the page drops to the static hero. */
  onFail: () => void;
};

/**
 * The landing page's live hero: the lab's own Realistic bench, full bleed.
 * Public and read-only: no checkpoints, no scores, nothing is saved. On a wide
 * screen the part sits right of the copy; on a narrower one it sits above it.
 */
export default function HeroStage({ config, caps, onFail }: Props) {
  useBeatTracking();
  const beside = useBeside();

  return (
    <StageBoundary onError={onFail}>
      <Suspense fallback={<Booting />}>
        <Stage3D
          config={config}
          caps={caps}
          frameOffset={beside ? HERO.offset.beside : HERO.offset.stacked}
          fit={beside ? HERO.fit.beside : HERO.fit.stacked}
        />
      </Suspense>
    </StageBoundary>
  );
}

function Booting() {
  return (
    <div className="absolute inset-0 grid place-items-center text-center" role="status">
      <p className="text-sm font-semibold text-chalk">Loading the 3D bench…</p>
    </div>
  );
}
