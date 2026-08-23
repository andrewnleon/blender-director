import { CATALOG } from "@/lib/catalog";

export const LIBRARY_EXCLUSIONS_STORAGE_KEY =
  "openclaw-library.excluded-catalog-ids:v1";

const CATALOG_ID_PATTERN = /^[a-z0-9][a-z0-9-]{0,80}$/;

export function isCatalogIdFormat(value: string): boolean {
  return CATALOG_ID_PATTERN.test(value);
}

export function isKnownCatalogId(catalogId: string): boolean {
  return CATALOG.some((item) => item.id === catalogId);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseExcludedCatalogIds(value: unknown): string[] | null {
  if (!isRecord(value)) {
    return null;
  }
  const catalogIds = value.catalogIds;
  if (!Array.isArray(catalogIds)) {
    return null;
  }
  const parsed: string[] = [];
  for (const entry of catalogIds) {
    if (typeof entry !== "string" || !isCatalogIdFormat(entry)) {
      return null;
    }
    if (!parsed.includes(entry)) {
      parsed.push(entry);
    }
  }
  return parsed;
}

export function parseCatalogIdBody(value: unknown): string | null {
  if (!isRecord(value)) {
    return null;
  }
  const catalogId = value.catalogId;
  if (typeof catalogId !== "string" || !isCatalogIdFormat(catalogId)) {
    return null;
  }
  return catalogId;
}

export function readLocalExcludedCatalogIds(): string[] {
  if (typeof window === "undefined") {
    return [];
  }
  try {
    const stored = localStorage.getItem(LIBRARY_EXCLUSIONS_STORAGE_KEY);
    if (!stored) {
      return [];
    }
    const parsed: unknown = JSON.parse(stored);
    return parseExcludedCatalogIds(parsed) ?? [];
  } catch {
    return [];
  }
}

export function writeLocalExcludedCatalogIds(catalogIds: string[]): void {
  try {
    localStorage.setItem(
      LIBRARY_EXCLUSIONS_STORAGE_KEY,
      JSON.stringify({ catalogIds }),
    );
  } catch {
    // localStorage may be unavailable in private browsing
  }
}
