#!/usr/bin/env python3
"""Quick GLB stats for stage exports."""

from __future__ import annotations

import json
import os
import struct
import sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))


def glb_stats(path: str) -> dict[str, object]:
    with open(path, "rb") as handle:
        handle.read(12)
        json_len, _json_type = struct.unpack("<II", handle.read(8))
        gltf = json.loads(handle.read(json_len).decode())
        bin_len, _bin_type = struct.unpack("<II", handle.read(8))

    animations = gltf.get("animations", [])
    return {
        "path": path,
        "bytes": os.path.getsize(path),
        "meshes": len(gltf.get("meshes", [])),
        "accessors": len(gltf.get("accessors", [])),
        "animations": len(animations),
        "animation_names": [item.get("name", "") for item in animations[:8]],
        "bin_mb": round(bin_len / 1_000_000, 2),
    }


def main() -> None:
    filename = sys.argv[1] if len(sys.argv) > 1 else "skyscraper.glb"
    path = os.path.join(ROOT, "public", "models", filename)
    stats = glb_stats(path)
    print(json.dumps(stats, indent=2))


if __name__ == "__main__":
    main()
