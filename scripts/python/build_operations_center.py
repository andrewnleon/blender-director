"""Operations Center — mission-control hub with radome + crane (OC_ prefix)."""
from __future__ import annotations

import math

import bmesh
import bpy
from mathutils import Vector

from construction_crane import CraneConfig, build_tower_crane

PREFIX = "OC_"
PAD_Z = 0.32
# Yard lots are 10×10 m (±5 m). Site mesh inset — fence outer face inside yellow line.
SITE_HALF = 4.96
FENCE_THICK = 0.08
PAD_HALF = SITE_HALF - FENCE_THICK
FENCE_HALF = SITE_HALF - FENCE_THICK / 2
# ~80% of pad width (7.8 m podium) — readable dome/antennas, not a tiny center blob.
CORE_R = 3.4
WALL_H = 6.0
SITE_CRANE = (7.2, 7.0, PAD_Z)

OC_CRANE_CONFIG = CraneConfig(
    prefix=PREFIX,
    site_xyz=SITE_CRANE,
    pad_z=PAD_Z,
    tower_rest_h=6.2,
    boom_len=8.4,
    mat_yellow="OC_ConstrYellow",
    mat_black="OC_ConstrBlack",
    mat_cab="OC_ConstrCab",
    mat_payload="OC_Metal",
    collection_name="OC_Construction",
)


def coll(name: str):
    collection = bpy.data.collections.get(name)
    if collection is None:
        collection = bpy.data.collections.new(name)
        bpy.context.scene.collection.children.link(collection)
    return collection


def link(obj, collection):
    for user_collection in list(obj.users_collection):
        user_collection.objects.unlink(obj)
    collection.objects.link(obj)
    return obj


def game_mat(name, color, roughness=0.55, metallic=0.0, emit=0.0):
    mat = bpy.data.materials.get(name)
    if mat is None:
        mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    nodes.clear()
    output = nodes.new("ShaderNodeOutputMaterial")
    bsdf = nodes.new("ShaderNodeBsdfPrincipled")
    bsdf.inputs["Base Color"].default_value = (*color, 1.0)
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = metallic
    if emit > 0:
        if "Emission Color" in bsdf.inputs:
            bsdf.inputs["Emission Color"].default_value = (*color, 1.0)
        if "Emission Strength" in bsdf.inputs:
            bsdf.inputs["Emission Strength"].default_value = emit
    links.new(bsdf.outputs["BSDF"], output.inputs["Surface"])
    mat.diffuse_color = (*color, 1.0)
    return mat


def make_materials() -> None:
    game_mat("OC_Concrete", (0.50, 0.48, 0.44), roughness=0.9)
    game_mat("OC_Body", (0.22, 0.28, 0.36), roughness=0.55, metallic=0.15)
    game_mat("OC_Trim", (0.72, 0.64, 0.98), roughness=0.38, metallic=0.2)
    game_mat("OC_Accent", (0.49, 0.36, 0.75), roughness=0.32, metallic=0.28, emit=0.45)
    game_mat("OC_Glass", (0.18, 0.42, 0.58), roughness=0.08, metallic=0.08)
    game_mat("OC_Metal", (0.68, 0.70, 0.74), roughness=0.35, metallic=0.9)
    game_mat("OC_Beacon", (1.0, 0.12, 0.08), roughness=0.18, emit=1.4)
    game_mat("OC_Dirt", (0.34, 0.30, 0.24), roughness=0.95)
    game_mat("OC_ConstrYellow", (0.93, 0.74, 0.07), roughness=0.42, metallic=0.15)
    game_mat("OC_ConstrBlack", (0.12, 0.12, 0.14), roughness=0.55, metallic=0.25)
    game_mat("OC_ConstrCab", (0.28, 0.32, 0.36), roughness=0.45, metallic=0.2)


def box(name, loc, dims, mat_name, collection_name="OC_Structure"):
    mesh = bpy.data.meshes.new(name)
    obj = bpy.data.objects.new(name, mesh)
    link(obj, coll(collection_name))
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    for vert in bm.verts:
        vert.co.x *= dims[0]
        vert.co.y *= dims[1]
        vert.co.z *= dims[2]
    bm.to_mesh(mesh)
    bm.free()
    obj.location = Vector(loc)
    obj.data.materials.append(bpy.data.materials[mat_name])
    return obj


