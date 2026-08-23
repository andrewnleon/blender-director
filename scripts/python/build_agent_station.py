"""Procedural agent station meshes — RC_/DC_/QA_/DP_ prefixes."""
from __future__ import annotations

import math

import bmesh
import bpy
from mathutils import Vector

from agent_station_specs import AgentStationSpec, get_agent_station_spec
from construction_crane import CraneConfig, build_tower_crane
from construct_grammar import crane_boom_len, crane_site_xyz

PAD_Z = 0.32
SITE_HALF = 4.96
FENCE_THICK = 0.08
PAD_HALF = SITE_HALF - FENCE_THICK
FENCE_HALF = SITE_HALF - FENCE_THICK / 2


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


def game_mat(
    name: str,
    color: tuple[float, float, float],
    *,
    roughness: float = 0.55,
    metallic: float = 0.0,
    emit: float = 0.0,
):
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


def box(name, loc, dims, mat_name, collection_name="Structure"):
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


def cylinder(
    name,
    loc,
    radius,
    depth,
    mat_name,
    segments=16,
    rot=(0, 0, 0),
    collection_name="Structure",
):
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


def hemisphere(name, loc, radius, mat_name, segments=24, collection_name="Structure"):
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


def make_materials(spec: AgentStationSpec) -> None:
    prefix = spec.prefix
    game_mat(f"{prefix}Concrete", (0.50, 0.48, 0.44), roughness=0.9)
    game_mat(f"{prefix}Body", spec.body_rgb, roughness=0.55, metallic=0.15)
    game_mat(f"{prefix}Trim", spec.trim_rgb, roughness=0.38, metallic=0.2)
    game_mat(
        f"{prefix}Accent",
        spec.accent_rgb,
        roughness=0.32,
        metallic=0.28,
        emit=0.45,
    )
    game_mat(f"{prefix}Glass", (0.18, 0.42, 0.58), roughness=0.08, metallic=0.08)
    game_mat(f"{prefix}Metal", (0.68, 0.70, 0.74), roughness=0.35, metallic=0.9)
    game_mat(f"{prefix}Beacon", (1.0, 0.12, 0.08), roughness=0.18, emit=1.4)
    game_mat(f"{prefix}Dirt", (0.34, 0.30, 0.24), roughness=0.95)
    game_mat(f"{prefix}ConstrYellow", (0.93, 0.74, 0.07), roughness=0.42, metallic=0.15)
    game_mat(f"{prefix}ConstrBlack", (0.12, 0.12, 0.14), roughness=0.55, metallic=0.25)
    game_mat(f"{prefix}ConstrCab", (0.28, 0.32, 0.36), roughness=0.45, metallic=0.2)


def build_site(spec: AgentStationSpec) -> None:
    prefix = spec.prefix
    site = coll(f"{prefix}Site")
    dirt = box(
        f"{prefix}DirtGround",
        (0, 0, PAD_Z * 0.15),
        (SITE_HALF * 2, SITE_HALF * 2, 0.12),
        f"{prefix}Dirt",
        f"{prefix}Site",
    )
    link(dirt, site)
    pad = box(
        f"{prefix}Pad",
        (0, 0, PAD_Z * 0.5),
        (PAD_HALF * 2, PAD_HALF * 2, PAD_Z),
        f"{prefix}Concrete",
        f"{prefix}Site",
    )
    link(pad, site)
    for side, loc in (
        ("N", (0, FENCE_HALF, PAD_Z * 0.55)),
        ("S", (0, -FENCE_HALF, PAD_Z * 0.55)),
        ("E", (FENCE_HALF, 0, PAD_Z * 0.55)),
        ("W", (-FENCE_HALF, 0, PAD_Z * 0.55)),
    ):
        fence = box(
            f"{prefix}Fence_{side}",
            loc,
            (
                PAD_HALF * 2 if side in {"N", "S"} else FENCE_THICK,
                FENCE_THICK if side in {"N", "S"} else PAD_HALF * 2,
                0.55,
            ),
            f"{prefix}Metal",
            f"{prefix}Site",
        )
        link(fence, site)


def build_crane(spec: AgentStationSpec) -> None:
    prefix = spec.prefix
    site_xyz = crane_site_xyz(PAD_HALF * 2, PAD_HALF * 2, PAD_Z)
    boom_len = crane_boom_len(site_xyz) if spec.boom_len <= 0 else spec.boom_len
    config = CraneConfig(
        prefix=prefix,
        site_xyz=site_xyz,
        pad_z=PAD_Z,
        tower_rest_h=spec.tower_rest_h,
        boom_len=boom_len,
        mat_yellow=f"{prefix}ConstrYellow",
        mat_black=f"{prefix}ConstrBlack",
        mat_cab=f"{prefix}ConstrCab",
        mat_payload=f"{prefix}Metal",
        collection_name=f"{prefix}Construction",
    )
    build_tower_crane(config, box, coll, link)


