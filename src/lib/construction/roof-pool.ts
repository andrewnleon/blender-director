import { Mesh, type Object3D } from "three";

/** Catalog tower with a finished roof deck large enough for a pool. */
export const ROOF_POOL_CATALOG_ID = "pack-futuristic-city-2560";

/** Keep water inside the roof lip. */
export const ROOF_POOL_INSET = 0.22;

/** Vertices this close to max Y count as the roof deck. */
export const ROOF_DECK_BAND = 0.18;

const ROOF_POOL_MIN_SPAN = 0.6;

export type RoofPoolLayout = {
  centerX: number;
  centerZ: number;
  width: number;
  depth: number;
  roofY: number;
};

export function shouldMountRoofPool(catalogId: string): boolean {
  return catalogId === ROOF_POOL_CATALOG_ID;
}

function isCompleteHullName(name: string): boolean {
  return /_complete$/i.test(name);
}

function isIgnoredRoofName(name: string): boolean {
  return /crane/i.test(name) || /_(site|floor\d+|crown)$/i.test(name);
}

function collectRoofMeshes(root: Object3D): Mesh[] {
  const completeMeshes: Mesh[] = [];
  const fallbackMeshes: Mesh[] = [];
  root.traverse((child) => {
    if (!(child instanceof Mesh) || !child.geometry) {
      return;
    }
    if (isCompleteHullName(child.name)) {
      completeMeshes.push(child);
      return;
    }
    if (!isIgnoredRoofName(child.name)) {
      fallbackMeshes.push(child);
    }
  });
  return completeMeshes.length > 0 ? completeMeshes : fallbackMeshes;
}

function readPosition(
  geometry: Mesh["geometry"],
): { count: number; getX: (index: number) => number; getY: (index: number) => number; getZ: (index: number) => number } | null {
  const attribute = geometry.getAttribute("position");
  if (
    !attribute ||
    attribute.itemSize < 3 ||
    typeof attribute.count !== "number" ||
    attribute.count < 1
  ) {
    return null;
  }
  return attribute;
}

/**
 * Roof-deck plan from mesh geometry (ignores bind-pose scale 0).
 * Prefers `*_complete` hulls so crane / construct slices do not raise the water.
 */
export function measureRoofPoolLayout(
  root: Object3D,
  inset: number = ROOF_POOL_INSET,
): RoofPoolLayout | null {
  const meshes = collectRoofMeshes(root);
  if (meshes.length === 0) {
    return null;
  }

  let maxY = Number.NEGATIVE_INFINITY;
  const samples: Array<{ x: number; y: number; z: number }> = [];

  for (const mesh of meshes) {
    const position = readPosition(mesh.geometry);
    if (!position) {
      continue;
    }
    const originX = mesh.position.x;
    const originY = mesh.position.y;
    const originZ = mesh.position.z;
    for (let index = 0; index < position.count; index += 1) {
      const x = position.getX(index) + originX;
      const y = position.getY(index) + originY;
      const z = position.getZ(index) + originZ;
      samples.push({ x, y, z });
      if (y > maxY) {
        maxY = y;
      }
    }
  }

  if (samples.length === 0 || !Number.isFinite(maxY)) {
    return null;
  }

  const band = Math.max(ROOF_DECK_BAND, Math.abs(maxY) * 0.004);
  let minX = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let minZ = Number.POSITIVE_INFINITY;
  let maxZ = Number.NEGATIVE_INFINITY;
  let deckCount = 0;

  for (const sample of samples) {
    if (sample.y < maxY - band) {
      continue;
    }
    deckCount += 1;
    if (sample.x < minX) minX = sample.x;
    if (sample.x > maxX) maxX = sample.x;
    if (sample.z < minZ) minZ = sample.z;
    if (sample.z > maxZ) maxZ = sample.z;
  }

  if (deckCount === 0) {
    return null;
  }

  const rawWidth = maxX - minX;
  const rawDepth = maxZ - minZ;
  const width = Math.max(ROOF_POOL_MIN_SPAN, rawWidth - inset * 2);
  const depth = Math.max(ROOF_POOL_MIN_SPAN, rawDepth - inset * 2);

  return {
    centerX: (minX + maxX) * 0.5,
    centerZ: (minZ + maxZ) * 0.5,
    width,
    depth,
    roofY: maxY,
  };
}
