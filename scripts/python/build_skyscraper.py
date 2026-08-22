"""Hero skyscraper — single tower at origin for OpenClaw Yard."""
from __future__ import annotations

import math

import bmesh
import bpy
from mathutils import Euler, Vector

PREFIX = "ST_"
PAD_Z = 0.32
PAD_HALF = 4.2
FOOTPRINT = (6.0, 6.0)
HEIGHT = 18.0
FLOORS = 12
# Typical RC frame: 3×4 column grid (12 posts), beams, then slabs.
COLUMN_GRID = (3, 4)
COLUMN_SIZE = 0.28
BEAM_SIZE = 0.16

# Tower crane rest pose — NE of the 8.4 m pad. Mast grows in animation.
SITE_CRANE = (5.8, 5.0, PAD_Z)
SITE_ROAD = (-11.0, -8.0, PAD_Z)
CRANE_TOWER_REST_H = 5.4
CRANE_TOWER_BASE_Z = 0.6
CRANE_BOOM_REST_Z = 5.73
CRANE_CAB_REST_Z = 5.7
CRANE_HOOK_REST = (4.6, 0.0, -1.15)


def floor_height() -> float:
    return HEIGHT / FLOORS


def floor_center_z(floor: int) -> float:
    return PAD_Z + floor_height() * (floor - 0.5)


def floor_slab_z(floor: int) -> float:
    return PAD_Z + floor_height() * floor - 0.08


def floor_ring_z(floor: int) -> float:
    return PAD_Z + floor_height() * floor


def column_xy_list() -> list[tuple[float, float]]:
    width, depth = FOOTPRINT
    cols_x, cols_y = COLUMN_GRID
    xs = [(-0.5 + (index / (cols_x - 1))) * width * 0.78 for index in range(cols_x)]
    ys = [(-0.5 + (index / (cols_y - 1))) * depth * 0.78 for index in range(cols_y)]
    return [(x, y) for x in xs for y in ys]


def slab_material(floor: int) -> str:
    if floor <= 1:
        return "ST_SlabGround"
    if floor == FLOORS:
        return "ST_SlabRoof"
    if floor <= FLOORS // 2:
        return "ST_SlabMid"
    return "ST_SlabUpper"


def clear_scene() -> None:
    for obj in list(bpy.data.objects):
        bpy.data.objects.remove(obj, do_unlink=True)
    for block in list(bpy.data.collections):
        if block.name != "Scene Collection":
            bpy.data.collections.remove(block)
    for datablocks in (bpy.data.meshes, bpy.data.materials, bpy.data.lights, bpy.data.cameras):
        for block in list(datablocks):
            datablocks.remove(block)


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


def game_mat(name, color, roughness=0.55, metallic=0.0, transmission=0.0, emit=0.0):
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
    if transmission > 0 and "Transmission Weight" in bsdf.inputs:
        bsdf.inputs["Transmission Weight"].default_value = transmission
    if emit > 0:
        if "Emission Color" in bsdf.inputs:
            bsdf.inputs["Emission Color"].default_value = (*color, 1.0)
        if "Emission Strength" in bsdf.inputs:
            bsdf.inputs["Emission Strength"].default_value = emit
    links.new(bsdf.outputs["BSDF"], output.inputs["Surface"])
    mat.diffuse_color = (*color, 1.0)
    return mat


