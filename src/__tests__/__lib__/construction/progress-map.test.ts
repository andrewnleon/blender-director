import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  progressFromStage,
  progressFromTaskStatuses,
} from "@/lib/construction/progress-map";

describe("progressFromTaskStatuses", () => {
  it("returns zero for empty task lists", () => {
    assert.equal(progressFromTaskStatuses([]), 0);
  });

  it("smooths between coarse stage bands", () => {
    assert.equal(progressFromStage(1), 1 / 3);
    assert.ok(progressFromTaskStatuses(["in-progress"]) > 1 / 3);
    assert.ok(progressFromTaskStatuses(["in-progress"]) < 2 / 3);
    assert.equal(progressFromTaskStatuses(["completed"]), 1);
  });
});
