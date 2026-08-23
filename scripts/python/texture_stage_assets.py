"""UV unwrap + tiled PBR maps on catalog buildings, then save and export GLB.

Headless (no MCP):

    blender --background projects/operations-center/operations-center.blend \\
        --python scripts/python/texture_stage_assets.py
"""
from __future__ import annotations

import os
import sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
SCRIPTS = os.path.dirname(os.path.abspath(__file__))
TEX_DIR = os.path.join(ROOT, "projects", "_shared", "textures")
SIZE = 512
UV_SCALE = 0.42

if SCRIPTS not in sys.path:
    sys.path.insert(0, SCRIPTS)

MATERIAL_PREFIXES = ("ST_", "OC_", "MAT_", "CC_", "CX_")

# Safety yellow / enamel black live in the albedo so glTF export
# (which drops Mix tint and ships baseColorFactor 0.8) still reads paint, not rock.
PAINT_ALBEDO_TINT: dict[str, tuple[float, float, float]] = {
    "paint_yellow": (0.98, 0.82, 0.08),
    "paint_black": (0.10, 0.10, 0.11),
}

SURFACE_BY_SUFFIX: dict[str, str] = {
    "Concrete": "concrete",
    "SlabGround": "concrete",
    "SlabMid": "concrete",
    "SlabUpper": "concrete",
    "SlabRoof": "concrete",
    "Dirt": "dirt",
    "SkyGlass": "glass",
    "Window": "glass",
    "Glass": "glass",
    "Wall": "cladding",
    "Body": "cladding",
    "LightMetal": "steel",
    "DarkMetal": "steel",
    "Steel": "steel",
    "FrameBlack": "steel",
    "Metal": "steel",
    "ConstrCab": "steel",
    "ConstrYellow": "paint_yellow",
    "Yellow": "paint_yellow",
    "ConstrBlack": "paint_black",
    "Trim": "steel",
    "Accent": "steel",
    "AntennaRed": "paint_yellow",
    "BeaconGlow": "emissive",
    "Beacon": "emissive",
}

SURFACE_SEEDS: dict[str, int] = {
    "concrete": 11,
    "dirt": 23,
    "cladding": 37,
    "steel": 41,
    "paint_yellow": 53,
    "paint_black": 59,
    "glass": 67,
    "emissive": 71,
}


def _value_noise(uu, vv, cells: int, seed: int):
    import numpy as np

    rng = np.random.RandomState(seed)
    lattice = rng.rand(cells, cells).astype(np.float32)
    x = uu * cells
    y = vv * cells
    x0 = np.floor(x).astype(np.int32) % cells
    y0 = np.floor(y).astype(np.int32) % cells
    x1 = (x0 + 1) % cells
    y1 = (y0 + 1) % cells
    fx = x - np.floor(x)
    fy = y - np.floor(y)
    sx = fx * fx * (3.0 - 2.0 * fx)
    sy = fy * fy * (3.0 - 2.0 * fy)
    n00 = lattice[y0, x0]
    n10 = lattice[y0, x1]
    n01 = lattice[y1, x0]
    n11 = lattice[y1, x1]
    nx0 = n00 * (1.0 - sx) + n10 * sx
    nx1 = n01 * (1.0 - sx) + n11 * sx
    return nx0 * (1.0 - sy) + nx1 * sy


def _fbm(size: int, cells: int, octaves: int, seed: int, stretch_y: float = 1.0):
    import numpy as np

    u = np.linspace(0.0, 1.0, size, endpoint=False, dtype=np.float32)
    uu, vv = np.meshgrid(u, u, indexing="xy")
    if stretch_y != 1.0:
        vv = (vv * stretch_y) % 1.0
    total = np.zeros((size, size), dtype=np.float32)
    amplitude = 1.0
    frequency = float(cells)
    weight = 0.0
    for octave in range(octaves):
        total += amplitude * _value_noise(uu, vv, max(2, int(frequency)), seed + octave * 17)
        weight += amplitude
        amplitude *= 0.5
        frequency *= 2.0
    return total / max(weight, 1e-6)


def _height_to_normal(height, strength: float = 4.0):
    import numpy as np

    dx = np.roll(height, -1, axis=1) - np.roll(height, 1, axis=1)
    dy = np.roll(height, -1, axis=0) - np.roll(height, 1, axis=0)
    nx = -dx * strength
    ny = -dy * strength
    nz = np.ones_like(height)
    length = np.sqrt(nx * nx + ny * ny + nz * nz)
    rgb = np.stack(
        ((nx / length) * 0.5 + 0.5, (ny / length) * 0.5 + 0.5, (nz / length) * 0.5 + 0.5),
        axis=-1,
    )
    return rgb.astype(np.float32)


