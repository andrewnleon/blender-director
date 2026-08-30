import { Mesh, type Object3D } from "three";
import { isSiteKitObjectName } from "@/lib/construction/site-kit";

/** Hero pad stays at rest; pack lots sit on living ground once kit unmounts. */
const REST_KEEP_EXACT = new Set(["ST_Pad"]);

const PACK_CONSTRUCT_SLICE = /_(floor\d+|site|crown)$/i;
const EXTERIOR_HULL = /_complete$|_shell$/i;

export function isExteriorHullName(name: string): boolean {
  return EXTERIOR_HULL.test(name);
}

export function isRestKeepName(name: string): boolean {
  return REST_KEEP_EXACT.has(name);
}

/** Floor plates, cores, site cage, crane, construct slices — not the curtain hull. */
export function shouldHideAtHollowComplete(name: string): boolean {
  if (isRestKeepName(name) || isExteriorHullName(name)) {
    return false;
  }
  if (isSiteKitObjectName(name)) {
    return true;
  }
  if (/crane/i.test(name)) {
    return true;
  }
  if (PACK_CONSTRUCT_SLICE.test(name)) {
    return true;
  }
  if (/dirtground|interior|corelift|floorslab/i.test(name)) {
    return true;
  }
  return false;
}

/** Meshes `applyHollowCompleteVisibility` touches — cache per root for per-frame use. */
export function collectHollowCompleteMeshes(root: Object3D): Mesh[] {
  const meshes: Mesh[] = [];
  root.traverse((child) => {
    if (!(child instanceof Mesh)) {
      return;
    }
    if (!shouldHideAtHollowComplete(child.name)) {
      return;
    }
    meshes.push(child);
  });
  return meshes;
}

export function applyHollowCompleteMeshVisibility(
  meshes: readonly Mesh[],
  isHollowComplete: boolean,
): void {
  for (const mesh of meshes) {
    mesh.visible = !isHollowComplete;
    mesh.castShadow = !isHollowComplete;
    mesh.receiveShadow = !isHollowComplete;
  }
}

export function applyHollowCompleteVisibility(
  root: Object3D,
  isHollowComplete: boolean,
): void {
  applyHollowCompleteMeshVisibility(
    collectHollowCompleteMeshes(root),
    isHollowComplete,
  );
}

export function isHollowCompleteState(input: {
  constructDone: boolean;
  isConstructReplaying: boolean;
}): boolean {
  return input.constructDone;
}
