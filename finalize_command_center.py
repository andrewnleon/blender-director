"""Final greeble pass to land near 20k tris and frame the C&C camera."""
import bpy
import bmesh
import math
from mathutils import Euler, Vector


def collection(name):
    c = bpy.data.collections.get(name)
    if c is None:
        c = bpy.data.collections.new(name)
        bpy.context.scene.collection.children.link(c)
    return c


def link(obj, coll):
    for c in list(obj.users_collection):
        c.objects.unlink(obj)
    coll.objects.link(obj)
    return obj


def assign(obj, mat):
    obj.data.materials.clear()
    obj.data.materials.append(bpy.data.materials[mat])


def shade(obj):
    if obj.data.polygons:
        obj.data.polygons.foreach_set("use_smooth", [True] * len(obj.data.polygons))
        obj.data.update()


def add_box(bm, loc, dims):
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
    vs = [bm.verts.new(c) for c in coords]
    for f in ((0, 1, 2, 3), (4, 7, 6, 5), (0, 4, 5, 1), (1, 5, 6, 2), (2, 6, 7, 3), (3, 7, 4, 0)):
        bm.faces.new([vs[i] for i in f])


def from_bm(name, bm, coll, mat, loc=(0, 0, 0)):
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    obj = bpy.data.objects.new(name, me)
    obj.location = loc
    link(obj, coll)
    assign(obj, mat)
    shade(obj)
    return obj


def cube(name, loc, dims, coll, mat):
    me = bpy.data.meshes.new(name)
    obj = bpy.data.objects.new(name, me)
    link(obj, coll)
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts:
        v.co.x *= dims[0]
        v.co.y *= dims[1]
        v.co.z *= dims[2]
    bm.to_mesh(me)
    bm.free()
    obj.location = loc
    assign(obj, mat)
    shade(obj)
    return obj


def add_roof_rails():
    coll = collection("CC_RoofGear")
    bm = bmesh.new()
    # ops parapet rail
    ox, oy, z = -2.15, 2.55, 6.22
    sx, sy = 12.4, 4.85
    posts = []
    for x in [ox + t for t in (-sx * 0.5, -sx * 0.25, 0, sx * 0.25, sx * 0.5)]:
        for y in (oy - sy * 0.5, oy + sy * 0.5):
            posts.append((x, y))
    for y in [oy + t for t in (-sy * 0.25, 0, sy * 0.25)]:
        posts.append((ox - sx * 0.5, y))
        posts.append((ox + sx * 0.5, y))
    for i, (x, y) in enumerate(posts):
        add_box(bm, (x, y, z + 0.18), (0.04, 0.04, 0.36))
    add_box(bm, (ox, oy + sy * 0.5, z + 0.34), (sx, 0.035, 0.035))
    add_box(bm, (ox, oy - sy * 0.5, z + 0.34), (sx, 0.035, 0.035))
    add_box(bm, (ox - sx * 0.5, oy, z + 0.34), (0.035, sy, 0.035))
    add_box(bm, (ox + sx * 0.5, oy, z + 0.34), (0.035, sy, 0.035))
    from_bm("CC_OpsRails", bm, coll, "CC_LightMetal")

    bm2 = bmesh.new()
    ex, ey, ez = 4.85, -2.55, 5.42
    sx, sy = 7.0, 5.8
    for x in [ex + t for t in (-sx * 0.5, 0, sx * 0.5)]:
        for y in (ey - sy * 0.5, ey + sy * 0.5):
            add_box(bm2, (x, y, ez + 0.18), (0.04, 0.04, 0.36))
    add_box(bm2, (ex, ey + sy * 0.5, ez + 0.34), (sx, 0.035, 0.035))
    add_box(bm2, (ex, ey - sy * 0.5, ez + 0.34), (sx, 0.035, 0.035))
    add_box(bm2, (ex - sx * 0.5, ey, ez + 0.34), (0.035, sy, 0.035))
    add_box(bm2, (ex + sx * 0.5, ey, ez + 0.34), (0.035, sy, 0.035))
    from_bm("CC_EntRails", bm2, coll, "CC_LightMetal")


