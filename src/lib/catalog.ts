import type { CatalogItem, PlacedObject } from "@/lib/catalog-types";
import { PALETTE_CATALOG } from "@/lib/construction/asset-registry";

export type { CatalogFootprint, CatalogItem, PlacedObject } from "@/lib/catalog-types";

/** Palette toolbar — entries from asset registry with shipped GLBs. */
export const CATALOG: CatalogItem[] = PALETTE_CATALOG;

export function getCatalogItem(catalogId: string) {
  return CATALOG.find((item) => item.id === catalogId);
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
