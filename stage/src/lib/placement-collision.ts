import {
  getCatalogItem,
  type CatalogFootprint,
  type PlacedObject,
} from "@/lib/catalog";

/** Minimum gap between placed asset footprints (meters). */
export const PLACEMENT_COLLISION_PADDING = 0.25;

const DEFAULT_FOOTPRINT: CatalogFootprint = { width: 2, depth: 2 };

export type XzBounds = {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
};

export function getPlacementFootprint(catalogId: string): CatalogFootprint {
  const item = getCatalogItem(catalogId);
  return item?.footprint ?? DEFAULT_FOOTPRINT;
}

/** Axis-aligned bounds on the XZ plane, centered at position with optional padding. */
export function getXzBounds(
  position: readonly [number, number, number],
  footprint: CatalogFootprint,
  padding = PLACEMENT_COLLISION_PADDING,
): XzBounds {
  const [x, , z] = position;
  const halfWidth = footprint.width / 2 + padding;
  const halfDepth = footprint.depth / 2 + padding;

  return {
    minX: x - halfWidth,
    maxX: x + halfWidth,
    minZ: z - halfDepth,
    maxZ: z + halfDepth,
  };
}

export function xzBoundsOverlap(a: XzBounds, b: XzBounds): boolean {
  return (
    a.minX < b.maxX &&
    a.maxX > b.minX &&
    a.minZ < b.maxZ &&
    a.maxZ > b.minZ
  );
}

/** True when the candidate footprint does not overlap any existing placement. */
export function canPlaceAt(
  catalogId: string,
  position: [number, number, number],
  existingObjects: readonly PlacedObject[],
  padding = PLACEMENT_COLLISION_PADDING,
): boolean {
  const footprint = getPlacementFootprint(catalogId);
  const candidateBounds = getXzBounds(position, footprint, padding);

  for (const existing of existingObjects) {
    const existingFootprint = getPlacementFootprint(existing.catalogId);
    const existingBounds = getXzBounds(existing.position, existingFootprint, padding);
    if (xzBoundsOverlap(candidateBounds, existingBounds)) {
      return false;
    }
  }

  return true;
}
