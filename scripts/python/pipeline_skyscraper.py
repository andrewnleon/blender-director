"""Re-export skyscraper.glb with merged construct clip + animation optimize."""
from __future__ import annotations

import os
import sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
SCRIPTS = os.path.dirname(os.path.abspath(__file__))
if SCRIPTS not in sys.path:
    sys.path.insert(0, SCRIPTS)

from export_stage_models import export_building
from lookdev_stage_assets import process_blend
from merge_construct_nla import push_prefix_actions_to_nla
from restack_construct_glb import GLB_PATH, inspect_glb, restack_glb

BLEND_PATH = os.path.join(ROOT, "projects", "skyscraper", "skyscraper.blend")


def main() -> None:
    if not os.path.exists(BLEND_PATH):
        raise FileNotFoundError(BLEND_PATH)

    process_blend(BLEND_PATH, "ST_")

    import bpy

    bpy.ops.wm.open_mainfile(filepath=BLEND_PATH)
    pushed = push_prefix_actions_to_nla("ST_")
    bpy.ops.wm.save_as_mainfile(filepath=BLEND_PATH)
    print("NLA_PUSHED", pushed)

    out_path = export_building(
        "skyscraper",
        "skyscraper.glb",
        rest_frame=1,
        mesh_prefix="ST_",
        export_animations=True,
    )
    size_before_restack = os.path.getsize(out_path)
    restack_result = restack_glb()
    inspect_glb(GLB_PATH)
    size_after = os.path.getsize(out_path)
    print("EXPORTED", out_path)
    print("BYTES_BEFORE_RESTACK", size_before_restack)
    print("BYTES_AFTER_RESTACK", size_after)
    print("RESTACK", restack_result)


if __name__ == "__main__":
    main()
