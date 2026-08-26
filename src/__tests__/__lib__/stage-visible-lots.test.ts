import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { PlacedObject } from "@/lib/catalog-types";
import {
  pickMountedCatalogIds,
  STAGE_MAX_MOUNTED_LOTS,
} from "@/lib/stage-visible-lots";

const lots: PlacedObject[] = [
  { id: "a", catalogId: "near", position: [0, 0, 0] },
  { id: "b", catalogId: "mid", position: [20, 0, 0] },
  { id: "c", catalogId: "far", position: [80, 0, 0] },
  { id: "d", catalogId: "south", position: [0, 0, 90] },
];

describe("stage visible lots", () => {
  it("keeps selected lots then fills nearest to the look-at point", () => {
    assert.deepEqual(
      pickMountedCatalogIds(lots, 0, 0, ["far"], 3),
      ["far", "near", "mid"],
    );
  });

  it("caps how many catalog GLBs can mount", () => {
    const many: PlacedObject[] = Array.from({ length: 40 }, (_, index) => ({
      id: `lot-${index}`,
      catalogId: `pack-${index}`,
      position: [index * 12, 0, 0],
    }));
    const mounted = pickMountedCatalogIds(many, 0, 0, [], STAGE_MAX_MOUNTED_LOTS);
    assert.equal(mounted.length, STAGE_MAX_MOUNTED_LOTS);
    assert.equal(mounted[0], "pack-0");
  });
});
