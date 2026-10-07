import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Html, useGLTF } from "@react-three/drei";
import * as THREE from "three";

import { assetUrl, LabConfig } from "@/resistor/lib/config";
import { ASSET_PATHS, BAND_LAYOUT, RESISTOR, USE_GLB_MODEL } from "@/resistor/lib/experience";
import { BAND_COLORS, BandSet, METALLIC_BANDS } from "@/resistor/lib/resistor";
import { createResistorParts } from "@/resistor/lib/resistorGeometry";
import { createCeramicTextures, createLeadRoughness } from "@/resistor/lib/textures";
import { damp, lerp, sceneAnim } from "@/resistor/lib/sceneState";
import { useLab } from "@/resistor/store";

type Props = {
  config: LabConfig;
  bands: BandSet;
  detail: "ultra" | "high" | "low";
  explain: boolean;
  pickable: boolean;
};

const BAND_KEYS = ["band0", "band1", "band2", "band3"] as const;
const BAND_NAME = /^band_([0-3])$/;
const LEAD_NAME = /^lead_[01]$/;

interface Parts {
  body: THREE.Mesh;
  leads: THREE.Mesh[];
  bands: THREE.Mesh[];
}

/**
 * The part, laid flat: local +Y (first band) points to world −X, the formed
 * legs point down. Geometry comes from the GLB (or the same generator at
 * runtime); materials are applied here so textures can be drawn at the right
 * size for the device and bands repainted live.
 */
export default function ResistorModel(props: Props) {
  return USE_GLB_MODEL ? <GltfResistor {...props} /> : <ProceduralResistor {...props} />;
}

function GltfResistor(props: Props) {
  const { scene } = useGLTF(assetUrl(props.config, ASSET_PATHS.model), false, true);
  const model = useMemo(() => scene.clone(true), [scene]);

  const parts = useMemo<Parts>(() => {
    let body: THREE.Mesh | null = null;
    const leads: THREE.Mesh[] = [];
    const bands: THREE.Mesh[] = [];
    model.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;
      if (child.name === "body") body = child;
      else if (LEAD_NAME.test(child.name)) leads.push(child);
      else {
        const match = child.name.match(BAND_NAME);
        if (match) bands[Number(match[1])] = child;
      }
    });
    if (!body || bands.length !== 4) throw new Error("resistor.glb is missing body or band_0…band_3");
    return { body, leads, bands };
  }, [model]);

  return <Dressed {...props} object={model} parts={parts} />;
}

function ProceduralResistor(props: Props) {
  const { group, parts } = useMemo(() => {
    const geometry = createResistorParts();
    const group = new THREE.Group();
    const body = new THREE.Mesh(geometry.body);
    body.name = "body";
    const leads = geometry.leads.map((g, i) => Object.assign(new THREE.Mesh(g), { name: `lead_${i}` }));
    const bands = geometry.bands.map((g, i) => Object.assign(new THREE.Mesh(g), { name: `band_${i}` }));
    group.add(body, ...leads, ...bands);
    return { group, parts: { body, leads, bands } };
  }, []);

  return <Dressed {...props} object={group} parts={parts} />;
}

