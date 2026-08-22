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

  /** Play this GLTF clip once when the asset is placed. */

  clip?: string;

  /** Cap how many of this asset can sit in the yard. Omit = unlimited. */

  maxCount?: number;

  /** Approximate ground footprint for library grid spacing. */

  footprint?: CatalogFootprint;

  /** Show on the read-only asset library stage. */

  inLibrary?: boolean;

  /** Source blend under projects/<projectFile>. */

  projectFile?: string;

};



export type PlacedObject = {

  id: string;

  catalogId: string;

  position: [number, number, number];

};



/** Palette toolbar — hero skyscraper only (legacy cityscape assets deprecated). */

export const CATALOG: CatalogItem[] = [

  {

    id: "skyscraper",

    label: "Skyscraper",

    role: "City",

    kind: "glb",

    url: "/models/skyscraper.glb?v=42",

    accent: "#6a9ec4",

    clip: "construct",

    maxCount: 1,

    footprint: { width: 10, depth: 10 },

    inLibrary: true,

    projectFile: "skyscraper/skyscraper.blend",

  },

];



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

