"""Second pass: more C&C Zero Hour read, climb toward 20k tris."""
import bpy
import bmesh
import math
from mathutils import Euler, Vector


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
    mat = bpy.data.materials[mat_name]
    obj.data.materials.clear()
    obj.data.materials.append(mat)


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


def make_cube(name, loc, dims, collection, mat, bevel=0.0):
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
    if bevel > 0:
        mod = obj.modifiers.new("Bevel", "BEVEL")
        mod.width = bevel
        mod.segments = 2
        mod.limit_method = "ANGLE"
        bpy.context.view_layer.objects.active = obj
        obj.select_set(True)
        try:
            bpy.ops.object.modifier_apply(modifier=mod.name)
        except Exception:
            pass
        obj.select_set(False)
    shade(obj)
    return obj


def nuke(prefixes):
    for obj in list(bpy.data.objects):
        if any(obj.name.startswith(p) for p in prefixes):
            bpy.data.objects.remove(obj, do_unlink=True)


def add_wear_to_materials():
    def wear(mat_name, scale, dirt, contrast=0.28):
        mat = bpy.data.materials.get(mat_name)
        if not mat or not mat.use_nodes:
            return
        nt = mat.node_tree
        bsdf = next((n for n in nt.nodes if n.type == "BSDF_PRINCIPLED"), None)
        if not bsdf:
            return
        # already worn?
        if any(n.name.startswith("WearNoise") for n in nt.nodes):
            return
        base = bsdf.inputs["Base Color"].default_value[:]
        tex = nt.nodes.new("ShaderNodeTexNoise")
        tex.name = "WearNoise"
        tex.location = (-860, 80)
        tex.inputs["Scale"].default_value = scale
        tex.inputs["Detail"].default_value = 8.0
        tex.inputs["Roughness"].default_value = 0.55
        ramp = nt.nodes.new("ShaderNodeValToRGB")
        ramp.location = (-640, 80)
        ramp.color_ramp.elements[0].position = 0.38
        ramp.color_ramp.elements[1].position = 0.62
        mix = nt.nodes.new("ShaderNodeMix")
        mix.data_type = "RGBA"
        mix.location = (-400, 40)
        mix.inputs["A"].default_value = base
        mix.inputs["B"].default_value = (*dirt, 1.0)
        coord = nt.nodes.new("ShaderNodeTexCoord")
        coord.location = (-1080, 80)
        nt.links.new(coord.outputs["Object"], tex.inputs["Vector"])
        nt.links.new(tex.outputs["Fac"], ramp.inputs["Fac"])
        nt.links.new(ramp.outputs["Color"], mix.inputs["Factor"])
        nt.links.new(mix.outputs["Result"], bsdf.inputs["Base Color"])

    wear("CC_TanWall", 14.0, (0.42, 0.36, 0.26))
    wear("CC_Concrete", 7.5, (0.38, 0.36, 0.32))
    wear("CC_Roof", 10.0, (0.10, 0.10, 0.11))
    wear("CC_GreenGen", 9.0, (0.14, 0.18, 0.10))
    wear("CC_Dirt", 4.0, (0.30, 0.24, 0.14))


