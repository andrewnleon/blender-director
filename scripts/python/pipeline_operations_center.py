"""Build, animate, save, and export operations-center asset."""
from __future__ import annotations

import os
import sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
SCRIPTS = os.path.dirname(os.path.abspath(__file__))
if SCRIPTS not in sys.path:
    sys.path.insert(0, SCRIPTS)

import bpy

from build_operations_center import build_operations_center
from animate_operations_center import create_construct_clip, END

PROJECTS = os.path.join(ROOT, "projects")
OUT_DIR = os.path.join(ROOT, "public", "models")
BUILDING_ID = "operations-center"
BLEND_PATH = os.path.join(PROJECTS, BUILDING_ID, f"{BUILDING_ID}.blend")
GLB_PATH = os.path.join(OUT_DIR, f"{BUILDING_ID}.glb")
MESH_PREFIX = "OC_"
SKIP_NAMES = {"OC_DirtGround"}


def select_export_objects() -> list[str]:
    from construction_crane import crane_root_names, is_crane_object_name

    names: list[str] = []
    for obj in bpy.data.objects:
        if obj.name in SKIP_NAMES:
            continue
        if not obj.name.startswith(MESH_PREFIX):
            continue
        if obj.type == "EMPTY" and obj.name in crane_root_names(MESH_PREFIX):
            names.append(obj.name)
            continue
        if obj.type == "EMPTY":
            if obj.name == "OC_DishPivot":
                names.append(obj.name)
            continue
        if obj.type != "MESH":
            continue
        if is_crane_object_name(obj.name, MESH_PREFIX) or obj.name.startswith(MESH_PREFIX):
            names.append(obj.name)
    return names


def export_glb(mesh_names: list[str]) -> str:
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
    bpy.ops.export_scene.gltf(
        filepath=GLB_PATH,
        export_format="GLB",
        collection=coll_name,
        use_active_collection_with_nested=True,
        export_apply=True,
        export_yup=True,
        export_animations=True,
        export_lights=False,
        export_cameras=False,
        use_visible=False,
        use_renderable=False,
    )
    return GLB_PATH


def main() -> None:
    build_operations_center()
    create_construct_clip()

    os.makedirs(os.path.dirname(BLEND_PATH), exist_ok=True)
    bpy.context.scene.frame_set(END)
    bpy.ops.wm.save_as_mainfile(filepath=BLEND_PATH)

    # Bind pose = frame 1 (collapsed) so yard placement starts empty.
    bpy.context.scene.frame_set(1)
    mesh_names = select_export_objects()
    if not mesh_names:
        raise RuntimeError("No OC_ meshes to export")
    out = export_glb(mesh_names)

    tri_count = sum(
        len(p.vertices) - 2
        for name in mesh_names
        for obj in [bpy.data.objects.get(name)]
        if obj is not None and obj.type == "MESH"
        for p in obj.data.polygons
    )
    print("SAVED", BLEND_PATH)
    print("EXPORTED", out)
    print("TRIS", tri_count)


if __name__ == "__main__":
    main()
