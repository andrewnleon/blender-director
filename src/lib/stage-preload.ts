import { getCatalogGlbUrl } from "@/lib/catalog";
import {
  getLibraryCatalogItems,
  getLibraryPreloadPriority,
} from "@/lib/library-layout";
import { LIVE_TEXTURE } from "@/lib/live-textures";

/** Hero buildings that fill the first library rows. */
export const STAGE_FIRST_WAVE_COUNT = 6;

/** Pack GLBs after the first wave — keep low so heroes finish first. */
export const STAGE_BACKGROUND_CONCURRENCY = 2;

export function uniqueCatalogIds(ids: readonly string[]): string[] {
  const seen = new Set<string>();
  const ordered: string[] = [];
  for (const catalogId of ids) {
    if (seen.has(catalogId)) {
      continue;
    }
    seen.add(catalogId);
    ordered.push(catalogId);
  }
  return ordered;
}

export function getFirstWaveCatalogIds(
  priorityCatalogIds: readonly string[],
): string[] {
  return uniqueCatalogIds(priorityCatalogIds).slice(0, STAGE_FIRST_WAVE_COUNT);
}

export function getBackgroundCatalogIds(
  priorityCatalogIds: readonly string[],
  placedCatalogIds: readonly string[] = [],
): string[] {
  const firstWaveIds = new Set(getFirstWaveCatalogIds(priorityCatalogIds));
  return uniqueCatalogIds([...priorityCatalogIds, ...placedCatalogIds]).filter(
    (catalogId) => !firstWaveIds.has(catalogId),
  );
}

export function catalogIdsToGlbUrls(catalogIds: readonly string[]): string[] {
  const urls: string[] = [];
  for (const catalogId of catalogIds) {
    const url = getCatalogGlbUrl(catalogId);
    if (url) {
      urls.push(url);
    }
  }
  return urls;
}

/** Same-origin GLB URLs for `<link rel="preload">` / `preload()` before JS. */
export function getStageHttpPreloadUrls(): string[] {
  const libraryItems = getLibraryCatalogItems();
  const priorityIds = getLibraryPreloadPriority(libraryItems);
  return catalogIdsToGlbUrls(getFirstWaveCatalogIds(priorityIds));
}

/** Ground + horizon textures needed for first paint. */
export function getStageTexturePreloadUrls(): string[] {
  return [
    LIVE_TEXTURE.grassColor,
    LIVE_TEXTURE.grassNormal,
    LIVE_TEXTURE.grassRoughness,
    LIVE_TEXTURE.dirtColor,
    LIVE_TEXTURE.rockColor,
    LIVE_TEXTURE.barkColor,
  ];
}
