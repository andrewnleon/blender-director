"""Apply tiled PBR to exported pack GLBs without rebuilding construct clips.

Why textures were missing: export_pack_buildings duplicates meshes then glTF-exports.
Source image nodes never made it into the GLBs — hull slots stayed unnamed
Material.### / glass / ground at default 0.8 gray.

    blender --background --python scripts/python/texture_pack_assets.py

Optional: PACK_TEXTURE_LIMIT=1 to process one file.
"""
from __future__ import annotations

import json
import os
import re
import sys

SCRIPTS = os.path.dirname(os.path.abspath(__file__))
if SCRIPTS not in sys.path:
    sys.path.insert(0, SCRIPTS)

from texture_stage_assets import (  # noqa: E402
    SURFACE_SEEDS,
    TEX_DIR,
    UV_SCALE,
    apply_surface_to_material,
    box_unwrap,
    ensure_surface_images,
    _read_bsdf,
)

ROOT = os.path.abspath(os.path.join(SCRIPTS, "..", ".."))
EXPORT_DIR = os.path.join(ROOT, "public", "models", "packs", "exported")
PACK_TEX_DIR = os.path.join(ROOT, "public", "models", "packs", "blender", "textures")
MANIFEST_PATH = os.path.join(ROOT, "src", "lib", "generated", "pack-manifest.json")
EXPORT_SCRIPT = os.path.join(SCRIPTS, "export_pack_buildings.py")
ASSET_URL_VERSION = 6
CONSTRUCT_CLIP = "construct"
GLASS_TINT = (0.18, 0.28, 0.38, 1.0)


def _load_image(name: str, path: str, colorspace: str):
    import bpy

    if not os.path.exists(path):
        return None
    existing = bpy.data.images.get(name)
    if existing is not None:
        bpy.data.images.remove(existing)
    image = bpy.data.images.load(path)
    image.name = name
    image.colorspace_settings.name = colorspace
    image.pack()
    return image


def load_generated_library() -> dict[str, dict[str, object]]:
    library: dict[str, dict[str, object]] = {}
    for kind in SURFACE_SEEDS:
        albedo_path = os.path.join(TEX_DIR, f"T_{kind}_Albedo.png")
        rough_path = os.path.join(TEX_DIR, f"T_{kind}_Rough.png")
        normal_path = os.path.join(TEX_DIR, f"T_{kind}_Normal.png")
        if not (os.path.exists(albedo_path) and os.path.exists(rough_path) and os.path.exists(normal_path)):
            return merge_pack_images(ensure_surface_images())
        library[kind] = {
            "albedo": _load_image(f"T_{kind}_Albedo", albedo_path, "sRGB"),
            "roughness": _load_image(f"T_{kind}_Rough", rough_path, "Non-Color"),
            "normal": _load_image(f"T_{kind}_Normal", normal_path, "Non-Color"),
        }
    return merge_pack_images(library)


def merge_pack_images(library: dict[str, dict[str, object]]) -> dict[str, dict[str, object]]:
    wall_c = _load_image(
        "T_pack_AussenWand_C",
        os.path.join(PACK_TEX_DIR, "AussenWand_C.jpg"),
        "sRGB",
    )
    wall_n = _load_image(
        "T_pack_AussenWand_N",
        os.path.join(PACK_TEX_DIR, "AussenWand_N.jpg"),
        "Non-Color",
    )
    steel_c = _load_image(
        "T_pack_Steel_C",
        os.path.join(PACK_TEX_DIR, "Steel_C.jpg"),
        "sRGB",
    )
    steel_n = _load_image(
        "T_pack_Steel_N",
        os.path.join(PACK_TEX_DIR, "Steel_N.jpg"),
        "Non-Color",
    )
    if wall_c is not None:
        library["cladding"]["albedo"] = wall_c
    if wall_n is not None:
        library["cladding"]["normal"] = wall_n
    if steel_c is not None:
        library["steel"]["albedo"] = steel_c
    if steel_n is not None:
        library["steel"]["normal"] = steel_n
    return library


def _is_default_gray(tint: tuple) -> bool:
    if len(tint) < 3:
        return True
    return (
        abs(float(tint[0]) - 0.8) < 0.05
        and abs(float(tint[1]) - 0.8) < 0.05
        and abs(float(tint[2]) - 0.8) < 0.05
    )


def classify_by_orientation(mat) -> str:
    import bpy

    horizontal = 0.0
    vertical = 0.0
    for obj in bpy.data.objects:
        if obj.type != "MESH" or obj.data is None:
            continue
        slot_indices = {
            index
            for index, slot in enumerate(obj.material_slots)
            if slot.material == mat
        }
        if not slot_indices:
            continue
        for polygon in obj.data.polygons:
            if polygon.material_index not in slot_indices:
                continue
            if abs(polygon.normal.z) > 0.65:
                horizontal += polygon.area
            else:
                vertical += polygon.area
    if horizontal > vertical * 1.35:
        return "concrete"
    return "cladding"


def surface_for_pack_material(mat) -> str:
    lowered = mat.name.lower()
    if "constryellow" in lowered:
        return "paint_yellow"
    if "constrblack" in lowered:
        return "paint_black"
    if "steel" in lowered or "constrcab" in lowered:
        return "steel"
    if "glass" in lowered or "window" in lowered or "sky" in lowered:
        return "glass"
    if "ground" in lowered or "dirt" in lowered:
        return "concrete"
    if "roof" in lowered or "slab" in lowered:
        return "concrete"
    if "wall" in lowered or "cladding" in lowered or "body" in lowered:
        return "cladding"

    values = _read_bsdf(mat)
    if float(values["transmission"]) > 0.12:
        return "glass"
    if float(values["emit"]) > 0.25:
        return "emissive"
    if float(values["metallic"]) >= 0.55:
        return "steel"
    return classify_by_orientation(mat)


