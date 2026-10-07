import { Suspense, useEffect, useMemo, useRef } from "react";
import { Canvas, ThreeEvent, useThree } from "@react-three/fiber";
import { Environment, Lightformer, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";

import { Capabilities } from "@/resistor/lib/capabilities";
import { CircuitDoc, FlagKind, PartType, Wire } from "../lib/types";
import { useBench } from "../store";
import {
    Battery3D,
    Junction3D,
    Led3D,
    Lead,
    Meter3D,
    PartProps,
    Post,
    Resistor3D,
    Supply3D,
    Switch3D,
} from "./Parts3D";
import { boardBox, BoardBox, postTop, Vec3 } from "./layout";

const PINS: Record<PartType, string[]> = {
    battery: ["+", "-"],
    supply: ["+", "-"],
    resistor: ["a", "b"],
    led: ["a", "k"],
    switch: ["a", "b"],
    junction: ["j"],
    meter: ["com", "v"],
};

const PART_COMPONENT: Record<
    PartType,
    (props: PartProps) => React.ReactElement
> = {
    battery: Battery3D,
    supply: Supply3D,
    resistor: Resistor3D,
    led: Led3D,
    switch: Switch3D,
    junction: Junction3D,
    meter: Meter3D,
};

/** Dots on the board at the schematic's grid, so the parts sit on something that reads as a drawing board. */
function boardTexture(box: BoardBox): THREE.CanvasTexture {
    const px = 6;
    const canvas = document.createElement("canvas");
    canvas.width = Math.min(2048, Math.round(box.width * px));
    canvas.height = Math.min(2048, Math.round(box.depth * px));
    const ctx = canvas.getContext("2d");
    if (ctx) {
        ctx.fillStyle = "#d4d9d2";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "rgba(40,60,50,0.28)";
        const step = 12 * (canvas.width / box.width);
        for (let x = step / 2; x < canvas.width; x += step)
            for (let y = step / 2; y < canvas.height; y += step)
                ctx.fillRect(x - 1, y - 1, 2, 2);
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    return texture;
}

function Board({ box }: { box: BoardBox }) {
    const texture = useMemo(() => boardTexture(box), [box]);
    useEffect(() => () => texture.dispose(), [texture]);
    return (
        <group position={[box.cx, 0, box.cz]}>
            {/* The bench itself */}
            <mesh rotation-x={-Math.PI / 2} position-y={-8.1} receiveShadow>
                <planeGeometry args={[1600, 1600]} />
                <meshStandardMaterial color="#2c3a35" roughness={0.95} />
            </mesh>
            {/* Project board */}
            <mesh position-y={-4} castShadow receiveShadow>
                <boxGeometry args={[box.width, 8, box.depth]} />
                <meshStandardMaterial color="#b7beb6" roughness={0.7} />
            </mesh>
            <mesh rotation-x={-Math.PI / 2} position-y={0.02} receiveShadow>
                <planeGeometry args={[box.width, box.depth]} />
                <meshStandardMaterial map={texture} roughness={0.75} />
            </mesh>
        </group>
    );
}

const WIRE_COLORS = ["#2d6fd6", "#2e9a4a", "#e0b020", "#e0702a", "#8a4fc0"];

function wireColor(wire: Wire, index: number): string {
    const pins = [wire.from.pin, wire.to.pin];
    if (pins.some((p) => p === "+" || p === "v")) return "#c3352a";
    if (pins.some((p) => p === "-" || p === "com")) return "#1f2224";
    return WIRE_COLORS[index % WIRE_COLORS.length];
}

/** A jumper between two posts: it climbs, arcs over whatever is between, and drops, like real hook-up wire. */
function Jumper({
    wire,
    doc,
    index,
}: {
    wire: Wire;
    doc: CircuitDoc;
    index: number;
}) {
    const selected = useBench(
        (s) => s.selection?.kind === "wire" && s.selection.id === wire.id,
    );
    const points = useMemo<Vec3[] | null>(() => {
        const a = doc.parts.find((p) => p.id === wire.from.part);
        const b = doc.parts.find((p) => p.id === wire.to.part);
        if (!a || !b) return null;
        const p0 = postTop(a, wire.from.pin);
        const p1 = postTop(b, wire.to.pin);
        const distance = Math.hypot(p1[0] - p0[0], p1[2] - p0[2]);
        const lift = 12 + Math.min(distance * 0.16, 26) + (index % 3) * 3;
        return [
            p0,
            [p0[0], p0[1] + lift * 0.7, p0[2]],
            [(p0[0] + p1[0]) / 2, p0[1] + lift, (p0[2] + p1[2]) / 2],
            [p1[0], p1[1] + lift * 0.7, p1[2]],
            p1,
        ];
    }, [doc, wire, index]);
    if (!points) return null;

    return (
        <group
            onClick={(event: ThreeEvent<MouseEvent>) => {
                event.stopPropagation();
                useBench.getState().select({ kind: "wire", id: wire.id });
            }}
            onPointerOver={() => (document.body.style.cursor = "pointer")}
            onPointerOut={() => (document.body.style.cursor = "")}
        >
            <Lead
                points={points}
                radius={selected ? 1.5 : 1.1}
                color={selected ? "#E0AE7E" : wireColor(wire, index)}
            />
        </group>
    );
}

/** Puts the camera where the whole circuit is in view, now and whenever a new circuit is loaded. */
function Fit({
    box,
    controls,
}: {
    box: BoardBox;
    controls: React.RefObject<OrbitControlsImpl>;
}) {
    const camera = useThree((s) => s.camera);
    const size = useThree((s) => s.size);
    const fitTick = useBench((s) => s.fitTick);
    const key = useRef("");

    useEffect(() => {
        const next = `${fitTick}:${size.width > 600}`;
        if (key.current === next) return;
        key.current = next;
        const aspect = size.width / Math.max(1, size.height);
        const fov = ((camera as THREE.PerspectiveCamera).fov * Math.PI) / 180;
        const reach = Math.max(
            box.width / Math.min(aspect, 1.6),
            box.depth * 1.5,
        );
        const distance =
            (reach / 2 / Math.tan(fov / 2)) * (aspect < 1 ? 1.02 : 0.82) + 30;
        camera.position.set(
            box.cx,
            distance * (aspect < 1 ? 1.0 : 0.85),
            box.cz + distance * (aspect < 1 ? 0.3 : 0.55),
        );
        controls.current?.target.set(box.cx, 0, box.cz);
        controls.current?.update();
    }, [box, camera, controls, fitTick, size.width, size.height]);

    return null;
}

export default function Bench3D({ caps }: { caps: Capabilities }) {
    const doc = useBench((s) => s.doc);
    const result = useBench((s) => s.result);
    const box = useMemo(() => boardBox(doc), [doc.parts.length]); // eslint-disable-line react-hooks/exhaustive-deps
    const controls = useRef<OrbitControlsImpl>(null);
    const shadows = !caps.compact && !caps.lowPower;

    const flagsOf = useMemo(() => {
        const map = new Map<string, FlagKind[]>();
        for (const flag of result.flags)
            map.set(flag.part, [...(map.get(flag.part) ?? []), flag.kind]);
        return map;
    }, [result.flags]);

    return (
        <Canvas
            shadows={shadows ? "soft" : false}
            dpr={[1, caps.lowPower || caps.compact ? 1.25 : 1.75]}
            gl={{
                antialias: true,
                toneMapping: THREE.ACESFilmicToneMapping,
                toneMappingExposure: 0.95,
                outputColorSpace: THREE.SRGBColorSpace,
            }}
            camera={{
                fov: caps.compact ? 48 : 38,
                near: 1,
                far: 4000,
                position: [0, 300, 300],
            }}
            onPointerMissed={() => useBench.getState().select(null)}
        >
            <color attach="background" args={["#1b2622"]} />
            <Suspense fallback={null}>
                {/* A small studio built from light panels, so no environment file has to be downloaded. */}
                <Environment resolution={256} environmentIntensity={0.55}>
                    <Lightformer
                        form="rect"
                        intensity={3}
                        position={[0, 220, 120]}
                        scale={[400, 200, 1]}
                        rotation-x={Math.PI / 2}
                    />
                    <Lightformer
                        form="rect"
                        intensity={1.2}
                        position={[-300, 100, 0]}
                        scale={[200, 160, 1]}
                        rotation-y={Math.PI / 2}
                    />
                    <Lightformer
                        form="rect"
                        intensity={1.2}
                        position={[300, 100, 0]}
                        scale={[200, 160, 1]}
                        rotation-y={-Math.PI / 2}
                    />
                </Environment>
            </Suspense>
            <directionalLight
                position={[box.cx + 160, 340, box.cz + 220]}
                intensity={2.1}
                color="#fff3e2"
                castShadow={shadows}
                shadow-mapSize={[2048, 2048]}
                shadow-bias={-0.0004}
                shadow-normalBias={0.5}
                shadow-camera-left={-Math.max(260, box.width * 0.75)}
                shadow-camera-right={Math.max(260, box.width * 0.75)}
                shadow-camera-top={Math.max(220, box.depth * 0.9)}
                shadow-camera-bottom={-Math.max(220, box.depth * 0.9)}
                shadow-camera-near={50}
                shadow-camera-far={900}
                target-position={[box.cx, 0, box.cz]}
            />
            <hemisphereLight args={["#f2efe6", "#3a4a44", 0.35]} />

            <Board box={box} />

            {doc.parts.flatMap((part) =>
                PINS[part.type].map((pin) => (
                    <Post
                        key={`${part.id}.${pin}`}
                        position={postTop(part, pin)}
                    />
                )),
            )}
            {doc.parts.map((part) => {
                const Component = PART_COMPONENT[part.type];
                return (
                    <Component
                        key={part.id}
                        part={part}
                        result={result}
                        flags={flagsOf.get(part.id) ?? []}
                    />
                );
            })}
            {doc.wires.map((wire, index) => (
                <Jumper key={wire.id} wire={wire} doc={doc} index={index} />
            ))}

            <Fit box={box} controls={controls} />
            <OrbitControls
                ref={controls}
                makeDefault
                enableDamping
                dampingFactor={0.12}
                maxPolarAngle={Math.PI / 2.08}
                minDistance={60}
                maxDistance={1400}
                enablePan
                screenSpacePanning={false}
            />
        </Canvas>
    );
}
