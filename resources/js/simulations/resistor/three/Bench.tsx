import { useEffect, useMemo } from "react";
import { RoundedBox } from "@react-three/drei";
import * as THREE from "three";

import { BREADBOARD, MAT_Y } from "@/resistor/lib/experience";
import { BLACK_JUMPER, RED_JUMPER } from "@/resistor/lib/bench";
import { createBreadboardTexture, createMatTexture } from "@/resistor/lib/textures";

type Props = { detail: "ultra" | "high" | "low" };

/** Jumper insulation, about 1.5 mm across, like 22 AWG solid-core wire. */
export const WIRE_RADIUS = 0.75;

/**
 * The anti-static mat and a half-size breadboard with its two jumpers. The
 * board's printing and holes are a canvas texture; the body is a rounded box.
 */
export default function Bench({ detail }: Props) {
  const mat = useMemo(() => createMatTexture(), []);
  const top = useMemo(() => createBreadboardTexture(detail === "ultra" ? 32 : detail === "high" ? 24 : 14), [detail]);

  const jumpers = useMemo(
    () => [
      { geometry: new THREE.TubeGeometry(RED_JUMPER, 96, WIRE_RADIUS, 10, false), color: "#c3352a" },
      { geometry: new THREE.TubeGeometry(BLACK_JUMPER, 96, WIRE_RADIUS, 10, false), color: "#1f2224" },
    ],
    [],
  );

  useEffect(
    () => () => {
      mat.map.dispose();
      mat.roughnessMap.dispose();
      top.dispose();
      jumpers.forEach((j) => j.geometry.dispose());
    },
    [mat, top, jumpers],
  );

  return (
    <group>
      {/* Bench mat */}
      <mesh rotation-x={-Math.PI / 2} position-y={MAT_Y} receiveShadow>
        <planeGeometry args={[1400, 1400]} />
        <meshStandardMaterial map={mat.map} roughnessMap={mat.roughnessMap} roughness={1} metalness={0} />
      </mesh>

      {/* Breadboard body */}
      <RoundedBox
        args={[BREADBOARD.width, BREADBOARD.height, BREADBOARD.depth]}
        radius={1.2}
        smoothness={3}
        position={[0, MAT_Y + BREADBOARD.height / 2, 0]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial color={BREADBOARD.color} roughness={0.62} metalness={0} />
      </RoundedBox>

      {/* Printed, holed top face, a hair above the body */}
      <mesh rotation-x={-Math.PI / 2} position-y={0.02} receiveShadow>
        <planeGeometry args={[BREADBOARD.width - 1.2, BREADBOARD.depth - 1.2]} />
        <meshStandardMaterial map={top} roughness={0.6} metalness={0} />
      </mesh>

      {jumpers.map((jumper, index) => (
        <mesh key={index} geometry={jumper.geometry} castShadow receiveShadow>
          <meshStandardMaterial color={jumper.color} roughness={0.45} metalness={0} />
        </mesh>
      ))}
    </group>
  );
}