def make_materials() -> None:
    game_mat("ST_Concrete", (0.56, 0.54, 0.49), roughness=0.85)
    game_mat("ST_SlabGround", (0.78, 0.58, 0.32), roughness=0.88)
    game_mat("ST_SlabMid", (0.42, 0.62, 0.48), roughness=0.86)
    game_mat("ST_SlabUpper", (0.38, 0.52, 0.72), roughness=0.84)
    game_mat("ST_SlabRoof", (0.72, 0.70, 0.66), roughness=0.82)
    game_mat("ST_Dirt", (0.34, 0.30, 0.24), roughness=0.95)
    game_mat("ST_SkyGlass", (0.42, 0.58, 0.72), roughness=0.12, metallic=0.05, transmission=0.35)
    game_mat("ST_Wall", (0.14, 0.15, 0.17), roughness=0.58, metallic=0.12)
    game_mat("ST_Window", (0.04, 0.07, 0.10), roughness=0.12, metallic=0.0, transmission=0.55)
    game_mat("ST_LightMetal", (0.72, 0.74, 0.76), roughness=0.38, metallic=0.88)
    game_mat("ST_DarkMetal", (0.22, 0.23, 0.25), roughness=0.45, metallic=0.92)
    game_mat("ST_Steel", (0.18, 0.19, 0.21), roughness=0.4, metallic=0.78)
    game_mat("ST_FrameBlack", (0.02, 0.02, 0.025), roughness=0.38, metallic=0.88)
    game_mat("ST_Yellow", (0.92, 0.78, 0.18), roughness=0.35, emit=0.35)
    game_mat("ST_ConstrYellow", (0.93, 0.74, 0.07), roughness=0.42, metallic=0.15)
    game_mat("ST_ConstrBlack", (0.12, 0.12, 0.14), roughness=0.55, metallic=0.25)
    game_mat("ST_ConstrCab", (0.28, 0.32, 0.36), roughness=0.45, metallic=0.2)


def shade(obj) -> None:
    mesh = obj.data
    if len(mesh.polygons):
        mesh.polygons.foreach_set("use_smooth", [True] * len(mesh.polygons))
        mesh.update()


def assign(obj, mat_name: str):
    mat = bpy.data.materials.get(mat_name)
    if mat is None:
        return obj
    obj.data.materials.clear()
    obj.data.materials.append(mat)
    shade(obj)
    return obj


def add_box_mesh(bm, loc, dims):
    sx, sy, sz = dims[0] * 0.5, dims[1] * 0.5, dims[2] * 0.5
    x, y, z = loc
    coords = [
        (x - sx, y - sy, z - sz),
        (x + sx, y - sy, z - sz),
        (x + sx, y + sy, z - sz),
        (x - sx, y + sy, z - sz),
        (x - sx, y - sy, z + sz),
        (x + sx, y - sy, z + sz),
        (x + sx, y + sy, z + sz),
        (x - sx, y + sy, z + sz),
    ]
    verts = [bm.verts.new(c) for c in coords]
    for face in (
        (0, 1, 2, 3),
        (4, 7, 6, 5),
        (0, 4, 5, 1),
        (1, 5, 6, 2),
        (2, 6, 7, 3),
        (3, 7, 4, 0),
    ):
        bm.faces.new([verts[i] for i in face])


def mesh_from_bm(name, bm, collection, mat, loc=(0, 0, 0)):
    mesh = bpy.data.meshes.new(name)
    bm.to_mesh(mesh)
    bm.free()
    obj = bpy.data.objects.new(name, mesh)
    obj.location = loc
    link(obj, collection)
    assign(obj, mat)
    return obj


def make_cube(name, loc, dims, collection, mat):
    mesh = bpy.data.meshes.new(name)
    obj = bpy.data.objects.new(name, mesh)
    link(obj, collection)
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    for vert in bm.verts:
        vert.co.x *= dims[0]
        vert.co.y *= dims[1]
        vert.co.z *= dims[2]
    bm.to_mesh(mesh)
    bm.free()
    obj.location = loc
    assign(obj, mat)
    return obj


def make_cylinder(name, loc, radius, depth, collection, mat, segs=16, rot=(0, 0, 0)):
    mesh = bpy.data.meshes.new(name)
    obj = bpy.data.objects.new(name, mesh)
    link(obj, collection)
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=segs, radius1=radius, radius2=radius, depth=depth)
    bm.to_mesh(mesh)
    bm.free()
    obj.location = loc
    obj.rotation_euler = rot
    assign(obj, mat)
    return obj


def window_row(prefix, width, depth, floor_index, cols, collection, outward_y):
    """Single-floor window row — object origin at floor center."""
    floor_h = floor_height()
    floor_center = floor_center_z(floor_index)
    bm = bmesh.new()
    col_w = width / cols
    for column in range(cols):
        x = -width * 0.5 + col_w * (column + 0.5)
        y = outward_y * (depth * 0.5 + 0.12)
        add_box_mesh(bm, (x, y, 0.0), (col_w * 0.72, 0.06, floor_h * 0.62))
    return mesh_from_bm(f"{prefix}_F{floor_index}", bm, collection, "ST_Window", (0, 0, floor_center))


