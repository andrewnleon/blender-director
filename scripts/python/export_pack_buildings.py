"""Export placeable GLBs from bundled residential / futuristic city packs.

Normalizes each mesh so the longer plan axis is TARGET_LOT_M (10 m), keeps
aspect ratio, seats the pad on Z=0, and recenters the footprint. Adds a
skyscraper-style construct clip: crane on pad, floor stack, Lego snap, crane gone.
"""

from __future__ import annotations

import json
import os
import sys

import bmesh
import bpy
from mathutils import Vector

SCRIPTS = os.path.dirname(os.path.abspath(__file__))
if SCRIPTS not in sys.path:
    sys.path.insert(0, SCRIPTS)

from construct_grammar import (
    CRANE_COLLAPSE_SPAN,
    DROP_HOLD,
    FOUNDATION_START,
    FPS,
    GROW_START_SCALE,
    MAST_RAISE_FRAMES,
    SNAP_FRAMES,
    boom_angle_for_index,
    construct_clip_end,
    crane_boom_len,
    crane_site_xyz,
    floor_count_for_height,
    lift_duration_for_index,
)
from construction_crane import (
    CONSTRUCT_CLIP,
    CraneConfig,
    build_standalone_crane,
    collapse_crane_scale,
    crane_export_objects,
    crane_place_piece,
    key_crane_mast_to_height,
    linear_crane_fcurves,
    name_construct_action,
)

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
PACKS = os.path.join(ROOT, "public", "models", "packs")
BLENDER_DIR = os.path.join(PACKS, "blender")
EXPORT_DIR = os.path.join(PACKS, "exported")
MANIFEST_PATH = os.path.join(ROOT, "src", "lib", "generated", "pack-manifest.json")

RESIDENTIAL_BLEND = os.path.join(BLENDER_DIR, "01 Residential Buildings Set.blend")
FUTURISTIC_BLEND = os.path.join(BLENDER_DIR, "uploads_files_2727648_Futuristic+City.blend")

PACK_EXPORT_LIMIT = int(os.environ.get("PACK_EXPORT_LIMIT", "0"))
TARGET_LOT_M = 10.0
ASSET_URL_VERSION = 6
SLICE_OVERLAP_M = 0.02

ACCENTS = [
    "#8b7355",
    "#6a9ec4",
    "#7c5cbf",
    "#22c55e",
    "#d97706",
    "#e879f9",
    "#38bdf8",
    "#f97316",
]


def mesh_height(obj: bpy.types.Object) -> float:
    zs = [(obj.matrix_world @ vertex.co).z for vertex in obj.data.vertices]
    return max(zs) - min(zs) if zs else 0.0


def mesh_plan_size(obj: bpy.types.Object) -> tuple[float, float]:
    xs = [(obj.matrix_world @ vertex.co).x for vertex in obj.data.vertices]
    ys = [(obj.matrix_world @ vertex.co).y for vertex in obj.data.vertices]
    width = max(xs) - min(xs) if xs else 0.0
    depth = max(ys) - min(ys) if ys else 0.0
    return width, depth


def round_meters(value: float) -> float:
    return round(value, 2)


def open_blend(path: str) -> None:
    if not os.path.exists(path):
        raise FileNotFoundError(path)
    bpy.ops.wm.open_mainfile(filepath=path)


def activate(obj: bpy.types.Object) -> None:
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj


def duplicate_mesh(obj: bpy.types.Object, name: str) -> bpy.types.Object:
    duplicate = obj.copy()
    duplicate.data = obj.data.copy()
    duplicate.name = name
    duplicate.data.name = name
    bpy.context.scene.collection.objects.link(duplicate)
    if duplicate.animation_data:
        duplicate.animation_data_clear()
    return duplicate


def apply_world_mesh(obj: bpy.types.Object) -> None:
    activate(obj)
    if obj.parent:
        bpy.ops.object.parent_clear(type="CLEAR_KEEP_TRANSFORM")
    if obj.modifiers:
        bpy.ops.object.convert(target="MESH")
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)


