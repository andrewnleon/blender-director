"""Skyscrapers + industrial buildings for the Command Center site.

DEPRECATED: legacy cityscape. Use build_skyscraper.py for the hero tower.
"""
import bpy
import bmesh
import math


def coll(name):
    c = bpy.data.collections.get(name)
    if c is None:
        c = bpy.data.collections.new(name)
        bpy.context.scene.collection.children.link(c)
    return c


def link(obj, collection):
    for c in list(obj.users_collection):
        c.objects.unlink(obj)
    collection.objects.link(obj)
    return obj


def assign(obj, mat_name):
    mat = bpy.data.materials.get(mat_name)
    if mat is None:
        return obj
    obj.data.materials.clear()
    obj.data.materials.append(mat)
    return obj


def shade(obj):
    mesh = obj.data
    if len(mesh.polygons):
        mesh.polygons.foreach_set("use_smooth", [True] * len(mesh.polygons))
        mesh.update()


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
    for f in (
        (0, 1, 2, 3),
        (4, 7, 6, 5),
        (0, 4, 5, 1),
        (1, 5, 6, 2),
        (2, 6, 7, 3),
        (3, 7, 4, 0),
    ):
        bm.faces.new([verts[i] for i in f])


def mesh_from_bm(name, bm, collection, mat, loc=(0, 0, 0)):
    mesh = bpy.data.meshes.new(name)
    bm.to_mesh(mesh)
    bm.free()
    obj = bpy.data.objects.new(name, mesh)
    obj.location = loc
    link(obj, collection)
    assign(obj, mat)
    shade(obj)
    return obj


def make_cube(name, loc, dims, collection, mat):
    mesh = bpy.data.meshes.new(name)
    obj = bpy.data.objects.new(name, mesh)
    link(obj, collection)
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts:
        v.co.x *= dims[0]
        v.co.y *= dims[1]
        v.co.z *= dims[2]
    bm.to_mesh(mesh)
    bm.free()
    obj.location = loc
    assign(obj, mat)
    shade(obj)
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
    shade(obj)
    return obj


def ensure_sky_mat():
    mat = bpy.data.materials.get("CC_SkyGlass")
    if mat is not None:
        return mat
    mat = bpy.data.materials.new("CC_SkyGlass")
    mat.use_nodes = True
    nt = mat.node_tree
    bsdf = next((n for n in nt.nodes if n.type == "BSDF_PRINCIPLED"), None)
    if bsdf is None:
        nt.nodes.clear()
        bsdf = nt.nodes.new("ShaderNodeBsdfPrincipled")
        out = nt.nodes.new("ShaderNodeOutputMaterial")
        nt.links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])
    bsdf.inputs["Base Color"].default_value = (0.42, 0.58, 0.72, 1.0)
    bsdf.inputs["Roughness"].default_value = 0.12
    bsdf.inputs["Metallic"].default_value = 0.05
    if "Transmission Weight" in bsdf.inputs:
        bsdf.inputs["Transmission Weight"].default_value = 0.35
    mat.diffuse_color = (0.42, 0.58, 0.72, 1.0)
    return mat


def window_grid(prefix, loc, width, depth, height, floors, cols, collection, outward_y=None, outward_x=None):
    """Merged window panels for a tower face (mesh local to building center)."""
    bm = bmesh.new()
    floor_h = height / floors
    col_w = width / cols
    for f in range(floors):
        z = -height * 0.5 + floor_h * (f + 0.5)
        for c in range(cols):
            x = -width * 0.5 + col_w * (c + 0.5)
            if outward_y is not None:
                y = outward_y * (depth * 0.5 + 0.04)
                add_box_mesh(bm, (x, y, z), (col_w * 0.72, 0.06, floor_h * 0.62))
            elif outward_x is not None:
                y = -depth * 0.5 + col_w * (c + 0.5) if outward_x < 0 else depth * 0.5 - col_w * (cols - c - 0.5)
                x = outward_x * (width * 0.5 + 0.04)
                add_box_mesh(bm, (x, y, z), (0.06, col_w * 0.72, floor_h * 0.62))
    return mesh_from_bm(f"{prefix}_Windows", bm, collection, "CC_Window", loc)


