"""Apply realistic PBR materials and optimize meshes toward the 20K tri budget."""
from __future__ import annotations

import os

ROOT = os.path.dirname(os.path.abspath(__file__))

MAX_TRIS = 20_000

MATERIAL_PRESETS: dict[str, dict[str, float | tuple[float, float, float]]] = {
    "ST_Concrete": {
        "color": (0.62, 0.61, 0.58),
        "roughness": 0.82,
        "metallic": 0.0,
    },
    "ST_SkyGlass": {
        "color": (0.38, 0.52, 0.66),
        "roughness": 0.08,
        "metallic": 0.05,
        "transmission": 0.42,
    },
    "ST_Window": {
        "color": (0.18, 0.24, 0.32),
        "roughness": 0.12,
        "metallic": 0.15,
        "transmission": 0.55,
    },
    "ST_LightMetal": {
        "color": (0.72, 0.74, 0.76),
        "roughness": 0.38,
        "metallic": 0.88,
    },
    "ST_DarkMetal": {
        "color": (0.22, 0.23, 0.25),
        "roughness": 0.45,
        "metallic": 0.92,
    },
    "ST_Steel": {
        "color": (0.18, 0.19, 0.21),
        "roughness": 0.4,
        "metallic": 0.78,
    },
    "ST_Yellow": {
        "color": (0.92, 0.78, 0.18),
        "roughness": 0.35,
        "metallic": 0.05,
        "emit": 0.35,
    },
}


def ensure_material(name: str, preset: dict) -> None:
    import bpy

    mat = bpy.data.materials.get(name)
    if mat is None:
        mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    nodes.clear()

    output = nodes.new("ShaderNodeOutputMaterial")
    output.location = (420, 0)
    bsdf = nodes.new("ShaderNodeBsdfPrincipled")
    bsdf.location = (120, 0)

    color = preset["color"]
    bsdf.inputs["Base Color"].default_value = (*color, 1.0)
    bsdf.inputs["Roughness"].default_value = float(preset.get("roughness", 0.5))
    bsdf.inputs["Metallic"].default_value = float(preset.get("metallic", 0.0))

    transmission = preset.get("transmission")
    if transmission is not None:
        if "Transmission Weight" in bsdf.inputs:
            bsdf.inputs["Transmission Weight"].default_value = float(transmission)
        elif "Transmission" in bsdf.inputs:
            bsdf.inputs["Transmission"].default_value = float(transmission)

    emit = preset.get("emit")
    if emit is not None and float(emit) > 0:
        if "Emission Color" in bsdf.inputs:
            bsdf.inputs["Emission Color"].default_value = (*color, 1.0)
        if "Emission Strength" in bsdf.inputs:
            bsdf.inputs["Emission Strength"].default_value = float(emit)

    links.new(bsdf.outputs["BSDF"], output.inputs["Surface"])
    mat.diffuse_color = (*color, 1.0)


def apply_material_presets() -> None:
    for name, preset in MATERIAL_PRESETS.items():
        ensure_material(name, preset)


def count_tris(mesh_prefix: str | None = None) -> int:
    import bpy

    total = 0
    for obj in bpy.data.objects:
        if obj.type != "MESH":
            continue
        if mesh_prefix and not obj.name.startswith(mesh_prefix):
            continue
        total += sum(len(p.vertices) - 2 for p in obj.data.polygons)
    return total


def optimize_scene(mesh_prefix: str | None = None) -> int:
    """Merge duplicate materials and decimate if still over budget."""
    import bpy

    apply_material_presets()

    for obj in bpy.data.objects:
        if obj.type != "MESH":
            continue
        if mesh_prefix and not obj.name.startswith(mesh_prefix):
            continue
        mesh = obj.data
        if len(mesh.polygons):
            mesh.polygons.foreach_set("use_smooth", [True] * len(mesh.polygons))
            mesh.update()

    total = count_tris(mesh_prefix)
    if total <= MAX_TRIS:
        return total

    ratio = max(0.35, MAX_TRIS / max(total, 1))
    print("DECIMATE ratio", round(ratio, 4), "from", total, "tris")
    for obj in bpy.data.objects:
        if obj.type != "MESH":
            continue
        if mesh_prefix and not obj.name.startswith(mesh_prefix):
            continue
        if "Beacon" in obj.name or "Antenna" in obj.name:
            continue
        mod = obj.modifiers.new(name="StageDecimate", type="DECIMATE")
        mod.ratio = ratio
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.select_all(action="DESELECT")
        obj.select_set(True)
        bpy.ops.object.modifier_apply(modifier=mod.name)

    final = count_tris(mesh_prefix)
    print("DECIMATE result", final, "tris")
    return final


def tune_scene_lighting() -> None:
    import bpy

    world = bpy.context.scene.world
    if world is None:
        world = bpy.data.worlds.new("StageWorld")
        bpy.context.scene.world = world
    world.use_nodes = True
    nodes = world.node_tree.nodes
    links = world.node_tree.links
    nodes.clear()
    output = nodes.new("ShaderNodeOutputWorld")
    bg = nodes.new("ShaderNodeBackground")
    bg.inputs["Color"].default_value = (0.55, 0.62, 0.72, 1.0)
    bg.inputs["Strength"].default_value = 0.35
    links.new(bg.outputs["Background"], output.inputs["Surface"])


def process_blend(blend_path: str, mesh_prefix: str | None = None) -> None:
    import bpy

    bpy.ops.wm.open_mainfile(filepath=blend_path)
    tune_scene_lighting()
    final_tris = optimize_scene(mesh_prefix)
    bpy.ops.wm.save_mainfile(filepath=blend_path)
    print("LOOKDEV", blend_path, "tris=", final_tris)


def process_all_projects() -> None:
    projects = os.path.join(ROOT, "projects")
    targets = [
        ("skyscraper/skyscraper.blend", "ST_"),
    ]
    for rel_path, mesh_prefix in targets:
        blend_path = os.path.join(projects, rel_path)
        if os.path.exists(blend_path):
            process_blend(blend_path, mesh_prefix)
        else:
            print("SKIP missing", blend_path)


if __name__ == "__main__":
    process_all_projects()