function Dressed({ object, parts, bands, detail, explain, pickable }: Props & { object: THREE.Object3D; parts: Parts }) {
  const setHoveredBand = useLab((s) => s.setHoveredBand);
  const highlights = useRef([0, 0, 0, 0]);

  const materials = useMemo(() => {
    const ceramic = createCeramicTextures(detail === "ultra" ? 2048 : detail === "high" ? 1024 : 512);
    const body = new THREE.MeshPhysicalMaterial({
      map: ceramic.map,
      roughnessMap: ceramic.roughnessMap,
      roughness: 1,
      bumpMap: ceramic.bumpMap,
      bumpScale: 1.2,
      metalness: 0,
      sheen: 0.35,
      sheenRoughness: 0.55,
      sheenColor: new THREE.Color("#fff3dc"),
      clearcoat: 0.1,
      clearcoatRoughness: 0.6,
    });

    const leadRoughness = createLeadRoughness();
    leadRoughness.repeat.set(3, 1);
    // Tinned copper: a dull silver-grey, not chrome. Dimmer reflections keep
    // the white studio from turning the leads white.
    const lead = new THREE.MeshPhysicalMaterial({
      color: "#7e7d78",
      metalness: 1,
      roughness: 0.3,
      roughnessMap: leadRoughness,
      anisotropy: 0.4,
      envMapIntensity: 0.34,
    });

    // Opaque: the band geometry itself thins towards its edges, so the paint
    // reads soft-edged without alpha blending (and without sorting issues).
    const band = [0, 1, 2, 3].map(
      () =>
        new THREE.MeshPhysicalMaterial({
          roughness: 0.42,
          clearcoat: 0.3,
          clearcoatRoughness: 0.35,
          polygonOffset: true,
          polygonOffsetFactor: -1,
        }),
    );

    return { body, lead, band, textures: [ceramic.map, ceramic.roughnessMap, ceramic.bumpMap, leadRoughness] };
  }, [detail]);

  useEffect(() => {
    parts.body.material = materials.body;
    parts.leads.forEach((mesh) => (mesh.material = materials.lead));
    parts.bands.forEach((mesh, index) => (mesh.material = materials.band[index]));
    object.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
  }, [object, parts, materials]);

  useEffect(
    () => () => {
      materials.body.dispose();
      materials.lead.dispose();
      materials.band.forEach((m) => m.dispose());
      materials.textures.forEach((t) => t.dispose());
    },
    [materials],
  );

  // Repaint the bands. Gold and silver are metallic pigment, the rest lacquer.
  useEffect(() => {
    bands.forEach((color, index) => {
      const material = materials.band[index];
      const metallic = METALLIC_BANDS.has(color);
      material.color.set(BAND_COLORS[color].hex);
      material.metalness = metallic ? 0.72 : 0;
      material.roughness = metallic ? 0.34 : 0.44;
      material.emissive.set(BAND_COLORS[color].hex);
      material.emissiveIntensity = 0;
    });
  }, [bands, materials]);

  // Explain mode lifts the band being discussed a touch. Realistic: never.
  useFrame((_, delta) => {
    const hovered = useLab.getState().hoveredBand;
    for (let i = 0; i < 4; i++) {
      const wanted = explain ? Math.max(sceneAnim[BAND_KEYS[i]], hovered === i ? 1 : 0) : 0;
      highlights.current[i] = lerp(highlights.current[i], wanted, damp(delta, 6));
      materials.band[i].emissiveIntensity = highlights.current[i] * 0.22;
    }
  });

  return (
    <group rotation-z={Math.PI / 2}>
      <primitive object={object} />

      {/* Generous invisible pick targets: a 0.6 mm band is hard to hit with a finger. */}
      {pickable &&
        BAND_LAYOUT.map(({ y }, index) => (
          <mesh
            key={index}
            position-y={y}
            onPointerOver={(event) => {
              event.stopPropagation();
              setHoveredBand(index);
            }}
            onPointerOut={() => setHoveredBand(null)}
          >
            <cylinderGeometry args={[RESISTOR.capRadius * 1.35, RESISTOR.capRadius * 1.35, 0.9, 16]} />
            <meshBasicMaterial transparent opacity={0} depthWrite={false} />
          </mesh>
        ))}

      {explain && <BandTags bands={bands} />}
    </group>
  );
}

/** Leader-line tags naming each band, drawn as HTML so they stay crisp and readable. */
function BandTags({ bands }: { bands: BandSet }) {
  const chapter = useLab((s) => s.activeChapter);
  const focused = useLab((s) => s.focusedBand);
  if (!["intro", "colorcode", "build"].includes(chapter)) return null;

  return (
    <>
      {BAND_LAYOUT.map(({ y }, index) => (
        // Neighbouring bands are 1 mm apart: alternate the tag heights so the labels never overlap.
        <Html key={index} position={[RESISTOR.capRadius + 0.15 + (index % 2) * 1.7, y, 0]} zIndexRange={[20, 0]} style={{ pointerEvents: "none" }}>
          <div className="lab-tag relative" style={{ opacity: focused === null || focused === index ? 1 : 0.45 }}>
            {index + 1} · {BAND_COLORS[bands[index]].label}
          </div>
        </Html>
      ))}
    </>
  );
}

