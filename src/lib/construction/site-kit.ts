import {
  Box3,
  Group,
  Material,
  Matrix4,
  Mesh,
  Quaternion,
  Vector3,
  type Object3D,
} from "three";
import type { CatalogFootprint } from "../catalog-types";
import type { ConstructClock } from "./types";

/** Matches `build_skyscraper.py` SITE_HALF * 2, FOOTPRINT, HEIGHT. */
export const SKYSCRAPER_SITE_AUTHORING = {
  siteWidth: 9.92,
  siteDepth: 9.92,
  cageWidth: 6,
  cageDepth: 6,
  cageHeight: 18,
} as const;

export const SKYSCRAPER_CATALOG_ID = "skyscraper";

const SITE_KIT_EXACT = new Set([
  "ST_Pad",
  "ST_Foundation",
  "ST_ExcavPit",
  "ST_UtilRun",
  "ST_Footings",
]);

const SITE_KIT_PREFIXES = [
  "ST_SiteCrate_",
  "ST_Stake_",
  "ST_Fence_",
  "ST_Columns_",
  "ST_FrameFloor_",
  "ST_Deck_",
  "ST_FloorSlab_",
  "ST_CoreLift_",
] as const;

const MIN_TARGET_PLAN = 0.5;
const MIN_TARGET_HEIGHT = 1.5;
const BIND_COLLAPSE = 0.0001;

/**
 * Hero construct windows (`animate_skyscraper.py`, END≈968):
 * site prep → foundation → per-floor frame → park/complete hides overlay.
 */
export const SITE_KIT_REVEAL = {
  siteStart: 0.02,
  subgradeStart: 0.08,
  frameStart: 0.12,
  frameEnd: 0.82,
  restHide: 0.9,
} as const;

export type SiteKitLayer = "site" | "subgrade" | "frame";

export type SiteKitScale = {
  x: number;
  y: number;
  z: number;
};

export type AuthoredBounds = {
  width: number;
  depth: number;
  height: number;
};

export function getSkyscraperGlbUrl(catalogUrl?: string): string {
  return catalogUrl ?? "/models/skyscraper.glb";
}

export function shouldAttachSiteKit(catalogId: string): boolean {
  return catalogId !== SKYSCRAPER_CATALOG_ID;
}

/** Full cage clones stay off the graph when the lot is at hollow rest. */
export function shouldMountSiteKit(
  catalogId: string,
  isConstructActive: boolean,
): boolean {
  return isConstructActive && shouldAttachSiteKit(catalogId);
}

/** Cloned kit materials only — GLTF geometry stays in the loader cache. */
export function disposeSiteKitMaterials(root: Object3D): void {
  root.traverse((child) => {
    if (!(child instanceof Mesh)) {
      return;
    }
    const materials = Array.isArray(child.material)
      ? child.material
      : [child.material];
    for (const material of materials) {
      if (material instanceof Material) {
        material.dispose();
      }
    }
  });
}

export function isSiteKitObjectName(name: string): boolean {
  if (SITE_KIT_EXACT.has(name)) {
    return true;
  }
  return SITE_KIT_PREFIXES.some((prefix) => name.startsWith(prefix));
}

export function shouldIgnoreForAuthoredMeasure(name: string): boolean {
  return /crane/i.test(name);
}

export function computeSiteKitScale(input: {
  targetWidth: number;
  targetDepth: number;
  targetHeight: number;
}): SiteKitScale {
  const width = Math.max(input.targetWidth, MIN_TARGET_PLAN);
  const depth = Math.max(input.targetDepth, MIN_TARGET_PLAN);
  const height = Math.max(input.targetHeight, MIN_TARGET_HEIGHT);
  return {
    x: width / SKYSCRAPER_SITE_AUTHORING.siteWidth,
    y: height / SKYSCRAPER_SITE_AUTHORING.cageHeight,
    z: depth / SKYSCRAPER_SITE_AUTHORING.siteDepth,
  };
}

export function resolveSiteKitTargets(
  footprint: CatalogFootprint | undefined,
  bounds: AuthoredBounds,
): { targetWidth: number; targetDepth: number; targetHeight: number } {
  const catalogWidth = footprint?.width ?? 0;
  const catalogDepth = footprint?.depth ?? 0;
  return {
    targetWidth: Math.max(catalogWidth, bounds.width),
    targetDepth: Math.max(catalogDepth, bounds.depth),
    targetHeight: bounds.height,
  };
}