def normalize_to_lot(obj: bpy.types.Object, target_lot: float = TARGET_LOT_M) -> tuple[float, float]:
    """Uniform scale so max(width, depth) == target_lot. Origin = footprint center, Z=0."""
    apply_world_mesh(obj)
    width, depth = mesh_plan_size(obj)
    longest = max(width, depth, 1e-6)
    uniform = target_lot / longest
    obj.scale = (uniform, uniform, uniform)
    apply_world_mesh(obj)

    xs = [vertex.co.x for vertex in obj.data.vertices]
    ys = [vertex.co.y for vertex in obj.data.vertices]
    zs = [vertex.co.z for vertex in obj.data.vertices]
    center_x = (min(xs) + max(xs)) / 2.0
    center_y = (min(ys) + max(ys)) / 2.0
    min_z = min(zs)
    offset = Vector((center_x, center_y, min_z))
    for vertex in obj.data.vertices:
        vertex.co -= offset
    obj.data.update()
    obj.location = (0.0, 0.0, 0.0)

    width, depth = mesh_plan_size(obj)
    return width, depth


def _bm_geom(bm: bmesh.types.BMesh) -> list:
    return list(bm.verts) + list(bm.edges) + list(bm.faces)


def _fill_cut(bm: bmesh.types.BMesh, cut_geom: list) -> None:
    cut_edges = [elem for elem in cut_geom if isinstance(elem, bmesh.types.BMEdge)]
    if not cut_edges:
        return
    bmesh.ops.holes_fill(bm, edges=cut_edges, sides=0)


def isolate_height_band(
    source: bpy.types.Object,
    name: str,
    z_lo: float,
    z_hi: float,
) -> bpy.types.Object | None:
    """Cut a watertight slab — bisect+fill, never delete verts (that opens holes)."""
    part = duplicate_mesh(source, name)
    mesh = part.data
    bm = bmesh.new()
    bm.from_mesh(mesh)
    upper = bmesh.ops.bisect_plane(
        bm,
        geom=_bm_geom(bm),
        dist=1e-5,
        plane_co=Vector((0.0, 0.0, z_hi)),
        plane_no=Vector((0.0, 0.0, 1.0)),
        clear_outer=True,
    )
    _fill_cut(bm, upper.get("geom_cut", []))
    lower = bmesh.ops.bisect_plane(
        bm,
        geom=_bm_geom(bm),
        dist=1e-5,
        plane_co=Vector((0.0, 0.0, z_lo)),
        plane_no=Vector((0.0, 0.0, 1.0)),
        clear_inner=True,
    )
    _fill_cut(bm, lower.get("geom_cut", []))
    if bm.faces:
        bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
    remaining = len(bm.verts)
    bm.to_mesh(mesh)
    bm.free()
    mesh.update()
    if remaining < 3 or len(mesh.polygons) == 0:
        bpy.data.objects.remove(part, do_unlink=True)
        return None
    return part


def recenter_parts(parts: list[bpy.types.Object]) -> tuple[float, float]:
    """Origin = combined footprint center, pad on Z=0 (glTF Y=0 after Y-up)."""
    xs: list[float] = []
    ys: list[float] = []
    zs: list[float] = []
    for obj in parts:
        for vertex in obj.data.vertices:
            xs.append(vertex.co.x)
            ys.append(vertex.co.y)
            zs.append(vertex.co.z)
    if not xs:
        return 0.0, 0.0
    offset = Vector(((min(xs) + max(xs)) / 2.0, (min(ys) + max(ys)) / 2.0, min(zs)))
    for obj in parts:
        for vertex in obj.data.vertices:
            vertex.co -= offset
        obj.data.update()
        obj.location = (0.0, 0.0, 0.0)
    width = max(xs) - min(xs)
    depth = max(ys) - min(ys)
    return width, depth


def split_construction_parts(source: bpy.types.Object, catalog_id: str) -> list[bpy.types.Object]:
    zs = [vertex.co.z for vertex in source.data.vertices]
    z_min = min(zs)
    z_max = max(zs)
    height = z_max - z_min
    slice_count = floor_count_for_height(height)
    if slice_count <= 1:
        source.name = f"{catalog_id}_shell"
        return [source]

    band_h = height / slice_count
    overlap = SLICE_OVERLAP_M
    parts: list[bpy.types.Object] = []
    for index in range(slice_count):
        if index == 0:
            role = "site"
        elif index == slice_count - 1:
            role = "crown"
        else:
            role = f"floor{index:02d}"
        z_lo = z_min + index * band_h
        z_hi = z_min + (index + 1) * band_h
        if index == 0:
            z_lo -= 0.02
        else:
            z_lo -= overlap
        if index == slice_count - 1:
            z_hi += 0.02
        else:
            z_hi += overlap
        part = isolate_height_band(source, f"{catalog_id}_{role}", z_lo, z_hi)
        if part is not None:
            parts.append(part)
    if not parts:
        source.name = f"{catalog_id}_shell"
        return [source]
    bpy.data.objects.remove(source, do_unlink=True)
    return parts


