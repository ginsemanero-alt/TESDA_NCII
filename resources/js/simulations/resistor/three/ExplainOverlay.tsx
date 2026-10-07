import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";

import { BATTERY_CENTER, currentLoop, JACKS, meterFacePoint } from "@/resistor/lib/bench";
import { BREADBOARD, holeX, ROW_Z } from "@/resistor/lib/experience";
import { sceneAnim, sceneInput } from "@/resistor/lib/sceneState";
import { useLab } from "@/resistor/store";

// Sparse on purpose: a few chevrons say "this way", a stream would say "particles".
const ARROWS = 14;

/**
 * Explain mode only. Annotations over the real bench: small chevrons riding
 * just above the conductors in the direction of conventional current (their
 * speed follows the Ohm's-law sliders), and thin tags naming each prop. No
 * particles inside the part, no glow.
 */
export default function ExplainOverlay() {
  const chapter = useLab((s) => s.activeChapter);
  const showProps = chapter === "measure" || chapter === "circuit" || chapter === "ohmslaw";

  return (
    <>
      <FlowArrows />
      {showProps && <PropTags chapter={chapter} />}
    </>
  );
}

function FlowArrows() {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const loop = useMemo(() => currentLoop(), []);
  const geometry = useMemo(() => {
    // Unit size; each arrow is scaled by its distance to the camera so it
    // reads the same at the bench view and up close, like an annotation.
    const cone = new THREE.ConeGeometry(0.36, 1, 3);
    cone.rotateX(Math.PI / 2); // point along +z, then aimed along the path
    return cone;
  }, []);
  const offset = useRef(0);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const point = useMemo(() => new THREE.Vector3(), []);
  const ahead = useMemo(() => new THREE.Vector3(), []);

  useEffect(() => () => geometry.dispose(), [geometry]);

  useFrame(({ camera }, delta) => {
    const instances = mesh.current;
    if (!instances) return;
    const on = sceneAnim.power > 0.5;
    instances.visible = on;
    if (!on) return;

    offset.current = (offset.current + delta * 0.018 * sceneInput.currentScale) % 1;
    for (let i = 0; i < ARROWS; i++) {
      const t = (i / ARROWS + offset.current) % 1;
      loop.getPointAt(t, point);
      loop.getPointAt(Math.min(t + 0.002, 1), ahead);
      dummy.position.copy(point);
      dummy.lookAt(ahead);
      dummy.scale.setScalar(Math.min(Math.max(camera.position.distanceTo(point) * 0.02, 0.6), 11));
      dummy.updateMatrix();
      instances.setMatrixAt(i, dummy.matrix);
    }
    instances.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={mesh} args={[geometry, undefined, ARROWS]} frustumCulled={false}>
      <meshBasicMaterial color="#E0AE7E" toneMapped={false} />
    </instancedMesh>
  );
}

function Tag({ position, children }: { position: [number, number, number]; children: string }) {
  return (
    <Html position={position} zIndexRange={[20, 0]} style={{ pointerEvents: "none" }}>
      <div className="lab-tag relative">{children}</div>
    </Html>
  );
}

function PropTags({ chapter }: { chapter: string }) {
  const lcd = meterFacePoint(36, 23, 6);
  return (
    <>
      <Tag position={[BATTERY_CENTER.x, BATTERY_CENTER.y + 12, BATTERY_CENTER.z]}>
        {chapter === "measure" ? "9 V battery: disconnected" : "9 V battery"}
      </Tag>
      <Tag position={[-BREADBOARD.width / 2 + 10, 3, ROW_Z.topPlus]}>+ rail</Tag>
      <Tag position={[holeX(15), 6, ROW_Z.e]}>R1 · row e, cols 13–17</Tag>
      <Tag position={[lcd.x, lcd.y, lcd.z]}>Meter on Ω</Tag>
      {chapter === "measure" && <Tag position={[JACKS.com.x, JACKS.com.y + 6, JACKS.com.z]}>COM ← black probe</Tag>}
    </>
  );
}