def rebuild_windows():
    nuke(("CC_Windows_Glass", "CC_Windows_Frame"))
    collection = coll("CC_Buildings")
    pad_z = 0.32
    ops_dim = (12.8, 5.2, 5.65)
    ops_loc = (-2.15, 2.55, pad_z + ops_dim[2] * 0.5)
    ent_dim = (7.35, 6.15, 4.85)
    ent_loc = (4.85, -2.55, pad_z + ent_dim[2] * 0.5)

    placements = []

    def row(cx, cy, cz, count, span, axis, nrm, w=0.42, h=0.48):
        step = span / max(1, count - 1) if count > 1 else 0
        start = -span * 0.5
        for i in range(count):
            t = start + i * step
            if axis == "x":
                placements.append((cx + t, cy + nrm, cz, w, 0.11, h, (0, 1 if nrm > 0 else -1, 0)))
            else:
                placements.append((cx + nrm, cy + t, cz, 0.11, w, h, (1 if nrm > 0 else -1, 0, 0)))

    ox, oy, oz = ops_loc
    row(ox, oy - ops_dim[1] * 0.5, oz - 0.85, 7, 10.4, "x", -0.06)
    row(ox, oy - ops_dim[1] * 0.5, oz + 1.15, 7, 10.4, "x", -0.06)
    row(ox, oy + ops_dim[1] * 0.5, oz - 0.85, 8, 11.0, "x", 0.06)
    row(ox, oy + ops_dim[1] * 0.5, oz + 1.15, 8, 11.0, "x", 0.06)
    row(ox - ops_dim[0] * 0.5, oy, oz - 0.85, 3, 3.4, "y", -0.06)
    row(ox - ops_dim[0] * 0.5, oy, oz + 1.15, 3, 3.4, "y", -0.06)

    ex, ey, ez = ent_loc
    row(ex - 2.15, ey - ent_dim[1] * 0.5, ez - 0.25, 2, 1.55, "x", -0.06)
    row(ex + 2.15, ey - ent_dim[1] * 0.5, ez - 0.25, 2, 1.55, "x", -0.06)
    row(ex - 2.15, ey - ent_dim[1] * 0.5, ez + 1.15, 2, 1.55, "x", -0.06)
    row(ex + 2.15, ey - ent_dim[1] * 0.5, ez + 1.15, 2, 1.55, "x", -0.06)
    row(ex, ey + ent_dim[1] * 0.5, ez + 0.2, 5, 5.4, "x", 0.06)
    row(ex + ent_dim[0] * 0.5, ey, ez + 0.2, 4, 4.4, "y", 0.06)

    glass_bm = bmesh.new()
    frame_bm = bmesh.new()
    for x, y, z, sx, sy, sz, _n in placements:
        add_box_mesh(glass_bm, (x, y, z), (sx * 0.72, sy * 0.55, sz * 0.72))
        # 4-piece frame
        if sx > sy:
            add_box_mesh(frame_bm, (x, y, z + sz * 0.42), (sx, sy, 0.055))
            add_box_mesh(frame_bm, (x, y, z - sz * 0.42), (sx, sy, 0.055))
            add_box_mesh(frame_bm, (x - sx * 0.46, y, z), (0.055, sy, sz))
            add_box_mesh(frame_bm, (x + sx * 0.46, y, z), (0.055, sy, sz))
        else:
            add_box_mesh(frame_bm, (x, y, z + sz * 0.42), (sx, sy, 0.055))
            add_box_mesh(frame_bm, (x, y, z - sz * 0.42), (sx, sy, 0.055))
            add_box_mesh(frame_bm, (x, y - sy * 0.46, z), (sx, 0.055, sz))
            add_box_mesh(frame_bm, (x, y + sy * 0.46, z), (sx, 0.055, sz))
    mesh_from_bm("CC_Windows_Glass", glass_bm, collection, "CC_Window")
    mesh_from_bm("CC_Windows_Frame", frame_bm, collection, "CC_Frame")


def add_skirting_and_seams():
    collection = coll("CC_Buildings")
    pad_z = 0.32
    bm = bmesh.new()
    # skirting boards
    specs = [
        ((-2.15, 2.55, pad_z + 0.16), (12.95, 5.35, 0.32)),
        ((4.85, -2.55, pad_z + 0.16), (7.5, 6.3, 0.32)),
        ((2.55, 0.55, pad_z + 0.28), (3.3, 2.7, 0.22)),
    ]
    for loc, dims in specs:
        add_box_mesh(bm, loc, dims)
    mesh_from_bm("CC_Skirting", bm, collection, "CC_Concrete")

    seam_bm = bmesh.new()
    # horizontal panel seams on ops front
    for z in (1.55, 3.35, 5.05):
        add_box_mesh(seam_bm, (-2.15, 2.55 - 2.62, z), (12.6, 0.03, 0.035))
        add_box_mesh(seam_bm, (-2.15, 2.55 + 2.62, z), (12.6, 0.03, 0.035))
        add_box_mesh(seam_bm, (-2.15 - 6.42, 2.55, z), (0.03, 5.0, 0.035))
    for z in (1.7, 3.2, 4.55):
        add_box_mesh(seam_bm, (4.85, -2.55 - 3.1, z), (7.15, 0.03, 0.035))
        add_box_mesh(seam_bm, (4.85 + 3.7, -2.55, z), (0.03, 5.9, 0.035))
    mesh_from_bm("CC_PanelSeams", seam_bm, collection, "CC_DarkMetal")


