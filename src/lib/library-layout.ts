import {
  CATALOG,
  getCatalogItem,
  type CatalogItem,
  type PlacedObject,
} from "@/lib/catalog";

/** Columns before wrapping to the next row. */
export const LIBRARY_COLUMN_COUNT = 4;

/** Gap between asset footprints on the library stage. */
export const LIBRARY_CELL_PADDING = 3;

/** Fallback when a catalog item omits footprint metadata. */
export const DEFAULT_LIBRARY_FOOTPRINT = { width: 8, depth: 8 } as const;

export function getLibraryCatalogItems(): CatalogItem[] {
  return CATALOG.filter((item) => item.inLibrary === true);
}

function getFootprint(item: CatalogItem) {
  return item.footprint ?? DEFAULT_LIBRARY_FOOTPRINT;
}

/** Horizontal cell span — uses the larger footprint axis plus padding. */
export function getLibraryCellWidth(item: CatalogItem): number {
  const footprint = getFootprint(item);
  return Math.max(footprint.width, footprint.depth) + LIBRARY_CELL_PADDING;
}

/** Depth reserved for a row — footprint depth plus half padding. */
export function getLibraryCellDepth(item: CatalogItem): number {
  const footprint = getFootprint(item);
  return footprint.depth + LIBRARY_CELL_PADDING * 0.5;
}

type LibraryRow = {
  items: CatalogItem[];
  rowWidth: number;
  rowDepth: number;
};

function buildLibraryRows(items: readonly CatalogItem[]): LibraryRow[] {
  const rows: LibraryRow[] = [];
  let currentRow: CatalogItem[] = [];
  let rowWidth = 0;
  let rowDepth = 0;

  for (const item of items) {
    const cellWidth = getLibraryCellWidth(item);
    const cellDepth = getLibraryCellDepth(item);

    if (currentRow.length >= LIBRARY_COLUMN_COUNT) {
      rows.push({ items: currentRow, rowWidth, rowDepth });
      currentRow = [];
      rowWidth = 0;
      rowDepth = 0;
    }

    currentRow.push(item);
    rowWidth += cellWidth;
    rowDepth = Math.max(rowDepth, cellDepth);
  }

  if (currentRow.length > 0) {
    rows.push({ items: currentRow, rowWidth, rowDepth });
  }

  return rows;
}

/** Auto-place library catalog items on a centered grid with footprint-aware spacing. */
export function buildLibraryPlacements(
  items: readonly CatalogItem[] = getLibraryCatalogItems(),
): PlacedObject[] {
  if (items.length === 0) {
    return [];
  }

  const rows = buildLibraryRows(items);
  const rowGap = LIBRARY_CELL_PADDING;
  const totalDepth =
    rows.reduce((sum, row) => sum + row.rowDepth, 0) +
    rowGap * Math.max(rows.length - 1, 0);

  let zCursor = -totalDepth / 2;
  const placements: PlacedObject[] = [];

  for (const row of rows) {
    let xCursor = -row.rowWidth / 2;
    const rowCenterZ = zCursor + row.rowDepth / 2;

    for (const item of row.items) {
      const cellWidth = getLibraryCellWidth(item);
      const x = xCursor + cellWidth / 2;

      placements.push({
        id: `library-${item.id}`,
        catalogId: item.id,
        position: [x, 0, rowCenterZ],
      });

      xCursor += cellWidth;
    }

    zCursor += row.rowDepth + rowGap;
  }

  return placements;
}

export type LibraryBounds = {
  width: number;
  depth: number;
  center: [number, number, number];
};

/** Bounding box for camera framing — merges placement positions with footprints. */
export function getLibraryBounds(
  placements: readonly PlacedObject[],
): LibraryBounds {
  if (placements.length === 0) {
    return { width: 16, depth: 16, center: [0, 0.75, 0] };
  }

  let minX = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let minZ = Number.POSITIVE_INFINITY;
  let maxZ = Number.NEGATIVE_INFINITY;

  for (const placement of placements) {
    const item = getCatalogItem(placement.catalogId);
    const footprint = item ? getFootprint(item) : DEFAULT_LIBRARY_FOOTPRINT;
    const halfWidth = footprint.width / 2;
    const halfDepth = footprint.depth / 2;
    const [x, , z] = placement.position;

    minX = Math.min(minX, x - halfWidth);
    maxX = Math.max(maxX, x + halfWidth);
    minZ = Math.min(minZ, z - halfDepth);
    maxZ = Math.max(maxZ, z + halfDepth);
  }

  const padding = LIBRARY_CELL_PADDING;
  return {
    width: maxX - minX + padding * 2,
    depth: maxZ - minZ + padding * 2,
    center: [(minX + maxX) / 2, 0.75, (minZ + maxZ) / 2],
  };
}

export function getLibraryGroundExtent(bounds: LibraryBounds): number {
  const span = Math.max(bounds.width, bounds.depth);
  return Math.max(48, Math.ceil(span + LIBRARY_CELL_PADDING * 4));
}

export function getLibraryViewDistance(bounds: LibraryBounds): number {
  const span = Math.max(bounds.width, bounds.depth);
  return Math.min(96, Math.max(28, span * 1.35));
}
