"use client";

import { useTexture } from "@react-three/drei";
import { useEffect, useLayoutEffect, useMemo } from "react";
import { RingGeometry } from "three";
import { mountainRingRadii } from "@/lib/live-backdrop";
import { LIVE_TEXTURE, prepareLiveTexture } from "@/lib/live-textures";
import type { SceneGroundLook, SceneVariant } from "@/lib/scene-lighting";

const RIDGE_TINT: Record<SceneVariant, string> = {
  sunset: "#8a7a6c",
  sunny: "#b8b4ae",
  snow: "#e4ecf2",
  rain: "#6a7074",
};

function hashNoise(seed: number): number {
  const raw = Math.sin(seed) * 43758.5453;
  return raw - Math.floor(raw);
}

export function LivingMountains({
  extent,
  variant,
}: {
  extent: number;
  look: SceneGroundLook;
  variant: SceneVariant;
}) {
  const { inner, outer } = mountainRingRadii(extent);
  const ridgeColor = RIDGE_TINT[variant];

  const [rockColor, rockNormal, rockRough] = useTexture([
    LIVE_TEXTURE.rockColor,
    LIVE_TEXTURE.rockNormal,
    LIVE_TEXTURE.rockRoughness,
  ]);

  useLayoutEffect(() => {
    prepareLiveTexture(rockColor, 3.4, true);
    prepareLiveTexture(rockNormal, 3.4, false);
    prepareLiveTexture(rockRough, 3.4, false);
  }, [rockColor, rockNormal, rockRough]);

  const ridge = useMemo(() => {
    const ring = new RingGeometry(inner, outer, 220, 48);
    const positions = ring.attributes.position;
    for (let index = 0; index < positions.count; index += 1) {
      const x = positions.getX(index);
      const y = positions.getY(index);
      const radius = Math.hypot(x, y);
      const span = (radius - inner) / (outer - inner);
      const angle = Math.atan2(y, x);
      const envelope = Math.sin(span * Math.PI);
      const valleys =
        0.22 + 0.78 * (0.5 + 0.5 * Math.sin(angle * 3.2 + 0.5)) ** 1.6;
      const crumble = hashNoise(x * 0.08 + y * 0.11) * 10 - 3;
      const ridgeHeight =
        (0.5 + 0.5 * Math.sin(angle * 5 + 0.4)) ** 2.1 * 48 +
        (0.5 + 0.5 * Math.sin(angle * 9 + 1.7)) ** 2.8 * 26 +
        (0.5 + 0.5 * Math.sin(angle * 2.2 - 0.8)) ** 1.4 * 18;
      positions.setZ(index, ridgeHeight * envelope * valleys + crumble);
    }
    ring.computeVertexNormals();
    return ring;
  }, [inner, outer]);

  useEffect(() => {
    return () => {
      ridge.dispose();
    };
  }, [ridge]);

  return (
    <mesh
      geometry={ridge}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, -0.08, 0]}
      raycast={() => undefined}
      receiveShadow
    >
      <meshStandardMaterial
        map={rockColor}
        normalMap={rockNormal}
        roughnessMap={rockRough}
        color={ridgeColor}
        metalness={0.04}
      />
    </mesh>
  );
}

useTexture.preload([
  LIVE_TEXTURE.rockColor,
  LIVE_TEXTURE.rockNormal,
  LIVE_TEXTURE.rockRoughness,
]);
