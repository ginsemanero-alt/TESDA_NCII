import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import * as THREE from "three";

import { MAT_Y, MULTIMETER } from "@/resistor/lib/experience";
import { METER_MATRIX, PROBES, ProbePose } from "@/resistor/lib/bench";
import { measure, meterDisplay } from "@/resistor/lib/meter";
import { createLcdTexture, createMeterFaceTexture, LCD_ASPECT } from "@/resistor/lib/textures";
import { sceneAnim } from "@/resistor/lib/sceneState";
import { useLab } from "@/resistor/store";

/**
 * A pocket digital multimeter in a yellow holster, dial on Ω, probes in COM
 * and VΩ. Its LCD is a live canvas showing exactly what the Measure panel
 * shows. With the probes off the part it reads O.L (open), as a real one does;
 * when the probes touch the leads it takes a reading on its own.
 */
export default function Multimeter() {
  const face = useMemo(() => createMeterFaceTexture(), []);
  const lcd = useMemo(() => createLcdTexture(), []);
  const reading = useLab((s) => s.reading);
  const bands = useLab((s) => s.bands);
  const setReading = useLab((s) => s.setReading);
  const [probesOn, setProbesOn] = useState(sceneAnim.probes > 0.5);
  const latest = useRef(probesOn);

  useFrame(() => {
    const now = sceneAnim.probes > 0.5;
    if (now !== latest.current) {
      latest.current = now;
      setProbesOn(now);
    }
  });

  useEffect(() => {
    if (probesOn && reading === null) setReading(measure(bands));
  }, [probesOn, reading, bands, setReading]);

  useEffect(() => {
    const display = probesOn ? meterDisplay(reading) : { digits: "O.L", unit: "MΩ" };
    lcd.draw(display.digits, display.unit);
  }, [probesOn, reading, lcd]);

  useEffect(
    () => () => {
      face.dispose();
      lcd.texture.dispose();
    },
    [face, lcd],
  );

  const matrix = METER_MATRIX;
  const position = useMemo(() => new THREE.Vector3().setFromMatrixPosition(matrix), [matrix]);
  const quaternion = useMemo(() => new THREE.Quaternion().setFromRotationMatrix(matrix), [matrix]);
  const [w, h, d] = MULTIMETER.size;
  const top = h / 2 + 0.5;
  /** Face coordinates (mm from the face's top-left) to the meter's local space. */
  const at = (fx: number, fy: number, y = top): [number, number, number] => [fx - 36, y, fy - 70];
  const lcdWidth = 52;

  return (
    <group>
      <group position={position} quaternion={quaternion}>
        {/* Holster */}
        <RoundedBox args={[w, h, d]} radius={5} smoothness={3} castShadow receiveShadow>
          <meshStandardMaterial color="#e0a526" roughness={0.78} metalness={0} />
        </RoundedBox>
        {/* Face */}
        <mesh rotation-x={-Math.PI / 2} position-y={top} receiveShadow>
          <planeGeometry args={[72, 140]} />
          <meshStandardMaterial map={face} roughness={0.55} metalness={0} />
        </mesh>
        {/* LCD behind a little glass */}
        <mesh rotation-x={-Math.PI / 2} position={at(36, 23, top + 0.05)}>
          <planeGeometry args={[lcdWidth, lcdWidth / LCD_ASPECT]} />
          <meshStandardMaterial map={lcd.texture} roughness={0.25} metalness={0} emissive="#c5cfb2" emissiveIntensity={0.08} emissiveMap={lcd.texture} />
        </mesh>
        <mesh rotation-x={-Math.PI / 2} position={at(36, 23, top + 0.4)}>
          <planeGeometry args={[58, 28]} />
          <meshPhysicalMaterial transparent opacity={0.12} roughness={0.05} metalness={0} clearcoat={1} color="#ffffff" />
        </mesh>
        {/* Selector knob, pointing at Ω */}
        <group position={at(36, 78, top)}>
          <mesh castShadow>
            <cylinderGeometry args={[13, 14, 5, 40]} />
            <meshStandardMaterial color="#2e3134" roughness={0.6} />
          </mesh>
          <mesh position={[0, 2.6, -6]} castShadow>
            <boxGeometry args={[3.2, 1.6, 15]} />
            <meshStandardMaterial color="#45494d" roughness={0.5} />
          </mesh>
          <mesh position={[0, 3.45, -12]}>
            <boxGeometry args={[1.2, 0.2, 3]} />
            <meshStandardMaterial color="#f2f0e8" roughness={0.5} />
          </mesh>
        </group>
        {/* Jacks: 10A, COM, VΩmA */}
        {[
          { fx: 14, ring: "#1b1c1e" },
          { fx: 36, ring: "#1b1c1e" },
          { fx: 58, ring: "#a8261c" },
        ].map((jack) => (
          <mesh key={jack.fx} position={at(jack.fx, 120, top + 0.6)} castShadow>
            <cylinderGeometry args={[4.2, 4.6, 1.6, 28]} />
            <meshStandardMaterial color={jack.ring} roughness={0.5} />
          </mesh>
        ))}
      </group>

      {probesOn ? (
        <>
          <Probe pose={PROBES.black} color="#1f2224" />
          <Probe pose={PROBES.red} color="#b92b22" />
        </>
      ) : (
        <ParkedProbes />
      )}
    </group>
  );
}

