"use client";

import { getCatalogItem } from "@/lib/catalog";

type StagePlacementPlaceholderProps = {
  catalogId: string;
  position: readonly [number, number, number];
};

/** Lightweight lot marker while the GLB preload queue reaches this building. */
export function StagePlacementPlaceholder({
  catalogId,
  position,
}: StagePlacementPlaceholderProps) {
  const item = getCatalogItem(catalogId);
  const accent = item?.accent ?? "#7a8a72";
  const width = item?.footprint?.width ?? 10;
  const depth = item?.footprint?.depth ?? 10;

  return (
    <group position={[position[0], 0, position[2]]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]}>
        <planeGeometry args={[width * 0.92, depth * 0.92]} />
        <meshBasicMaterial color={accent} transparent opacity={0.22} />
      </mesh>
      <mesh position={[0, 0.35, 0]}>
        <boxGeometry args={[width * 0.18, 0.7, depth * 0.18]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.15} />
      </mesh>
    </group>
  );
}