def part_top_z(obj: bpy.types.Object) -> float:
    zs = [vertex.co.z for vertex in obj.data.vertices]
    return max(zs) if zs else 0.0


def crane_prefix_for_catalog(catalog_id: str) -> str:
    return catalog_id.replace("-", "_") + "_"


def grow_in(obj: bpy.types.Object, frame_on: int, clip_end: int) -> None:
    prefs = bpy.context.preferences.edit
    previous_interp = prefs.keyframe_new_interpolation_type
    prefs.keyframe_new_interpolation_type = "CONSTANT"
    rest = obj.scale.copy()
    loc = obj.location.copy()
    obj.location = loc
    obj.keyframe_insert("location", frame=1)
    obj.keyframe_insert("location", frame=clip_end)
    tiny = (
        rest.x * GROW_START_SCALE,
        rest.y * GROW_START_SCALE,
        rest.z * GROW_START_SCALE,
    )
    obj.scale = tiny
    obj.keyframe_insert("scale", frame=1)
    pre = max(1, frame_on - 1)
    obj.keyframe_insert("scale", frame=pre)
    obj.scale = rest
    obj.keyframe_insert("scale", frame=frame_on + SNAP_FRAMES)
    obj.keyframe_insert("scale", frame=clip_end)
    name_construct_action(obj)
    prefs.keyframe_new_interpolation_type = previous_interp


def add_construct_clip(
    parts: list[bpy.types.Object],
    width: float,
    depth: float,
    catalog_id: str,
) -> tuple[int, str, list[bpy.types.Object]]:
    """Crane + floor stack. Returns (clip_end, prefix, crane_objects)."""
    clip_end = construct_clip_end(len(parts))
    scene = bpy.context.scene
    scene.render.fps = FPS
    scene.frame_start = 1
    scene.frame_end = clip_end
    scene.frame_set(1)

    prefix = crane_prefix_for_catalog(catalog_id)
    site_xyz = crane_site_xyz(width, depth)
    config = CraneConfig(
        prefix=prefix,
        site_xyz=site_xyz,
        pad_z=0.0,
        tower_rest_h=3.2,
        boom_len=crane_boom_len(site_xyz),
        collection_name=f"{prefix}Construction",
    )
    build_standalone_crane(config)
    crane_objects = crane_export_objects(prefix)

    if len(parts) == 1:
        grow_in(parts[0], FOUNDATION_START, clip_end)
        top_z = max(1.2, part_top_z(parts[0]))
        key_crane_mast_to_height(config, 1, top_z)
        collapse_crane_scale(
            prefix,
            max(FOUNDATION_START + 8, clip_end - CRANE_COLLAPSE_SPAN),
            clip_end,
        )
        linear_crane_fcurves(prefix)
        for crane_obj in crane_objects:
            name_construct_action(crane_obj)
        return clip_end, prefix, crane_objects

    frame = FOUNDATION_START
    current_top = max(0.6, part_top_z(parts[0]))
    key_crane_mast_to_height(config, 1, current_top)
    key_crane_mast_to_height(config, frame, current_top)

    for index, part in enumerate(parts):
        top_z = max(0.4, part_top_z(part))
        if index > 0 and top_z > current_top + 0.05:
            key_crane_mast_to_height(config, frame, current_top)
            frame += MAST_RAISE_FRAMES
            key_crane_mast_to_height(config, frame, top_z)
            current_top = top_z
        place_frame = crane_place_piece(
            config,
            part,
            frame,
            lift_duration_for_index(index),
            boom_angle_for_index(index),
            current_top,
            clip_end,
        )
        frame = place_frame + DROP_HOLD

    collapse_at = min(clip_end, max(frame, clip_end - CRANE_COLLAPSE_SPAN))
    collapse_crane_scale(prefix, collapse_at, clip_end)
    linear_crane_fcurves(prefix)
    for crane_obj in crane_objects:
        name_construct_action(crane_obj)
    return clip_end, prefix, crane_objects


