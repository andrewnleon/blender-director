import type { PlacedObject } from "@/lib/catalog-types";

/** Hard cap — full catalog (~60 GLBs + site kits) stalls the stage. */
export const STAGE_MAX_MOUNTED_LOTS = 12;

function planDistanceSq(
  position: readonly [number, number, number],
  focusX: number,
  focusZ: number,
): number {
  const dx = position[0] - focusX;
  const dz = position[2] - focusZ;
  return dx * dx + dz * dz;
}

/**
 * Catalog ids to mount: selected lots first, then nearest to the look-at point.
 * Far lots stay as placeholders so slices / kits do not stack the GPU.
 */
export function pickMountedCatalogIds(
  objects: readonly PlacedObject[],
  focusX: number,
  focusZ: number,
  alwaysCatalogIds: readonly string[],
  maxCount: number = STAGE_MAX_MOUNTED_LOTS,
): string[] {
  const limit = Math.max(1, maxCount);
  const mounted: string[] = [];
  const seen = new Set<string>();

  for (const catalogId of alwaysCatalogIds) {
    if (seen.has(catalogId) || mounted.length >= limit) {
      continue;
    }
    if (!objects.some((object) => object.catalogId === catalogId)) {
      continue;
    }
    seen.add(catalogId);
    mounted.push(catalogId);
  }

  const ranked = [...objects].toSorted(
    (left, right) =>
      planDistanceSq(left.position, focusX, focusZ) -
      planDistanceSq(right.position, focusX, focusZ),
  );

  for (const object of ranked) {
    if (mounted.length >= limit) {
      break;
    }
    if (seen.has(object.catalogId)) {
      continue;
    }
    seen.add(object.catalogId);
    mounted.push(object.catalogId);
  }

  return mounted;
}