def build_foundation(spec: AgentStationSpec) -> None:
    prefix = spec.prefix
    core_r = spec.core_r
    foundation_coll = coll(f"{prefix}Foundation")
    podium_z = PAD_Z + 0.18
    box(f"{prefix}Podium", (0, 0, podium_z), (core_r * 2.3, core_r * 2.3, 0.28), f"{prefix}Concrete")
    box(
        f"{prefix}Foundation",
        (0, 0, PAD_Z + 0.38),
        (core_r * 2.05, core_r * 2.05, 0.16),
        f"{prefix}Concrete",
    )
    for name in (f"{prefix}Podium", f"{prefix}Foundation"):
        link(bpy.data.objects[name], foundation_coll)


def build_frame(spec: AgentStationSpec) -> None:
    prefix = spec.prefix
    core_r = spec.core_r
    wall_h = spec.wall_h
    frame_coll = coll(f"{prefix}Frame")
    base_z = PAD_Z + 0.52
    shaft_r = core_r * (0.42 if spec.variant == "tower" else 0.55)
    cylinder(
        f"{prefix}Core",
        (0, 0, base_z + wall_h * 0.42),
        shaft_r,
        wall_h * 0.82,
        f"{prefix}Metal",
        16,
    )
    link(bpy.data.objects[f"{prefix}Core"], frame_coll)

    for index, angle in enumerate((45, 135, 225, 315)):
        rad = math.radians(angle)
        x = math.cos(rad) * core_r * 0.78
        y = math.sin(rad) * core_r * 0.78
        buttress = box(
            f"{prefix}Buttress_{index}",
            (x, y, base_z + wall_h * 0.35),
            (0.64, 0.64, wall_h * 0.68),
            f"{prefix}Body",
        )
        link(buttress, frame_coll)

    ring_z = base_z + wall_h * 0.78
    cylinder(
        f"{prefix}FrameRing",
        (0, 0, ring_z),
        core_r * 0.92,
        0.22,
        f"{prefix}Metal",
        20,
    )
    link(bpy.data.objects[f"{prefix}FrameRing"], frame_coll)


def build_walls(spec: AgentStationSpec) -> None:
    prefix = spec.prefix
    core_r = spec.core_r
    wall_h = spec.wall_h
    wall_coll = coll(f"{prefix}Walls")
    base_z = PAD_Z + 0.52
    mid_z = base_z + wall_h * 0.45

    cylinder(
        f"{prefix}GlassBand",
        (0, 0, mid_z),
        core_r * 1.02,
        wall_h * 0.55,
        f"{prefix}Glass",
        20,
    )
    link(bpy.data.objects[f"{prefix}GlassBand"], wall_coll)

    for index, angle in enumerate((0, 90, 180, 270)):
        rad = math.radians(angle)
        x = math.cos(rad) * core_r * 1.05
        y = math.sin(rad) * core_r * 1.05
        panel = box(
            f"{prefix}WallPanel_{index}",
            (x, y, mid_z),
            (0.21, core_r * 0.9, wall_h * 0.5),
            f"{prefix}Body",
        )
        panel.rotation_euler = (0, 0, rad)
        link(panel, wall_coll)

    canopy = box(
        f"{prefix}Canopy",
        (0, -core_r * 1.05, base_z + 1.05),
        (2.75, 1.35, 0.12),
        f"{prefix}Trim",
    )
    canopy_pillar_l = box(
        f"{prefix}CanopyPost_L",
        (-1.0, -core_r * 1.05, base_z + 0.55),
        (0.18, 0.18, 1.0),
        f"{prefix}Metal",
    )
    canopy_pillar_r = box(
        f"{prefix}CanopyPost_R",
        (1.0, -core_r * 1.05, base_z + 0.55),
        (0.18, 0.18, 1.0),
        f"{prefix}Metal",
    )
    link(canopy, wall_coll)
    link(canopy_pillar_l, wall_coll)
    link(canopy_pillar_r, wall_coll)