def make_site() -> None:
    site = coll(f"{PREFIX}Site")
    make_cube(f"{PREFIX}DirtGround", (0, 0, -0.12), (24, 24, 0.24), site, "ST_Dirt")
    make_cube(f"{PREFIX}Pad", (0, 0, 0.16), (8.4, 8.4, 0.32), site, "ST_Concrete")
    make_cube(f"{PREFIX}Foundation", (0, 0, 0.34), (7.2, 7.2, 0.28), site, "ST_Concrete")
    make_cube(f"{PREFIX}ExcavPit", (0, 0, -0.28), (5.6, 5.6, 0.42), site, "ST_Dirt")
    make_cube(f"{PREFIX}UtilRun", (0, -2.1, -0.04), (4.2, 0.28, 0.18), site, "ST_DarkMetal")
    for index, (x, y) in enumerate(((-2.4, -2.4), (2.4, -2.4), (-2.4, 2.4), (2.4, 2.4))):
        make_cube(f"{PREFIX}SiteCrate_{index}", (x, y, 0.55), (0.9, 0.9, 0.9), site, "ST_ConstrYellow")
        make_cube(f"{PREFIX}Stake_{index}", (x, y, 0.62), (0.1, 0.1, 0.55), site, "ST_ConstrYellow")
    fence_half = PAD_HALF + 0.35
    for index, (loc, dims) in enumerate(
        (
            ((0, -fence_half, 0.42), (8.8, 0.08, 0.85)),
            ((0, fence_half, 0.42), (8.8, 0.08, 0.85)),
            ((-fence_half, 0, 0.42), (0.08, 8.8, 0.85)),
            ((fence_half, 0, 0.42), (0.08, 8.8, 0.85)),
        )
    ):
        make_cube(f"{PREFIX}Fence_{index}", loc, dims, site, "ST_ConstrBlack")
    make_cube(f"{PREFIX}TempOffice", (-6.8, 5.2, 0.62), (2.4, 1.8, 1.25), site, "ST_ConstrCab")


def make_construction_meshes() -> None:
    construction = coll(f"{PREFIX}Construction")
    width, depth = FOOTPRINT
    beam = BEAM_SIZE
    posts = column_xy_list()
    xs = sorted({x for x, _y in posts})
    ys = sorted({y for _x, y in posts})
    floor_h = floor_height()

    foot_bm = bmesh.new()
    for x, y in posts:
        add_box_mesh(foot_bm, (x, y, 0.42), (0.62, 0.62, 0.22))
        add_box_mesh(foot_bm, (x, y, 0.58), (0.40, 0.40, 0.14))
    mesh_from_bm(f"{PREFIX}Footings", foot_bm, construction, "ST_Concrete")

    for floor in range(1, FLOORS + 1):
        floor_center = floor_center_z(floor)
        ring_local = floor_h * 0.5

        column_bm = bmesh.new()
        for x, y in posts:
            add_box_mesh(column_bm, (x, y, 0.0), (COLUMN_SIZE, COLUMN_SIZE, floor_h * 0.94))
        mesh_from_bm(
            f"{PREFIX}Columns_{floor}",
            column_bm,
            construction,
            "ST_Concrete",
            (0, 0, floor_center),
        )

        beam_bm = bmesh.new()
        for y in ys:
            add_box_mesh(beam_bm, (0, y, ring_local), (width * 0.80, beam, beam))
        for x in xs:
            add_box_mesh(beam_bm, (x, 0, ring_local), (beam, depth * 0.80, beam))
        mesh_from_bm(
            f"{PREFIX}FrameFloor_{floor}",
            beam_bm,
            construction,
            "ST_FrameBlack",
            (0, 0, floor_center),
        )

        slab_z = floor_slab_z(floor)
        make_cube(
            f"{PREFIX}Deck_{floor}",
            (0, 0, slab_z - 0.06),
            (width * 0.86, depth * 0.86, 0.05),
            construction,
            "ST_LightMetal",
        )
        make_cube(
            f"{PREFIX}FloorSlab_{floor}",
            (0, 0, slab_z),
            (width * 0.84, depth * 0.84, 0.12),
            construction,
            slab_material(floor),
        )