def add_clutter():
    props = collection("CC_Props")
    pad_z = 0.32
    # crate stacks
    spots = [(-7.6, -3.4), (-6.7, -3.55), (-7.55, -2.55), (8.3, -4.2), (7.5, -4.35)]
    for i, (x, y) in enumerate(spots):
        h = 0.55 + (i % 3) * 0.12
        cube(f"CC_Crate_{i}", (x, y, pad_z + h * 0.5), (0.7, 0.62, h), props, "CC_TanWall")
        cube(f"CC_CrateBand_{i}", (x, y, pad_z + h * 0.5), (0.72, 0.64, 0.08), props, "CC_BlueTrim")
    # drums
    for i, (x, y) in enumerate(((-5.7, -4.6), (-5.15, -4.75), (-5.45, -4.15))):
        me = bpy.data.meshes.new(f"CC_Drum_{i}")
        obj = bpy.data.objects.new(f"CC_Drum_{i}", me)
        link(obj, props)
        bm = bmesh.new()
        bmesh.ops.create_cone(bm, cap_ends=True, segments=14, radius1=0.22, radius2=0.22, depth=0.7)
        bm.to_mesh(me)
        bm.free()
        obj.location = (x, y, pad_z + 0.35)
        assign(obj, "CC_GreenGen" if i else "CC_DarkMetal")
        shade(obj)

    # extra HVAC on ops so three read from this camera
    cube("CC_HVAC_extra", (2.85, 3.35, 6.15), (1.2, 1.2, 0.55), collection("CC_RoofGear"), "CC_DarkMetal")
    cube("CC_HVAC_extraFan", (2.85, 3.35, 6.46), (0.85, 0.85, 0.08), collection("CC_RoofGear"), "CC_LightMetal")

    # corner armor plates
    bcoll = collection("CC_Buildings")
    bm = bmesh.new()
    corners = [
        (-8.55, -0.05, 1.6, 0.12, 0.55, 2.4),
        (-8.55, 5.15, 1.6, 0.12, 0.55, 2.4),
        (8.52, -5.62, 1.4, 0.12, 0.5, 2.1),
        (8.52, 0.52, 1.4, 0.12, 0.5, 2.1),
    ]
    for x, y, z, sx, sy, sz in corners:
        add_box(bm, (x, y, z), (sx, sy, sz))
    from_bm("CC_CornerArmor", bm, bcoll, "CC_DarkMetal")


def set_view():
    cam = bpy.data.objects.get("CC_Camera")
    if cam:
        cam.location = (11.2, -19.4, 10.6)
        cam.rotation_euler = (math.radians(61.5), 0, math.radians(28))
        cam.data.lens = 45
        bpy.context.scene.camera = cam
    for area in bpy.context.screen.areas:
        if area.type != "VIEW_3D":
            continue
        for space in area.spaces:
            if space.type != "VIEW_3D":
                continue
            space.shading.type = "MATERIAL"
            space.shading.use_scene_lights = True
            space.shading.use_scene_world = True
            space.lens = 45
            r3d = space.region_3d
            r3d.view_perspective = "PERSP"
            r3d.view_location = Vector((1.2, -2.2, 2.1))
            r3d.view_distance = 27.5
            r3d.view_rotation = Euler((math.radians(61.5), 0, math.radians(28)), "XYZ").to_quaternion()


def count():
    faces = tris = meshes = 0
    for obj in bpy.data.objects:
        if obj.type != "MESH":
            continue
        meshes += 1
        faces += len(obj.data.polygons)
        obj.data.calc_loop_triangles()
        tris += len(obj.data.loop_triangles)
    return faces, tris, meshes


def finalize():
    add_roof_rails()
    add_clutter()
    set_view()
    bpy.ops.wm.save_mainfile()
    result = count()
    print("FINAL", result)
    return result