def add_entrance_stairs():
    collection = coll("CC_Entrance")
    pad_z = 0.32
    ex, ey = 4.85, -2.55 - 3.075
    bm = bmesh.new()
    for i in range(4):
        add_box_mesh(bm, (ex, ey - 0.28 - i * 0.28, pad_z + 0.08 + i * 0.07), (2.4 - i * 0.08, 0.28, 0.14 + i * 0.02))
    add_box_mesh(bm, (ex - 1.2, ey - 0.55, pad_z + 0.42), (0.16, 1.35, 0.85))
    add_box_mesh(bm, (ex + 1.2, ey - 0.55, pad_z + 0.42), (0.16, 1.35, 0.85))
    mesh_from_bm("CC_Stairs", bm, collection, "CC_Concrete")
    make_cube("CC_DoorLightL", (ex - 1.05, ey + 0.15, pad_z + 2.55), (0.16, 0.14, 0.12), collection, "CC_Yellow")
    make_cube("CC_DoorLightR", (ex + 1.05, ey + 0.15, pad_z + 2.55), (0.16, 0.14, 0.12), collection, "CC_Yellow")


def add_pad_star_and_panels():
    collection = coll("CC_Foundation")
    # concrete slab grid
    bm = bmesh.new()
    for ix in range(-4, 5):
        for iy in range(-3, 4):
            x, y = ix * 2.05, iy * 1.85
            if abs(x) < 9.2 and abs(y) < 6.4:
                add_box_mesh(bm, (x, y, 0.325), (1.92, 1.72, 0.012))
    mesh_from_bm("CC_PadPanels", bm, collection, "CC_Concrete")

    # painted star on pad near entrance
    star_bm = bmesh.new()
    pts = []
    for i in range(10):
        a = math.radians(-90 + i * 36)
        r = 1.15 if i % 2 == 0 else 0.46
        pts.append((r * math.cos(a), r * math.sin(a)))
    f = [star_bm.verts.new((p[0], p[1], 0.02)) for p in pts]
    b = [star_bm.verts.new((p[0], p[1], 0.0)) for p in pts]
    try:
        star_bm.faces.new(f)
        star_bm.faces.new(list(reversed(b)))
        for i in range(10):
            j = (i + 1) % 10
            star_bm.faces.new([f[i], f[j], b[j], b[i]])
    except Exception:
        pass
    mesh_from_bm("CC_PadStar", star_bm, collection, "CC_Yellow", (6.6, -5.35, 0.328))


