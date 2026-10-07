import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

import { LabConfig } from "@/resistor/lib/config";
import { RESISTOR_HEIGHT, RESISTOR_ROW_Z } from "@/resistor/lib/experience";
import { lerp, sceneAnim } from "@/resistor/lib/sceneState";
import { useLab } from "@/resistor/store";
import ResistorModel from "./ResistorModel";

type Props = { config: LabConfig; detail: "ultra" | "high" | "low"; explain: boolean };

/**
 * Holds the part above the breadboard and lowers it into row e as the story
 * reaches the measuring chapter. While it is in the air it turns slowly, the
 * way a product shot would; once in the board it is still.
 */
export default function PlacedResistor({ config, detail, explain }: Props) {
  const group = useRef<THREE.Group>(null);
  const bands = useLab((s) => s.bands);
  const interactive = useLab((s) => s.interactive);
  // With reduced motion the part holds still instead of floating and turning.
  const still = useMemo(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches, []);

  useFrame((state) => {
    const node = group.current;
    if (!node) return;
    const time = state.clock.elapsedTime;
    const drift = still ? 0 : sceneAnim.drift * (1 - sceneAnim.insert);
    node.position.y = lerp(RESISTOR_HEIGHT.floating, RESISTOR_HEIGHT.inserted, sceneAnim.insert) + Math.sin(time * 0.7) * 0.25 * drift;
    node.rotation.y = Math.sin(time * 0.22) * 0.32 * drift;
  });

  return (
    <group ref={group} position={[0, RESISTOR_HEIGHT.floating, RESISTOR_ROW_Z]}>
      <ResistorModel config={config} bands={bands} detail={detail} explain={explain} pickable={interactive} />
    </group>
  );
}
