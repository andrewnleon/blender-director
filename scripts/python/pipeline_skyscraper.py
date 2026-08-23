"""Re-export skyscraper.glb with animation optimize + restack + gltf-transform."""
from __future__ import annotations

import os
import sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
SCRIPTS = os.path.dirname(os.path.abspath(__file__))
if SCRIPTS not in sys.path:
    sys.path.insert(0, SCRIPTS)

from export_stage_models import export_building
from lookdev_stage_assets import process_blend
from optimize_glb_export import optimize_glb_in_place
from restack_construct_glb import GLB_PATH, inspect_glb, restack_glb

BLEND_PATH = os.path.join(ROOT, "projects", "skyscraper", "skyscraper.blend")


def main() -> None:
    if not os.path.exists(BLEND_PATH):
        raise FileNotFoundError(BLEND_PATH)

    process_blend(BLEND_PATH, "ST_")
    out_path = export_building(
        "skyscraper",
        "skyscraper.glb",
        rest_frame=1,
        mesh_prefix="ST_",
        export_animations=True,
    )
    size_after_export = os.path.getsize(out_path)
    restack_result = restack_glb()
    inspect_glb(GLB_PATH)
    size_after_restack = os.path.getsize(out_path)
    # Restack alone is ~7.4 MB (was ~12 MB). gltf-transform resample can drop to ~240 KB
    # but needs visual QA on construct playback — skip by default.
    size_final = size_after_restack
    if os.environ.get("SKYSCRAPER_GLTF_OPTIMIZE") == "1":
        size_final = optimize_glb_in_place(out_path, preserve_scene=True)

    print("EXPORTED", out_path)
    print("BYTES_AFTER_EXPORT", size_after_export)
    print("BYTES_AFTER_RESTACK", size_after_restack)
    print("BYTES_FINAL", size_final)
    print("RESTACK", restack_result)


if __name__ == "__main__":
    main()