def _surface_maps(kind: str) -> dict[str, object]:
    import numpy as np

    seed = SURFACE_SEEDS[kind]
    if kind == "steel":
        height = _fbm(SIZE, 6, 5, seed, stretch_y=3.2)
    elif kind == "cladding":
        height = _fbm(SIZE, 5, 4, seed)
        panel = ((_fbm(SIZE, 8, 1, seed + 3) * 8.0) % 1.0)
        grout = (np.abs(panel - 0.5) * 2.0)
        height = height * 0.65 + (1.0 - grout) * 0.35
    elif kind == "glass":
        height = _fbm(SIZE, 4, 3, seed) * 0.25 + 0.5
    elif kind == "emissive":
        height = _fbm(SIZE, 3, 2, seed) * 0.15 + 0.7
    else:
        height = _fbm(SIZE, 8, 5, seed)

    albedo_amp = {
        "concrete": 0.28,
        "dirt": 0.34,
        "cladding": 0.24,
        "steel": 0.22,
        "paint_yellow": 0.14,
        "paint_black": 0.12,
        "glass": 0.10,
        "emissive": 0.08,
    }[kind]
    albedo = np.clip(0.70 + (height - 0.5) * 2.4 * albedo_amp, 0.08, 0.96)
    if kind == "dirt":
        clumps = _fbm(SIZE, 4, 3, seed + 9)
        albedo = np.clip(albedo * (0.82 + clumps * 0.28), 0.08, 0.95)

    rough_base = {
        "concrete": 0.86,
        "dirt": 0.94,
        "cladding": 0.58,
        "steel": 0.42,
        "paint_yellow": 0.40,
        "paint_black": 0.52,
        "glass": 0.10,
        "emissive": 0.22,
    }[kind]
    roughness = np.clip(rough_base + (height - 0.5) * 0.22, 0.04, 0.98)
    normal = _height_to_normal(height, 3.2 if kind != "glass" else 1.1)
    albedo_rgb = np.stack([albedo, albedo, albedo], axis=-1)
    paint_tint = PAINT_ALBEDO_TINT.get(kind)
    if paint_tint is not None:
        albedo_rgb = np.clip(albedo_rgb * paint_tint, 0.0, 1.0)
    return {"albedo": albedo_rgb, "roughness": roughness, "normal": normal}


def _write_png_rgba(path: str, rgb) -> None:
    import struct
    import zlib

    import numpy as np

    if rgb.ndim == 2:
        rgb = np.stack([rgb, rgb, rgb], axis=-1)
    height, width, _ = rgb.shape
    rgba = np.concatenate(
        [np.clip(rgb, 0.0, 1.0), np.ones((height, width, 1), dtype=np.float32)],
        axis=-1,
    )
    pixels = (rgba * 255.0).astype(np.uint8)
    raw = b"".join(b"\x00" + pixels[row].tobytes() for row in range(height))

    def chunk(tag: bytes, payload: bytes) -> bytes:
        return (
            struct.pack(">I", len(payload))
            + tag
            + payload
            + struct.pack(">I", zlib.crc32(tag + payload) & 0xFFFFFFFF)
        )

    png = (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0))
        + chunk(b"IDAT", zlib.compress(raw, 6))
        + chunk(b"IEND", b"")
    )
    with open(path, "wb") as handle:
        handle.write(png)


def _blender_image(name: str, rgb, colorspace: str) -> object:
    import bpy

    os.makedirs(TEX_DIR, exist_ok=True)
    path = os.path.join(TEX_DIR, f"{name}.png")
    _write_png_rgba(path, rgb)
    existing = bpy.data.images.get(name)
    if existing is not None:
        bpy.data.images.remove(existing)
    image = bpy.data.images.load(path)
    image.name = name
    image.colorspace_settings.name = colorspace
    image.pack()
    return image


def ensure_surface_images() -> dict[str, dict[str, object]]:
    library: dict[str, dict[str, object]] = {}
    for kind in SURFACE_SEEDS:
        maps = _surface_maps(kind)
        library[kind] = {
            "albedo": _blender_image(f"T_{kind}_Albedo", maps["albedo"], "sRGB"),
            "roughness": _blender_image(f"T_{kind}_Rough", maps["roughness"], "Non-Color"),
            "normal": _blender_image(f"T_{kind}_Normal", maps["normal"], "Non-Color"),
        }
        print(
            "TEX",
            kind,
            "albedo",
            round(float(maps["albedo"].min()), 3),
            round(float(maps["albedo"].max()), 3),
        )
    return library