def build_skyscraper(prefix, cx, cy, footprint, height, floors, coll_name="CC_Buildings"):
    """Glass tower with core, windows, roof cap."""
    bcoll = coll(coll_name)
    pad_z = 0.32
    w, d = footprint
    loc = (cx, cy, pad_z + height * 0.5)
    ensure_sky_mat()

    make_cube(f"{prefix}_Body", loc, (w * 0.88, d * 0.88, height), bcoll, "CC_Concrete")
    make_cube(f"{prefix}_Shell", loc, (w, d, height * 0.98), bcoll, "CC_SkyGlass")

    # Floor band lines (local mesh; object at building center)
    band_bm = bmesh.new()
    for f in range(1, floors):
        z = -height * 0.5 + (height / floors) * f
        add_box_mesh(band_bm, (0, 0, z), (w + 0.08, d + 0.08, 0.06))
    mesh_from_bm(f"{prefix}_Ribs", band_bm, bcoll, "CC_LightMetal", loc)

    # Windows on four faces
    window_grid(prefix, loc, w, d, height * 0.92, floors, max(3, int(w)), bcoll, outward_y=-1)
    window_grid(
        prefix + "_N",
        loc,
        w,
        d,
        height * 0.92,
        floors,
        max(3, int(w)),
        bcoll,
        outward_y=1,
    )

    make_cube(f"{prefix}_Roof", (cx, cy, pad_z + height + 0.12), (w * 0.92, d * 0.92, 0.18), bcoll, "CC_DarkMetal")
    make_cube(f"{prefix}_Parapet", (cx, cy, pad_z + height + 0.32), (w, d, 0.22), bcoll, "CC_LightMetal")
    make_cube(f"{prefix}_Antenna", (cx, cy, pad_z + height + 1.1), (0.12, 0.12, 1.4), bcoll, "CC_LightMetal")
    make_cube(f"{prefix}_Beacon", (cx, cy, pad_z + height + 1.85), (0.18, 0.18, 0.18), bcoll, "CC_Yellow")

    return {"cx": cx, "cy": cy, "footprint": footprint, "height": height, "floors": floors}


def build_industrial_factory(prefix, cx, cy, size, height, coll_name="CC_Buildings"):
    """Warehouse / factory block with stack and roof gear."""
    bcoll = coll(coll_name)
    roof_coll = coll("CC_RoofGear")
    pad_z = 0.32
    w, d = size
    loc = (cx, cy, pad_z + height * 0.5)

    make_cube(f"{prefix}_Body", loc, (w, d, height), bcoll, "CC_TanWall")
    make_cube(f"{prefix}_Roof", (cx, cy, pad_z + height + 0.08), (w * 0.96, d * 0.96, 0.14), bcoll, "CC_DarkMetal")

    # Corrugated ribs along long face (local mesh; object at building center)
    rib_bm = bmesh.new()
    rib_count = max(6, int(w / 1.2))
    for i in range(rib_count):
        x = -w * 0.5 + (w / rib_count) * (i + 0.5)
        add_box_mesh(rib_bm, (x, -d * 0.5 - 0.02, 0), (0.14, 0.06, height * 0.88))
    mesh_from_bm(f"{prefix}_Ribs", rib_bm, bcoll, "CC_LightMetal", loc)

    make_cube(f"{prefix}_Stripe", (cx, cy, loc[2]), (w * 0.92, 0.08, height * 0.12), bcoll, "CC_BlueTrim")

    # Loading dock doors
    for i, dx in enumerate((-w * 0.25, w * 0.25)):
        make_cube(f"{prefix}_Door_{i}", (cx + dx, cy - d * 0.5 - 0.03, pad_z + 1.2), (2.2, 0.1, 2.4), bcoll, "CC_DarkMetal")

    # Smokestack
    stack_x = cx + w * 0.35
    stack_y = cy + d * 0.25
    make_cylinder(f"{prefix}_Stack", (stack_x, stack_y, pad_z + height + 2.2), 0.35, 3.8, roof_coll, "CC_DarkMetal", 12)
    make_cylinder(f"{prefix}_StackCap", (stack_x, stack_y, pad_z + height + 4.2), 0.42, 0.2, roof_coll, "CC_LightMetal", 12)

    # Roof vents / HVAC
    for i, (vx, vy) in enumerate(((cx - w * 0.2, cy + d * 0.15), (cx + w * 0.15, cy - d * 0.1))):
        make_cube(f"{prefix}_HVAC_{i}", (vx, vy, pad_z + height + 0.55), (1.4, 1.0, 0.65), roof_coll, "CC_LightMetal")
        make_cube(f"{prefix}_Vent_{i}", (vx, vy, pad_z + height + 0.95), (0.9, 0.9, 0.35), roof_coll, "CC_DarkMetal")

    return {"cx": cx, "cy": cy, "footprint": size, "height": height}


