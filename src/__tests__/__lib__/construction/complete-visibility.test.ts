import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { BoxGeometry, Group, Mesh } from "three";
import {
  applyHollowCompleteVisibility,
  isExteriorHullName,
  isHollowCompleteState,
  isRestKeepName,
  shouldHideAtHollowComplete,
} from "@/lib/construction/complete-visibility";

describe("complete-visibility", () => {
  it("keeps pad and exterior hulls, hides cage and inners", () => {
    assert.equal(isRestKeepName("ST_Pad"), true);
    assert.equal(isExteriorHullName("pack-residential-001_complete"), true);
    assert.equal(isExteriorHullName("pack-futuristic-city-001_shell"), true);
    assert.equal(shouldHideAtHollowComplete("ST_Pad"), false);
    assert.equal(shouldHideAtHollowComplete("ST_CWPanel_1_S"), false);
    assert.equal(shouldHideAtHollowComplete("pack-residential-001_complete"), false);
    assert.equal(shouldHideAtHollowComplete("ST_Columns_3"), true);
    assert.equal(shouldHideAtHollowComplete("ST_FrameFloor_12"), true);
    assert.equal(shouldHideAtHollowComplete("ST_FloorSlab_4"), true);
    assert.equal(shouldHideAtHollowComplete("ST_CoreLift_2"), true);
    assert.equal(shouldHideAtHollowComplete("ST_Fence_0"), true);
    assert.equal(shouldHideAtHollowComplete("ST_DirtGround"), true);
    assert.equal(shouldHideAtHollowComplete("pack-residential-001_floor02"), true);
    assert.equal(shouldHideAtHollowComplete("pack-residential-001_site"), true);
    assert.equal(shouldHideAtHollowComplete("ST_CraneTower"), true);
  });

  it("treats clip-end as hollow rest even if replay flag still on", () => {
    assert.equal(
      isHollowCompleteState({ constructDone: true, isConstructReplaying: false }),
      true,
    );
    assert.equal(
      isHollowCompleteState({ constructDone: true, isConstructReplaying: true }),
      true,
    );
    assert.equal(
      isHollowCompleteState({ constructDone: false, isConstructReplaying: false }),
      false,
    );
  });

  it("hides inner meshes without moving them", () => {
    const column = new Mesh(new BoxGeometry(1, 1, 1));
    column.name = "ST_Columns_1";
    column.position.set(2, 0, 3);
    const hull = new Mesh(new BoxGeometry(1, 1, 1));
    hull.name = "pack-residential-001_complete";
    const root = new Group();
    root.add(column, hull);

    applyHollowCompleteVisibility(root, true);
    assert.equal(column.visible, false);
    assert.equal(column.castShadow, false);
    assert.equal(column.position.x, 2);
    assert.equal(hull.visible, true);

    applyHollowCompleteVisibility(root, false);
    assert.equal(column.visible, true);
    assert.equal(column.castShadow, true);
  });
});
