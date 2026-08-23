import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  catalogIdsToGlbUrls,
  getBackgroundCatalogIds,
  getFirstWaveCatalogIds,
  getStageHttpPreloadUrls,
  getStageTexturePreloadUrls,
  STAGE_FIRST_WAVE_COUNT,
  uniqueCatalogIds,
} from "@/lib/stage-preload";

describe("stage preload waves", () => {
  it("keeps first unique ids for the first wave", () => {
    const priorityIds = [
      "skyscraper",
      "skyscraper",
      "operations-center",
      "research-center",
      "development-center",
      "qa-center",
      "deploy-pad",
      "pack-residential-001",
    ];
    assert.deepEqual(getFirstWaveCatalogIds(priorityIds), [
      "skyscraper",
      "operations-center",
      "research-center",
      "development-center",
      "qa-center",
      "deploy-pad",
    ]);
    assert.equal(getFirstWaveCatalogIds(priorityIds).length, STAGE_FIRST_WAVE_COUNT);
  });

  it("drops first-wave ids from the background queue", () => {
    const priorityIds = [
      "skyscraper",
      "operations-center",
      "research-center",
      "development-center",
      "qa-center",
      "deploy-pad",
      "pack-a",
    ];
    const placedIds = ["pack-a", "pack-b", "skyscraper"];
    assert.deepEqual(getBackgroundCatalogIds(priorityIds, placedIds), [
      "pack-a",
      "pack-b",
    ]);
  });

  it("dedupes catalog ids in order", () => {
    assert.deepEqual(uniqueCatalogIds(["b", "a", "b", "c"]), ["b", "a", "c"]);
  });

  it("maps known catalog ids to versioned glb urls", () => {
    const urls = catalogIdsToGlbUrls(["skyscraper", "missing-id"]);
    assert.equal(urls.length, 1);
    assert.match(urls[0] ?? "", /\/models\/skyscraper\.glb/);
  });

  it("http preload list is hero glbs only", () => {
    const urls = getStageHttpPreloadUrls();
    assert.ok(urls.length > 0);
    assert.ok(urls.length <= STAGE_FIRST_WAVE_COUNT);
    assert.ok(urls.every((url) => url.startsWith("/models/")));
    assert.ok(urls.some((url) => url.includes("skyscraper.glb")));
  });

  it("texture preload list uses live ground and horizon maps", () => {
    const urls = getStageTexturePreloadUrls();
    assert.ok(urls.some((url) => url.includes("Grass001")));
    assert.ok(urls.some((url) => url.includes("Rock023")));
  });
});
