import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  constructActionTimeScale,
  constructLeaderDuration,
  constructWallClockSeconds,
  countNamedFloors,
  estimateFloorsFromHeight,
  HERO_CONSTRUCT_DURATION_S,
  HERO_FLOOR_COUNT,
  HERO_HEIGHT_M,
  isCraneConstructClip,
  parseNamedFloorIndex,
  pickConstructLeaderClip,
  resolveConstructFloorCount,
  SECONDS_PER_FLOOR,
} from "@/lib/construction/construct-duration";

describe("construct duration from floors", () => {
  it("parses hero plates, decks, and pack floor names", () => {
    assert.equal(parseNamedFloorIndex("ST_FrameFloor_12"), 12);
    assert.equal(parseNamedFloorIndex("ST_Deck_3"), 3);
    assert.equal(parseNamedFloorIndex("ST_FloorSlab_4"), 4);
    assert.equal(parseNamedFloorIndex("pack-residential-001_floor02"), 2);
    assert.equal(parseNamedFloorIndex("ST_Pad"), null);
  });

  it("counts named floors without requiring every plate", () => {
    assert.equal(countNamedFloors(["ST_FrameFloor_12", "ST_CraneTower"]), 12);
    assert.equal(
      countNamedFloors([
        "pack-house_site",
        "pack-house_floor01",
        "pack-house_floor02",
        "pack-house_crown",
      ]),
      4,
    );
  });

  it("estimates floors from site-kit height scale vs hero", () => {
    assert.equal(estimateFloorsFromHeight(HERO_HEIGHT_M), HERO_FLOOR_COUNT);
    assert.equal(estimateFloorsFromHeight(4.5), 3);
    assert.equal(estimateFloorsFromHeight(0), 1);
  });

  it("prefers catalog, then names, then height", () => {
    assert.equal(
      resolveConstructFloorCount({
        catalogFloorCount: 8,
        names: ["ST_FrameFloor_12"],
        meshHeightM: 4.5,
      }),
      8,
    );
    assert.equal(
      resolveConstructFloorCount({
        names: ["ST_FrameFloor_12"],
        meshHeightM: 4.5,
      }),
      12,
    );
    assert.equal(resolveConstructFloorCount({ meshHeightM: 4.5 }), 3);
  });

  it("keeps hero timeScale at 1 and finishes a short house first", () => {
    assert.equal(Number(SECONDS_PER_FLOOR.toFixed(4)), 3.3611);
    assert.ok(
      Math.abs(
        constructActionTimeScale(HERO_CONSTRUCT_DURATION_S, HERO_FLOOR_COUNT) -
          1,
      ) < 1e-9,
    );
    const houseSeconds = constructWallClockSeconds(
      HERO_CONSTRUCT_DURATION_S,
      3,
    );
    const towerSeconds = constructWallClockSeconds(
      HERO_CONSTRUCT_DURATION_S,
      HERO_FLOOR_COUNT,
    );
    assert.equal(houseSeconds, SECONDS_PER_FLOOR * 3);
    assert.equal(towerSeconds, SECONDS_PER_FLOOR * HERO_FLOOR_COUNT);
    assert.ok(houseSeconds < towerSeconds);
    assert.ok(
      constructActionTimeScale(HERO_CONSTRUCT_DURATION_S, 3) >
        constructActionTimeScale(HERO_CONSTRUCT_DURATION_S, HERO_FLOOR_COUNT),
    );
  });

  it("ignores overrun crane clips when picking the construct leader", () => {
    assert.equal(isCraneConstructClip("ST_CraneBoomPivotAction"), true);
    assert.equal(isCraneConstructClip("construct"), false);
    const clips = [
      { name: "ST_BeaconAction", duration: 185.9167 },
      { name: "ST_CraneBoomPivotAction", duration: 369.8333 },
      { name: "ST_CraneHookAction", duration: 369.8333 },
      { name: "construct", duration: 40.3333 },
    ];
    assert.equal(constructLeaderDuration(clips), 185.9167);
    assert.equal(pickConstructLeaderClip(clips)?.name, "ST_BeaconAction");
    assert.ok(
      Math.abs(
        constructActionTimeScale(185.9167, HERO_FLOOR_COUNT) -
          185.9167 / (SECONDS_PER_FLOOR * HERO_FLOOR_COUNT),
      ) < 1e-9,
    );
    assert.ok(
      constructActionTimeScale(185.9167, HERO_FLOOR_COUNT) <
        constructActionTimeScale(369.8333, HERO_FLOOR_COUNT),
    );
  });

  it("falls back to crane duration when every clip is a crane", () => {
    const clips = [
      { name: "ST_CraneBoomPivotAction", duration: 8.8 },
      { name: "ST_CraneHookAction", duration: 8.8 },
    ];
    assert.equal(constructLeaderDuration(clips), 8.8);
    assert.equal(pickConstructLeaderClip(clips)?.name, "ST_CraneBoomPivotAction");
  });
});
