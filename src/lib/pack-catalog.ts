import type { CatalogItem } from "@/lib/catalog-types";
import packManifest from "@/lib/generated/pack-manifest.json";

type PackManifestItem = {
  id: string;
  label: string;
  role: string;
  kind: "glb";
  url: string;
  accent: string;
  footprint: { width: number; depth: number };
  inLibrary?: boolean;
};

function isPackManifestItem(value: unknown): value is PackManifestItem {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const item = value as PackManifestItem;
  return (
    typeof item.id === "string" &&
    typeof item.label === "string" &&
    typeof item.url === "string" &&
    typeof item.accent === "string" &&
    typeof item.footprint?.width === "number" &&
    typeof item.footprint?.depth === "number"
  );
}

function readPackManifestItems(): PackManifestItem[] {
  const raw = packManifest as { items?: unknown };
  if (!Array.isArray(raw.items)) {
    return [];
  }
  return raw.items.filter(isPackManifestItem);
}

/** Bundled Blender pack exports — static GLBs for yard placement tests. */
export const PACK_PALETTE_CATALOG: CatalogItem[] = readPackManifestItems().map(
  (item) => ({
    id: item.id,
    label: item.label,
    role: item.role,
    kind: item.kind,
    url: item.url,
    accent: item.accent,
    footprint: item.footprint,
    inLibrary: item.inLibrary ?? true,
  }),
);
