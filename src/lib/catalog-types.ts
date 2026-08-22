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
};

export type PlacedObject = {
  id: string;
  catalogId: string;
  position: [number, number, number];
};
