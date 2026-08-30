import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CATALOG, catalogHasConstructClip } from "@/lib/catalog";
import {
  buildConstructionMap,
  constructDriveModeForCatalog,
  libraryConstructPlayback,
} from "@/lib/construction/driver";
import {
  MOCK_OPENCLAW_AGENTS,
  mockOpenClawTasksForPreviewStep,
} from "@/lib/construction/mock-openclaw-data";
import type { ConstructionState } from "@/lib/construction/types";

describe("construct drive defaults", () => {
  it("auto-plays every yard lot while no live map drives it", () => {
    // Scrubbing an idle lot pins it at progress 0, where every grow-in piece
    // rests at 0.04 scale and only the pad renders.
    assert.equal(
      constructDriveModeForCatalog("operations-center", undefined),
      "auto",
    );
    assert.equal(
      constructDriveModeForCatalog("operations-center", {
        stage: 0,
        progress: 0,
        isLive: false,
      }),
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
    assert.equal(
      constructDriveModeForCatalog("skyscraper", undefined),
      "auto",
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

  it("hands a paused stream back to auto-play at any staged progress", () => {
    const pausedStates: ConstructionState[] = [
      { stage: 0, progress: 0, isLive: false },
      { stage: 1, progress: 0.33, isLive: false },
      { stage: 3, progress: 1, isLive: false },
    ];
    for (const state of pausedStates) {
      assert.equal(
        constructDriveModeForCatalog("operations-center", state),
        "auto",
      );
    }
  });

  it("only a live map takes over the clip time", () => {
    assert.equal(
      constructDriveModeForCatalog("skyscraper", {
        stage: 1,
        progress: 0.2,
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

  it("preview mock uses live bind rules for hero buildings", () => {
    const queued = buildConstructionMap(
      MOCK_OPENCLAW_AGENTS,
      mockOpenClawTasksForPreviewStep(0),
      true,
    );
    assert.equal(queued["operations-center"]?.stage, 0);
    assert.equal(queued["skyscraper"]?.stage, 0);

    const complete = buildConstructionMap(
      MOCK_OPENCLAW_AGENTS,
      mockOpenClawTasksForPreviewStep(3),
      true,
    );
    assert.equal(complete["operations-center"]?.progress, 1);
    assert.equal(complete["skyscraper"]?.progress, 1);
    assert.equal(complete["operations-center"]?.isLive, true);
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
