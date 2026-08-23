import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { BoxGeometry, Group, Mesh } from "three";
import {
  applySiteKitReveal,
  classifySiteKitPiece,
  computeSiteKitScale,
  extractSiteKit,
  getSiteKitTierForCatalog,
  isSiteKitObjectName,
  isSiteKitPieceRevealed,
  measureAuthoredBounds,
  PACK_SITE_KIT_PLAN_INSET,
  resolveSiteKitTargets,
  shouldAttachSiteKit,
  shouldIncludeSiteKitMesh,
  shouldMountSiteKit,
  shouldIgnoreForAuthoredMeasure,
  SITE_KIT_REVEAL,
  SKYSCRAPER_SITE_AUTHORING,
  writeConstructClock,
} from "@/lib/construction/site-kit";

describe("site-kit", () => {
  it("skips only the authored skyscraper", () => {
    assert.equal(shouldAttachSiteKit("skyscraper"), false);
    assert.equal(shouldAttachSiteKit("pack-residential-001"), true);
    assert.equal(shouldAttachSiteKit("pack-futuristic-city-001"), true);
    assert.equal(shouldMountSiteKit("pack-residential-001", true), true);
    assert.equal(shouldMountSiteKit("pack-residential-001", false), false);
    assert.equal(shouldMountSiteKit("skyscraper", true), false);
  });

  it("matches site + cage names, not curtain or crane", () => {
    assert.equal(isSiteKitObjectName("ST_Pad"), true);
    assert.equal(isSiteKitObjectName("ST_FrameFloor_12"), true);
    assert.equal(isSiteKitObjectName("ST_Columns_3"), true);
    assert.equal(isSiteKitObjectName("ST_Fence_0"), true);
    assert.equal(isSiteKitObjectName("ST_CWPanel_1_S"), false);
    assert.equal(isSiteKitObjectName("ST_CraneTower"), false);
    assert.equal(shouldIgnoreForAuthoredMeasure("pack_residential_001_Crane"), true);
  });

  it("scales site XY from lot and cage Y from height", () => {
    const scale = computeSiteKitScale({
      targetWidth: 9.92,
      targetDepth: 9.92,
      targetHeight: 18,
    });
    assert.equal(scale.x, 1);
    assert.equal(scale.y, 1);
    assert.equal(scale.z, 1);

    const house = computeSiteKitScale({
      targetWidth: 5.45,
      targetDepth: 10,
      targetHeight: 9,
    });
    assert.ok(Math.abs(house.x - 5.45 / 9.92) < 1e-9);
    assert.ok(Math.abs(house.z - 10 / 9.92) < 1e-9);
    assert.ok(Math.abs(house.y - 9 / 18) < 1e-9);
  });

  it("uses the larger of catalog footprint and mesh plan", () => {
    const targets = resolveSiteKitTargets(
      { width: 5.45, depth: 10 },
      { width: 4, depth: 8, height: 7 },
    );
    assert.equal(targets.targetWidth, 5.45);
    assert.equal(targets.targetDepth, 10);
    assert.equal(targets.targetHeight, 7);
  });

  it("pack lots use footprint-only plan with inset", () => {
    const targets = resolveSiteKitTargets(
      { width: 5.45, depth: 10 },
      { width: 8, depth: 12, height: 9 },
      { footprintOnlyPlan: true, planInset: PACK_SITE_KIT_PLAN_INSET },
    );
    assert.ok(Math.abs(targets.targetWidth - 5.45 * PACK_SITE_KIT_PLAN_INSET) < 1e-9);
    assert.ok(Math.abs(targets.targetDepth - 10 * PACK_SITE_KIT_PLAN_INSET) < 1e-9);
    assert.equal(targets.targetHeight, 9);
  });

  it("site-only tier skips frame meshes and keeps Y scale at 1", () => {
    assert.equal(getSiteKitTierForCatalog("pack-residential-001"), "site-only");
    assert.equal(getSiteKitTierForCatalog("operations-center"), "full");
    assert.equal(shouldIncludeSiteKitMesh("ST_Pad", "site-only"), true);
    assert.equal(shouldIncludeSiteKitMesh("ST_Footings", "site-only"), true);
    assert.equal(shouldIncludeSiteKitMesh("ST_Columns_3", "site-only"), false);
    assert.equal(shouldIncludeSiteKitMesh("ST_FrameFloor_4", "site-only"), false);

    const pad = new Mesh(new BoxGeometry(1, 1, 1));
    pad.name = "ST_Pad";
    const column = new Mesh(new BoxGeometry(1, 1, 1));
    column.name = "ST_Columns_1";
    const source = new Group();
    source.add(pad, column);
    const kit = extractSiteKit(source, { tier: "site-only" });
    assert.equal(kit.children.length, 1);
    assert.equal(kit.children[0]?.name, "ST_Pad");

    const scale = computeSiteKitScale({
      targetWidth: 5.45,
      targetDepth: 10,
      targetHeight: 9,
      tier: "site-only",
    });
    assert.equal(scale.y, 1);
  });

  it("measures geometry with collapsed object scale ignored", () => {
    const mesh = new Mesh(new BoxGeometry(4, 8, 6));
    mesh.scale.setScalar(0.0001);
    const root = new Group();
    root.add(mesh);
    const bounds = measureAuthoredBounds(root);
    assert.ok(Math.abs(bounds.width - 4) < 1e-5);
    assert.ok(Math.abs(bounds.height - 8) < 1e-5);
    assert.ok(Math.abs(bounds.depth - 6) < 1e-5);
  });

  it("extracts only kit meshes at unit scale", () => {
    const pad = new Mesh(new BoxGeometry(1, 1, 1));
    pad.name = "ST_Pad";
    pad.scale.setScalar(0.0001);
    const wall = new Mesh(new BoxGeometry(1, 1, 1));
    wall.name = "ST_CWPanel_1_S";
    const source = new Group();
    source.add(pad, wall);
    const kit = extractSiteKit(source);
    assert.equal(kit.children.length, 1);
    const cloned = kit.children[0];
    assert.ok(cloned instanceof Mesh);
    assert.equal(cloned.name, "ST_Pad");
    assert.equal(cloned.scale.x, 1);
    assert.equal(cloned.visible, true);
    assert.equal(SKYSCRAPER_SITE_AUTHORING.cageWidth, 6);
  });

  it("classifies pad vs foundation vs numbered frame", () => {
    assert.deepEqual(classifySiteKitPiece("ST_Pad"), {
      layer: "site",
      floorIndex: null,
    });
    assert.deepEqual(classifySiteKitPiece("ST_Fence_2"), {
      layer: "site",
      floorIndex: null,
    });
    assert.deepEqual(classifySiteKitPiece("ST_Footings"), {
      layer: "subgrade",
      floorIndex: null,
    });
    assert.deepEqual(classifySiteKitPiece("ST_Columns_3"), {
      layer: "frame",
      floorIndex: 3,
    });
    assert.deepEqual(classifySiteKitPiece("ST_FrameFloor_12"), {
      layer: "frame",
      floorIndex: 12,
    });
  });

  it("hides kit at rest and complete, grows pad then floors", () => {
    const floors = 12;
    assert.equal(isSiteKitPieceRevealed("ST_Pad", 0, floors), false);
    assert.equal(isSiteKitPieceRevealed("ST_Pad", 1, floors), false);
    assert.equal(
      isSiteKitPieceRevealed("ST_Pad", SITE_KIT_REVEAL.restHide, floors),
      false,
    );
    assert.equal(isSiteKitPieceRevealed("ST_Pad", 0.05, floors), true);
    assert.equal(isSiteKitPieceRevealed("ST_Columns_1", 0.05, floors), false);
    assert.equal(isSiteKitPieceRevealed("ST_Footings", 0.05, floors), false);
    assert.equal(isSiteKitPieceRevealed("ST_Footings", 0.1, floors), true);
    assert.equal(isSiteKitPieceRevealed("ST_Columns_1", 0.2, floors), true);
    assert.equal(isSiteKitPieceRevealed("ST_Columns_12", 0.2, floors), false);
    assert.equal(isSiteKitPieceRevealed("ST_Columns_12", 0.82, floors), true);
  });

  it("collapses extracted kit until construct progress", () => {
    const pad = new Mesh(new BoxGeometry(1, 1, 1));
    pad.name = "ST_Pad";
    const column = new Mesh(new BoxGeometry(1, 1, 1));
    column.name = "ST_Columns_1";
    const kit = new Group();
    kit.add(pad, column);

    applySiteKitReveal(kit, 1);
    assert.equal(kit.visible, false);
    assert.equal(pad.visible, false);
    assert.equal(column.visible, false);

    applySiteKitReveal(kit, 0.05);
    assert.equal(kit.visible, true);
    assert.equal(pad.visible, true);
    assert.equal(column.visible, false);

    applySiteKitReveal(kit, 0.5);
    assert.equal(column.visible, true);
  });

  it("writes a clamped construct clock", () => {
    const clock = { progress01: 0, isPlaying: false };
    writeConstructClock(clock, 1.4, true);
    assert.equal(clock.progress01, 1);
    assert.equal(clock.isPlaying, true);
    writeConstructClock(undefined, 0.2, false);
  });
});
