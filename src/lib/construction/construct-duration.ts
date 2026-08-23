import type { Object3D } from "three";
import { SKYSCRAPER_SITE_AUTHORING } from "./site-kit";

/**
 * Hero construct (`animate_skyscraper.py`): END≈968 @ 24 fps, 12 floors, 18 m cage.
 * Wall-clock target is `SECONDS_PER_FLOOR * floorCount` so a 3-floor house
 * finishes before a 12-floor tower even when both clips start together.
 */
export const HERO_CONSTRUCT_END_FRAME = 968;
export const HERO_CONSTRUCT_FPS = 24;
export const HERO_FLOOR_COUNT = 12;
export const HERO_HEIGHT_M = SKYSCRAPER_SITE_AUTHORING.cageHeight;
export const HERO_CONSTRUCT_DURATION_S =
  HERO_CONSTRUCT_END_FRAME / HERO_CONSTRUCT_FPS;

/** Seconds per floor — hero clip length / hero floor count (~3.36 s). */
export const SECONDS_PER_FLOOR = HERO_CONSTRUCT_DURATION_S / HERO_FLOOR_COUNT;

/** Last-resort storey height when site-kit scale cannot run. */
export const TYPICAL_STOREY_M = 3.25;

const FRAME_OR_DECK = /^(?:ST_FrameFloor_|ST_Deck_|ST_FloorSlab_)(\d+)$/;
const PACK_FLOOR = /_floor(\d+)$/i;
const PACK_BAND = /_(site|crown)$/i;
const PACK_SLICE = /_(floor\d+|site|crown)$/i;

export function parseNamedFloorIndex(name: string): number | null {
  const frameMatch = name.match(FRAME_OR_DECK);
  if (frameMatch) {
    return Number(frameMatch[1]);
  }
  const packMatch = name.match(PACK_FLOOR);
  if (packMatch) {
    return Number(packMatch[1]);
  }
  return null;
}

export function collectObjectNames(root: Object3D): string[] {
  const names: string[] = [];
  root.traverse((child) => {
    if (child.name.length > 0) {
      names.push(child.name);
    }
  });
  return names;
}

/** Unique frame/deck/floor indices; pack site+crown bands add to the count. */
export function countNamedFloors(names: readonly string[]): number {
  const indices = new Set<number>();
  let packSliceCount = 0;
  let packBandCount = 0;
  for (const name of names) {
    const floorIndex = parseNamedFloorIndex(name);
    if (floorIndex !== null) {
      indices.add(floorIndex);
    }
    if (PACK_SLICE.test(name)) {
      packSliceCount += 1;
    }
    if (PACK_BAND.test(name)) {
      packBandCount += 1;
    }
  }
  if (indices.size > 0) {
    const maxIndex = Math.max(...indices);
    const namedCount = Math.max(maxIndex, indices.size);
    if (packBandCount > 0) {
      return Math.max(namedCount + packBandCount, packSliceCount);
    }
    return namedCount;
  }
  return packSliceCount;
}

/** `sy = meshH / 18` × hero floors, else meshH / typical storey. */
export function estimateFloorsFromHeight(meshHeightM: number): number {
  if (!(meshHeightM > 0)) {
    return 1;
  }
  const fromHeroScale = Math.round(
    HERO_FLOOR_COUNT * (meshHeightM / HERO_HEIGHT_M),
  );
  if (fromHeroScale >= 1) {
    return fromHeroScale;
  }
  return Math.max(1, Math.round(meshHeightM / TYPICAL_STOREY_M));
}

export function resolveConstructFloorCount(input: {
  names?: readonly string[];
  meshHeightM?: number;
  catalogFloorCount?: number;
}): number {
  const catalogFloorCount = input.catalogFloorCount;
  if (
    catalogFloorCount !== undefined &&
    Number.isFinite(catalogFloorCount) &&
    catalogFloorCount >= 1
  ) {
    return Math.round(catalogFloorCount);
  }
  const namedCount = countNamedFloors(input.names ?? []);
  if (namedCount >= 1) {
    return namedCount;
  }
  return estimateFloorsFromHeight(input.meshHeightM ?? 0);
}

const CRANE_CLIP_NAME = /crane/i;

export function isCraneConstructClip(clipName: string): boolean {
  return CRANE_CLIP_NAME.test(clipName);
}

/**
 * Shared construct timeline length. Per-object Blender exports have no
 * `construct` clip — boom/jib/hook actions often keep keys after the build
 * (skyscraper boom ≈370s vs beacon ≈186s). Using those as leader timeScales
 * the tower too fast and leaves the jib spinning after floors clamp.
 */
export function constructLeaderDuration(
  clips: readonly { name: string; duration: number }[],
): number {
  let constructMax = 0;
  let allMax = 0;
  for (const clip of clips) {
    allMax = Math.max(allMax, clip.duration);
    if (!isCraneConstructClip(clip.name)) {
      constructMax = Math.max(constructMax, clip.duration);
    }
  }
  if (constructMax > 1e-6) {
    return constructMax;
  }
  return allMax;
}

export function pickConstructLeaderClip<T extends { name: string; duration: number }>(
  clips: readonly T[],
): T | undefined {
  if (clips.length === 0) {
    return undefined;
  }
  const constructClips = clips.filter((clip) => !isCraneConstructClip(clip.name));
  const pool = constructClips.length > 0 ? constructClips : clips;
  return pool.reduce((longest, clip) =>
    clip.duration > longest.duration ? clip : longest,
  );
}

/** AnimationAction.timeScale so wall-clock ≈ SECONDS_PER_FLOOR * floors. */
export function constructActionTimeScale(
  clipDurationS: number,
  floorCount: number,
): number {
  const floors = Math.max(1, floorCount);
  const targetDurationS = SECONDS_PER_FLOOR * floors;
  if (clipDurationS <= 1e-6 || targetDurationS <= 1e-6) {
    return 1;
  }
  return clipDurationS / targetDurationS;
}

export function constructWallClockSeconds(
  clipDurationS: number,
  floorCount: number,
): number {
  return clipDurationS / constructActionTimeScale(clipDurationS, floorCount);
}