def build_roof_signature(spec: AgentStationSpec) -> None:
    prefix = spec.prefix
    core_r = spec.core_r
    wall_h = spec.wall_h
    roof_coll = coll(f"{prefix}Roof")
    trim_coll = coll(f"{prefix}Trim")
    base_z = PAD_Z + 0.52
    roof_z = base_z + wall_h * 0.82

    deck = box(
        f"{prefix}RoofDeck",
        (0, 0, roof_z),
        (core_r * 1.9, core_r * 1.9, 0.1),
        f"{prefix}Body",
    )
    link(deck, roof_coll)

    signature_z = roof_z + 0.05
    if spec.variant == "greenhouse":
        radome = hemisphere(
            f"{prefix}Radome",
            (0, 0, signature_z),
            core_r * 0.72,
            f"{prefix}Glass",
            28,
        )
        link(radome, roof_coll)
    elif spec.variant == "factory":
        radome = box(
            f"{prefix}Radome",
            (0, 0, signature_z + 0.55),
            (core_r * 1.35, core_r * 1.1, 0.95),
            f"{prefix}Body",
        )
        link(radome, roof_coll)
        stack = cylinder(
            f"{prefix}Smokestack",
            (core_r * 0.75, core_r * 0.55, signature_z + 1.35),
            0.35,
            1.8,
            f"{prefix}Metal",
            14,
        )
        link(stack, roof_coll)
    elif spec.variant == "tower":
        radome = cylinder(
            f"{prefix}Radome",
            (0, 0, signature_z + 1.2),
            core_r * 0.55,
            2.4,
            f"{prefix}Trim",
            18,
        )
        link(radome, roof_coll)
        spire = box(
            f"{prefix}Spire",
            (0, 0, signature_z + 2.85),
            (0.28, 0.28, 1.2),
            f"{prefix}Accent",
        )
        link(spire, roof_coll)
    else:
        pad_ring = cylinder(
            f"{prefix}LaunchRing",
            (0, 0, signature_z + 0.08),
            core_r * 0.95,
            0.12,
            f"{prefix}Accent",
            24,
            (math.radians(90), 0, 0),
        )
        link(pad_ring, roof_coll)
        radome = cylinder(
            f"{prefix}Radome",
            (0, 0, signature_z + 1.05),
            0.42,
            2.2,
            f"{prefix}Trim",
            16,
        )
        link(radome, roof_coll)

    dish_pivot = bpy.data.objects.new(f"{prefix}DishPivot", None)
    dish_pivot.location = (core_r * 0.35, core_r * 0.35, roof_z + 0.35)
    link(dish_pivot, roof_coll)
    arm = box(f"{prefix}DishArm", (0.85, 0, 0.35), (1.7, 0.15, 0.15), f"{prefix}Metal")
    arm.parent = dish_pivot
    dish = cylinder(
        f"{prefix}Dish",
        (1.6, 0, 0.35),
        0.85,
        0.12,
        f"{prefix}Metal",
        20,
        (math.radians(72), 0, 0),
    )
    dish.parent = dish_pivot

    ring = cylinder(
        f"{prefix}RadomeRing",
        (0, 0, roof_z + 0.12),
        core_r * 0.82,
        0.12,
        f"{prefix}Accent",
        24,
        (math.radians(90), 0, 0),
    )
    link(ring, trim_coll)

    for index, angle in enumerate((30, 120, 210, 300)):
        rad = math.radians(angle)
        x = math.cos(rad) * core_r * 0.95
        y = math.sin(rad) * core_r * 0.95
        light = box(
            f"{prefix}RimLight_{index}",
            (x, y, roof_z + 0.18),
            (0.42, 0.42, 0.15),
            f"{prefix}Accent",
        )
        link(light, trim_coll)

    antenna = box(
        f"{prefix}Antenna",
        (0, 0, signature_z + (2.4 if spec.variant == "tower" else core_r * 0.95)),
        (0.12, 0.12, 0.95),
        f"{prefix}Metal",
    )
    link(antenna, trim_coll)
    beacon = box(
        f"{prefix}Beacon",
        (0, 0, signature_z + (3.0 if spec.variant == "tower" else core_r * 1.15)),
        (0.24, 0.24, 0.33),
        f"{prefix}Beacon",
    )
    link(beacon, trim_coll)


def clear_scene() -> None:
    for obj in list(bpy.data.objects):
        bpy.data.objects.remove(obj, do_unlink=True)
    for block in list(bpy.data.collections):
        if block.name != "Scene Collection":
            bpy.data.collections.remove(block)
    for datablocks in (bpy.data.meshes, bpy.data.materials, bpy.data.lights, bpy.data.cameras):
        for block in list(datablocks):
            datablocks.remove(block)


def build_agent_station(building_id: str) -> AgentStationSpec:
    spec = get_agent_station_spec(building_id)
    clear_scene()
    make_materials(spec)
    build_site(spec)
    build_crane(spec)
    build_foundation(spec)
    build_frame(spec)
    build_walls(spec)
    build_roof_signature(spec)
    return spec


if __name__ == "__main__":
    import sys

    station_id = sys.argv[-1] if len(sys.argv) > 1 else "research-center"
    build_agent_station(station_id)