def add_more_greebles():
    collection = coll("CC_RoofGear")
    pad_z = 0.32
    ops_loc = (-2.15, 2.55, pad_z + 2.825)
    roof_z = ops_loc[2] + 2.825 + 0.22
    # extra roof boxes / vents / pipes
    extras = [
        ((-6.4, 2.9, roof_z + 0.18), (0.7, 0.55, 0.32), "CC_DarkMetal"),
        ((-5.5, 3.7, roof_z + 0.12), (0.85, 0.4, 0.2), "CC_LightMetal"),
        ((2.6, 2.2, roof_z + 0.14), (1.1, 0.35, 0.22), "CC_DarkMetal"),
        ((1.5, 3.6, roof_z + 0.1), (0.55, 0.55, 0.16), "CC_LightMetal"),
    ]
    for i, (loc, dims, mat) in enumerate(extras):
        make_cube(f"CC_RoofBox_{i}", loc, dims, collection, mat, bevel=0.015)

    pipe_bm = bmesh.new()
    add_box_mesh(pipe_bm, (-4.2, 3.8, roof_z + 0.08), (6.8, 0.09, 0.09))
    add_box_mesh(pipe_bm, (-0.8, 2.4, roof_z + 0.08), (0.09, 2.6, 0.09))
    add_box_mesh(pipe_bm, (2.4, 2.4, roof_z + 0.28), (0.09, 0.09, 0.4))
    mesh_from_bm("CC_RoofPipes", pipe_bm, collection, "CC_DarkMetal")

    # wall conduits / AC boxes on ops front
    props = coll("CC_Props")
    for i, x in enumerate((-6.8, -5.2, 0.6)):
        make_cube(f"CC_AC_{i}", (x, 2.55 - 2.72, 1.55), (0.7, 0.28, 0.55), props, "CC_LightMetal", bevel=0.02)
        make_cube(f"CC_ACFan_{i}", (x, 2.55 - 2.86, 1.55), (0.42, 0.06, 0.42), props, "CC_DarkMetal")

    # bollards along front
    for i, x in enumerate((-8.2, -7.3, 7.4, 8.3)):
        make_cube(f"CC_Bollard_{i}", (x, -6.7, pad_z + 0.32), (0.16, 0.16, 0.64), props, "CC_Yellow", bevel=0.02)
        make_cube(f"CC_BollardCap_{i}", (x, -6.7, pad_z + 0.66), (0.18, 0.18, 0.08), props, "CC_DarkMetal")

    # extra generator greebles
    make_cube("CC_GenStack", (-1.15, -2.35, pad_z + 1.55), (0.35, 0.35, 0.55), props, "CC_DarkMetal", bevel=0.02)
    make_cube("CC_GenStackCap", (-1.15, -2.35, pad_z + 1.88), (0.42, 0.42, 0.1), props, "CC_LightMetal")
    for i in range(8):
        make_cube(
            f"CC_Cable_{i}",
            (-4.8 + i * 0.22, 0.95, pad_z + 0.2 + (i % 3) * 0.04),
            (0.07, 1.8, 0.07),
            props,
            "CC_Black",
        )

    # roof ladder on ops left
    lad = bmesh.new()
    for i in range(14):
        add_box_mesh(lad, (-8.58, 2.55, pad_z + 0.35 + i * 0.38), (0.06, 0.42, 0.05))
    add_box_mesh(lad, (-8.58, 2.34, pad_z + 2.9), (0.05, 0.05, 5.4))
    add_box_mesh(lad, (-8.58, 2.76, pad_z + 2.9), (0.05, 0.05, 5.4))
    mesh_from_bm("CC_Ladder", lad, props, "CC_DarkMetal")


def thicken_canopy():
    collection = coll("CC_Entrance")
    # extra canopy shell so it reads from iso camera
    pad_z = 0.32
    ex = 4.85
    front_y = -2.55 - 3.075
    make_cube("CC_CanopyBand", (ex, front_y - 0.55, pad_z + 2.48), (2.7, 1.35, 0.08), collection, "CC_BlueTrim", bevel=0.02)
    make_cube("CC_CanopyInner", (ex, front_y - 0.55, pad_z + 2.38), (2.45, 1.2, 0.06), collection, "CC_White")


def set_camera_and_view():
    cam = bpy.data.objects.get("CC_Camera")
    if cam:
        cam.location = (13.6, -17.8, 11.4)
        cam.rotation_euler = (math.radians(60.5), 0, math.radians(38))
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
            space.lens = 50
            r3d = space.region_3d
            r3d.view_perspective = "PERSP"
            r3d.view_location = Vector((1.6, -1.8, 2.4))
            r3d.view_distance = 26.5
            r3d.view_rotation = Euler((math.radians(60.5), 0, math.radians(38)), "XYZ").to_quaternion()


def count_polys():
    faces = tris = meshes = 0
    for obj in bpy.data.objects:
        if obj.type != "MESH":
            continue
        meshes += 1
        faces += len(obj.data.polygons)
        obj.data.calc_loop_triangles()
        tris += len(obj.data.loop_triangles)
    return faces, tris, meshes


def enhance():
    add_wear_to_materials()
    rebuild_windows()
    add_skirting_and_seams()
    add_entrance_stairs()
    add_pad_star_and_panels()
    add_more_greebles()
    thicken_canopy()
    set_camera_and_view()
    faces, tris, meshes = count_polys()
    print(f"ENHANCED faces={faces} tris={tris} meshes={meshes}")
    return faces, tris, meshes
