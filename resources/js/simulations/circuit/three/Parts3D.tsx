import { useEffect, useMemo } from "react";
import { Html, RoundedBox } from "@react-three/drei";
import { ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";

import { BAND_COLORS } from "@/resistor/lib/resistor";
import { BODY, rotate } from "../lib/geometry";
import {
    ampsText,
    bandsForValue,
    readingDisplay,
    voltsText,
} from "../lib/format";
import { LED } from "../lib/parts";
import { FlagKind, MeterMode, Part, SolveResult } from "../lib/types";
import { useBench } from "../store";
import { labelFor } from "../ui/Symbols";
import { centreOf, POST_H, S, Vec3 } from "./layout";

export type PartProps = { part: Part; result: SolveResult; flags: FlagKind[] };

/* ------------------------------------------------------------------ */
/* Small shared pieces                                                 */
/* ------------------------------------------------------------------ */

const METAL = { color: "#a4a6a8", metalness: 0.85, roughness: 0.42 } as const;
const BRASS = { color: "#c79a4a", metalness: 0.9, roughness: 0.35 } as const;

/** A canvas drawn once and used as a texture (labels, displays). */
function useCanvasTexture(
    width: number,
    height: number,
    draw: (ctx: CanvasRenderingContext2D) => void,
    deps: unknown[],
): THREE.CanvasTexture {
    const texture = useMemo(() => {
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const t = new THREE.CanvasTexture(canvas);
        t.colorSpace = THREE.SRGBColorSpace;
        t.anisotropy = 4;
        return t;
    }, [width, height]);

    useEffect(() => {
        const ctx = (texture.image as HTMLCanvasElement).getContext("2d");
        if (!ctx) return;
        draw(ctx);
        texture.needsUpdate = true;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [texture, ...deps]);

    useEffect(() => () => texture.dispose(), [texture]);
    return texture;
}

/** A bent wire (a component lead or a probe cable) as a thin tube through the given points. */
export function Lead({
    points,
    radius = 0.45,
    color,
    metal = true,
}: {
    points: Vec3[];
    radius?: number;
    color?: string;
    metal?: boolean;
}) {
    const geometry = useMemo(() => {
        const curve = new THREE.CatmullRomCurve3(
            points.map((p) => new THREE.Vector3(...p)),
            false,
            "catmullrom",
            0.25,
        );
        return new THREE.TubeGeometry(curve, 28, radius, 8, false);
    }, [points, radius]);
    useEffect(() => () => geometry.dispose(), [geometry]);
    return (
        <mesh geometry={geometry} castShadow>
            {color ? (
                <meshStandardMaterial color={color} roughness={0.5} />
            ) : (
                <meshStandardMaterial {...METAL} metalness={metal ? 0.85 : 0} />
            )}
        </mesh>
    );
}

/** A lead from a point on a part's body to a binding post, sagging a little like formed wire. */
function leadTo(from: Vec3, to: Vec3): Vec3[] {
    const mid: Vec3 = [
        (from[0] + to[0]) / 2,
        Math.min(from[1], to[1]) - 0.2,
        (from[2] + to[2]) / 2,
    ];
    return [from, mid, [to[0], to[1] - 0.8, to[2]]];
}

/** The binding post every pin is wired to: a base, a brass pillar and a knurled nut. */
export function Post({ position }: { position: Vec3 }) {
    return (
        <group position={[position[0], 0, position[2]]}>
            <mesh position-y={0.5} castShadow receiveShadow>
                <cylinderGeometry args={[3.6, 3.8, 1, 24]} />
                <meshStandardMaterial color="#2b2f31" roughness={0.6} />
            </mesh>
            <mesh position-y={POST_H / 2 + 0.5} castShadow>
                <cylinderGeometry args={[1.7, 1.7, POST_H, 20]} />
                <meshStandardMaterial {...BRASS} />
            </mesh>
            <mesh position-y={POST_H - 0.6} castShadow>
                <cylinderGeometry args={[2.7, 2.7, 1.3, 6]} />
                <meshStandardMaterial {...BRASS} roughness={0.5} />
            </mesh>
        </group>
    );
}

/** Position, turn, picking, selection highlight and the little name tag every part shares. */
function Shell({
    part,
    result,
    rotated = true,
    children,
}: {
    part: Part;
    result: SolveResult;
    rotated?: boolean;
    children: React.ReactNode;
}) {
    const selected = useBench(
        (s) => s.selection?.kind === "part" && s.selection.id === part.id,
    );
    const showValues = useBench((s) => s.showValues);
    const [hx, hy] = BODY[part.type];
    const el = result.elements[part.id];

    let tag = labelFor(part);
    if (showValues && el && part.type !== "meter" && part.type !== "junction")
        tag += `  ·  ${voltsText(Math.abs(el.v))}  ${ampsText(Math.abs(el.i))}`;

    return (
        <group position={centreOf(part)}>
            <group
                rotation-y={rotated ? (-part.rot * Math.PI) / 180 : 0}
                onClick={(event: ThreeEvent<MouseEvent>) => {
                    event.stopPropagation();
                    useBench.getState().select({ kind: "part", id: part.id });
                }}
                onPointerOver={() => (document.body.style.cursor = "pointer")}
                onPointerOut={() => (document.body.style.cursor = "")}
            >
                {selected && (
                    <mesh rotation-x={-Math.PI / 2} position-y={0.12}>
                        <planeGeometry
                            args={[hx * S * 2 + 8, hy * S * 2 + 8]}
                        />
                        <meshBasicMaterial
                            color="#E0AE7E"
                            transparent
                            opacity={0.28}
                            depthWrite={false}
                        />
                    </mesh>
                )}
                {children}
            </group>
            {tag && (
                <Html
                    position={[
                        0,
                        part.type === "meter" ? 34 : 17,
                        part.type === "meter" ? 58 : 0,
                    ]}
                    center
                    zIndexRange={[5, 0]}
                    style={{ pointerEvents: "none" }}
                >
                    <div className="rounded-full bg-board/85 px-2 py-0.5 font-mono text-[10px] md:px-2.5 md:text-[11px] whitespace-nowrap text-chalk">
                        {tag}
                    </div>
                </Html>
            )}
        </group>
    );
}

const PIN_X = 40 * S;

/* ------------------------------------------------------------------ */
/* Resistor                                                            */
/* ------------------------------------------------------------------ */

const BAND_X = [-3.9, -2.2, -0.5, 3.1];

export function Resistor3D({ part, result, flags }: PartProps) {
    const hot = flags.includes("overheat");
    const bands = useMemo(() => bandsForValue(part.value ?? 100), [part.value]);
    // Drawn about twice life size (a 6.3 mm body is 12.6 mm here) so the bands can be read from the bench camera.
    const y = 2.6;
    const k = 1;
    return (
        <Shell part={part} result={result}>
            <group scale={k}>
                <mesh
                    rotation-z={Math.PI / 2}
                    position-y={y}
                    castShadow
                    receiveShadow
                >
                    <capsuleGeometry args={[2.1, 8.4, 8, 24]} />
                    <meshStandardMaterial
                        color={hot ? "#6a3a22" : "#d9c397"}
                        emissive={hot ? "#ff4a1c" : "#000000"}
                        emissiveIntensity={hot ? 0.55 : 0}
                        roughness={0.72}
                    />
                </mesh>
                {bands.map((band, i) => (
                    <mesh
                        key={i}
                        rotation-z={Math.PI / 2}
                        position={[BAND_X[i], y, 0]}
                        castShadow
                    >
                        <cylinderGeometry
                            args={[2.16, 2.16, i === 3 ? 0.8 : 1, 28]}
                        />
                        <meshStandardMaterial
                            color={BAND_COLORS[band].hex}
                            roughness={0.55}
                            metalness={
                                band === "gold" || band === "silver" ? 0.7 : 0
                            }
                        />
                    </mesh>
                ))}
            </group>
            {([-1, 1] as const).map((side) => (
                <Lead
                    key={side}
                    points={leadTo(
                        [side * 6.6 * k, y * k, 0],
                        [side * PIN_X, POST_H, 0],
                    )}
                />
            ))}
        </Shell>
    );
}

/* ------------------------------------------------------------------ */
/* LED                                                                 */
/* ------------------------------------------------------------------ */

export function Led3D({ part, result, flags }: PartProps) {
    const el = result.elements[part.id];
    const burnt = flags.includes("burnt");
    const level = burnt ? 0 : el?.on ? Math.min(1, el.i / LED.ratedAmps) : 0;
    const color = part.color === "green" ? "#35d46e" : "#ff3b30";
    const lens = part.color === "green" ? "#7ee8a0" : "#ff7468";
    return (
        <Shell part={part} result={result}>
            {/* Flange and stem, then the epoxy dome */}
            <mesh position-y={0.7} castShadow receiveShadow>
                <cylinderGeometry args={[3.2, 3.2, 1.2, 28]} />
                <meshStandardMaterial
                    color={burnt ? "#2a2a2a" : lens}
                    transparent
                    opacity={0.92}
                    roughness={0.25}
                    emissive={color}
                    emissiveIntensity={level * 0.9}
                />
            </mesh>
            <mesh position-y={4.2} castShadow>
                <cylinderGeometry args={[2.6, 2.6, 5.6, 28]} />
                <meshStandardMaterial
                    color={burnt ? "#2a2a2a" : lens}
                    transparent
                    opacity={burnt ? 1 : 0.88}
                    roughness={0.18}
                    emissive={color}
                    emissiveIntensity={level * 1.6}
                />
            </mesh>
            <mesh position-y={7} castShadow>
                <sphereGeometry
                    args={[2.6, 28, 16, 0, Math.PI * 2, 0, Math.PI / 2]}
                />
                <meshStandardMaterial
                    color={burnt ? "#2a2a2a" : lens}
                    transparent
                    opacity={burnt ? 1 : 0.88}
                    roughness={0.12}
                    emissive={color}
                    emissiveIntensity={level * 2.2}
                />
            </mesh>
            {/* The die and its anvil, seen through the dome */}
            {!burnt && (
                <>
                    <mesh position={[-0.9, 3.2, 0]}>
                        <boxGeometry args={[0.4, 3.4, 1.5]} />
                        <meshStandardMaterial {...METAL} />
                    </mesh>
                    <mesh position={[0.9, 3.5, 0]}>
                        <boxGeometry args={[0.4, 4, 1.5]} />
                        <meshStandardMaterial {...METAL} />
                    </mesh>
                </>
            )}
            {level > 0 && (
                <mesh position-y={5.2}>
                    <sphereGeometry args={[7.5, 20, 14]} />
                    <meshBasicMaterial
                        color={color}
                        transparent
                        opacity={0.1 + level * 0.14}
                        depthWrite={false}
                        blending={THREE.AdditiveBlending}
                    />
                </mesh>
            )}
            <pointLight
                position={[0, 6, 0]}
                color={color}
                intensity={level * 900}
                distance={90}
                decay={2}
            />
            {/* Formed legs: the anode (longer) on the left, the cathode on the right */}
            <Lead points={leadTo([-1.3, 0.4, 0], [-PIN_X, POST_H, 0])} />
            <Lead points={leadTo([1.3, 0.4, 0], [PIN_X, POST_H, 0])} />
        </Shell>
    );
}

/* ------------------------------------------------------------------ */
/* Battery and bench supply                                            */
/* ------------------------------------------------------------------ */

export function Battery3D({ part, result }: PartProps) {
    const face = useCanvasTexture(
        256,
        128,
        (ctx) => {
            ctx.fillStyle = "#c98a2e";
            ctx.fillRect(0, 0, 256, 128);
            ctx.fillStyle = "#1b1308";
            ctx.font = "700 54px sans-serif";
            ctx.textAlign = "center";
            ctx.fillText("9V", 128, 66);
            ctx.font = "600 20px sans-serif";
            ctx.fillText("ALKALINE  PP3", 128, 100);
        },
        [],
    );
    return (
        <Shell part={part} result={result}>
            <RoundedBox
                args={[40, 17, 26]}
                radius={1.6}
                smoothness={3}
                position-y={8.5}
                castShadow
                receiveShadow
            >
                <meshStandardMaterial color="#1c1f21" roughness={0.55} />
            </RoundedBox>
            <mesh rotation-x={-Math.PI / 2} position={[0, 17.05, 0]}>
                <planeGeometry args={[30, 18]} />
                <meshStandardMaterial map={face} roughness={0.5} />
            </mesh>
            {/* Snap studs: the smaller round stud is +, the hexagonal one is − */}
            <mesh position={[-16, 18.2, 0]} castShadow>
                <cylinderGeometry args={[2.3, 2.3, 2.4, 24]} />
                <meshStandardMaterial {...METAL} />
            </mesh>
            <mesh position={[16, 18.2, 0]} castShadow>
                <cylinderGeometry args={[3, 3, 2.4, 6]} />
                <meshStandardMaterial {...METAL} />
            </mesh>
            <Lead
                points={leadTo([-16, 19, 0], [-PIN_X, POST_H, 0])}
                radius={0.9}
                color="#c3352a"
            />
            <Lead
                points={leadTo([16, 19, 0], [PIN_X, POST_H, 0])}
                radius={0.9}
                color="#1f2224"
            />
        </Shell>
    );
}

export function Supply3D({ part, result }: PartProps) {
    const volts = part.value ?? 0;
    const display = useCanvasTexture(
        192,
        80,
        (ctx) => {
            ctx.fillStyle = "#0b140f";
            ctx.fillRect(0, 0, 192, 80);
            ctx.fillStyle = "#6bffa0";
            ctx.font = "700 46px ui-monospace, monospace";
            ctx.textAlign = "right";
            ctx.fillText(volts.toFixed(1), 150, 54);
            ctx.font = "600 22px ui-monospace, monospace";
            ctx.fillText("V", 178, 54);
        },
        [volts],
    );
    return (
        <Shell part={part} result={result}>
            <RoundedBox
                args={[40, 20, 30]}
                radius={1.8}
                smoothness={3}
                position-y={10}
                castShadow
                receiveShadow
            >
                <meshStandardMaterial
                    color="#3a4046"
                    roughness={0.45}
                    metalness={0.25}
                />
            </RoundedBox>
            <mesh rotation-x={-Math.PI / 2} position={[-6, 20.06, -5]}>
                <planeGeometry args={[18, 7.5]} />
                <meshStandardMaterial
                    map={display}
                    emissiveMap={display}
                    emissive="#ffffff"
                    emissiveIntensity={0.7}
                    roughness={0.2}
                />
            </mesh>
            {/* Voltage knob with its pointer */}
            <group
                position={[10, 20, 3]}
                rotation-y={(-(volts / 15) * 4.6 + 2.3) * 1}
            >
                <mesh position-y={2.2} castShadow>
                    <cylinderGeometry args={[5, 5.4, 4.4, 32]} />
                    <meshStandardMaterial
                        color="#14171a"
                        roughness={0.4}
                        metalness={0.3}
                    />
                </mesh>
                <mesh position={[0, 4.5, -3]}>
                    <boxGeometry args={[0.9, 0.3, 3]} />
                    <meshStandardMaterial color="#f2f0e6" />
                </mesh>
            </group>
            <Lead
                points={leadTo([-20, 12, 0], [-PIN_X, POST_H, 0])}
                radius={0.9}
                color="#c3352a"
            />
            <Lead
                points={leadTo([20, 12, 0], [PIN_X, POST_H, 0])}
                radius={0.9}
                color="#1f2224"
            />
        </Shell>
    );
}

/* ------------------------------------------------------------------ */
/* Switch and junction                                                 */
/* ------------------------------------------------------------------ */

export function Switch3D({ part, result }: PartProps) {
    const closed = part.closed === true;
    return (
        <Shell part={part} result={result}>
            <RoundedBox
                args={[22, 8, 14]}
                radius={1.2}
                smoothness={3}
                position-y={4}
                castShadow
                receiveShadow
            >
                <meshStandardMaterial color="#1d2022" roughness={0.5} />
            </RoundedBox>
            <mesh position={[0, 8.05, 0]}>
                <boxGeometry args={[14, 0.2, 3]} />
                <meshStandardMaterial color="#05070a" />
            </mesh>
            <group
                position={[0, 8.2, 0]}
                rotation-z={closed ? -0.62 : 0.62}
                onClick={(event: ThreeEvent<MouseEvent>) => {
                    event.stopPropagation();
                    useBench.getState().toggleSwitch(part.id);
                }}
            >
                <mesh position-y={4.2} castShadow>
                    <boxGeometry args={[3, 8.4, 3.2]} />
                    <meshStandardMaterial
                        color={closed ? "#d98a2b" : "#9aa3a8"}
                        roughness={0.4}
                        metalness={0.4}
                    />
                </mesh>
            </group>
            <Lead points={leadTo([-11, 3, 0], [-PIN_X, POST_H, 0])} />
            <Lead points={leadTo([11, 3, 0], [PIN_X, POST_H, 0])} />
        </Shell>
    );
}

export function Junction3D({ part, result }: PartProps) {
    return (
        <Shell part={part} result={result}>
            <mesh position-y={POST_H + 1.2} castShadow>
                <sphereGeometry args={[2.4, 20, 14]} />
                <meshStandardMaterial {...BRASS} />
            </mesh>
        </Shell>
    );
}

/* ------------------------------------------------------------------ */
/* Digital multimeter                                                  */
/* ------------------------------------------------------------------ */

const DIAL: Record<MeterMode, number> = {
    V: -0.95,
    A: -0.32,
    ohm: 0.32,
    cont: 0.95,
};

export function Meter3D({ part, result, flags }: PartProps) {
    const mode = part.mode ?? "V";
    const reading = result.meters[part.id];
    const d = readingDisplay(mode, reading);
    const warn = flags.some((f) => f === "fuse" || f === "live");

    const lcd = useCanvasTexture(
        256,
        104,
        (ctx) => {
            ctx.fillStyle = "#b9c4a6";
            ctx.fillRect(0, 0, 256, 104);
            ctx.fillStyle = "#1a2116";
            ctx.textAlign = "right";
            ctx.font = `700 ${d.digits.length > 6 ? 46 : 62}px ui-monospace, monospace`;
            ctx.fillText(d.digits, 206, 66);
            ctx.font = "700 26px ui-monospace, monospace";
            ctx.fillText(d.unit + (reading?.beep ? " ♪" : ""), 246, 94);
            ctx.textAlign = "left";
            ctx.font = "700 18px ui-monospace, monospace";
            ctx.fillText(
                mode === "V" ? "DC" : mode === "A" ? "DC" : "",
                10,
                24,
            );
        },
        [d.digits, d.unit, mode, reading?.beep],
    );

    // The jacks sit on whichever edge the part's rotation picks, exactly as in the schematic.
    const jack = (pin: "com" | "v") => {
        const offset: [number, number] = pin === "com" ? [-30, 100] : [30, 100];
        const [px, py] = rotate(offset, part.rot);
        const edge: [number, number] =
            part.rot % 180 === 0
                ? [px, Math.sign(py) * 82]
                : [Math.sign(px) * 62, py];
        return {
            socket: [edge[0] * S, 11, edge[1] * S] as Vec3,
            post: [px * S, POST_H, py * S] as Vec3,
        };
    };
    const com = jack("com");
    const volt = jack("v");

    return (
        <Shell part={part} result={result} rotated={false}>
            <group rotation-x={-0.12} position-y={1}>
                <RoundedBox
                    args={[74, 22, 98]}
                    radius={6}
                    smoothness={4}
                    position-y={11}
                    castShadow
                    receiveShadow
                >
                    <meshStandardMaterial color="#e0a526" roughness={0.62} />
                </RoundedBox>
                <RoundedBox
                    args={[64, 3, 88]}
                    radius={4}
                    smoothness={3}
                    position-y={22.4}
                    castShadow
                >
                    <meshStandardMaterial color="#26292b" roughness={0.5} />
                </RoundedBox>
                <mesh rotation-x={-Math.PI / 2} position={[0, 24.1, -26]}>
                    <planeGeometry args={[52, 21]} />
                    <meshStandardMaterial
                        map={lcd}
                        roughness={0.15}
                        emissive={warn ? "#f08a7a" : "#1a2a10"}
                        emissiveIntensity={warn ? 0.35 : 0.2}
                    />
                </mesh>
                {/* Rotary switch */}
                <group position={[0, 24, 14]} rotation-y={-DIAL[mode]}>
                    <mesh position-y={2.5} castShadow>
                        <cylinderGeometry args={[11, 12, 5, 40]} />
                        <meshStandardMaterial
                            color="#14171a"
                            roughness={0.38}
                            metalness={0.3}
                        />
                    </mesh>
                    <mesh position={[0, 5.2, -6]}>
                        <boxGeometry args={[1.8, 0.4, 8]} />
                        <meshStandardMaterial color="#f2f0e6" />
                    </mesh>
                </group>
                {(
                    [
                        ["V", -0.95],
                        ["A", -0.32],
                        ["Ω", 0.32],
                        ["•))", 0.95],
                    ] as const
                ).map(([name, angle]) => (
                    <mesh
                        key={name}
                        position={[
                            Math.sin(angle) * 17,
                            23.9,
                            14 - Math.cos(angle) * 17,
                        ]}
                    >
                        <sphereGeometry args={[0.9, 10, 8]} />
                        <meshStandardMaterial
                            color={
                                name ===
                                (mode === "V"
                                    ? "V"
                                    : mode === "A"
                                      ? "A"
                                      : mode === "ohm"
                                        ? "Ω"
                                        : "•))")
                                    ? "#f0c46a"
                                    : "#9aa3a8"
                            }
                        />
                    </mesh>
                ))}
                {/* Sockets */}
                {[
                    { j: com, c: "#1f2224" },
                    { j: volt, c: "#c3352a" },
                ].map(({ j, c }, i) => (
                    <mesh
                        key={i}
                        position={[j.socket[0], 8, j.socket[2]]}
                        rotation-x={Math.PI / 2}
                        castShadow
                    >
                        <torusGeometry args={[3.2, 1.4, 12, 24]} />
                        <meshStandardMaterial color={c} roughness={0.4} />
                    </mesh>
                ))}
            </group>
            {/* Probe cables run from the sockets to the posts, so the board shows what the meter is connected to. */}
            <Lead
                points={[
                    [com.socket[0], 9, com.socket[2]],
                    [
                        (com.socket[0] + com.post[0]) / 2,
                        2,
                        (com.socket[2] + com.post[2]) / 2,
                    ],
                    com.post,
                ]}
                radius={1.2}
                color="#1f2224"
            />
            <Lead
                points={[
                    [volt.socket[0], 9, volt.socket[2]],
                    [
                        (volt.socket[0] + volt.post[0]) / 2,
                        2,
                        (volt.socket[2] + volt.post[2]) / 2,
                    ],
                    volt.post,
                ]}
                radius={1.2}
                color="#c3352a"
            />
        </Shell>
    );
}