def snap_complete_on(obj: bpy.types.Object, clip_end: int) -> None:
    """Intact hull hidden during grow-in, visible at rest / library bind pose."""
    prefs = bpy.context.preferences.edit
    previous_interp = prefs.keyframe_new_interpolation_type
    prefs.keyframe_new_interpolation_type = "CONSTANT"
    obj.location = (0.0, 0.0, 0.0)
    obj.keyframe_insert("location", frame=1)
    obj.keyframe_insert("location", frame=clip_end)
    obj.scale = (0.0, 0.0, 0.0)
    obj.keyframe_insert("scale", frame=1)
    obj.keyframe_insert("scale", frame=clip_end - 1)
    obj.scale = (1.0, 1.0, 1.0)
    obj.keyframe_insert("scale", frame=clip_end)
    name_construct_action(obj)
    prefs.keyframe_new_interpolation_type = previous_interp


def snap_parts_off_at_end(parts: list[bpy.types.Object], clip_end: int) -> None:
    """Drop sliced chunks at clip end so rest pose is the uncut hull."""
    prefs = bpy.context.preferences.edit
    previous_interp = prefs.keyframe_new_interpolation_type
    prefs.keyframe_new_interpolation_type = "CONSTANT"
    for obj in parts:
        obj.scale = (0.0, 0.0, 0.0)
        obj.keyframe_insert("scale", frame=clip_end)
        name_construct_action(obj)
    prefs.keyframe_new_interpolation_type = previous_interp


def export_selected_glb(objects: list[bpy.types.Object], filepath: str) -> None:
    bpy.ops.object.select_all(action="DESELECT")
    for obj in objects:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]
    bpy.ops.export_scene.gltf(
        filepath=filepath,
        export_format="GLB",
        use_selection=True,
        export_apply=False,
        export_yup=True,
        export_animations=True,
        export_animation_mode="ACTIVE_ACTIONS",
        export_merge_animation="ACTION",
        export_nla_strips_merged_animation_name=CONSTRUCT_CLIP,
        export_anim_slide_to_zero=True,
        export_current_frame=True,
        export_lights=False,
        export_cameras=False,
    )


def cleanup(objects: list[bpy.types.Object]) -> None:
    for obj in objects:
        mesh = obj.data if obj.type == "MESH" else None
        bpy.data.objects.remove(obj, do_unlink=True)
        if mesh is not None and mesh.users == 0:
            bpy.data.meshes.remove(mesh)


def export_selected_mesh_glb(
    obj: bpy.types.Object,
    catalog_id: str,
    label: str,
    role: str,
    accent_index: int,
    source_blend: str,
) -> dict[str, object]:
    if obj.type != "MESH":
        raise RuntimeError(f"Not a mesh: {obj.name}")
    if mesh_height(obj) < 3.0:
        raise RuntimeError(f"Skipping thin mesh {obj.name}")

    working = duplicate_mesh(obj, f"{catalog_id}_src")
    width, depth = normalize_to_lot(working)
    complete = duplicate_mesh(working, f"{catalog_id}_complete")
    parts = split_construction_parts(working, catalog_id)
    recenter_parts(parts)
    clip_end, _prefix, crane_objects = add_construct_clip(
        parts,
        width,
        depth,
        catalog_id,
    )
    export_objects = list(parts)
    if len(parts) > 1:
        snap_complete_on(complete, clip_end)
        snap_parts_off_at_end(parts, clip_end)
        export_objects = [complete, *parts]
    else:
        bpy.data.objects.remove(complete, do_unlink=True)
    export_objects.extend(crane_objects)
    # Bind pose / library static = last frame (intact hull, slices + crane gone).
    bpy.context.scene.frame_set(clip_end)
    if len(parts) > 1:
        complete.scale = (1.0, 1.0, 1.0)
        for part in parts:
            part.scale = (0.0, 0.0, 0.0)
    else:
        for part in parts:
            part.scale = (1.0, 1.0, 1.0)
    for crane_obj in crane_objects:
        if crane_obj.type == "MESH":
            rest = crane_obj.scale.copy()
            crane_obj.scale = (
                rest.x * GROW_START_SCALE,
                rest.y * GROW_START_SCALE,
                rest.z * GROW_START_SCALE,
            )
    bpy.context.view_layer.update()

    os.makedirs(EXPORT_DIR, exist_ok=True)
    filename = f"{catalog_id}.glb"
    filepath = os.path.join(EXPORT_DIR, filename)
    export_selected_glb(export_objects, filepath)
    cleanup(export_objects)

    return {
        "id": catalog_id,
        "label": label,
        "role": role,
        "kind": "glb",
        "url": f"/models/packs/exported/{catalog_id}.glb?v={ASSET_URL_VERSION}",
        "accent": ACCENTS[accent_index % len(ACCENTS)],
        "footprint": {
            "width": round_meters(width),
            "depth": round_meters(depth),
        },
        "clip": CONSTRUCT_CLIP,
        "inLibrary": True,
        "sourceBlend": os.path.basename(source_blend),
        "sourceMesh": obj.name,
    }


