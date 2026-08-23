"use client";

import { useTexture } from "@react-three/drei";
import { useLayoutEffect, useMemo, useRef } from "react";
import { Color, InstancedMesh, Object3D } from "three";
import { mountainRingRadii } from "@/lib/live-backdrop";
import { LIVE_TEXTURE, prepareLiveTexture } from "@/lib/live-textures";
import type { SceneVariant } from "@/lib/scene-lighting";

const TREE_COUNT = 220;
const CANOPY_BLOBS = 3;
const CANOPY_COUNT = TREE_COUNT * CANOPY_BLOBS;

const CANOPY_TINT: Record<SceneVariant, string> = {
  sunset: "#5a6a38",
  sunny: "#3d6e30",
  snow: "#d8e4dc",
  rain: "#2a4a30",
};

const TRUNK_TINT: Record<SceneVariant, string> = {
  sunset: "#4a3224",
  sunny: "#5a3a28",
  snow: "#6a5a50",
  rain: "#3a2a22",
};

function hashNoise(seed: number): number {
  const raw = Math.sin(seed) * 43758.5453;
  return raw - Math.floor(raw);
}

export function LivingTrees({
  extent,
  variant,
}: {
  extent: number;
  variant: SceneVariant;
}) {
  const trunkRef = useRef<InstancedMesh>(null);
  const canopyRef = useRef<InstancedMesh>(null);
  const padHalf = extent / 2;
  const innerRadius = padHalf + 12;
  const outerRadius = mountainRingRadii(extent).inner - 8;
  const winterScale = variant === "snow" ? 0.92 : 1;
  const [barkColor, barkNormal, barkRough, sharedGrass] = useTexture([
    LIVE_TEXTURE.barkColor,
    LIVE_TEXTURE.barkNormal,
    LIVE_TEXTURE.barkRoughness,
    LIVE_TEXTURE.grassColor,
  ]);
  const canopyColor = useMemo(() => sharedGrass.clone(), [sharedGrass]);

  useLayoutEffect(() => {
    prepareLiveTexture(barkColor, 2, true);
    prepareLiveTexture(barkNormal, 2, false);
    prepareLiveTexture(barkRough, 2, false);
    prepareLiveTexture(canopyColor, 2.4, true);
    return () => {
      canopyColor.dispose();
    };
  }, [barkColor, barkNormal, barkRough, canopyColor]);

  useLayoutEffect(() => {
    const trunks = trunkRef.current;
    const canopies = canopyRef.current;
    if (!trunks || !canopies) {
      return;
    }
    const dummy = new Object3D();
    const tint = new Color(CANOPY_TINT[variant]);
    for (let index = 0; index < TREE_COUNT; index += 1) {
      const angle = hashNoise(index * 2.17 + 3) * Math.PI * 2;
      const radius =
        innerRadius +
        hashNoise(index * 3.71 + 11) ** 0.62 * (outerRadius - innerRadius);
      const size = (0.65 + hashNoise(index + 19) * 1.35) * winterScale;
      const treeX = Math.sin(angle) * radius;
      const treeZ = Math.cos(angle) * radius;
      dummy.position.set(treeX, 1.15 * size, treeZ);
      dummy.rotation.set(0, hashNoise(index + 7) * Math.PI * 2, 0);
      dummy.scale.set(0.2 * size, 2.35 * size, 0.2 * size);
      dummy.updateMatrix();
      trunks.setMatrixAt(index, dummy.matrix);

      for (let blob = 0; blob < CANOPY_BLOBS; blob += 1) {
        const blobSeed = index * 13 + blob * 17;
        const offsetX = (hashNoise(blobSeed) - 0.5) * 1.15 * size;
        const offsetZ = (hashNoise(blobSeed + 5) - 0.5) * 1.15 * size;
        const lift = 2.35 * size + blob * 0.55 * size;
        dummy.position.set(treeX + offsetX, lift, treeZ + offsetZ);
        dummy.scale.set(
          (1.05 + hashNoise(blobSeed + 2) * 0.55) * size,
          (0.72 + hashNoise(blobSeed + 4) * 0.38) * size,
          (1.05 + hashNoise(blobSeed + 6) * 0.55) * size,
        );
        dummy.updateMatrix();
        const canopyIndex = index * CANOPY_BLOBS + blob;
        canopies.setMatrixAt(canopyIndex, dummy.matrix);
        const shade = 0.78 + hashNoise(blobSeed + 9) * 0.28;
        canopies.setColorAt(
          canopyIndex,
          tint.clone().multiplyScalar(shade),
        );
      }
    }
    trunks.instanceMatrix.needsUpdate = true;
    canopies.instanceMatrix.needsUpdate = true;
    if (canopies.instanceColor) {
      canopies.instanceColor.needsUpdate = true;
    }
    trunks.computeBoundingSphere();
    canopies.computeBoundingSphere();
  }, [innerRadius, outerRadius, variant, winterScale]);

  return (
    <group name="tree-grove">
      <instancedMesh
        ref={trunkRef}
        args={[undefined, undefined, TREE_COUNT]}
        raycast={() => undefined}
        castShadow
      >
        <cylinderGeometry args={[1, 1.2, 1, 7]} />
        <meshStandardMaterial
          map={barkColor}
          normalMap={barkNormal}
          roughnessMap={barkRough}
          color={TRUNK_TINT[variant]}
          metalness={0.02}
        />
      </instancedMesh>
      <instancedMesh
        ref={canopyRef}
        args={[undefined, undefined, CANOPY_COUNT]}
        raycast={() => undefined}
        castShadow
        receiveShadow
      >
        <sphereGeometry args={[1, 9, 7]} />
        <meshStandardMaterial
          map={canopyColor}
          color={CANOPY_TINT[variant]}
          roughness={0.88}
          metalness={0.01}
          vertexColors
        />
      </instancedMesh>
    </group>
  );
}

useTexture.preload([
  LIVE_TEXTURE.barkColor,
  LIVE_TEXTURE.barkNormal,
  LIVE_TEXTURE.barkRoughness,
  LIVE_TEXTURE.grassColor,
]);
