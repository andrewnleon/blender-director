import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CATALOG, catalogHasConstructClip } from "@/lib/catalog";
import {
  constructDriveModeForCatalog,
  libraryConstructPlayback,
} from "@/lib/construction/driver";

describe("construct drive defaults", () => {
  it("auto-plays pack, staged, and hero lots when the stream is idle", () => {
    assert.equal(constructDriveModeForCatalog("skyscraper", undefined), "auto");
    assert.equal(
      constructDriveModeForCatalog("operations-center", undefined),
      "auto",
    );
    assert.equal(
      constructDriveModeForCatalog("pack-residential-001", undefined),
      "auto",
    );
    assert.equal(
      constructDriveModeForCatalog("pack-residential-001", {
        stage: 0,
        progress: 0,
        isLive: false,
      }),
      "auto",
    );
  });

  it("scrubs only while a live OpenClaw stream drives the lot", () => {
    assert.equal(
      constructDriveModeForCatalog("pack-residential-001", {
        stage: 2,
        progress: 0.4,
        isLive: true,
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