def build_ind_plant(prefix, cx, cy, coll_name="CC_Buildings"):
    """Power plant — tanks, generator, pipes."""
    bcoll = coll(coll_name)
    props = coll("CC_Props")
    pad_z = 0.32

    make_cube(f"{prefix}_Body", (cx, cy, pad_z + 1.8), (8.5, 6.5, 3.2), bcoll, "CC_TanWall")
    make_cube(f"{prefix}_Roof", (cx, cy, pad_z + 3.45), (8.2, 6.2, 0.16), bcoll, "CC_DarkMetal")
    make_cube(f"{prefix}_Ribs", (cx, cy - 3.35, pad_z + 1.8), (8.4, 0.08, 2.8), bcoll, "CC_LightMetal")

    for i, tx in enumerate((cx - 2.5, cx + 2.8)):
        make_cylinder(f"{prefix}_Tank_{i}", (tx, cy + 2.2, pad_z + 1.1), 0.55, 1.8, props, "CC_Tank", 18)
        make_cylinder(f"{prefix}_TankCap_{i}", (tx, cy + 2.2, pad_z + 2.05), 0.58, 0.1, props, "CC_LightMetal", 16)

    make_cube(f"{prefix}_Gen", (cx - 1.5, cy - 1.8, pad_z + 0.85), (3.2, 1.8, 1.5), props, "CC_GreenGen")
    make_cube(f"{prefix}_Pipe", (cx + 0.5, cy, pad_z + 0.55), (0.14, 4.2, 0.14), props, "CC_DarkMetal")
    make_cube(f"{prefix}_Stack", (cx + 3.2, cy - 1.2, pad_z + 3.8), (0.5, 0.5, 2.8), props, "CC_DarkMetal")

    return {"cx": cx, "cy": cy, "footprint": (8.5, 6.5), "height": 3.6}


def nuke_cityscape():
    keys = ("SkyTower", "IndFactory", "IndPlant")
    for obj in list(bpy.data.objects):
        if any(k in obj.name for k in keys):
            bpy.data.objects.remove(obj, do_unlink=True)


def build_cityscape():
    """Add surrounding skyscrapers and industrial blocks. Idempotent."""
    nuke_cityscape()
    ensure_sky_mat()

    specs = [
        build_skyscraper("CC_SkyTowerA", -14.0, 11.0, (5.2, 5.2), 14.5, 10),
        build_skyscraper("CC_SkyTowerB", 15.5, 9.5, (4.5, 4.5), 11.8, 8),
        build_skyscraper("CC_SkyTowerC", -12.0, -13.5, (6.0, 5.5), 9.5, 7),
        build_industrial_factory("CC_IndFactoryA", 17.0, -5.5, (10.5, 8.0), 4.2),
        build_industrial_factory("CC_IndFactoryB", -17.5, -8.0, (11.0, 7.0), 3.8),
        build_ind_plant("CC_IndPlant", 10.5, -15.0),
    ]

    # Expand dirt pad slightly so new buildings sit on ground
    ground = bpy.data.objects.get("CC_DirtGround")
    if ground:
        ground.dimensions = (52, 42, ground.dimensions.z)
        ground.location = (0, 0, ground.location.z)

    print("CITYSCAPE BUILT", len(specs), "sites")
    return specs


if __name__ == "__main__":
    build_cityscape()