def _set_principled(mat, **kwargs: float | tuple) -> None:
    if mat.node_tree is None:
        return
    for node in mat.node_tree.nodes:
        if node.type != "BSDF_PRINCIPLED":
            continue
        for key, value in kwargs.items():
            if key not in node.inputs:
                continue
            node.inputs[key].default_value = value
        break


def finish_glass(mat) -> None:
    values = _read_bsdf(mat)
    tint = values["tint"]
    if _is_default_gray(tint) or float(tint[0]) > 0.9:
        _set_principled(
            mat,
            **{
                "Transmission Weight": 0.55,
                "Roughness": 0.08,
                "Metallic": 0.0,
                "IOR": 1.45,
            },
        )
        if mat.node_tree is not None:
            for node in mat.node_tree.nodes:
                if node.type == "RGB":
                    node.outputs[0].default_value = GLASS_TINT
                    break
        mat.diffuse_color = GLASS_TINT
    else:
        _set_principled(mat, **{"Transmission Weight": max(0.35, float(values["transmission"]))})


def unwrap_missing_uvs() -> int:
    import bpy

    count = 0
    for obj in bpy.data.objects:
        if obj.type != "MESH" or obj.data is None:
            continue
        if obj.data.uv_layers:
            continue
        box_unwrap(obj, UV_SCALE)
        count += 1
    return count


def texture_pack_materials(library: dict[str, dict[str, object]]) -> dict[str, int]:
    import bpy

    counts: dict[str, int] = {}
    for mat in list(bpy.data.materials):
        kind = surface_for_pack_material(mat)
        apply_surface_to_material(mat, kind, library)
        if kind == "glass":
            finish_glass(mat)
        counts[kind] = counts.get(kind, 0) + 1
    return counts


def export_open_glb(filepath: str) -> None:
    import bpy

    from construct_grammar import FPS

    actions = list(bpy.data.actions)
    if actions:
        clip_end = 1
        for action in actions:
            if action.frame_range[1] > clip_end:
                clip_end = int(action.frame_range[1])
        scene = bpy.context.scene
        scene.render.fps = FPS
        scene.frame_start = 1
        scene.frame_end = max(clip_end, 1)
        scene.frame_set(scene.frame_end)

    bpy.ops.export_scene.gltf(
        filepath=filepath,
        export_format="GLB",
        use_selection=False,
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
        export_image_format="AUTO",
    )


def reset_scene() -> None:
    import bpy

    bpy.ops.wm.read_factory_settings(use_empty=True)


def texture_one_glb(filepath: str) -> dict[str, object]:
    import bpy

    reset_scene()
    bpy.ops.import_scene.gltf(filepath=filepath)
    object_names = sorted(obj.name for obj in bpy.data.objects if obj.type == "MESH")
    action_names = sorted(action.name for action in bpy.data.actions)
    unwrap_count = unwrap_missing_uvs()
    library = load_generated_library()
    kind_counts = texture_pack_materials(library)
    export_open_glb(filepath)
    return {
        "file": os.path.basename(filepath),
        "objects": len(object_names),
        "actions": action_names,
        "unwrapped": unwrap_count,
        "kinds": kind_counts,
    }


def list_pack_glbs() -> list[str]:
    names = [
        name
        for name in os.listdir(EXPORT_DIR)
        if name.startswith("pack-") and name.endswith(".glb")
    ]
    names.sort()
    limit = int(os.environ.get("PACK_TEXTURE_LIMIT", "0"))
    if limit > 0:
        return names[:limit]
    return names


def bump_manifest_version() -> int:
    with open(MANIFEST_PATH, encoding="utf-8") as handle:
        manifest = json.load(handle)
    items = manifest.get("items")
    if not isinstance(items, list):
        raise RuntimeError("pack-manifest missing items")
    version_token = f"?v={ASSET_URL_VERSION}"
    changed = 0
    for item in items:
        if not isinstance(item, dict):
            continue
        url = item.get("url")
        if not isinstance(url, str) or "/models/packs/exported/" not in url:
            continue
        next_url = re.sub(r"\?v=\d+", version_token, url)
        if "?v=" not in next_url:
            next_url = url + version_token
        if next_url != url:
            item["url"] = next_url
            changed += 1
    manifest["texturedAt"] = "pack-pbr"
    with open(MANIFEST_PATH, "w", encoding="utf-8") as handle:
        json.dump(manifest, handle, indent=2)
        handle.write("\n")
    return changed


def bump_export_script_version() -> None:
    with open(EXPORT_SCRIPT, encoding="utf-8") as handle:
        source = handle.read()
    next_source = re.sub(
        r"ASSET_URL_VERSION = \d+",
        f"ASSET_URL_VERSION = {ASSET_URL_VERSION}",
        source,
        count=1,
    )
    if next_source != source:
        with open(EXPORT_SCRIPT, "w", encoding="utf-8") as handle:
            handle.write(next_source)


def main() -> None:
    names = list_pack_glbs()
    if not names:
        raise RuntimeError(f"No pack GLBs in {EXPORT_DIR}")
    ensure_surface_images()
    results: list[dict[str, object]] = []
    for name in names:
        path = os.path.join(EXPORT_DIR, name)
        result = texture_one_glb(path)
        results.append(result)
        print("TEXTURED", result)
    changed = bump_manifest_version()
    bump_export_script_version()
    print("PACKS", len(results), "MANIFEST", changed, "VERSION", ASSET_URL_VERSION)


if __name__ == "__main__":
    main()
