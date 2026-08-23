import type { CatalogItem, PlacedObject } from "@/lib/catalog-types";
import { PALETTE_CATALOG } from "@/lib/construction/asset-registry";
import { PACK_PALETTE_CATALOG } from "@/lib/pack-catalog";
import { yawToFaceNorth } from "@/lib/stage-world";

export type { CatalogFootprint, CatalogItem, PlacedObject } from "@/lib/catalog-types";

/** Palette toolbar — hero buildings + bundled pack exports. */
export const CATALOG: CatalogItem[] = [...PALETTE_CATALOG, ...PACK_PALETTE_CATALOG];

export function getCatalogItem(catalogId: string) {
  return CATALOG.find((item) => item.id === catalogId);
}

/** True when the catalog entry ships a construct (or slice-fallback) clip name. */
export function catalogHasConstructClip(catalogId: string): boolean {
  const item = getCatalogItem(catalogId);
  return item?.kind === "glb" && Boolean(item.clip);
}

/** Render yaw so the catalog front aims stage north (−Z). */
export function catalogNorthYaw(item: CatalogItem): number {
  return yawToFaceNorth(item.authoredFront);
}

/** GLB URL for drei `useGLTF` / `useGLTF.preload` — query string is the cache key. */
export function getCatalogGlbUrl(catalogId: string): string | undefined {
  const item = getCatalogItem(catalogId);
  if (item?.kind !== "glb" || !item.url) {
    return undefined;
  }
  return item.url;
}

export function getVisibleCatalogItems(
  excludedIds: readonly string[] = [],
): CatalogItem[] {
  if (excludedIds.length === 0) {
    return CATALOG;
  }
  const excludedCatalogIds = new Set(excludedIds);
  return CATALOG.filter((item) => !excludedCatalogIds.has(item.id));
}

export function countPlaced(
  objects: readonly PlacedObject[],
  catalogId: string,
): number {
  return objects.filter((object) => object.catalogId === catalogId).length;
}

export function canPlaceCatalogItem(
  catalogId: string,
  objects: readonly PlacedObject[],
  sandboxMode = false,
): boolean {
  const item = getCatalogItem(catalogId);
  if (!item) {
    return false;
  }
  if (sandboxMode || item.maxCount === undefined) {
    return true;
  }
  return countPlaced(objects, catalogId) < item.maxCount;
}
