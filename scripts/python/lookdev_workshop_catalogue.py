"""Workshop catalogue lookdev — shared PBR + dynamic lighting.

Keeps CC_/CX_ names, collections, and construction animation fcurves.
Does not edit mesh topology. Matches ST_* lookdev values from
lookdev_stage_assets.py.
"""
from __future__ import annotations

import os
import sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
SCRIPTS = os.path.dirname(os.path.abspath(__file__))
SHOT_DIR = os.path.join(ROOT, "projects", "workshop")

if SCRIPTS not in sys.path:
    sys.path.insert(0, SCRIPTS)

# Name -> PBR. Existing CC_* slots stay; values align with ST_* gold standard.
MATERIAL_PRESETS: dict[str, dict[str, float | tuple[float, float, float]]] = {
    "CC_Concrete": {
        "color": (0.58, 0.56, 0.51),
        "roughness": 0.88,
        "metallic": 0.0,
        "bump": 0.08,
    },
    "CC_TanWall": {
        "color": (0.66, 0.56, 0.40),
        "roughness": 0.62,
        "metallic": 0.04,
        "bump": 0.05,
    },
    "CC_LightMetal": {
        "color": (0.72, 0.74, 0.76),
        "roughness": 0.38,
        "metallic": 0.88,
        "bump": 0.03,
    },
    "CC_DarkMetal": {
        "color": (0.18, 0.19, 0.21),
        "roughness": 0.45,
        "metallic": 0.92,
        "bump": 0.04,
    },
    "CC_Steel": {
        "color": (0.18, 0.19, 0.21),
        "roughness": 0.40,
        "metallic": 0.78,
        "bump": 0.03,
    },
    "CC_Roof": {
        "color": (0.14, 0.13, 0.12),
        "roughness": 0.78,
        "metallic": 0.08,
        "bump": 0.06,
    },
    "CC_SkyGlass": {
        "color": (0.18, 0.32, 0.46),
        "roughness": 0.05,
        "metallic": 0.12,
        "transmission": 0.78,
        "emit": 0.35,
        "emit_color": (0.55, 0.78, 1.0),
        "glass": True,
    },
    "CC_Window": {
        "color": (0.06, 0.09, 0.14),
        "roughness": 0.06,
        "metallic": 0.05,
        "transmission": 0.72,
        "emit": 0.55,
        "emit_color": (1.0, 0.78, 0.42),
        "glass": True,
    },
    "CC_Canopy": {
        "color": (0.42, 0.62, 0.78),
        "roughness": 0.06,
        "metallic": 0.0,
        "transmission": 0.72,
        "emit": 0.18,
        "emit_color": (0.70, 0.85, 1.0),
    },
    "CC_Dirt": {
        "color": (0.26, 0.20, 0.13),
        "roughness": 0.94,
        "metallic": 0.0,
        "bump": 0.12,
    },
    "CC_Yellow": {
        "color": (0.92, 0.74, 0.10),
        "roughness": 0.38,
        "metallic": 0.06,
        "emit": 0.28,
        "emit_color": (1.0, 0.82, 0.22),
    },
    "CC_ConstrYellow": {
        "color": (0.93, 0.74, 0.07),
        "roughness": 0.40,
        "metallic": 0.12,
    },
    "CC_ConstrBlack": {
        "color": (0.04, 0.04, 0.04),
        "roughness": 0.55,
        "metallic": 0.35,
    },
    "CC_ConstrCab": {
        "color": (0.12, 0.28, 0.62),
        "roughness": 0.38,
        "metallic": 0.18,
    },
    "CC_BlueTrim": {
        "color": (0.10, 0.28, 0.72),
        "roughness": 0.36,
        "metallic": 0.22,
    },
    "CC_Frame": {
        "color": (0.78, 0.76, 0.70),
        "roughness": 0.42,
        "metallic": 0.12,
    },
    "CC_Tank": {
        "color": (0.20, 0.22, 0.24),
        "roughness": 0.36,
        "metallic": 0.72,
    },
    "CC_GreenGen": {
        "color": (0.18, 0.28, 0.14),
        "roughness": 0.52,
        "metallic": 0.28,
    },
    "CC_Black": {
        "color": (0.03, 0.03, 0.03),
        "roughness": 0.55,
        "metallic": 0.15,
    },
    "CC_White": {
        "color": (0.86, 0.87, 0.84),
        "roughness": 0.42,
        "metallic": 0.0,
        "emit": 0.15,
        "emit_color": (0.95, 0.94, 0.88),
    },
}


