import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import * as THREE from "three";

import { BATTERY } from "@/resistor/lib/experience";
import { BATTERY_CENTER, batteryLeadPath, RAIL_HOLES, SNAP_ATTACHED, SNAP_LOOSE } from "@/resistor/lib/bench";
import { sceneAnim } from "@/resistor/lib/sceneState";
import { WIRE_RADIUS } from "./Bench";

/** Plain side label, no brand: "9V" and the battery type. */
function useLabelTexture(): THREE.CanvasTexture {
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#2a2d31";
    ctx.fillRect(0, 0, 512, 256);
    ctx.fillStyle = "#b8873a";
    ctx.fillRect(0, 196, 512, 26);
    ctx.fillStyle = "#e9e5d8";
    ctx.font = '900 120px "Archivo", Arial, sans-serif';
    ctx.textBaseline = "middle";
    ctx.fillText("9V", 36, 104);
    ctx.font = '600 30px "IBM Plex Mono", monospace';
    ctx.fillText("6LR61 · ALKALINE", 228, 104);
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  }, []);
  useEffect(() => () => texture.dispose(), [texture]);
  return texture;
}

/**
 * A PP3 9 V battery on its side with a snap clip. When the story removes power
 * (to measure resistance safely) the clip comes off and lies beside the
 * battery; its leads stay in the breadboard rails, so the loop is open.
 */
export default function Battery() {
  const label = useLabelTexture();
  const [connected, setConnected] = useState(sceneAnim.power > 0.5);
  const latest = useRef(connected);

  useFrame(() => {
    const now = sceneAnim.power > 0.5;
    if (now !== latest.current) {
      latest.current = now;
      setConnected(now);
    }
  });

  const snap = connected ? SNAP_ATTACHED : SNAP_LOOSE;

  const leads = useMemo(() => {
    const red = new THREE.TubeGeometry(batteryLeadPath(snap, -3, RAIL_HOLES.plus), 120, WIRE_RADIUS * 0.9, 10, false);
    const black = new THREE.TubeGeometry(batteryLeadPath(snap, 3, RAIL_HOLES.minus), 120, WIRE_RADIUS * 0.9, 10, false);
    return { red, black };
  }, [snap]);

  useEffect(
    () => () => {
      leads.red.dispose();
      leads.black.dispose();
    },
    [leads],
  );

  const [w, h, d] = BATTERY.size;

  return (
    <group>
      <group position={BATTERY_CENTER.toArray()}>
        <RoundedBox args={[w, h, d]} radius={1.6} smoothness={3} castShadow receiveShadow>
          <meshStandardMaterial color="#2a2d31" roughness={0.5} metalness={0.15} />
        </RoundedBox>
        {/* Printed label on the upward face */}
        <mesh rotation-x={-Math.PI / 2} position-y={h / 2 + 0.02}>
          <planeGeometry args={[w - 6, d - 4]} />
          <meshStandardMaterial map={label} roughness={0.45} metalness={0.1} />
        </mesh>
        {/* Terminals on the +x end: round stud is +, hexagon is − */}
        <mesh position={[w / 2 + 1.5, 0, -6.35]} rotation-z={Math.PI / 2} castShadow>
          <cylinderGeometry args={[2.9, 2.9, 3, 24]} />
          <meshStandardMaterial color="#c9c9c4" metalness={1} roughness={0.3} />
        </mesh>
        <mesh position={[w / 2 + 1.5, 0, 6.35]} rotation-z={Math.PI / 2} castShadow>
          <cylinderGeometry args={[4, 4, 3, 6]} />
          <meshStandardMaterial color="#c9c9c4" metalness={1} roughness={0.3} />
        </mesh>
      </group>

      {/* Snap clip */}
      <group position={snap.toArray()} rotation-y={connected ? 0 : 0.5}>
        <RoundedBox args={[9, 15, 30]} radius={1.2} smoothness={2} castShadow receiveShadow>
          <meshStandardMaterial color="#1b1c1e" roughness={0.55} />
        </RoundedBox>
      </group>

      <mesh geometry={leads.red} castShadow receiveShadow>
        <meshStandardMaterial color="#c3352a" roughness={0.45} />
      </mesh>
      <mesh geometry={leads.black} castShadow receiveShadow>
        <meshStandardMaterial color="#1f2224" roughness={0.45} />
      </mesh>
    </group>
  );
}