export function measureAuthoredBounds(root: Object3D): AuthoredBounds {
  const union = new Box3();
  const geometryBox = new Box3();
  const position = new Vector3();
  const quaternion = new Quaternion();
  const scale = new Vector3();
  const unitMatrix = new Matrix4();
  let hasBounds = false;

  root.updateWorldMatrix(true, true);
  root.traverse((child) => {
    if (!(child instanceof Mesh) || !child.geometry) {
      return;
    }
    if (shouldIgnoreForAuthoredMeasure(child.name)) {
      return;
    }
    child.geometry.computeBoundingBox();
    const localBox = child.geometry.boundingBox;
    if (!localBox || localBox.isEmpty()) {
      return;
    }
    geometryBox.copy(localBox);
    child.matrixWorld.decompose(position, quaternion, scale);
    unitMatrix.compose(position, quaternion, new Vector3(1, 1, 1));
    geometryBox.applyMatrix4(unitMatrix);
    if (!hasBounds) {
      union.copy(geometryBox);
      hasBounds = true;
      return;
    }
    union.union(geometryBox);
  });

  if (!hasBounds || union.isEmpty()) {
    return {
      width: SKYSCRAPER_SITE_AUTHORING.siteWidth,
      depth: SKYSCRAPER_SITE_AUTHORING.siteDepth,
      height: SKYSCRAPER_SITE_AUTHORING.cageHeight,
    };
  }

  return {
    width: union.max.x - union.min.x,
    depth: union.max.z - union.min.z,
    height: union.max.y - union.min.y,
  };
}

const FRAME_NAME =
  /^(ST_Columns_|ST_FrameFloor_|ST_Deck_|ST_FloorSlab_|ST_CoreLift_)(\d+)$/;

export function classifySiteKitPiece(name: string): {
  layer: SiteKitLayer;
  floorIndex: number | null;
} {
  const frameMatch = name.match(FRAME_NAME);
  if (frameMatch) {
    return { layer: "frame", floorIndex: Number(frameMatch[2]) };
  }
  if (
    name === "ST_Foundation" ||
    name === "ST_ExcavPit" ||
    name === "ST_UtilRun" ||
    name === "ST_Footings"
  ) {
    return { layer: "subgrade", floorIndex: null };
  }
  return { layer: "site", floorIndex: null };
}

export function maxSiteKitFloor(root: Object3D): number {
  let maxFloor = 0;
  root.traverse((child) => {
    const classified = classifySiteKitPiece(child.name);
    if (classified.floorIndex !== null && classified.floorIndex > maxFloor) {
      maxFloor = classified.floorIndex;
    }
  });
  return maxFloor;
}

export function isSiteKitPieceRevealed(
  name: string,
  progress: number,
  maxFloor: number,
): boolean {
  if (progress <= SITE_KIT_REVEAL.siteStart || progress >= SITE_KIT_REVEAL.restHide) {
    return false;
  }
  const classified = classifySiteKitPiece(name);
  if (classified.layer === "site") {
    return true;
  }
  if (classified.layer === "subgrade") {
    return progress >= SITE_KIT_REVEAL.subgradeStart;
  }
  if (progress < SITE_KIT_REVEAL.frameStart) {
    return false;
  }
  if (maxFloor <= 0) {
    return progress < SITE_KIT_REVEAL.restHide;
  }
  const span = SITE_KIT_REVEAL.frameEnd - SITE_KIT_REVEAL.frameStart;
  const frameT = Math.min(
    1,
    Math.max(0, (progress - SITE_KIT_REVEAL.frameStart) / span),
  );
  const revealedFloor = Math.ceil(frameT * maxFloor);
  const floorIndex = classified.floorIndex ?? 1;
  return floorIndex <= revealedFloor;
}

/** Hide or pop kit pieces from construct 0–1. Rest/complete = all collapsed. */
export function applySiteKitReveal(root: Object3D, progress: number): void {
  const maxFloor = maxSiteKitFloor(root);
  let hasVisible = false;
  root.traverse((child) => {
    if (!(child instanceof Mesh) || !isSiteKitObjectName(child.name)) {
      return;
    }
    const isRevealed = isSiteKitPieceRevealed(child.name, progress, maxFloor);
    child.visible = isRevealed;
    if (isRevealed) {
      child.scale.set(1, 1, 1);
      hasVisible = true;
      return;
    }
    child.scale.setScalar(BIND_COLLAPSE);
  });
  root.visible = hasVisible;
}

export function writeConstructClock(
  clock: ConstructClock | null | undefined,
  progress01: number,
  isPlaying: boolean,
): void {
  if (!clock) {
    return;
  }
  clock.progress01 = Math.min(1, Math.max(0, progress01));
  clock.isPlaying = isPlaying;
}

/** Clone skyscraper site + RC cage at authored size (bind pose is collapsed). */
export function extractSiteKit(sourceRoot: Object3D): Group {
  const group = new Group();
  group.name = "ST_SiteKitInstance";
  const position = new Vector3();
  const quaternion = new Quaternion();
  const scale = new Vector3();

  sourceRoot.updateWorldMatrix(true, true);
  sourceRoot.traverse((child) => {
    if (!(child instanceof Mesh)) {
      return;
    }
    if (!isSiteKitObjectName(child.name)) {
      return;
    }
    const clone = child.clone(false);
    child.matrixWorld.decompose(position, quaternion, scale);
    clone.position.copy(position);
    clone.quaternion.copy(quaternion);
    clone.scale.set(1, 1, 1);
    clone.visible = true;
    clone.matrixAutoUpdate = true;
    group.add(clone);
  });

  return group;
}