function Probe({ pose, color }: { pose: ProbePose; color: string }) {
  const cable = useMemo(() => new THREE.TubeGeometry(pose.cable, 140, 1.5, 10, false), [pose]);
  useEffect(() => () => cable.dispose(), [cable]);

  const quaternion = useMemo(
    () => new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), pose.direction),
    [pose],
  );
  const tipCentre = pose.tip.clone().addScaledVector(pose.direction, PROBES.tipLength / 2);
  const handleCentre = pose.tip.clone().addScaledVector(pose.direction, PROBES.tipLength + PROBES.handleLength / 2);
  const guard = pose.tip.clone().addScaledVector(pose.direction, PROBES.tipLength + 6);

  return (
    <group>
      <mesh position={tipCentre} quaternion={quaternion} castShadow>
        <cylinderGeometry args={[0.6, 0.2, PROBES.tipLength, 12]} />
        <meshStandardMaterial color="#d4d4cf" metalness={1} roughness={0.25} />
      </mesh>
      <mesh position={guard} quaternion={quaternion} castShadow>
        <cylinderGeometry args={[5.2, 5.2, 2.2, 20]} />
        <meshStandardMaterial color={color} roughness={0.5} />
      </mesh>
      <mesh position={handleCentre} quaternion={quaternion} castShadow>
        <cylinderGeometry args={[3.6, 3.9, PROBES.handleLength, 20]} />
        <meshStandardMaterial color={color} roughness={0.48} />
      </mesh>
      <mesh geometry={cable} castShadow receiveShadow>
        <meshStandardMaterial color={color} roughness={0.55} />
      </mesh>
    </group>
  );
}

/** Probes laid on the mat beside the meter while they are not in use. */
function ParkedProbes() {
  const base = new THREE.Vector3(MULTIMETER.position[0] - 58, MAT_Y + 4, MULTIMETER.position[2] + 40);
  return (
    <group position={base} rotation-y={0.35}>
      {[
        { z: 0, color: "#1f2224" },
        { z: 12, color: "#b92b22" },
      ].map((probe) => (
        <group key={probe.z} position-z={probe.z} rotation-z={Math.PI / 2}>
          <mesh castShadow>
            <cylinderGeometry args={[3.6, 3.9, PROBES.handleLength, 20]} />
            <meshStandardMaterial color={probe.color} roughness={0.48} />
          </mesh>
          <mesh position-y={PROBES.handleLength / 2 + PROBES.tipLength / 2} castShadow>
            <cylinderGeometry args={[0.2, 0.6, PROBES.tipLength, 12]} />
            <meshStandardMaterial color="#d4d4cf" metalness={1} roughness={0.25} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
