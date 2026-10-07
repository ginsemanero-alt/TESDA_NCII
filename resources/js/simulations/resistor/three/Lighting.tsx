import { Environment } from "@react-three/drei";

import { assetUrl, LabConfig } from "@/resistor/lib/config";
import { ASSET_PATHS } from "@/resistor/lib/experience";

type Props = { config: LabConfig; shadows: boolean; highQuality: boolean };

/**
 * Lit like a macro product photo on a bench: a self-hosted neutral studio
 * HDRI (CC0, Poly Haven, see docs/ASSETS.md) for reflections and fill, and one
 * soft, slightly warm key light from above-front casting the shadows. No
 * coloured rim or fill lights.
 */
export default function Lighting({ config, shadows, highQuality }: Props) {
  return (
    <>
      <Environment files={assetUrl(config, ASSET_PATHS.hdri)} environmentIntensity={0.6} />

      <directionalLight
        position={[70, 190, 120]}
        intensity={1.7}
        color="#fff5ea"
        castShadow={shadows}
        shadow-mapSize={highQuality ? [4096, 4096] : [2048, 2048]}
        shadow-bias={-0.0003}
        shadow-normalBias={0.04}
        shadow-camera-left={-170}
        shadow-camera-right={170}
        shadow-camera-top={170}
        shadow-camera-bottom={-170}
        shadow-camera-near={40}
        shadow-camera-far={520}
      />
      {/* A dim bounce from the bench so the underside of the part is not black. */}
      <hemisphereLight args={["#f2efe6", "#3a4a44", 0.25]} />
    </>
  );
}
