"""Post-process stage GLBs with gltf-transform (join/prune, no meshopt)."""
from __future__ import annotations

import os
import subprocess
import sys


def optimize_glb_in_place(path: str, *, preserve_scene: bool = False) -> int:
    if not os.path.exists(path):
        raise FileNotFoundError(path)

    temp_path = f"{path}.optimized.glb"
    command = [
        "npx",
        "--yes",
        "@gltf-transform/cli",
        "optimize",
        path,
        temp_path,
        "--compress",
        "false",
    ]
    if preserve_scene:
        # Animated construct clips: join/flatten/resample can collapse meshes or keys.
        command.extend(
            [
                "--join",
                "false",
                "--instance",
                "false",
                "--flatten",
                "false",
                "--weld",
                "false",
            ]
        )
    subprocess.run(command, check=True)
    before_bytes = os.path.getsize(path)
    os.replace(temp_path, path)
    after_bytes = os.path.getsize(path)
    print("GLTF_TRANSFORM", path, before_bytes, "->", after_bytes)
    return after_bytes


if __name__ == "__main__":
    target = sys.argv[1] if len(sys.argv) > 1 else ""
    if not target:
        raise SystemExit("usage: optimize_glb_in_place.py <path.glb>")
    optimize_glb_in_place(target)
