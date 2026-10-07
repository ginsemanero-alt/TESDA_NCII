import { Suspense, useEffect, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { useProgress } from "@react-three/drei";
import * as THREE from "three";

import { Capabilities } from "@/resistor/lib/capabilities";
import { LabConfig } from "@/resistor/lib/config";
import { CAMERA_START, INTERACTION } from "@/resistor/lib/experience";
import { usePointerControls } from "@/resistor/hooks/usePointerControls";
import { useLab } from "@/resistor/store";
import Scene from "./Scene";
import { CameraFit } from "./CameraRig";
import { FrameOffset } from "./ViewShift";

type Props = { config: LabConfig; caps: Capabilities; frameOffset?: FrameOffset; fit?: CameraFit };

/**
 * The 3D bench. Everything under three/ lives in a lazy chunk; nothing here is
 * downloaded unless the student is on the 3D stage.
 *
 * Renderer: physically based. sRGB output, ACES Filmic tone mapping at a
 * neutral exposure, soft PCF shadows, device pixel ratio capped (1.5, 1.25 on
 * low-power devices, 2 with High quality on). Rendering pauses whenever the stage is off screen.
 */
export default function Stage3D({ config, caps, frameOffset, fit }: Props) {
  const wrapper = useRef<HTMLDivElement>(null);
  const interactive = useLab((s) => s.interactive);
  const highQuality = useLab((s) => s.highQuality) && caps.highQualityAllowed;
  const [visible, setVisible] = useState(true);

  usePointerControls(wrapper);

  useEffect(() => {
    const element = wrapper.current;
    if (!element || !("IntersectionObserver" in window)) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.01 });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const shadows = !caps.compact && !caps.lowPower;

  return (
    <div
      ref={wrapper}
      className="absolute inset-0"
      style={{ touchAction: interactive ? "none" : "pan-y", cursor: interactive ? "grab" : "default" }}
      aria-label="3D bench: a resistor, a breadboard, a 9 V battery and a digital multimeter"
      role="img"
    >
      <Canvas
        frameloop={visible ? "always" : "never"}
        shadows={shadows ? "soft" : false}
        dpr={[1, highQuality ? 2 : caps.lowPower || caps.compact ? 1.25 : 1.5]}
        gl={{
          antialias: true,
          powerPreference: "high-performance",
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 0.92,
          outputColorSpace: THREE.SRGBColorSpace,
        }}
        camera={{
          fov: caps.compact ? INTERACTION.fov.compact : INTERACTION.fov.desktop,
          near: 0.5,
          far: 2000,
          position: CAMERA_START.pos,
        }}
      >
        <Suspense fallback={null}>
          <Scene config={config} caps={caps} frameOffset={frameOffset} fit={fit} />
        </Suspense>
      </Canvas>
      <LoadProgress />
    </div>
  );
}

/** A visible progress state while the model and HDRI stream in. */
function LoadProgress() {
  const { active, progress } = useProgress();
  const ready = useLab((s) => s.ready);
  if (ready && !active) return null;

  return (
    <div className="pointer-events-none absolute inset-0 grid place-items-center bg-board-2/80" role="status" aria-live="polite">
      <div className="w-56 text-center">
        <p className="text-[13px] font-semibold text-chalk">Setting up the bench… {Math.round(progress)}%</p>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-chalk/15">
          <div className="h-full rounded-full bg-copper-lt transition-[width]" style={{ width: `${progress}%` }} />
        </div>
      </div>
    </div>
  );
}
