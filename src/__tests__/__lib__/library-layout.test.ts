import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  getLibraryPreloadPriority,
  sortLibraryItemsHeroFirst,
} from "@/lib/library-layout";
import type { CatalogItem } from "@/lib/catalog-types";

const packItem: CatalogItem = {
  id: "pack-residential-001",
  label: "Residential 001",
  role: "Residential pack",
  kind: "glb",
  url: "/models/packs/exported/pack-residential-001.glb?v=7",
  accent: "#8b7355",
  footprint: { width: 5.45, depth: 10 },
  clip: "construct",
  inLibrary: true,
};

const skyscraperItem: CatalogItem = {
  id: "skyscraper",
  label: "Skyscraper",
  role: "City",
  kind: "glb",
  url: "/models/skyscraper.glb?v=44",
  accent: "#6a9ec4",
  footprint: { width: 10, depth: 10 },
  clip: "construct",
  inLibrary: true,
};

const operationsCenterItem: CatalogItem = {
  id: "operations-center",
  label: "Operations Center",
  role: "Orchestrator",
  kind: "glb",
  url: "/models/operations-center.glb?v=9",
  accent: "#7c5cbf",
  footprint: { width: 10, depth: 10 },
  clip: "construct",
  inLibrary: true,
};

describe("library layout preload order", () => {
  it("sorts hero buildings before pack exports", () => {
    const sorted = sortLibraryItemsHeroFirst([
      packItem,
      operationsCenterItem,
      skyscraperItem,
    ]);
    assert.deepEqual(
      sorted.map((item) => item.id),
      ["skyscraper", "operations-center", "pack-residential-001"],
    );
  });

  it("returns hero-first ids for progressive preload", () => {
    const priority = getLibraryPreloadPriority([
      packItem,
      operationsCenterItem,
      skyscraperItem,
    ]);
    assert.deepEqual(priority, [
      "skyscraper",
      "operations-center",
      "pack-residential-001",
    ]);
  });
});
