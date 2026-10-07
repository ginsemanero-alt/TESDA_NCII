import { useEffect } from "react";

import { Capabilities } from "@/resistor/lib/capabilities";
import { LabConfig } from "@/resistor/lib/config";
import { useLab } from "@/resistor/store";
import CameraRig from "./CameraRig";
import Lighting from "./Lighting";
import Bench from "./Bench";
import PlacedResistor from "./PlacedResistor";
import Battery from "./Battery";
import Multimeter from "./Multimeter";
import ExplainOverlay from "./ExplainOverlay";
import DebugHook from "./DebugHook";
import { CameraFit } from "./CameraRig";
import ViewShift, { FrameOffset } from "./ViewShift";

type Props = { config: LabConfig; caps: Capabilities; frameOffset?: FrameOffset; fit?: CameraFit };

/**
 * The bench, at real scale (1 unit = 1 mm). Realistic mode draws only what a
 * macro photo of a school electronics bench would show. Explain mode adds
 * annotations on top: thin tags, a leader to each band, and flow arrows along
 * the conductors, never glow inside the part.
 */
export default function Scene({ config, caps, frameOffset, fit }: Props) {
  const view = useLab((s) => s.view);
  const highQuality = useLab((s) => s.highQuality) && caps.highQualityAllowed;
  const setReady = useLab((s) => s.setReady);

  // This component only renders once every suspended asset has loaded.
  useEffect(() => {
    setReady(true);
    return () => setReady(false);
  }, [setReady]);

  // High quality (desktop only) sharpens textures and shadows; it adds no
  // post-processing pass, so it cannot change what the lesson shows.
  const detail = highQuality ? "ultra" : caps.lowPower || caps.compact ? "low" : "high";

  return (
    <>
      <color attach="background" args={["#17392E"]} />
      {/* The mat fades into the background before its far edge, so there is no hard horizon line. */}
      <fog attach="fog" args={["#17392E", 420, 760]} />

      {location.search.includes("debug3d") && <DebugHook />}
      {frameOffset && <ViewShift offset={frameOffset} />}
      <CameraRig compact={caps.compact} reducedMotion={caps.reducedMotion} fit={fit} />
      <Lighting config={config} shadows={!caps.compact && !caps.lowPower} highQuality={highQuality} />

      <Bench detail={detail} />
      <PlacedResistor config={config} detail={detail} explain={view === "explain"} />
      <Battery />
      <Multimeter />

      {view === "explain" && <ExplainOverlay />}

    </>
  );
}