def _read_bsdf(mat) -> dict[str, object]:
    tint = (0.6, 0.6, 0.6, 1.0)
    roughness = 0.5
    metallic = 0.0
    transmission = 0.0
    emit = 0.0
    emit_color = tint
    if not mat.use_nodes or mat.node_tree is None:
        return {
            "tint": tint,
            "roughness": roughness,
            "metallic": metallic,
            "transmission": transmission,
            "emit": emit,
            "emit_color": emit_color,
        }
    for node in mat.node_tree.nodes:
        if node.type != "BSDF_PRINCIPLED":
            continue
        tint = tuple(node.inputs["Base Color"].default_value)
        roughness = float(node.inputs["Roughness"].default_value)
        metallic = float(node.inputs["Metallic"].default_value)
        if "Transmission Weight" in node.inputs:
            transmission = float(node.inputs["Transmission Weight"].default_value)
        if "Emission Strength" in node.inputs:
            emit = float(node.inputs["Emission Strength"].default_value)
        if "Emission Color" in node.inputs:
            emit_color = tuple(node.inputs["Emission Color"].default_value)
        break
    return {
        "tint": tint,
        "roughness": roughness,
        "metallic": metallic,
        "transmission": transmission,
        "emit": emit,
        "emit_color": emit_color,
    }


def _tex_node(nodes, image, location):
    node = nodes.new("ShaderNodeTexImage")
    node.image = image
    node.location = location
    node.interpolation = "Smart"
    node.extension = "REPEAT"
    if image.colorspace_settings.name == "Non-Color":
        node.image.colorspace_settings.name = "Non-Color"
    return node


def apply_surface_to_material(mat, kind: str, library: dict[str, dict[str, object]]) -> None:
    import bpy

    values = _read_bsdf(mat)
    maps = library[kind]
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    nodes.clear()

    output = nodes.new("ShaderNodeOutputMaterial")
    output.location = (720, 0)
    bsdf = nodes.new("ShaderNodeBsdfPrincipled")
    bsdf.location = (420, 0)

    albedo = _tex_node(nodes, maps["albedo"], (-220, 180))
    if kind in PAINT_ALBEDO_TINT:
        # Color is baked into the map. A Mix tint is dropped by glTF and
        # left gray cranes looking like concrete.
        links.new(albedo.outputs["Color"], bsdf.inputs["Base Color"])
        viewport_tint = values["tint"]
        if kind == "paint_yellow" and _is_neutral_tint(viewport_tint):
            viewport_tint = (*PAINT_ALBEDO_TINT["paint_yellow"], 1.0)
        elif kind == "paint_black" and _is_neutral_tint(viewport_tint):
            viewport_tint = (*PAINT_ALBEDO_TINT["paint_black"], 1.0)
        values["tint"] = viewport_tint
    else:
        tint = nodes.new("ShaderNodeRGB")
        tint.location = (-220, 420)
        tint.outputs[0].default_value = values["tint"]
        mix = nodes.new("ShaderNodeMix")
        mix.location = (80, 220)
        mix.data_type = "RGBA"
        mix.blend_type = "MULTIPLY"
        mix.inputs["Factor"].default_value = 1.0
        links.new(albedo.outputs["Color"], mix.inputs["A"])
        links.new(tint.outputs["Color"], mix.inputs["B"])
        links.new(mix.outputs["Result"], bsdf.inputs["Base Color"])

    rough = _tex_node(nodes, maps["roughness"], (-220, -80))
    rough_mix = nodes.new("ShaderNodeMath")
    rough_mix.location = (80, -80)
    rough_mix.operation = "MULTIPLY"
    rough_mix.inputs[1].default_value = max(0.08, float(values["roughness"]))
    links.new(rough.outputs["Color"], rough_mix.inputs[0])
    links.new(rough_mix.outputs["Value"], bsdf.inputs["Roughness"])

    if kind != "glass":
        normal_tex = _tex_node(nodes, maps["normal"], (-220, -360))
        normal_map = nodes.new("ShaderNodeNormalMap")
        normal_map.location = (80, -360)
        normal_map.inputs["Strength"].default_value = 0.55 if kind != "emissive" else 0.2
        links.new(normal_tex.outputs["Color"], normal_map.inputs["Color"])
        links.new(normal_map.outputs["Normal"], bsdf.inputs["Normal"])

    bsdf.inputs["Metallic"].default_value = float(values["metallic"])
    if float(values["transmission"]) > 0 and "Transmission Weight" in bsdf.inputs:
        bsdf.inputs["Transmission Weight"].default_value = float(values["transmission"])
    if float(values["emit"]) > 0:
        if "Emission Color" in bsdf.inputs:
            bsdf.inputs["Emission Color"].default_value = values["emit_color"]
        if "Emission Strength" in bsdf.inputs:
            bsdf.inputs["Emission Strength"].default_value = float(values["emit"])

    links.new(bsdf.outputs["BSDF"], output.inputs["Surface"])
    mat.diffuse_color = values["tint"]


