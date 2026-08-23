import type { AuthoredFrontAxis } from "@/lib/stage-world";

export type CatalogKind = "glb" | "primitive";

export type CatalogFootprint = {
  /** World-space width along X (meters). */
  width: number;
  /** World-space depth along Z (meters). */
  depth: number;
};

export type CatalogItem = {
  id: string;
  label: string;
  role: string;
  kind: CatalogKind;
  url?: string;
  accent: string;
  clip?: string;
  maxCount?: number;
  footprint?: CatalogFootprint;
  inLibrary?: boolean;
  projectFile?: string;
  /** GLB front axis before north yaw. Default +Z (glTF / Blender −Y). */
  authoredFront?: AuthoredFrontAxis;
  /** Authored storey count — construct duration uses this first when set. */
  floorCount?: number;
};

export type PlacedObject = {
  id: string;
  catalogId: string;
  position: [number, number, number];
};
