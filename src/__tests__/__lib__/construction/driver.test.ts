import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CATALOG, catalogHasConstructClip } from "@/lib/catalog";
import {
  constructDriveModeForCatalog,
  libraryConstructPlayback,
} from "@/lib/construction/driver";

describe("construct drive defaults", () => {
  it("scrubs all yard lots at bind pose when idle (no auto-play on load)", () => {
    assert.equal(
      constructDriveModeForCatalog("operations-center", undefined),
      "scrub",
    );
    assert.equal(
      constructDriveModeForCatalog("operations-center", {
        stage: 0,
        progress: 0,
        isLive: false,
      }),
      "scrub",
    );
    assert.equal(
      constructDriveModeForCatalog("pack-residential-001", undefined),
      "scrub",
    );
    assert.equal(
      constructDriveModeForCatalog("pack-residential-001", {
        stage: 0,
        progress: 0,
        isLive: false,
      }),
      "scrub",
    );
    assert.equal(
      constructDriveModeForCatalog("skyscraper", undefined),
      "scrub",
    );
  });

  it("scrubs while a live OpenClaw stream drives the lot", () => {
    assert.equal(
      constructDriveModeForCatalog("pack-residential-001", {
        stage: 2,
        progress: 0.4,
        isLive: true,
      }),
      "scrub",
    );
  });

  it("holds scrub when stream pauses with any staged progress", () => {
    assert.equal(
      constructDriveModeForCatalog("operations-center", {
        stage: 0,
        progress: 0,
        isLive: false,
      }),
      "scrub",
    );
    assert.equal(
      constructDriveModeForCatalog("operations-center", {
        stage: 1,
        progress: 0.33,
        isLive: false,
      }),
      "scrub",
    );
    assert.equal(
      constructDriveModeForCatalog("operations-center", {
        stage: 3,
        progress: 1,
        isLive: false,
      }),
      "scrub",
    );
  });

  it("every catalog glb declares a construct clip", () => {
    const missing = CATALOG.filter(
      (item) => item.kind === "glb" && !catalogHasConstructClip(item.id),
    ).map((item) => item.id);
    assert.deepEqual(missing, []);
  });

  it("holds library at complete until replay, then auto-plays from start", () => {
    assert.deepEqual(libraryConstructPlayback(false), {
      driveMode: "scrub",
      progress: 1,
    });
    assert.deepEqual(libraryConstructPlayback(true), {
      driveMode: "auto",
      progress: 0,
    });
  });
});