def _set_input(node, name: str, value) -> None:
    if name in node.inputs:
        node.inputs[name].default_value = value


def build_principled(mat, preset: dict) -> None:
    """Rebuild a shared procedural Principled graph. Keep material datablock name."""
    import bpy

    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    nodes.clear()

    output = nodes.new("ShaderNodeOutputMaterial")
    output.location = (520, 0)
    bsdf = nodes.new("ShaderNodeBsdfPrincipled")
    bsdf.location = (200, 0)

    color = preset["color"]
    _set_input(bsdf, "Base Color", (*color, 1.0))
    _set_input(bsdf, "Roughness", float(preset.get("roughness", 0.5)))
    _set_input(bsdf, "Metallic", float(preset.get("metallic", 0.0)))

    transmission = preset.get("transmission")
    if transmission is not None:
        if "Transmission Weight" in bsdf.inputs:
            bsdf.inputs["Transmission Weight"].default_value = float(transmission)
        elif "Transmission" in bsdf.inputs:
            bsdf.inputs["Transmission"].default_value = float(transmission)
        _set_input(bsdf, "IOR", 1.48)

    emit = float(preset.get("emit") or 0.0)
    emit_color = preset.get("emit_color") or color
    if emit > 0:
        _set_input(bsdf, "Emission Color", (*emit_color, 1.0))
        _set_input(bsdf, "Emission Strength", emit)

    bump_amt = float(preset.get("bump") or 0.0)
    if bump_amt > 0:
        tex_coord = nodes.new("ShaderNodeTexCoord")
        tex_coord.location = (-560, -80)
        noise = nodes.new("ShaderNodeTexNoise")
        noise.location = (-360, -80)
        noise.inputs["Scale"].default_value = 18.0
        noise.inputs["Detail"].default_value = 6.0
        noise.inputs["Roughness"].default_value = 0.55
        bump = nodes.new("ShaderNodeBump")
        bump.location = (0, -120)
        bump.inputs["Strength"].default_value = bump_amt
        links.new(tex_coord.outputs["Object"], noise.inputs["Vector"])
        links.new(noise.outputs["Fac"], bump.inputs["Height"])
        links.new(bump.outputs["Normal"], bsdf.inputs["Normal"])

        # Subtle albedo variation so concrete/dirt is not a flat Lambert slab.
        ramp = nodes.new("ShaderNodeMix")
        ramp.location = (0, 160)
        ramp.data_type = "RGBA"
        ramp.blend_type = "MULTIPLY"
        ramp.inputs["Factor"].default_value = 0.22
        tint = nodes.new("ShaderNodeRGB")
        tint.location = (-220, 200)
        tint.outputs[0].default_value = (*color, 1.0)
        links.new(tint.outputs[0], ramp.inputs["A"])
        links.new(noise.outputs["Fac"], ramp.inputs["B"])
        links.new(ramp.outputs["Result"], bsdf.inputs["Base Color"])

    links.new(bsdf.outputs["BSDF"], output.inputs["Surface"])
    mat.diffuse_color = (*color, 1.0)
    if preset.get("glass"):
        if hasattr(mat, "use_screen_refraction"):
            mat.use_screen_refraction = True
        if hasattr(mat, "refraction_depth"):
            mat.refraction_depth = 0.15
        if hasattr(mat, "surface_render_method"):
            mat.surface_render_method = "BLENDED"
        if hasattr(mat, "blend_method"):
            try:
                mat.blend_method = "BLEND"
            except TypeError:
                pass


def apply_material_presets() -> list[str]:
    import bpy

    touched: list[str] = []
    for name, preset in MATERIAL_PRESETS.items():
        mat = bpy.data.materials.get(name)
        if mat is None:
            continue
        build_principled(mat, preset)
        touched.append(name)
    return touched


def shade_smooth_meshes() -> int:
    """Shade-smooth only. No topology change."""
    import bpy

    count = 0
    for obj in bpy.data.objects:
        if obj.type != "MESH" or not obj.data.polygons:
            continue
        obj.data.polygons.foreach_set("use_smooth", [True] * len(obj.data.polygons))
        obj.data.update()
        count += 1
    return count


