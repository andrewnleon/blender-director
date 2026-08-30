import {
  canPlaceCatalogItem,
  type PlacedObject,
} from "@/lib/catalog";
import { canPlaceAt } from "@/lib/placement-collision";

/** Marks lots the user clicked onto the grid — `library-` ids stay auto-placed. */
export const USER_PLACEMENT_ID_PREFIX = "placed-";

export function isUserPlacementId(placementId: string): boolean {
  return placementId.startsWith(USER_PLACEMENT_ID_PREFIX);
}

/** Snapped lot centers are unique, so catalog id + XZ is a stable placement id. */
export function userPlacementId(
  catalogId: string,
  position: readonly [number, number, number],
): string {
  return `${USER_PLACEMENT_ID_PREFIX}${catalogId}-${position[0]}x${position[2]}`;
}

/**
 * Stage lots = auto-placed library grid + user lots. The grid is derived from the
 * catalog, so user lots must be concatenated rather than replaced by it.
 */
export function mergeStagePlacements(
  libraryPlacements: readonly PlacedObject[],
  userPlacements: readonly PlacedObject[],
): PlacedObject[] {
  const libraryIds = new Set(
    libraryPlacements.map((placement) => placement.id),
  );
  return [
    ...libraryPlacements,
    ...userPlacements.filter((placement) => !libraryIds.has(placement.id)),
  ];
}

export type AppendUserPlacementInput = {
  catalogId: string;
  position: [number, number, number];
  userPlacements: readonly PlacedObject[];
  /** Merged stage lots — caps and overlap are checked against the grid too. */
  stagePlacements: readonly PlacedObject[];
  isSandboxMode?: boolean;
};

/** `null` when the catalog `maxCount` cap or a footprint overlap blocks the lot. */
export function appendUserPlacement({
  catalogId,
  position,
  userPlacements,
  stagePlacements,
  isSandboxMode = false,
}: AppendUserPlacementInput): PlacedObject[] | null {
  if (!canPlaceCatalogItem(catalogId, stagePlacements, isSandboxMode)) {
    return null;
  }
  if (!canPlaceAt(catalogId, position, stagePlacements)) {
    return null;
  }
  return [
    ...userPlacements,
    { id: userPlacementId(catalogId, position), catalogId, position },
  ];
}

export function removeUserPlacement(
  userPlacements: readonly PlacedObject[],
  placementId: string,
): PlacedObject[] {
  return userPlacements.filter((placement) => placement.id !== placementId);
}
