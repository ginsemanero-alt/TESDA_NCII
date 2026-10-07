import { createRoot } from "react-dom/client";

import { Capabilities } from "@/resistor/lib/capabilities";
import { LabConfig } from "@/resistor/lib/config";
import { DEFAULT_BANDS } from "@/resistor/lib/resistor";
import { useLab } from "@/resistor/store";
import HeroStage from "./HeroStage";

/**
 * Mounts the live hero into the stage element and returns a function that
 * removes it again. This module (React, the store, the stage) is only fetched
 * when landing.ts decides the device should get the 3D hero.
 */
export function mountHero(element: HTMLElement, config: LabConfig, caps: Capabilities, onFail: () => void): () => void {
  useLab.setState({
    view: "realistic",
    highQuality: false,
    activeChapter: "intro",
    focusedBand: null,
    interactive: false,
    bands: DEFAULT_BANDS,
    reading: null,
    ready: false,
  });

  const root = createRoot(element);
  root.render(<HeroStage config={config} caps={caps} onFail={onFail} />);

  return () => root.unmount();
}
