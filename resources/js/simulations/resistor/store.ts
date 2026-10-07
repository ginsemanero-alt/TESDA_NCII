import { create } from "zustand";

import { BandColor, BandSet, DEFAULT_BANDS } from "./lib/resistor";
import { ChapterId } from "./lib/experience";
import { StageMode } from "./lib/capabilities";

export type HandStatus = "off" | "loading" | "running" | "denied" | "error" | "unsupported";

/** Realistic shows only what a bench photo would. Explain adds annotations. */
export type ViewMode = "realistic" | "explain";

interface State {
  stage: StageMode;
  setStage: (stage: StageMode) => void;

  view: ViewMode;
  setView: (view: ViewMode) => void;

  /** Desktop-only: full pixel ratio, 4K shadow maps, 2K textures. */
  highQuality: boolean;
  setHighQuality: (on: boolean) => void;

  /** Set once the 3D scene and its assets have loaded. */
  ready: boolean;
  setReady: (ready: boolean) => void;

  activeChapter: ChapterId;
  setActiveChapter: (chapter: ChapterId) => void;

  /** Band the colour-code chapter is explaining, null between steps. */
  focusedBand: number | null;
  setFocusedBand: (index: number | null) => void;

  /** Band under the cursor in the build chapter. */
  hoveredBand: number | null;
  setHoveredBand: (index: number | null) => void;

  bands: BandSet;
  setBand: (index: number, color: BandColor) => void;
  setBands: (bands: BandSet) => void;

  /** Latest multimeter reading in ohms, null before the first measurement. */
  reading: number | null;
  setReading: (ohms: number | null) => void;

  /** True while the stage takes drag input (build chapter). */
  interactive: boolean;
  setInteractive: (interactive: boolean) => void;

  handStatus: HandStatus;
  handMessage: string;
  setHand: (status: HandStatus, message?: string) => void;
}

const HAND_MESSAGES: Record<HandStatus, string> = {
  off: "Turn the part with your hand in front of the webcam instead of the mouse.",
  loading: "Starting the camera and loading the tracking model...",
  running: "Open hand to turn. Pinch to zoom. Two hands apart to zoom out.",
  denied: "Camera access was blocked. Mouse and touch still work.",
  error: "Hand tracking stopped. Mouse and touch still work.",
  unsupported: "This device can't run hand tracking. Use touch or the mouse.",
};

export const useLab = create<State>((set) => ({
  stage: "2d",
  setStage: (stage) => set({ stage }),

  view: "realistic",
  setView: (view) => set({ view }),

  highQuality: false,
  setHighQuality: (highQuality) => set({ highQuality }),

  ready: false,
  setReady: (ready) => set({ ready }),

  activeChapter: "intro",
  setActiveChapter: (activeChapter) => set({ activeChapter }),

  focusedBand: null,
  setFocusedBand: (focusedBand) => set({ focusedBand }),

  hoveredBand: null,
  setHoveredBand: (hoveredBand) => set({ hoveredBand }),

  bands: DEFAULT_BANDS,
  setBand: (index, color) =>
    set((state) => {
      const next = [...state.bands] as [BandColor, BandColor, BandColor, BandColor];
      next[index] = color;
      // A new part has not been measured yet.
      return { bands: next, reading: null };
    }),
  setBands: (bands) => set({ bands, reading: null }),

  reading: null,
  setReading: (reading) => set({ reading }),

  interactive: false,
  setInteractive: (interactive) => set({ interactive }),

  handStatus: "off",
  handMessage: HAND_MESSAGES.off,
  setHand: (handStatus, message) => set({ handStatus, handMessage: message ?? HAND_MESSAGES[handStatus] }),
}));
