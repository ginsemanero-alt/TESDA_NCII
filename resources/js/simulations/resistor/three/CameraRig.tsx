import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import gsap from "gsap";
import * as THREE from "three";

import { CAMERA_START, CHAPTERS, CameraKeyframe, INTERACTION, SceneTargets, distanceFactor } from "@/resistor/lib/experience";
import { clamp, damp, lerp, resetOrbit, sceneAnim, sceneInput } from "@/resistor/lib/sceneState";
import { useLab } from "@/resistor/store";

export type CameraFit = { scale: number; referenceAspect: number };

type Props = { compact: boolean; reducedMotion: boolean; fit?: CameraFit };

export function keyframeFor(chapter: string, focusedBand: number | null): CameraKeyframe {
  const entry = CHAPTERS.find((c) => c.id === chapter) ?? CHAPTERS[0];
  const index = entry.id === "colorcode" ? clamp(focusedBand ?? 0, 0, entry.keyframes.length - 1) : 0;
  return entry.keyframes[index];
}

/**
 * Owns the camera. When the chapter the student is reading changes, one slow
 * GSAP tween carries the camera and the scene values (part inserted, power on,
 * probes down, band highlight) to that chapter's keyframe. Every frame the
 * camera eases towards that state with orbit and a little cursor parallax on
 * top. With reduced motion the move is a cut.
 */
export default function CameraRig({ compact, reducedMotion, fit }: Props) {
  const camera = useThree((state) => state.camera);
  // Rounded so a window drag does not restart the move at every pixel.
  const aspect = useThree((state) => Math.round((state.size.width / Math.max(state.size.height, 1)) * 20) / 20);
  const lookAt = useRef(new THREE.Vector3(...CAMERA_START.target));
  const scratch = useRef({
    target: new THREE.Vector3(),
    offset: new THREE.Vector3(),
    desired: new THREE.Vector3(),
    spherical: new THREE.Spherical(),
  });

  useEffect(() => {
    const distance = distanceFactor(aspect, compact, fit?.referenceAspect) * (fit?.scale ?? 1);
    let tween: gsap.core.Tween | null = null;

    const goTo = (chapter: string, focusedBand: number | null) => {
      const keyframe = keyframeFor(chapter, focusedBand);
      const eye = keyframe.pos.map((value, axis) => keyframe.target[axis] + (value - keyframe.target[axis]) * distance);
      if (chapter !== "build") resetOrbit();

      tween?.kill();
      tween = gsap.to(sceneAnim, {
        camX: eye[0],
        camY: eye[1],
        camZ: eye[2],
        targetX: keyframe.target[0],
        targetY: keyframe.target[1],
        targetZ: keyframe.target[2],
        ...(keyframe.scene as Partial<SceneTargets>),
        duration: reducedMotion ? 0 : INTERACTION.moveSeconds,
        ease: "power2.inOut",
      });
    };

    const { activeChapter, focusedBand } = useLab.getState();
    goTo(activeChapter, focusedBand);

    const unsubscribe = useLab.subscribe((state, previous) => {
      if (state.activeChapter !== previous.activeChapter || state.focusedBand !== previous.focusedBand) {
        goTo(state.activeChapter, state.focusedBand);
      }
    });

    return () => {
      unsubscribe();
      tween?.kill();
    };
  }, [compact, reducedMotion, aspect, fit?.scale, fit?.referenceAspect]);

  useFrame((_, rawDelta) => {
    // Exponential damping is stable at any step, so only guard against
    // tab-switch spikes: on a slow PC rendering 5 fps the camera must still
    // arrive in real time, not five times slower.
    const delta = Math.min(rawDelta, 0.5);
    const { target, offset, desired, spherical } = scratch.current;

    const pointerEase = damp(delta, INTERACTION.pointerDamping);
    sceneInput.smoothX = lerp(sceneInput.smoothX, reducedMotion ? 0 : sceneInput.pointerX, pointerEase);
    sceneInput.smoothY = lerp(sceneInput.smoothY, reducedMotion ? 0 : sceneInput.pointerY, pointerEase);

    const orbitEase = damp(delta, INTERACTION.orbitDamping);
    sceneInput.yaw = lerp(sceneInput.yaw, sceneInput.targetYaw, orbitEase);
    sceneInput.pitch = lerp(sceneInput.pitch, sceneInput.targetPitch, orbitEase);
    sceneInput.zoom = lerp(sceneInput.zoom, sceneInput.targetZoom, orbitEase);

    target.set(sceneAnim.targetX, sceneAnim.targetY, sceneAnim.targetZ);
    offset.set(sceneAnim.camX - sceneAnim.targetX, sceneAnim.camY - sceneAnim.targetY, sceneAnim.camZ - sceneAnim.targetZ);

    spherical.setFromVector3(offset);
    spherical.theta += sceneInput.yaw;
    spherical.phi = clamp(spherical.phi - sceneInput.pitch, 0.25, Math.PI / 2 - 0.05);
    spherical.radius *= sceneInput.zoom;
    offset.setFromSpherical(spherical);

    // Parallax scales with distance: a hair at macro range, a little more on the bench.
    const parallax = INTERACTION.pointerParallax * (spherical.radius / 40);
    desired.copy(target).add(offset);
    desired.x += sceneInput.smoothX * parallax;
    desired.y += sceneInput.smoothY * parallax * 0.6;

    // With reduced motion the camera does not ease towards its target either: it
    // is there on the next frame, so a chapter change is a cut, not a glide.
    const ease = reducedMotion ? 1 : damp(delta, INTERACTION.cameraDamping);
    camera.position.lerp(desired, ease);
    lookAt.current.lerp(target, ease);
    camera.lookAt(lookAt.current);
  });

  return null;
}
