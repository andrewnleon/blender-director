import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getVisibleCatalogItems } from "@/lib/catalog";
import {
  appendUserPlacement,
  isUserPlacementId,
  mergeStagePlacements,
  removeUserPlacement,
  userPlacementId,
} from "@/lib/stage-placements";
import type { PlacedObject } from "@/lib/catalog";

function place(
  catalogId: string,
  position: [number, number, number],
): PlacedObject {
  return { id: userPlacementId(catalogId, position), catalogId, position };
}

describe("stage placements", () => {
  it("starts the yard empty and grows only from user clicks", () => {
    const emptyStage = mergeStagePlacements([], []);
    assert.deepEqual(emptyStage, []);

    const placed = appendUserPlacement({
      catalogId: "skyscraper",
      position: [5, 0, 5],
      userPlacements: emptyStage,
      stagePlacements: emptyStage,
    });

    assert.deepEqual(placed?.map((placement) => placement.catalogId), [
      "skyscraper",
    ]);
    assert.ok(placed && isUserPlacementId(placed[0].id));
  });

  it("places every palette building without sandbox mode", () => {
    for (const item of getVisibleCatalogItems()) {
      const next = appendUserPlacement({
        catalogId: item.id,
        position: [5, 0, 5],
        userPlacements: [],
        stagePlacements: [],
      });
      assert.ok(next, `${item.id} should be placeable on an empty stage`);
    }
  });

  it("appends a user lot on empty ground", () => {
    const next = appendUserPlacement({
      catalogId: "operations-center",
      position: [-5, 0, 15],
      userPlacements: [],
      stagePlacements: [],
    });

    assert.ok(next);
    assert.deepEqual(next.map((placement) => placement.catalogId), [
      "operations-center",
    ]);
    assert.deepEqual(next[0].position, [-5, 0, 15]);
  });

  it("rejects a lot overlapping an existing footprint", () => {
    const existing = place("operations-center", [-5, 0, 15]);
    const stagePlacements = mergeStagePlacements([], [existing]);

    assert.equal(
      appendUserPlacement({
        catalogId: "research-center",
        position: [-5, 0, 15],
        userPlacements: [existing],
        stagePlacements,
      }),
      null,
    );
  });

  it("rejects a second lot past the catalog maxCount, unless sandbox mode", () => {
    const existing = place("operations-center", [-5, 0, 15]);
    const stagePlacements = mergeStagePlacements([], [existing]);
    const input = {
      catalogId: "operations-center",
      position: [25, 0, 15] as [number, number, number],
      userPlacements: [existing],
      stagePlacements,
    };

    assert.equal(appendUserPlacement(input), null);
    assert.equal(
      appendUserPlacement({ ...input, isSandboxMode: true })?.length,
      2,
    );
  });

  it("removes only the targeted user lot", () => {
    const first = place("operations-center", [-5, 0, 15]);
    const second = place("research-center", [25, 0, 15]);

    assert.deepEqual(removeUserPlacement([first, second], first.id), [second]);
    assert.deepEqual(removeUserPlacement([first, second], "library-skyscraper"), [
      first,
      second,
    ]);
  });
});