def tune_dynamic_lighting() -> None:
    import bpy
    from mathutils import Euler

    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"
    eevee = getattr(scene, "eevee", None)
    if eevee is not None:
        if hasattr(eevee, "use_gtao"):
            eevee.use_gtao = True
        if hasattr(eevee, "gtao_distance"):
            eevee.gtao_distance = 0.35
        if hasattr(eevee, "use_shadows"):
            eevee.use_shadows = True
        if hasattr(eevee, "use_raytracing"):
            eevee.use_raytracing = True
        if hasattr(eevee, "use_volumetric_shadows"):
            eevee.use_volumetric_shadows = True

    world = scene.world
    if world is None:
        world = bpy.data.worlds.new("World")
        scene.world = world
    world.use_nodes = True
    nodes = world.node_tree.nodes
    links = world.node_tree.links
    nodes.clear()
    output = nodes.new("ShaderNodeOutputWorld")
    output.location = (300, 0)
    bg = nodes.new("ShaderNodeBackground")
    bg.location = (80, 0)
    # Cool daylight fill — sun carries the key so shadows stay readable.
    bg.inputs["Color"].default_value = (0.48, 0.58, 0.72, 1.0)
    bg.inputs["Strength"].default_value = 0.28
    links.new(bg.outputs["Background"], output.inputs["Surface"])

    sun = bpy.data.objects.get("CC_Sun")
    if sun and sun.type == "LIGHT":
        sun.data.type = "SUN"
        sun.data.energy = 5.2
        sun.data.color = (1.0, 0.95, 0.86)
        sun.data.angle = 0.009
        if hasattr(sun.data, "use_shadow"):
            sun.data.use_shadow = True
        sun.rotation_euler = Euler((0.95, 0.15, 0.85), "XYZ")
        sun.location = (12.0, -14.0, 22.0)

    fill = bpy.data.objects.get("CC_Fill")
    if fill and fill.type == "LIGHT":
        fill.data.type = "AREA"
        fill.data.energy = 90.0
        fill.data.color = (0.72, 0.80, 0.95)
        if hasattr(fill.data, "size"):
            fill.data.size = 14.0
        fill.location = (-12.0, -10.0, 11.0)
        fill.rotation_euler = Euler((0.9, 0.0, -0.6), "XYZ")

    # Construction points stay as motivated work lights — dimmer so they do not flatten.
    for obj in bpy.data.objects:
        if obj.type != "LIGHT" or not obj.name.startswith("CC_BuildLight"):
            continue
        obj.data.energy = min(float(obj.data.energy), 140.0)
        obj.data.color = (1.0, 0.78, 0.45)
        if hasattr(obj.data, "use_shadow"):
            obj.data.use_shadow = True
        if hasattr(obj.data, "shadow_soft_size"):
            obj.data.shadow_soft_size = 0.35


def count_hide_keys() -> dict[str, int]:
    from animate_construction import iter_fcurves
    import bpy

    keyed = 0
    objects = 0
    for obj in bpy.data.objects:
        hide_count = 0
        for fcu in iter_fcurves(obj):
            if "hide" in fcu.data_path:
                hide_count += len(fcu.keyframe_points)
        if hide_count:
            objects += 1
            keyed += hide_count
    return {"objects_with_hide": objects, "hide_keyframes": keyed}


def ensure_lookdev_camera() -> None:
    """Studio extras only. Names avoid CC_/CX_ so animate_construction ignores them."""
    import bpy
    from mathutils import Euler, Vector

    scene = bpy.context.scene
    ground = bpy.data.objects.get("Lookdev_Ground")
    if ground is None:
        bpy.ops.mesh.primitive_plane_add(size=420.0, location=(130.0, 0.0, -0.14))
        ground = bpy.context.active_object
        ground.name = "Lookdev_Ground"
        dirt = bpy.data.materials.get("CC_Dirt")
        if dirt is not None:
            ground.data.materials.append(dirt)
        studio = bpy.data.collections.get("CC_Studio")
        if studio is not None:
            for coll in list(ground.users_collection):
                coll.objects.unlink(ground)
            studio.objects.link(ground)

    cam = bpy.data.objects.get("CAM_Lookdev")
    if cam is None:
        cam_data = bpy.data.cameras.new("CAM_Lookdev")
        cam = bpy.data.objects.new("CAM_Lookdev", cam_data)
        scene.collection.objects.link(cam)
        studio = bpy.data.collections.get("CC_Studio")
        if studio is not None:
            studio.objects.link(cam)
    aim_camera(cam, Vector((70.0, -52.0, 26.0)), Vector((88.0, 0.0, 7.0)), 32.0)
    scene.camera = cam


