import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parsePlaceCatalogId, parseYardObjects } from "@/lib/yard-session";

describe("yard-session", () => {
  it("keeps exact positions for known catalog lots", () => {
    const objects = parseYardObjects([
      {
        id: "pack-residential-001-abc",
        catalogId: "pack-residential-001",
        position: [12, 0, -8],
      },
      {
        id: "ghost",
        catalogId: "not-a-catalog-item",
        position: [0, 0, 0],
      },
    ]);
    assert.equal(objects.length, 1);
    assert.equal(objects[0]?.catalogId, "pack-residential-001");
    assert.deepEqual(objects[0]?.position, [12, 0, -8]);
  });

  it("rejects malformed payloads", () => {
    assert.deepEqual(parseYardObjects(null), []);
    assert.deepEqual(parseYardObjects([{ id: "x" }]), []);
    assert.deepEqual(
      parseYardObjects([
        {
          id: "a",
          catalogId: "skyscraper",
          position: [1, 2],
        },
      ]),
      [],
    );
  });

  it("parses palette selection from session values", () => {
    assert.equal(parsePlaceCatalogId(null, "skyscraper"), "skyscraper");
    assert.equal(parsePlaceCatalogId("", "skyscraper"), null);
    assert.equal(parsePlaceCatalogId("skyscraper", null), "skyscraper");
    assert.equal(parsePlaceCatalogId("not-a-catalog-item", "skyscraper"), "skyscraper");
  });
});