def cylinder(name, loc, radius, depth, mat_name, segments=16, rot=(0, 0, 0), collection_name="OC_Structure"):
    mesh = bpy.data.meshes.new(name)
    obj = bpy.data.objects.new(name, mesh)
    link(obj, coll(collection_name))
    bm = bmesh.new()
    bmesh.ops.create_cone(
        bm,
        cap_ends=True,
        cap_tris=False,
        segments=segments,
        radius1=radius,
        radius2=radius,
        depth=depth,
    )
    bm.to_mesh(mesh)
    bm.free()
    obj.location = Vector(loc)
    obj.rotation_euler = rot
    obj.data.materials.append(bpy.data.materials[mat_name])
    return obj


def hemisphere(name, loc, radius, mat_name, segments=24, collection_name="OC_Structure"):
    mesh = bpy.data.meshes.new(name)
    obj = bpy.data.objects.new(name, mesh)
    link(obj, coll(collection_name))
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=segments, v_segments=segments // 2, radius=radius)
    bmesh.ops.bisect_plane(
        bm,
        geom=bm.verts[:] + bm.edges[:] + bm.faces[:],
        dist=0,
        plane_co=(0, 0, 0),
        plane_no=(0, 0, 1),
        clear_inner=True,
    )
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(mesh)
    bm.free()
    obj.location = Vector(loc)
    obj.data.materials.append(bpy.data.materials[mat_name])
    return obj


def build_site() -> None:
    site = coll("OC_Site")
    dirt = box("OC_DirtGround", (0, 0, PAD_Z * 0.15), (SITE_HALF * 2, SITE_HALF * 2, 0.12), "OC_Dirt", "OC_Site")
    link(dirt, site)
    pad = box("OC_Pad", (0, 0, PAD_Z * 0.5), (PAD_HALF * 2, PAD_HALF * 2, PAD_Z), "OC_Concrete", "OC_Site")
    link(pad, site)
    for side, loc in (
        ("N", (0, FENCE_HALF, PAD_Z * 0.55)),
        ("S", (0, -FENCE_HALF, PAD_Z * 0.55)),
        ("E", (FENCE_HALF, 0, PAD_Z * 0.55)),
        ("W", (-FENCE_HALF, 0, PAD_Z * 0.55)),
    ):
        fence = box(
            f"OC_Fence_{side}",
            loc,
            (
                PAD_HALF * 2 if side in {"N", "S"} else FENCE_THICK,
                FENCE_THICK if side in {"N", "S"} else PAD_HALF * 2,
                0.55,
            ),
            "OC_Metal",
            "OC_Site",
        )
        link(fence, site)


def build_foundation() -> None:
    foundation_coll = coll("OC_Foundation")
    podium_z = PAD_Z + 0.18
    box("OC_Podium", (0, 0, podium_z), (CORE_R * 2.3, CORE_R * 2.3, 0.28), "OC_Concrete")
    box(
        "OC_Foundation",
        (0, 0, PAD_Z + 0.38),
        (CORE_R * 2.05, CORE_R * 2.05, 0.16),
        "OC_Concrete",
    )
    for name in ("OC_Podium", "OC_Foundation"):
        link(bpy.data.objects[name], foundation_coll)


def build_frame() -> None:
    frame_coll = coll("OC_Frame")
    base_z = PAD_Z + 0.52
    cylinder("OC_Core", (0, 0, base_z + WALL_H * 0.42), CORE_R * 0.55, WALL_H * 0.82, "OC_Metal", 16)
    link(bpy.data.objects["OC_Core"], frame_coll)

    for index, angle in enumerate((45, 135, 225, 315)):
        rad = math.radians(angle)
        x = math.cos(rad) * CORE_R * 0.78
        y = math.sin(rad) * CORE_R * 0.78
        buttress = box(
            f"OC_Buttress_{index}",
            (x, y, base_z + WALL_H * 0.35),
            (0.64, 0.64, WALL_H * 0.68),
            "OC_Body",
        )
        link(buttress, frame_coll)

    ring_z = base_z + WALL_H * 0.78
    cylinder("OC_FrameRing", (0, 0, ring_z), CORE_R * 0.92, 0.22, "OC_Metal", 20)
    link(bpy.data.objects["OC_FrameRing"], frame_coll)