def aim_camera(cam, location, target, lens: float) -> None:
    from mathutils import Vector

    cam.location = Vector(location)
    direction = Vector(target) - cam.location
    cam.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()
    cam.data.lens = lens


def render_shot(path: str, frame: int, camera_name: str | None = None) -> str:
    import bpy

    scene = bpy.context.scene
    camera = bpy.data.objects.get(camera_name) if camera_name else None
    if camera is None:
        camera = bpy.data.objects.get("CAM_Lookdev") or bpy.data.objects.get("CC_Camera")
    if camera is not None:
        scene.camera = camera
    scene.frame_set(frame)
    scene.render.image_settings.file_format = "PNG"
    scene.render.resolution_x = 1600
    scene.render.resolution_y = 900
    scene.render.resolution_percentage = 100
    scene.render.filepath = path
    bpy.ops.render.render(write_still=True)
    return path


def process_open_file() -> None:
    import bpy

    os.makedirs(SHOT_DIR, exist_ok=True)
    before_path = os.path.join(SHOT_DIR, "lookdev_before.png")
    after_path = os.path.join(SHOT_DIR, "lookdev_after.png")

    anim_before = count_hide_keys()
    print("ANIM_BEFORE", anim_before)
    render_shot(before_path, 360, "CC_Camera")
    print("SHOT_BEFORE", before_path)

    touched = apply_material_presets()
    smooth_count = shade_smooth_meshes()
    tune_dynamic_lighting()
    ensure_lookdev_camera()
    print("MATERIALS", touched)
    print("SMOOTH", smooth_count)

    anim_after = count_hide_keys()
    print("ANIM_AFTER", anim_after)

    render_shot(after_path, 360, "CAM_Lookdev")
    print("SHOT_AFTER", after_path)
    close_path = os.path.join(SHOT_DIR, "lookdev_after_sky_a.png")
    cam = bpy.data.objects.get("CAM_Lookdev")
    if cam is not None:
        from mathutils import Vector

        aim_camera(cam, Vector((32.0, -18.0, 8.5)), Vector((44.0, 0.0, 8.0)), 40.0)
    render_shot(close_path, 360, "CAM_Lookdev")
    print("SHOT_CLOSE", close_path)
    if cam is not None:
        from mathutils import Vector

        aim_camera(cam, Vector((70.0, -52.0, 26.0)), Vector((88.0, 0.0, 7.0)), 32.0)

    # Spot-check construction bind pose still keys hides on city towers.
    scene = bpy.context.scene
    scene.frame_set(1)
    hidden_at_1 = 0
    visible_at_360 = 0
    for name in (
        "CC_SkyTowerA_Body",
        "CC_SkyTowerB_Body",
        "CC_SkyTowerC_Body",
        "CC_IndFactoryA_Body",
        "CC_SteelFrame",
    ):
        obj = bpy.data.objects.get(name)
        if obj is None:
            print("MISSING", name)
            continue
        scene.frame_set(1)
        if obj.hide_viewport or obj.hide_render:
            hidden_at_1 += 1
        scene.frame_set(360)
        if not obj.hide_viewport and not obj.hide_render:
            visible_at_360 += 1
        print(
            "STAGE",
            name,
            "f1_hide",
            obj.hide_viewport,
            obj.hide_render,
            "f360_hide",
            end=" ",
        )
        scene.frame_set(360)
        print(obj.hide_viewport, obj.hide_render)

    scene.frame_set(360)
    if bpy.data.filepath:
        bpy.ops.wm.save_mainfile()
        print("SAVED", bpy.data.filepath)
    print("VERIFY hidden_at_1", hidden_at_1, "visible_at_360", visible_at_360)


if __name__ == "__main__":
    process_open_file()