def residential_exports(limit: int = 0) -> list[dict[str, object]]:
    open_blend(RESIDENTIAL_BLEND)
    items: list[dict[str, object]] = []
    meshes = sorted(
        [obj for obj in bpy.data.objects if obj.type == "MESH"],
        key=lambda obj: obj.name,
    )
    for index, obj in enumerate(meshes):
        suffix = obj.name.split()[-1]
        catalog_id = f"pack-residential-{suffix}"
        label = f"Residential {suffix}"
        items.append(
            export_selected_mesh_glb(
                obj,
                catalog_id,
                label,
                "Residential pack",
                index,
                RESIDENTIAL_BLEND,
            )
        )
        if limit and len(items) >= limit:
            break
    return items


def futuristic_exports(limit: int = 0) -> list[dict[str, object]]:
    open_blend(FUTURISTIC_BLEND)
    candidates: list[tuple[bpy.types.Object, str, str]] = []

    for obj in bpy.data.objects:
        if obj.type != "MESH":
            continue
        if mesh_height(obj) < 3.0:
            continue
        if obj.name.startswith("Downtown Center City"):
            suffix = obj.name.split(".")[-1]
            candidates.append(
                (obj, f"pack-futuristic-downtown-{suffix}", f"Downtown {suffix}"),
            )
        elif obj.name.startswith("city buildings"):
            suffix = obj.name.split(".")[-1]
            candidates.append(
                (obj, f"pack-futuristic-city-{suffix}", f"City tower {suffix}"),
            )
        elif obj.name.startswith("Cube"):
            suffix = obj.name.replace("Cube", "").strip(".") or "0"
            candidates.append(
                (obj, f"pack-futuristic-cube-{suffix}", f"Futuristic cube {suffix}"),
            )

    candidates.sort(key=lambda entry: entry[1])
    items: list[dict[str, object]] = []
    for index, (obj, catalog_id, label) in enumerate(candidates):
        items.append(
            export_selected_mesh_glb(
                obj,
                catalog_id,
                label,
                "Futuristic city pack",
                index + 10,
                FUTURISTIC_BLEND,
            )
        )
        if limit and len(items) >= limit:
            break
    return items


def main() -> None:
    limit = PACK_EXPORT_LIMIT
    residential = residential_exports(limit)
    remaining = 0 if limit == 0 else max(0, limit - len(residential))
    if limit == 0:
        futuristic = futuristic_exports(0)
    elif remaining > 0:
        futuristic = futuristic_exports(remaining)
    else:
        futuristic = []
    manifest_items = residential + futuristic
    manifest = {
        "generatedAt": "pack-export",
        "lotMeters": TARGET_LOT_M,
        "items": manifest_items,
    }
    os.makedirs(os.path.dirname(MANIFEST_PATH), exist_ok=True)
    with open(MANIFEST_PATH, "w", encoding="utf-8") as handle:
        json.dump(manifest, handle, indent=2)
        handle.write("\n")

    print("EXPORTED", len(manifest_items), "pack buildings ->", EXPORT_DIR)
    print("MANIFEST", MANIFEST_PATH)


if __name__ == "__main__":
    main()