def build_walls() -> None:
    wall_coll = coll("OC_Walls")
    base_z = PAD_Z + 0.52
    mid_z = base_z + WALL_H * 0.45

    cylinder("OC_GlassBand", (0, 0, mid_z), CORE_R * 1.02, WALL_H * 0.55, "OC_Glass", 20)
    link(bpy.data.objects["OC_GlassBand"], wall_coll)

    for index, angle in enumerate((0, 90, 180, 270)):
        rad = math.radians(angle)
        x = math.cos(rad) * CORE_R * 1.05
        y = math.sin(rad) * CORE_R * 1.05
        panel = box(
            f"OC_WallPanel_{index}",
            (x, y, mid_z),
            (0.21, CORE_R * 0.9, WALL_H * 0.5),
            "OC_Body",
        )
        panel.rotation_euler = (0, 0, rad)
        link(panel, wall_coll)

    canopy = box("OC_Canopy", (0, -CORE_R * 1.05, base_z + 1.05), (2.75, 1.35, 0.12), "OC_Trim")
    canopy_pillar_l = box("OC_CanopyPost_L", (-1.0, -CORE_R * 1.05, base_z + 0.55), (0.18, 0.18, 1.0), "OC_Metal")
    canopy_pillar_r = box("OC_CanopyPost_R", (1.0, -CORE_R * 1.05, base_z + 0.55), (0.18, 0.18, 1.0), "OC_Metal")
    link(canopy, wall_coll)
    link(canopy_pillar_l, wall_coll)
    link(canopy_pillar_r, wall_coll)


def build_roof_trim() -> None:
    roof_coll = coll("OC_Roof")
    trim_coll = coll("OC_Trim")
    base_z = PAD_Z + 0.52
    roof_z = base_z + WALL_H * 0.82

    deck = box("OC_RoofDeck", (0, 0, roof_z), (CORE_R * 1.9, CORE_R * 1.9, 0.1), "OC_Body")
    link(deck, roof_coll)

    radome_z = roof_z + 0.05
    radome = hemisphere("OC_Radome", (0, 0, radome_z), CORE_R * 0.78, "OC_Trim", 28)
    link(radome, roof_coll)

    dish_pivot = bpy.data.objects.new("OC_DishPivot", None)
    dish_pivot.location = (CORE_R * 0.35, CORE_R * 0.35, roof_z + 0.35)
    link(dish_pivot, roof_coll)
    arm = box("OC_DishArm", (0.85, 0, 0.35), (1.7, 0.15, 0.15), "OC_Metal")
    arm.parent = dish_pivot
    dish = cylinder("OC_Dish", (1.6, 0, 0.35), 0.85, 0.12, "OC_Metal", 20, (math.radians(72), 0, 0))
    dish.parent = dish_pivot

    ring = cylinder(
        "OC_RadomeRing",
        (0, 0, roof_z + 0.12),
        CORE_R * 0.82,
        0.12,
        "OC_Accent",
        24,
        (math.radians(90), 0, 0),
    )
    link(ring, trim_coll)

    for index, angle in enumerate((30, 120, 210, 300)):
        rad = math.radians(angle)
        x = math.cos(rad) * CORE_R * 0.95
        y = math.sin(rad) * CORE_R * 0.95
        light = box(f"OC_RimLight_{index}", (x, y, roof_z + 0.18), (0.42, 0.42, 0.15), "OC_Accent")
        link(light, trim_coll)

    antenna = box("OC_Antenna", (0, 0, radome_z + CORE_R * 0.95), (0.12, 0.12, 0.95), "OC_Metal")
    link(antenna, trim_coll)
    beacon = box("OC_Beacon", (0, 0, radome_z + CORE_R * 1.15), (0.24, 0.24, 0.33), "OC_Beacon")
    link(beacon, trim_coll)


def build_crane() -> None:
    build_tower_crane(OC_CRANE_CONFIG, box, coll, link)


def clear_scene() -> None:
    for obj in list(bpy.data.objects):
        bpy.data.objects.remove(obj, do_unlink=True)
    for block in list(bpy.data.collections):
        if block.name != "Scene Collection":
            bpy.data.collections.remove(block)
    for datablocks in (bpy.data.meshes, bpy.data.materials, bpy.data.lights, bpy.data.cameras):
        for block in list(datablocks):
            datablocks.remove(block)


def build_operations_center() -> None:
    clear_scene()
    make_materials()
    build_site()
    build_crane()
    build_foundation()
    build_frame()
    build_walls()
    build_roof_trim()


if __name__ == "__main__":
    build_operations_center()
