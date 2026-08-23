import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { BoxGeometry, Group, Mesh } from "three";
import {
  measureRoofPoolLayout,
  ROOF_POOL_CATALOG_ID,
  ROOF_POOL_INSET,
  shouldMountRoofPool,
} from "@/lib/construction/roof-pool";

describe("roof-pool", () => {
  it("gates only city tower 2560", () => {
    assert.equal(shouldMountRoofPool(ROOF_POOL_CATALOG_ID), true);
    assert.equal(shouldMountRoofPool("pack-futuristic-city-2560"), true);
    assert.equal(shouldMountRoofPool("pack-futuristic-city-2484"), false);
  });

  it("sizes water from complete-hull roof deck and insets", () => {
    const hullGeometry = new BoxGeometry(10, 33.2, 8);
    hullGeometry.translate(0, 16.6, 0);
    const hull = new Mesh(hullGeometry);
    hull.name = "pack-futuristic-city-2560_complete";

    const craneGeometry = new BoxGeometry(1, 40, 1);
    craneGeometry.translate(6, 20, 6);
    const crane = new Mesh(craneGeometry);
    crane.name = "pack_futuristic_city_2560_CraneTower";

    const root = new Group();
    root.add(hull, crane);

    const layout = measureRoofPoolLayout(root);
    assert.ok(layout);
    assert.ok(Math.abs(layout.width - (10 - ROOF_POOL_INSET * 2)) < 0.05);
    assert.ok(Math.abs(layout.depth - (8 - ROOF_POOL_INSET * 2)) < 0.05);
    assert.ok(layout.roofY > 33);
    assert.ok(Math.abs(layout.centerX) < 0.05);
    assert.ok(Math.abs(layout.centerZ) < 0.05);
  });

  it("does not use bind-pose world scale", () => {
    const hullGeometry = new BoxGeometry(8.7, 1, 7.8);
    hullGeometry.translate(0, 33.2, 0);
    const hull = new Mesh(hullGeometry);
    hull.name = "pack-futuristic-city-2560_complete";
    hull.scale.set(0, 0, 0);

    const root = new Group();
    root.add(hull);

    const layout = measureRoofPoolLayout(root);
    assert.ok(layout);
    assert.ok(layout.width > 7);
    assert.ok(layout.depth > 6);
    assert.ok(layout.roofY > 33);
  });
});
