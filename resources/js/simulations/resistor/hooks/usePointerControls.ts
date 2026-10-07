import { RefObject, useEffect } from "react";

import { INTERACTION } from "@/resistor/lib/experience";
import { clamp, sceneInput } from "@/resistor/lib/sceneState";
import { useLab } from "@/resistor/store";

const [MIN_ZOOM, MAX_ZOOM] = INTERACTION.zoomRange;

/** Nudges the camera closer or further, clamped. Used by the zoom buttons. */
export function zoomBy(amount: number): void {
  sceneInput.targetZoom = clamp(sceneInput.targetZoom * (1 - amount), MIN_ZOOM, MAX_ZOOM);
}

/**
 * Cursor position over the stage feeds a gentle parallax. Dragging, pinching
 * and ctrl-wheel zoom only take hold in the Build chapter, so scrolling the
 * page past the stage is never fought over. Listeners sit on the stage
 * element, not the window, so the rest of the page is untouched.
 */
export function usePointerControls(stageRef: RefObject<HTMLElement>): void {
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const pointers = new Map<number, { x: number; y: number }>();
    let last: { x: number; y: number } | null = null;
    let pinchDistance = 0;

    const handleMove = (event: PointerEvent) => {
      const rect = stage.getBoundingClientRect();
      sceneInput.pointerX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      sceneInput.pointerY = -(((event.clientY - rect.top) / rect.height) * 2 - 1);

      if (pointers.has(event.pointerId)) pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

      if (pointers.size === 2) {
        const [a, b] = Array.from(pointers.values());
        const distance = Math.hypot(a.x - b.x, a.y - b.y);
        if (pinchDistance > 0) zoomBy((distance - pinchDistance) * 0.0016);
        pinchDistance = distance;
        return;
      }

      if (!sceneInput.dragging || !last) return;

      sceneInput.source = "pointer";
      sceneInput.targetYaw -= (event.clientX - last.x) * INTERACTION.dragSpeed;
      sceneInput.targetPitch = clamp(
        sceneInput.targetPitch + (event.clientY - last.y) * INTERACTION.dragSpeed,
        -INTERACTION.pitchLimit,
        INTERACTION.pitchLimit,
      );
      last = { x: event.clientX, y: event.clientY };
    };

    const handleDown = (event: PointerEvent) => {
      if (!useLab.getState().interactive) return;
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      stage.setPointerCapture?.(event.pointerId);
      if (pointers.size === 1) {
        sceneInput.dragging = true;
        last = { x: event.clientX, y: event.clientY };
      } else {
        sceneInput.dragging = false;
      }
    };

    const handleUp = (event: PointerEvent) => {
      pointers.delete(event.pointerId);
      if (pointers.size < 2) pinchDistance = 0;
      if (pointers.size === 0) {
        sceneInput.dragging = false;
        last = null;
      }
    };

    const handleLeave = () => {
      sceneInput.pointerX = 0;
      sceneInput.pointerY = 0;
    };

    // Trackpad pinch arrives as ctrl+wheel. Plain wheel always scrolls the page.
    const handleWheel = (event: WheelEvent) => {
      if (!event.ctrlKey || !useLab.getState().interactive) return;
      event.preventDefault();
      zoomBy(-event.deltaY * 0.004);
    };

    stage.addEventListener("pointermove", handleMove, { passive: true });
    stage.addEventListener("pointerdown", handleDown, { passive: true });
    stage.addEventListener("pointerup", handleUp, { passive: true });
    stage.addEventListener("pointercancel", handleUp, { passive: true });
    stage.addEventListener("pointerleave", handleLeave, { passive: true });
    stage.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      stage.removeEventListener("pointermove", handleMove);
      stage.removeEventListener("pointerdown", handleDown);
      stage.removeEventListener("pointerup", handleUp);
      stage.removeEventListener("pointercancel", handleUp);
      stage.removeEventListener("pointerleave", handleLeave);
      stage.removeEventListener("wheel", handleWheel);
    };
  }, [stageRef]);
}
