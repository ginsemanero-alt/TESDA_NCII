import { useThree } from "@react-three/fiber";

/**
 * Test hook for scripts/browser-check.ts. Only mounted when the page URL
 * contains ?debug3d; it puts the scene and camera on window so the check can
 * wait for the camera to settle before taking a still. Inert otherwise.
 */
export default function DebugHook() {
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  const target = window as unknown as { __labScene: unknown; __labCamera: unknown };
  target.__labScene = scene;
  target.__labCamera = camera;
  return null;
}
