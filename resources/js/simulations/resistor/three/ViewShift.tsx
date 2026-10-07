import { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";

export type FrameOffset = {
  /** Fraction of the stage width to push the subject to the right (negative: left). */
  x: number;
  /** Fraction of the stage height to push the subject up (negative: down). */
  y: number;
};

/**
 * Slides the rendered picture inside the canvas without moving the camera, so
 * the part can sit beside (or above) text laid over a full-bleed stage. The
 * camera keyframes stay centred; this only shifts the projection window.
 */
export default function ViewShift({ offset }: { offset: FrameOffset }) {
  const camera = useThree((state) => state.camera) as THREE.PerspectiveCamera;
  const width = useThree((state) => state.size.width);
  const height = useThree((state) => state.size.height);

  useEffect(() => {
    if (!offset.x && !offset.y) {
      camera.clearViewOffset();
      return;
    }
    // A window shifted right shows the scene shifted left, hence the signs.
    camera.setViewOffset(width, height, -offset.x * width, offset.y * height, width, height);
    return () => camera.clearViewOffset();
  }, [camera, width, height, offset.x, offset.y]);

  return null;
}
