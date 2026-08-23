"""Build, animate, save, and export agent station GLBs."""
from __future__ import annotations

import os
import sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
SCRIPTS = os.path.dirname(os.path.abspath(__file__))
if SCRIPTS not in sys.path:
    sys.path.insert(0, SCRIPTS)

import bpy

from agent_station_specs import AGENT_STATION_SPECS, get_agent_station_spec
from animate_agent_station import END, create_construct_clip
from build_agent_station import build_agent_station
from gltf_export_options import base_gltf_export_kwargs

PROJECTS = os.path.join(ROOT, "projects")
OUT_DIR = os.path.join(ROOT, "public", "models")

SKIP_SUFFIXES = ("DirtGround",)
SKIP_FENCES = ("Fence_N", "Fence_S", "Fence_E", "Fence_W")


def select_export_objects(prefix: str) -> list[str]:
    from construction_crane import crane_root_names, is_crane_object_name

    names: list[str] = []
    for obj in bpy.data.objects:
        if not obj.name.startswith(prefix):
            continue
        if any(obj.name.endswith(suffix) for suffix in SKIP_SUFFIXES):
            continue
        if any(obj.name.endswith(fence) for fence in SKIP_FENCES):
            continue
        if obj.type == "EMPTY" and obj.name in crane_root_names(prefix):
            names.append(obj.name)
            continue
        if obj.type == "EMPTY" and obj.name.endswith("DishPivot"):
            names.append(obj.name)
            continue
        if obj.type != "MESH":
            continue
        if is_crane_object_name(obj.name, prefix) or obj.name.startswith(prefix):
            names.append(obj.name)
    return names


def export_glb(mesh_names: list[str], out_path: str) -> str:
    coll_name = "_StageExport"
    if coll_name in bpy.data.collections:
        export_coll = bpy.data.collections[coll_name]
        for obj in list(export_coll.objects):
            export_coll.objects.unlink(obj)
    else:
        export_coll = bpy.data.collections.new(coll_name)
        bpy.context.scene.collection.children.link(export_coll)

    for name in mesh_names:
        obj = bpy.data.objects.get(name)
        if obj and obj.name not in export_coll.objects:
            export_coll.objects.link(obj)

    os.makedirs(OUT_DIR, exist_ok=True)
    export_kwargs = {
        **base_gltf_export_kwargs(export_animations=True),
        "filepath": out_path,
        "collection": coll_name,
        "use_active_collection_with_nested": True,
        "use_visible": False,
        "use_renderable": False,
    }
    bpy.ops.export_scene.gltf(**export_kwargs)
    return out_path


def pipeline_station(building_id: str) -> dict[str, str | int]:
    spec = get_agent_station_spec(building_id)
    prefix = spec.prefix
    build_agent_station(building_id)
    create_construct_clip(spec)

    blend_dir = os.path.join(PROJECTS, building_id)
    os.makedirs(blend_dir, exist_ok=True)
    blend_path = os.path.join(blend_dir, f"{building_id}.blend")
    bpy.context.scene.frame_set(END)
    bpy.ops.wm.save_as_mainfile(filepath=blend_path)

    bpy.context.scene.frame_set(1)
    mesh_names = select_export_objects(prefix)
    if not mesh_names:
        raise RuntimeError(f"No {prefix} meshes to export for {building_id}")

    glb_path = os.path.join(OUT_DIR, f"{building_id}.glb")
    export_glb(mesh_names, glb_path)

    tri_count = sum(
        len(p.vertices) - 2
        for name in mesh_names
        for obj in [bpy.data.objects.get(name)]
        if obj is not None and obj.type == "MESH"
        for p in obj.data.polygons
    )
    print("SAVED", blend_path)
    print("EXPORTED", glb_path)
    print("TRIS", tri_count)
    return {"blend": blend_path, "glb": glb_path, "tris": tri_count}


def pipeline_all_stations() -> dict[str, dict[str, str | int]]:
    results: dict[str, dict[str, str | int]] = {}
    for building_id in AGENT_STATION_SPECS:
        results[building_id] = pipeline_station(building_id)
    return results


if __name__ == "__main__":
    argv = sys.argv
    if "--" in argv:
        argv = argv[argv.index("--") + 1 :]
    else:
        argv = []

    if not argv or argv[0] == "all":
        pipeline_all_stations()
    else:
        pipeline_station(argv[0])
