"""Civic office — single building at origin for OpenClaw Yard.

Matching hero skyscraper grammar but with civic-office specifications:
- catalogId: civic-office
- prefix: BD_
- lot 10×10 m, SITE_HALF 4.96, PAD_Z 0.32, origin pad center
- crane NE SITE_CRANE at (7.2, 7.0, PAD_Z) with boom over pad, mast grows after each slab then retracts and stays parked
- tower: footprint 7×5 m, height 14 m, 8 floors, RC 4×3, column 0.22 beam 0.12
- silhouette: 2-story podium, 6-story setback shaft, stepped mechanical crown, BD_Beacon — no antenna needle
- bind pose frame 1 = empty pad / tiny spawn. 24 fps. CONSTANT hide. No organic Z-grow.
- motion: crane_lift structure, pour_spread slabs (XY only), pop_in windows/beacon (scale 0.04, snap 2 frames)
- phases: P00–P13
- source projects/civic-office/civic-office.blend
- export public/models/civic-office.glb, clip construct rest frame 1
- do not overwrite ST_ / skyscraper.blend
- registry stub only unless merge requested
"""

from __future__ import annotations

import math

import bpy
from mathutils import Euler, Matrix, Vector

PREFIX = "BD_"
PREFIX_ST = "ST_"

PAD_Z = 0.32
SITE_HALF = 4.96
# Pad flush with fence inner face.
PAD_HALF = SITE_HALF - 0.08
# Lot is 10×10 m.
LOT_SIZE = 10.0

# Crane — NE outside the pad; boom sweeps over the site toward tower center.
SITE_CRANE = (7.2, 7.0, PAD_Z)

# Tower geometry
FOOTPRINT = (7.0, 5.0)  # width × depth
HEIGHT = 14.0
FLOORS = 8
# Typical RC frame: 4×3 column grid (12 posts), beams, then slabs.
COLUMN_GRID = (4, 3)
COLUMN_SIZE = 0.22
BEAM_SIZE = 0.12

# Silhouette: 2-story podium, 6-story setback shaft, stepped mechanical crown
# No antenna needle (unlike ST_ which has red antenna)

# Tower crane — NE outside the pad; boom sweeps over the site toward tower center.
# Mast grows after each slab then retracts and stays parked

# Silhouette control heights
PODIUM_HEIGHT = 4.0  # 2-story podium
SHAFT_SETBACK_Z = 3.5  # setback starts at floor 3
MECH_CROWN_STEPS = [  # stepped mechanical crown heights
    6.0,  # step 1 at floor 6
    9.0,  # step 2 at floor 8 (mechanical)
]


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
    game_mat("BD_Concrete", (0.56, 0.54, 0.49), roughness=0.85)
    game_mat("BD_SlabGround", (0.78, 0.58, 0.32), roughness=0.88)
    game_mat("BD_SlabMid", (0.42, 0.62, 0.48), roughness=0.86)
    game_mat("BD_SlabUpper", (0.38, 0.52, 0.72), roughness=0.84)
    game_mat("BD_SlabRoof", (0.72, 0.70, 0.66), roughness=0.82)
    game_mat("BD_Dirt", (0.34, 0.30, 0.24), roughness=0.95)
    game_mat("BD_SkyGlass", (0.42, 0.58, 0.72), roughness=0.12, metallic=0.05, transmission=0.35)
    game_mat("BD_Wall", (0.14, 0.15, 0.17), roughness=0.58, metallic=0.12)
    game_mat("BD_Window", (0.04, 0.07, 0.10), roughness=0.12, metallic=0.0, transmission=0.55)
    game_mat("BD_Steel", (0.18, 0.19, 0.21), roughness=0.4, metallic=0.78)
    game_mat("BD_FrameBlack", (0.02, 0.02, 0.025), roughness=0.38, metallic=0.88)
    game_mat("BD_Yellow", (0.92, 0.78, 0.18), roughness=0.35, emit=0.35)
    game_mat("BD_BeaconGlow", (1.0, 0.12, 0.08), roughness=0.18, metallic=0.1, emit=1.2)
    game_mat("BD_ConstrYellow", (0.93, 0.74, 0.07), roughness=0.42, metallic=0.15)
    game_mat("BD_ConstrBlack", (0.12, 0.12, 0.14), roughness=0.55, metallic=0.25)
    game_mat("BD_ConstrCab", (0.28, 0.32, 0.36), roughness=0.45, metallic=0.2)


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
    # Assign default material if none assigned yet
    if obj.data.materials:
        obj.data.materials[0] = mat
    else:
        obj.data.materials.append(mat)
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


