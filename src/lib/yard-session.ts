import { getCatalogItem, type PlacedObject } from "@/lib/catalog";

export const YARD_OBJECTS_SESSION_KEY = "openclaw-yard.objects";
export const PLACE_CATALOG_SESSION_KEY = "openclaw-yard.place-catalog-id";
export const DEFAULT_PLACE_CATALOG_ID = "operations-center";

/** Yard session keys — palette + exclusions. Grid layout uses `library-layout.ts`. */

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

/** Restore yard lots without changing positions. Invalid / unknown ids drop. */
export function parseYardObjects(value: unknown): PlacedObject[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const objects: PlacedObject[] = [];
  for (const entry of value) {
    if (typeof entry !== "object" || entry === null) {
      continue;
    }
    if (!("id" in entry) || !("catalogId" in entry) || !("position" in entry)) {
      continue;
    }
    const { id, catalogId, position } = entry;
    if (typeof id !== "string" || typeof catalogId !== "string") {
      continue;
    }
    if (!getCatalogItem(catalogId)) {
      continue;
    }
    if (!Array.isArray(position) || position.length !== 3) {
      continue;
    }
    const posX = position[0];
    const posY = position[1];
    const posZ = position[2];
    if (!isFiniteNumber(posX) || !isFiniteNumber(posY) || !isFiniteNumber(posZ)) {
      continue;
    }
    objects.push({
      id,
      catalogId,
      position: [posX, posY, posZ],
    });
  }
  return objects;
}

export function readYardObjectsFromSession(): PlacedObject[] {
  if (typeof window === "undefined") {
    return [];
  }
  try {
    const stored = sessionStorage.getItem(YARD_OBJECTS_SESSION_KEY);
    if (!stored) {
      return [];
    }
    return parseYardObjects(JSON.parse(stored));
  } catch {
    return [];
  }
}

/** Drop legacy manual yard lots — grid layout is computed in `library-layout.ts`. */
export function clearLegacyYardObjectsFromSession(): void {
  try {
    sessionStorage.removeItem(YARD_OBJECTS_SESSION_KEY);
  } catch {
    // sessionStorage may be unavailable in private browsing
  }
}

/** `null` stored means no building selected. Missing key uses the fallback. */
export function parsePlaceCatalogId(
  stored: string | null,
  fallbackId: string | null = DEFAULT_PLACE_CATALOG_ID,
): string | null {
  if (stored === null) {
    return fallbackId;
  }
  if (stored === "") {
    return null;
  }
  if (!getCatalogItem(stored)) {
    return fallbackId;
  }
  return stored;
}

export function readPlaceCatalogIdFromSession(
  fallbackId: string | null = DEFAULT_PLACE_CATALOG_ID,
): string | null {
  if (typeof window === "undefined") {
    return fallbackId;
  }
  try {
    return parsePlaceCatalogId(
      sessionStorage.getItem(PLACE_CATALOG_SESSION_KEY),
      fallbackId,
    );
  } catch {
    return fallbackId;
  }
}

export function writePlaceCatalogIdToSession(catalogId: string | null): void {
  try {
    sessionStorage.setItem(PLACE_CATALOG_SESSION_KEY, catalogId ?? "");
  } catch {
    // sessionStorage may be unavailable in private browsing
  }
}
