import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { yawToFaceNorth } from "@/lib/stage-world";

describe("yawToFaceNorth", () => {
  it("maps glTF +Z fronts onto world −Z", () => {
    assert.equal(yawToFaceNorth("+z"), Math.PI);
    assert.equal(yawToFaceNorth(), Math.PI);
  });

  it("leaves already-north fronts at identity", () => {
    assert.equal(yawToFaceNorth("-z"), 0);
  });

  it("compensates +X and −X authored fronts", () => {
    assert.equal(yawToFaceNorth("+x"), Math.PI / 2);
    assert.equal(yawToFaceNorth("-x"), -Math.PI / 2);
  });
});