def _parent_parts(root, parts) -> None:
    for part in parts:
        part.parent = root


def make_crane() -> tuple:
    """Tower crane beside pad — ST_Crane root + ST_CraneBoomPivot hierarchy."""
    construction = coll(f"{PREFIX}Construction")
    root = bpy.data.objects.new(f"{PREFIX}Crane", None)
    root.empty_display_size = 1.4
    root.location = SITE_CRANE
    link(root, construction)

    base = make_cube(f"{PREFIX}CraneBase", (0, 0, 0.35), (1.6, 1.6, 0.5), construction, "ST_ConstrYellow")
    track_l = make_cube(f"{PREFIX}CraneTrackL", (0, 0.7, 0.16), (1.9, 0.35, 0.28), construction, "ST_ConstrBlack")
    track_r = make_cube(f"{PREFIX}CraneTrackR", (0, -0.7, 0.16), (1.9, 0.35, 0.28), construction, "ST_ConstrBlack")
    tower = make_cube(
        f"{PREFIX}CraneTower",
        (0, 0, CRANE_TOWER_BASE_Z + CRANE_TOWER_REST_H * 0.5),
        (0.38, 0.38, CRANE_TOWER_REST_H),
        construction,
        "ST_ConstrYellow",
    )
    cab = make_cube(f"{PREFIX}CraneCab", (0.45, 0, CRANE_CAB_REST_Z), (0.7, 0.7, 0.7), construction, "ST_ConstrCab")
    _parent_parts(root, (base, track_l, track_r, tower, cab))

    boom_root = bpy.data.objects.new(f"{PREFIX}CraneBoomPivot", None)
    boom_root.empty_display_size = 0.8
    boom_root.parent = root
    boom_root.location = (0.0, 0.0, CRANE_BOOM_REST_Z)
    link(boom_root, construction)

    boom = make_cube(f"{PREFIX}CraneBoom", (2.4, 0, 0), (5.2, 0.22, 0.22), construction, "ST_ConstrYellow")
    boom2 = make_cube(f"{PREFIX}CraneBoom2", (4.6, 0, -0.15), (0.18, 0.18, 1.1), construction, "ST_ConstrYellow")
    cable = make_cube(f"{PREFIX}CraneCable", (4.6, 0, -0.65), (0.04, 0.04, 1.0), construction, "ST_ConstrBlack")
    hook = make_cube(
        f"{PREFIX}CraneHook",
        CRANE_HOOK_REST,
        (0.16, 0.16, 0.35),
        construction,
        "ST_ConstrBlack",
    )
    payload = make_cube(f"{PREFIX}CranePayload", (4.6, 0, -1.65), (1.1, 0.55, 0.22), construction, "ST_Steel")
    _parent_parts(boom_root, (boom, boom2, cable, hook, payload))
    return root, boom_root