def _is_neutral_tint(tint: tuple) -> bool:
    if len(tint) < 3:
        return True
    red, green, blue = float(tint[0]), float(tint[1]), float(tint[2])
    span = max(red, green, blue) - min(red, green, blue)
    return span < 0.08


def surface_for_material(name: str) -> str | None:
    lowered = name.lower()
    if "constryellow" in lowered:
        return "paint_yellow"
    if "constrblack" in lowered:
        return "paint_black"
    for prefix in MATERIAL_PREFIXES:
        if name.startswith(prefix):
            suffix = name[len(prefix) :]
            return SURFACE_BY_SUFFIX.get(suffix)
    return SURFACE_BY_SUFFIX.get(name)


def box_unwrap(obj, uv_scale: float = UV_SCALE) -> None:
    import bmesh
    from mathutils import Vector

    mesh = obj.data
    if mesh is None or len(mesh.polygons) == 0:
        return
    bm = bmesh.new()
    bm.from_mesh(mesh)
    uv_layer = bm.loops.layers.uv.get("UVMap")
    if uv_layer is None:
        uv_layer = bm.loops.layers.uv.new("UVMap")
    for face in bm.faces:
        normal = face.normal
        axis = 0
        if abs(normal.y) >= abs(normal.x) and abs(normal.y) >= abs(normal.z):
            axis = 1
        elif abs(normal.z) >= abs(normal.x) and abs(normal.z) >= abs(normal.y):
            axis = 2
        for loop in face.loops:
            coord = loop.vert.co
            if axis == 0:
                uv = Vector((coord.y, coord.z))
            elif axis == 1:
                uv = Vector((coord.x, coord.z))
            else:
                uv = Vector((coord.x, coord.y))
            loop[uv_layer].uv = uv * uv_scale
    bm.to_mesh(mesh)
    bm.free()
    mesh.update()


def unwrap_export_meshes() -> int:
    import bpy

    from export_stage_models import SKIP_NAMES

    count = 0
    for obj in bpy.data.objects:
        if obj.type != "MESH" or obj.name in SKIP_NAMES:
            continue
        if not (obj.name.startswith("ST_") or obj.name.startswith("OC_")):
            continue
        box_unwrap(obj)
        count += 1
    return count


def texture_open_materials(library: dict[str, dict[str, object]]) -> int:
    import bpy

    count = 0
    for mat in bpy.data.materials:
        kind = surface_for_material(mat.name)
        if kind is None:
            continue
        apply_surface_to_material(mat, kind, library)
        count += 1
    return count


def export_open_building() -> str:
    import bpy

    from export_stage_models import (
        EXPORTS,
        assert_poly_budget,
        build_export_collection,
        select_export_objects,
    )

    blend_path = bpy.data.filepath
    building_id = os.path.splitext(os.path.basename(blend_path))[0]
    spec = next((item for item in EXPORTS if item["building_id"] == building_id), None)
    if spec is None:
        raise RuntimeError(f"No export spec for {building_id}")

    scene = bpy.context.scene
    scene.frame_set(int(spec.get("rest_frame") or 1))
    mesh_names = select_export_objects(spec.get("mesh_prefix"))
    if not mesh_names:
        raise RuntimeError(f"No export meshes in {building_id}")
    assert_poly_budget(mesh_names, building_id)
    coll_name = build_export_collection(mesh_names)

    out_dir = os.path.join(ROOT, "public", "models")
    os.makedirs(out_dir, exist_ok=True)
    out_path = os.path.join(out_dir, spec["filename"])
    bpy.ops.export_scene.gltf(
        filepath=out_path,
        export_format="GLB",
        collection=coll_name,
        use_active_collection_with_nested=True,
        export_apply=True,
        export_yup=True,
        export_animations=bool(spec.get("export_animations")),
        export_lights=False,
        export_cameras=False,
        use_visible=False,
        use_renderable=False,
        export_image_format="AUTO",
    )
    return out_path


def process_open_file() -> None:
    import bpy

    library = ensure_surface_images()
    mesh_count = unwrap_export_meshes()
    mat_count = texture_open_materials(library)
    if bpy.data.filepath:
        bpy.ops.wm.save_mainfile()
        print("SAVED", bpy.data.filepath)
    out_path = export_open_building()
    print("UNWRAPPED", mesh_count)
    print("MATERIALS", mat_count)
    print("EXPORTED", out_path)


if __name__ == "__main__":
    process_open_file()