def pop_in(obj, frame_on: int) -> None:
    """Lego snap-in at fixed height — windows, beacon, small inserts."""
    sc = obj.scale.copy()
    loc = obj.location.copy()
    # Keep location seated. hide_viewport bakes glTF translation to origin.
    obj.location = loc
    obj.keyframe_insert("location", frame=1)
    tiny = (
        sc.x * 0.04,
        sc.y * 0.04,
        sc.z * 0.04,
    )
    obj.scale = tiny
    obj.keyframe_insert("scale", frame=1)
    pre = max(1, frame_on - 1)
    obj.keyframe_insert("scale", frame=pre)
    snap_end = frame_on + 2
    obj.scale = sc
    obj.keyframe_insert("scale", frame=snap_end)
    obj.keyframe_insert("location", frame=snap_end)


def bake_mesh_translation(obj) -> None:
    """Bake object location into mesh data so glTF bind pose stays correct when hidden at frame 1."""
    if obj.type != "MESH" or obj.parent is not None:
        return
    loc = obj.location.copy()
    if loc.length_squared < 1e-12:
        return
    obj.data.transform(Matrix.Translation(loc))
    obj.location = (0.0, 0.0, 0.0)


def make_site() -> None:
    site = coll(f"{PREFIX}Site")
    pad_size = PAD_HALF * 2
    # Lot boundary inset
    lot_extent = LOT_SIZE + 2.0
    make_cube(f"{PREFIX}DirtGround", (0, 0, -0.12), (lot_extent + 4, lot_extent + 4, 0.24), site, "BD_Dirt")
    make_cube(f"{PREFIX}Pad", (0, 0, 0.16), (pad_size, pad_size, 0.32), site, "BD_Concrete")
    # Lot marker
    make_cube(f"{PREFIX}LotMarker", (0, 0, 0.0), (LOT_SIZE, LOT_SIZE, 0.1), site, "BD_ConstrYellow")
    # Crane footprint marker
    make_cube(f"{PREFIX}CraneFootprint", SITE_CRANE[:2], (0.5, 0.5, 0.2), site, "BD_Yellow")
    for obj in site.objects:
        bake_mesh_translation(obj)


def make_construction_meshes() -> None:
    construction = coll(f"{PREFIX}Construction")
    width, depth = FOOTPRINT
    beam = BEAM_SIZE
    posts = column_xy_list()
    xs = sorted({x for x, _y in posts})
    ys = sorted({y for _x, y in posts})
    floor_h = floor_height()

    # Footings
    foot_bm = bmesh.new()
    for x, y in posts:
        add_box_mesh(foot_bm, (x, y, 0.42), (0.62, 0.62, 0.22))
        add_box_mesh(foot_bm, (x, y, 0.58), (0.40, 0.40, 0.14))
    mesh_from_bm(f"{PREFIX}Footings", foot_bm, construction, "BD_Concrete")

    for floor in range(1, FLOORS + 1):
        floor_center = floor_center_z(floor)
        ring_local = floor_h * 0.5

        # Columns
        column_bm = bmesh.new()
        for x, y in posts:
            add_box_mesh(column_bm, (x, y, 0.0), (COLUMN_SIZE, COLUMN_SIZE, floor_h * 0.94))
        mesh_from_bm(
            f"{PREFIX}Columns_{floor}",
            column_bm,
            construction,
            "BD_Concrete",
            (0, 0, floor_center),
        )