def make_tower() -> None:
    buildings = coll(f"{PREFIX}Tower")
    roof = coll(f"{PREFIX}RoofGear")
    width, depth = FOOTPRINT
    floor_h = floor_height()
    cols = max(3, int(width))
    core_w = 0.36

    for floor in range(1, FLOORS + 1):
        core_z = floor_center_z(floor)
        make_cube(
            f"{PREFIX}CoreLift_{floor}",
            (0, 0, core_z),
            (core_w, core_w * 0.88, floor_h * 0.94),
            buildings,
            "ST_Concrete",
        )

    panel_th = 0.08
    for floor in range(1, FLOORS + 1):
        band_z = floor_center_z(floor)
        rib_z = floor_ring_z(floor)
        make_cube(
            f"{PREFIX}RibBand_{floor}",
            (0, 0, rib_z),
            (width + 0.08, depth + 0.08, 0.06),
            buildings,
            "ST_LightMetal",
        )
        make_cube(
            f"{PREFIX}CWPanel_{floor}_S",
            (0, -(depth * 0.5 + panel_th * 0.5), band_z),
            (width, panel_th, floor_h * 0.92),
            buildings,
            "ST_Wall",
        )
        make_cube(
            f"{PREFIX}CWPanel_{floor}_N",
            (0, depth * 0.5 + panel_th * 0.5, band_z),
            (width, panel_th, floor_h * 0.92),
            buildings,
            "ST_Wall",
        )
        make_cube(
            f"{PREFIX}CWPanel_{floor}_E",
            (width * 0.5 + panel_th * 0.5, 0, band_z),
            (panel_th, depth, floor_h * 0.92),
            buildings,
            "ST_Wall",
        )
        make_cube(
            f"{PREFIX}CWPanel_{floor}_W",
            (-(width * 0.5 + panel_th * 0.5), 0, band_z),
            (panel_th, depth, floor_h * 0.92),
            buildings,
            "ST_Wall",
        )
        window_row("ST_Windows", width, depth, floor, cols, buildings, outward_y=-1)
        window_row("ST_N_Windows", width, depth, floor, cols, buildings, outward_y=1)

    make_cube(f"{PREFIX}Roof", (0, 0, PAD_Z + HEIGHT + 0.12), (width * 0.92, depth * 0.92, 0.18), buildings, "ST_DarkMetal")
    make_cube(f"{PREFIX}Parapet", (0, 0, PAD_Z + HEIGHT + 0.32), (width, depth, 0.22), buildings, "ST_LightMetal")
    make_cube(f"{PREFIX}Antenna", (0, 0, PAD_Z + HEIGHT + 1.1), (0.12, 0.12, 1.4), roof, "ST_LightMetal")
    make_cube(f"{PREFIX}Beacon", (0, 0, PAD_Z + HEIGHT + 1.85), (0.18, 0.18, 0.18), roof, "ST_Yellow")

    for index, (vx, vy) in enumerate(((-1.4, 1.2), (1.4, -1.0))):
        make_cube(f"{PREFIX}HVAC_{index}", (vx, vy, PAD_Z + HEIGHT + 0.55), (1.4, 1.0, 0.65), roof, "ST_LightMetal")
        make_cube(f"{PREFIX}Vent_{index}", (vx, vy, PAD_Z + HEIGHT + 0.95), (0.9, 0.9, 0.35), roof, "ST_DarkMetal")


def make_studio() -> None:
    studio = coll(f"{PREFIX}Studio")
    sun_data = bpy.data.lights.new(f"{PREFIX}Sun", "SUN")
    sun_data.energy = 3.2
    sun_data.angle = math.radians(4)
    sun = bpy.data.objects.new(f"{PREFIX}Sun", sun_data)
    sun.location = (12, -10, 18)
    sun.rotation_euler = Euler((math.radians(52), math.radians(8), math.radians(28)), "XYZ")
    link(sun, studio)

    fill_data = bpy.data.lights.new(f"{PREFIX}Fill", "AREA")
    fill_data.energy = 180
    fill_data.size = 8
    fill = bpy.data.objects.new(f"{PREFIX}Fill", fill_data)
    fill.location = (-8, 6, 10)
    fill.rotation_euler = Euler((math.radians(70), 0, math.radians(-140)), "XYZ")
    link(fill, studio)

    cam_data = bpy.data.cameras.new(f"{PREFIX}Camera")
    cam_data.lens = 45
    cam = bpy.data.objects.new(f"{PREFIX}Camera", cam_data)
    cam.location = (16.5, -22, 14)
    cam.rotation_euler = Euler((math.radians(58), 0, math.radians(30)), "XYZ")
    link(cam, studio)
    bpy.context.scene.camera = cam


def build_skyscraper() -> dict[str, int]:
    clear_scene()
    make_materials()
    make_site()
    make_construction_meshes()
    make_crane()
    make_tower()
    make_studio()

    mesh_count = sum(1 for obj in bpy.data.objects if obj.type == "MESH")
    print("SKYSCRAPER BUILT", mesh_count, "meshes")
    return {"meshes": mesh_count}


if __name__ == "__main__":
    build_skyscraper()
