"""Export placeable GLBs from bundled residential / futuristic city packs."""

from __future__ import annotations

import json
import math
import os
import re

import bpy
from mathutils import Vector

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
PACKS = os.path.join(ROOT, "public", "models", "packs")
BLENDER_DIR = os.path.join(PACKS, "blender")
EXPORT_DIR = os.path.join(PACKS, "exported")
MANIFEST_PATH = os.path.join(ROOT, "src", "lib", "generated", "pack-manifest.json")

RESIDENTIAL_BLEND = os.path.join(BLENDER_DIR, "01 Residential Buildings Set.blend")
FUTURISTIC_BLEND = os.path.join(BLENDER_DIR, "uploads_files_2727648_Futuristic+City.blend")

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


def slugify(text: str) -> str:
    cleaned = re.sub(r"[^a-zA-Z0-9]+", "-", text.strip().lower())
    return cleaned.strip("-") or "asset"


def mesh_height(obj: bpy.types.Object) -> float:
    zs = [(obj.matrix_world @ vertex.co).z for vertex in obj.data.vertices]
    return max(zs) - min(zs) if zs else 0.0


def mesh_footprint(obj: bpy.types.Object) -> tuple[float, float]:
    xs = [(obj.matrix_world @ vertex.co).x for vertex in obj.data.vertices]
    ys = [(obj.matrix_world @ vertex.co).y for vertex in obj.data.vertices]
    width = max(xs) - min(xs)
    depth = max(ys) - min(ys)
    return width, depth


def snap_footprint(width: float, depth: float) -> dict[str, float]:
    return {
        "width": max(10.0, math.ceil(width / 2.0) * 2.0),
        "depth": max(10.0, math.ceil(depth / 2.0) * 2.0),
    }


def open_blend(path: str) -> None:
    if not os.path.exists(path):
        raise FileNotFoundError(path)
    bpy.ops.wm.open_mainfile(filepath=path)


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

    width, depth = mesh_footprint(obj)
    footprint = snap_footprint(width, depth)

    bpy.ops.object.select_all(action="DESELECT")
    duplicate = obj.copy()
    duplicate.data = obj.data.copy()
    bpy.context.scene.collection.objects.link(duplicate)
    duplicate.select_set(True)
    bpy.context.view_layer.objects.active = duplicate

    min_z = min((duplicate.matrix_world @ vertex.co).z for vertex in duplicate.data.vertices)
    duplicate.location.z -= min_z

    os.makedirs(EXPORT_DIR, exist_ok=True)
    filename = f"{catalog_id}.glb"
    filepath = os.path.join(EXPORT_DIR, filename)

    bpy.ops.export_scene.gltf(
        filepath=filepath,
        export_format="GLB",
        use_selection=True,
        export_apply=True,
        export_yup=True,
        export_animations=False,
        export_lights=False,
        export_cameras=False,
    )

    bpy.data.objects.remove(duplicate, do_unlink=True)

    return {
        "id": catalog_id,
        "label": label,
        "role": role,
        "kind": "glb",
        "url": f"/models/packs/exported/{catalog_id}.glb?v=1",
        "accent": ACCENTS[accent_index % len(ACCENTS)],
        "footprint": footprint,
        "inLibrary": True,
        "sourceBlend": os.path.basename(source_blend),
        "sourceMesh": obj.name,
    }


def residential_exports() -> list[dict[str, object]]:
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
    return items


def futuristic_exports() -> list[dict[str, object]]:
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
    return items


def main() -> None:
    manifest_items = residential_exports() + futuristic_exports()
    manifest = {
        "generatedAt": "pack-export",
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
