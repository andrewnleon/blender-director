"""USA Command Center — C&C Generals: Zero Hour inspired, ~20k poly."""
import bpy
import bmesh
import math
from mathutils import Euler, Vector

USER_PROMPT = (
    "i want to build an command center 20k poly that looks like command and conquer "
    "style graffix lookup command and conquer zero hour for inspiration"
)


def clear_scene():
    for obj in list(bpy.data.objects):
        bpy.data.objects.remove(obj, do_unlink=True)
    for datablocks in (
        bpy.data.meshes,
        bpy.data.materials,
        bpy.data.lights,
        bpy.data.cameras,
        bpy.data.curves,
        bpy.data.collections,
    ):
        for block in list(datablocks):
            if block.name == "Scene Collection":
                continue
            try:
                datablocks.remove(block)
            except Exception:
                pass


def link(obj, coll):
    for c in list(obj.users_collection):
        c.objects.unlink(obj)
    coll.objects.link(obj)
    return obj


def get_or_make_coll(name, parent=None):
    coll = bpy.data.collections.get(name)
    if coll is None:
        coll = bpy.data.collections.new(name)
    if parent is None:
        parent = bpy.context.scene.collection
    if coll.name not in parent.children:
        try:
            parent.children.link(coll)
        except RuntimeError:
            pass
    return coll


def game_mat(name, color, roughness=0.55, metallic=0.0, spec=0.4, alpha=1.0, emit=0.0):
    mat = bpy.data.materials.get(name)
    if mat is None:
        mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nt = mat.node_tree
    nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    bsdf = nt.nodes.new("ShaderNodeBsdfPrincipled")
    bsdf.location = (-280, 0)
    out.location = (80, 0)
    bsdf.inputs["Base Color"].default_value = (*color, 1.0)
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = metallic
    if "Specular IOR Level" in bsdf.inputs:
        bsdf.inputs["Specular IOR Level"].default_value = spec
    if emit > 0 and "Emission Color" in bsdf.inputs:
        bsdf.inputs["Emission Color"].default_value = (*color, 1.0)
        bsdf.inputs["Emission Strength"].default_value = emit
    if alpha < 1.0:
        bsdf.inputs["Alpha"].default_value = alpha
        if "Transmission Weight" in bsdf.inputs:
            bsdf.inputs["Transmission Weight"].default_value = 0.72
        mat.blend_method = "BLEND"
        mat.use_screen_refraction = True
    nt.links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])
    mat.diffuse_color = (*color, alpha)
    return mat


def assign(obj, mat):
    if isinstance(mat, str):
        mat = bpy.data.materials[mat]
    obj.data.materials.clear()
    obj.data.materials.append(mat)


def shade(obj):
    mesh = obj.data
    mesh.polygons.foreach_set("use_smooth", [True] * len(mesh.polygons))
    mesh.update()


def apply_bevel(obj, width=0.035, segments=2, angle=0.7):
    mod = obj.modifiers.new("Bevel", "BEVEL")
    mod.width = width
    mod.segments = segments
    mod.limit_method = "ANGLE"
    mod.angle_limit = angle
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    try:
        bpy.ops.object.modifier_apply(modifier=mod.name)
    except Exception:
        pass
    obj.select_set(False)
    shade(obj)


def make_cube(name, loc, dims, coll, mat, bevel=0.0, bevel_seg=2):
    mesh = bpy.data.meshes.new(name)
    obj = bpy.data.objects.new(name, mesh)
    link(obj, coll)
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
        apply_bevel(obj, bevel, bevel_seg)
    else:
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
    faces = (
        (0, 1, 2, 3),
        (4, 7, 6, 5),
        (0, 4, 5, 1),
        (1, 5, 6, 2),
        (2, 6, 7, 3),
        (3, 7, 4, 0),
    )
    for f in faces:
        bm.faces.new([verts[i] for i in f])
    return verts


def mesh_from_bm(name, bm, coll, mat, loc=(0, 0, 0)):
    bm.verts.ensure_lookup_table()
    bm.faces.ensure_lookup_table()
    mesh = bpy.data.meshes.new(name)
    bm.to_mesh(mesh)
    bm.free()
    obj = bpy.data.objects.new(name, mesh)
    obj.location = loc
    link(obj, coll)
    assign(obj, mat)
    shade(obj)
    return obj


def make_cylinder(name, loc, radius, depth, coll, mat, segs=16, rot=(0, 0, 0)):
    mesh = bpy.data.meshes.new(name)
    obj = bpy.data.objects.new(name, mesh)
    link(obj, coll)
    bm = bmesh.new()
    bmesh.ops.create_cone(
        bm,
        cap_ends=True,
        cap_tris=False,
        segments=segs,
        radius1=radius,
        radius2=radius,
        depth=depth,
    )
    bm.to_mesh(mesh)
    bm.free()
    obj.location = loc
    obj.rotation_euler = rot
    assign(obj, mat)
    shade(obj)
    return obj


def make_materials():
    game_mat("CC_TanWall", (0.72, 0.62, 0.46), roughness=0.62, metallic=0.18, spec=0.35)
    game_mat("CC_BlueTrim", (0.12, 0.32, 0.78), roughness=0.38, metallic=0.12, spec=0.55)
    game_mat("CC_Roof", (0.16, 0.17, 0.18), roughness=0.72, metallic=0.05)
    game_mat("CC_Concrete", (0.56, 0.54, 0.49), roughness=0.85, metallic=0.0)
    game_mat("CC_Yellow", (0.92, 0.72, 0.08), roughness=0.45, metallic=0.0, spec=0.5)
    game_mat("CC_Window", (0.04, 0.07, 0.10), roughness=0.12, metallic=0.0, spec=0.8)
    game_mat("CC_Frame", (0.82, 0.80, 0.74), roughness=0.4, metallic=0.05)
    game_mat("CC_Canopy", (0.55, 0.72, 0.88), roughness=0.08, metallic=0.0, spec=0.9, alpha=0.42)
    game_mat("CC_DarkMetal", (0.12, 0.13, 0.14), roughness=0.42, metallic=0.65)
    game_mat("CC_LightMetal", (0.45, 0.46, 0.48), roughness=0.35, metallic=0.7)
    game_mat("CC_GreenGen", (0.20, 0.28, 0.14), roughness=0.55, metallic=0.25)
    game_mat("CC_Tank", (0.22, 0.24, 0.26), roughness=0.38, metallic=0.55)
    game_mat("CC_EmblemRed", (0.55, 0.08, 0.08), roughness=0.4)
    game_mat("CC_EmblemGold", (0.72, 0.55, 0.12), roughness=0.35, metallic=0.4)
    game_mat("CC_Dirt", (0.42, 0.36, 0.24), roughness=0.95)
    game_mat("CC_Black", (0.03, 0.03, 0.03), roughness=0.5)
    game_mat("CC_White", (0.85, 0.86, 0.84), roughness=0.4)


def setup_world_and_lights(coll):
    world = bpy.context.scene.world
    if world is None:
        world = bpy.data.worlds.new("World")
        bpy.context.scene.world = world
    world.use_nodes = True
    nt = world.node_tree
    nt.nodes.clear()
    bg = nt.nodes.new("ShaderNodeBackground")
    out = nt.nodes.new("ShaderNodeOutputWorld")
    bg.inputs["Color"].default_value = (0.58, 0.66, 0.78, 1.0)
    bg.inputs["Strength"].default_value = 0.55
    nt.links.new(bg.outputs["Background"], out.inputs["Surface"])

    sun_data = bpy.data.lights.new("CC_Sun", "SUN")
    sun_data.energy = 6.5
    sun_data.angle = math.radians(3.2)
    sun_data.color = (1.0, 0.94, 0.82)
    sun = bpy.data.objects.new("CC_Sun", sun_data)
    link(sun, coll)
    sun.rotation_euler = (math.radians(48), math.radians(8), math.radians(52))

    fill_data = bpy.data.lights.new("CC_Fill", "AREA")
    fill_data.energy = 350
    fill_data.size = 12
    fill_data.color = (0.72, 0.80, 0.95)
    fill = bpy.data.objects.new("CC_Fill", fill_data)
    link(fill, coll)
    fill.location = (-10, -8, 9)
    fill.rotation_euler = (math.radians(65), 0, math.radians(-35))

    cam_data = bpy.data.cameras.new("CC_Camera")
    cam_data.lens = 50
    cam = bpy.data.objects.new("CC_Camera", cam_data)
    link(cam, coll)
    cam.location = (15.8, -16.4, 13.2)
    cam.rotation_euler = (math.radians(57.5), 0, math.radians(46))
    bpy.context.scene.camera = cam
    return cam


def build_ground_and_pad(root):
    pad_coll = get_or_make_coll("CC_Foundation", root)
    make_cube("CC_DirtGround", (0, 0, -0.12), (46, 36, 0.24), pad_coll, "CC_Dirt", bevel=0.02)
    pad = make_cube("CC_Pad", (0, 0, 0.16), (20.4, 14.6, 0.32), pad_coll, "CC_Concrete", bevel=0.06, bevel_seg=3)
    lip = make_cube("CC_PadLip", (0, 0, 0.015), (20.9, 15.1, 0.03), pad_coll, "CC_Concrete", bevel=0.02)

    # Yellow tactical edge stripes
    stripe_bm = bmesh.new()
    # front edge dashes
    for i, x in enumerate((-8.6, -6.4, -4.2, 4.6, 6.8, 8.8)):
        add_box_mesh(stripe_bm, (x, -6.95, 0.332), (1.6, 0.22, 0.012))
    for x in (-8.6, -6.4, 6.8, 8.8):
        add_box_mesh(stripe_bm, (x, 6.95, 0.332), (1.6, 0.22, 0.012))
    # side chevrons
    for y in (-5.2, -3.0, 3.2, 5.4):
        add_box_mesh(stripe_bm, (-9.85, y, 0.332), (0.22, 1.5, 0.012))
        add_box_mesh(stripe_bm, (9.85, y, 0.332), (0.22, 1.5, 0.012))
    # hazard blocks at front-right approach
    for i in range(7):
        x = 2.2 + i * 0.55
        add_box_mesh(stripe_bm, (x, -6.55, 0.334), (0.42, 0.16, 0.01))
    mesh_from_bm("CC_YellowMarks", stripe_bm, pad_coll, "CC_Yellow")

    # painted 03
    curve = bpy.data.curves.new("CC_NumCurve", "FONT")
    curve.body = "03"
    curve.extrude = 0.012
    curve.offset = 0.0
    curve.size = 1.15
    text = bpy.data.objects.new("CC_Num03", curve)
    link(text, pad_coll)
    text.location = (-8.9, -6.15, 0.328)
    text.rotation_euler = (0, 0, 0)
    bpy.context.view_layer.objects.active = text
    text.select_set(True)
    bpy.ops.object.convert(target="MESH")
    text = bpy.context.active_object
    text.name = "CC_Num03"
    assign(text, "CC_Yellow")
    text.select_set(False)
    return pad


def add_ribs(name, coll, origin, size, skip_faces=None):
    """Vertical standing-seam ribs on a box. size = (sx, sy, sz) full dims. origin = center."""
    skip_faces = skip_faces or set()
    sx, sy, sz = size
    ox, oy, oz = origin
    spacing = 0.26
    rib_w, rib_d = 0.055, 0.04
    rib_h = sz - 0.22
    z = oz - 0.02
    bm = bmesh.new()

    def run_wall(length, start, axis, outward):
        n = max(3, int(length / spacing))
        step = length / n
        for i in range(n + 1):
            t = -length * 0.5 + i * step
            if axis == "x":
                loc = (start[0] + t, start[1] + outward[1], z)
                dims = (rib_w, rib_d, rib_h)
            else:
                loc = (start[0] + outward[0], start[1] + t, z)
                dims = (rib_d, rib_w, rib_h)
            add_box_mesh(bm, loc, dims)

    # +Y back, -Y front, -X left, +X right
    if "back" not in skip_faces:
        run_wall(sx - 0.2, (ox, oy + sy * 0.5, oz), "x", (0, rib_d * 0.5))
    if "front" not in skip_faces:
        run_wall(sx - 0.2, (ox, oy - sy * 0.5, oz), "x", (0, -rib_d * 0.5))
    if "left" not in skip_faces:
        run_wall(sy - 0.2, (ox - sx * 0.5, oy, oz), "y", (-rib_d * 0.5, 0))
    if "right" not in skip_faces:
        run_wall(sy - 0.2, (ox + sx * 0.5, oy, oz), "y", (rib_d * 0.5, 0))

    return mesh_from_bm(name, bm, coll, "CC_TanWall")


def add_blue_stripe(name, coll, origin, size, skip_faces=None):
    skip_faces = skip_faces or set()
    sx, sy, sz = size
    ox, oy, oz = origin
    z = oz + sz * 0.5 - 0.42
    t, d = 0.30, 0.055
    bm = bmesh.new()
    if "front" not in skip_faces:
        add_box_mesh(bm, (ox, oy - sy * 0.5 - d * 0.35, z), (sx + 0.02, d, t))
    if "back" not in skip_faces:
        add_box_mesh(bm, (ox, oy + sy * 0.5 + d * 0.35, z), (sx + 0.02, d, t))
    if "left" not in skip_faces:
        add_box_mesh(bm, (ox - sx * 0.5 - d * 0.35, oy, z), (d, sy + 0.02, t))
    if "right" not in skip_faces:
        add_box_mesh(bm, (ox + sx * 0.5 + d * 0.35, oy, z), (d, sy + 0.02, t))
    return mesh_from_bm(name, bm, coll, "CC_BlueTrim")


def add_parapet(name, coll, origin, size, wall=0.16, h=0.28):
    sx, sy, sz = size
    ox, oy, oz = origin
    top = oz + sz * 0.5 + h * 0.5 - 0.01
    bm = bmesh.new()
    add_box_mesh(bm, (ox, oy + sy * 0.5 - wall * 0.5, top), (sx, wall, h))
    add_box_mesh(bm, (ox, oy - sy * 0.5 + wall * 0.5, top), (sx, wall, h))
    add_box_mesh(bm, (ox - sx * 0.5 + wall * 0.5, oy, top), (wall, sy - wall * 2, h))
    add_box_mesh(bm, (ox + sx * 0.5 - wall * 0.5, oy, top), (wall, sy - wall * 2, h))
    return mesh_from_bm(name, bm, coll, "CC_Roof")


def add_roof_inset(name, coll, origin, size):
    sx, sy, sz = size
    ox, oy, oz = origin
    z = oz + sz * 0.5 + 0.015
    return make_cube(name, (ox, oy, z), (sx - 0.55, sy - 0.55, 0.05), coll, "CC_Roof", bevel=0.02)


def add_windows(name, coll, placements):
    """placements: list of (x,y,z, sx,sy,sz) for glass recesses + frames."""
    glass_bm = bmesh.new()
    frame_bm = bmesh.new()
    for x, y, z, sx, sy, sz in placements:
        add_box_mesh(glass_bm, (x, y, z), (sx * 0.78, sy * 0.78, sz * 0.78))
        # frame as thicker hollow-ish box (solid rim look)
        add_box_mesh(frame_bm, (x, y, z), (sx, sy, sz))
    glass = mesh_from_bm(name + "_Glass", glass_bm, coll, "CC_Window")
    frame = mesh_from_bm(name + "_Frame", frame_bm, coll, "CC_Frame")
    return glass, frame


def window_row(cx, cy, cz, count, span, axis, outward, w=0.38, h=0.42, inset=0.06):
    pts = []
    step = span / max(1, count - 1) if count > 1 else 0
    start = -span * 0.5
    for i in range(count):
        t = start + i * step
        if axis == "x":
            x, y = cx + t, cy + outward
            sx, sy = w, inset
        else:
            x, y = cx + outward, cy + t
            sx, sy = inset, w
        pts.append((x, y, cz, sx, sy, h))
    return pts


def build_buildings(root):
    bcoll = get_or_make_coll("CC_Buildings", root)
    pad_z = 0.32

    ops_dim = (12.8, 5.2, 5.65)
    ops_loc = (-2.15, 2.55, pad_z + ops_dim[2] * 0.5)
    make_cube("CC_OpsWing", ops_loc, ops_dim, bcoll, "CC_TanWall", bevel=0.045, bevel_seg=2)
    add_ribs("CC_OpsRibs", bcoll, ops_loc, ops_dim, skip_faces={"right"})
    add_blue_stripe("CC_OpsStripe", bcoll, ops_loc, ops_dim, skip_faces={"right"})
    add_parapet("CC_OpsParapet", bcoll, ops_loc, ops_dim)
    add_roof_inset("CC_OpsRoof", bcoll, ops_loc, ops_dim)

    ent_dim = (7.35, 6.15, 4.85)
    ent_loc = (4.85, -2.55, pad_z + ent_dim[2] * 0.5)
    make_cube("CC_EntranceWing", ent_loc, ent_dim, bcoll, "CC_TanWall", bevel=0.045, bevel_seg=2)
    add_ribs("CC_EntRibs", bcoll, ent_loc, ent_dim, skip_faces={"left"})
    add_blue_stripe("CC_EntStripe", bcoll, ent_loc, ent_dim, skip_faces={"left"})
    add_parapet("CC_EntParapet", bcoll, ent_loc, ent_dim)
    add_roof_inset("CC_EntRoof", bcoll, ent_loc, ent_dim)

    conn_dim = (3.15, 2.55, 3.25)
    conn_loc = (2.55, 0.55, pad_z + conn_dim[2] * 0.5 + 0.15)
    make_cube("CC_Connector", conn_loc, conn_dim, bcoll, "CC_TanWall", bevel=0.03)
    add_ribs("CC_ConnRibs", bcoll, conn_loc, conn_dim, skip_faces={"left", "right"})
    add_blue_stripe("CC_ConnStripe", bcoll, conn_loc, conn_dim, skip_faces={"left", "right"})
    add_parapet("CC_ConnParapet", bcoll, conn_loc, conn_dim, wall=0.12, h=0.2)
    add_roof_inset("CC_ConnRoof", bcoll, conn_loc, conn_dim)

    # Windows — ops two floors
    wins = []
    ox, oy, oz = ops_loc
    wins += window_row(ox, oy - ops_dim[1] * 0.5, oz - 0.85, 7, 10.4, "x", -0.03)
    wins += window_row(ox, oy - ops_dim[1] * 0.5, oz + 1.15, 7, 10.4, "x", -0.03)
    wins += window_row(ox, oy + ops_dim[1] * 0.5, oz - 0.85, 8, 11.0, "x", 0.03)
    wins += window_row(ox, oy + ops_dim[1] * 0.5, oz + 1.15, 8, 11.0, "x", 0.03)
    wins += window_row(ox - ops_dim[0] * 0.5, oy, oz - 0.85, 3, 3.4, "y", -0.03)
    wins += window_row(ox - ops_dim[0] * 0.5, oy, oz + 1.15, 3, 3.4, "y", -0.03)

    ex, ey, ez = ent_loc
    # skip center of front for door
    wins += window_row(ex - 2.15, ey - ent_dim[1] * 0.5, ez - 0.35, 2, 1.6, "x", -0.03)
    wins += window_row(ex + 2.15, ey - ent_dim[1] * 0.5, ez - 0.35, 2, 1.6, "x", -0.03)
    wins += window_row(ex, ey + ent_dim[1] * 0.5, ez + 0.15, 5, 5.4, "x", 0.03)
    wins += window_row(ex + ent_dim[0] * 0.5, ey, ez + 0.15, 4, 4.4, "y", 0.03)
    add_windows("CC_Windows", bcoll, wins)

    # Door
    make_cube(
        "CC_Door",
        (ex, ey - ent_dim[1] * 0.5 - 0.02, pad_z + 1.15),
        (1.7, 0.08, 2.3),
        bcoll,
        "CC_DarkMetal",
        bevel=0.02,
    )
    make_cube(
        "CC_DoorFrame",
        (ex, ey - ent_dim[1] * 0.5 - 0.01, pad_z + 1.2),
        (1.95, 0.12, 2.5),
        bcoll,
        "CC_Frame",
        bevel=0.015,
    )
    # door split
    make_cube(
        "CC_DoorBar",
        (ex, ey - ent_dim[1] * 0.5 - 0.05, pad_z + 1.15),
        (0.06, 0.04, 2.15),
        bcoll,
        "CC_LightMetal",
    )

    return {
        "ops_loc": ops_loc,
        "ops_dim": ops_dim,
        "ent_loc": ent_loc,
        "ent_dim": ent_dim,
        "conn_loc": conn_loc,
        "conn_dim": conn_dim,
        "pad_z": pad_z,
    }


def build_canopy(root, ent_loc, ent_dim, pad_z):
    coll = get_or_make_coll("CC_Entrance", root)
    ex, ey, ez = ent_loc
    front_y = ey - ent_dim[1] * 0.5
    # half-cylinder canopy
    mesh = bpy.data.meshes.new("CC_Canopy")
    obj = bpy.data.objects.new("CC_Canopy", mesh)
    link(obj, coll)
    bm = bmesh.new()
    segs = 18
    r, length = 1.15, 2.55
    for i in range(segs + 1):
        a = math.pi * i / segs
        x0, z0 = -length * 0.5, 0
        # profile in XZ, extrude Y
    # build as cylinder then delete bottom conceptually by using only upper half verts
    rows = []
    for j in range(2):
        y = -0.15 + j * 1.35
        row = []
        for i in range(segs + 1):
            a = math.pi * i / segs
            row.append(bm.verts.new((math.cos(a) * r, y, math.sin(a) * r)))
        rows.append(row)
    for i in range(segs):
        bm.faces.new([rows[0][i], rows[0][i + 1], rows[1][i + 1], rows[1][i]])
    # end caps
    for row in rows:
        bm.faces.new(row)
    bm.to_mesh(mesh)
    bm.free()
    obj.location = (ex, front_y - 0.55, pad_z + 2.35)
    assign(obj, "CC_Canopy")
    shade(obj)

    # canopy posts and lintel
    for xoff in (-1.2, 1.2):
        make_cube(
            f"CC_CanopyPost_{xoff}",
            (ex + xoff, front_y - 0.85, pad_z + 1.05),
            (0.1, 0.1, 2.1),
            coll,
            "CC_LightMetal",
            bevel=0.01,
        )
    make_cube(
        "CC_CanopyLint",
        (ex, front_y - 0.85, pad_z + 2.18),
        (2.55, 0.12, 0.1),
        coll,
        "CC_LightMetal",
        bevel=0.01,
    )

    # emblem pedestals
    for side, sx in ((-1, -2.15), (1, 2.15)):
        make_cube(
            f"CC_Plinth_{side}",
            (ex + sx, front_y - 1.35, pad_z + 0.55),
            (0.85, 0.55, 1.1),
            coll,
            "CC_Concrete",
            bevel=0.04,
        )
        make_shield(coll, (ex + sx, front_y - 1.64, pad_z + 0.72), 0.28)


def make_shield(coll, loc, scale):
    bm = bmesh.new()
    # shield outline in XY then extrude
    outline = [
        (0, 0.55),
        (0.42, 0.42),
        (0.48, 0.05),
        (0.32, -0.28),
        (0, -0.55),
        (-0.32, -0.28),
        (-0.48, 0.05),
        (-0.42, 0.42),
    ]
    depth = 0.07
    front = [bm.verts.new((p[0] * scale, depth * 0.5, p[1] * scale)) for p in outline]
    back = [bm.verts.new((p[0] * scale, -depth * 0.5, p[1] * scale)) for p in outline]
    bm.faces.new(front)
    bm.faces.new(list(reversed(back)))
    n = len(outline)
    for i in range(n):
        j = (i + 1) % n
        bm.faces.new([front[i], front[j], back[j], back[i]])
    obj = mesh_from_bm(f"CC_Shield_{loc[0]:.2f}", bm, coll, "CC_EmblemRed", loc)

    # gold star
    star_bm = bmesh.new()
    pts = []
    for i in range(10):
        a = math.radians(-90 + i * 36)
        r = 0.13 if i % 2 == 0 else 0.055
        pts.append((r * math.cos(a), r * math.sin(a)))
    f = [star_bm.verts.new((p[0], 0.05, p[1])) for p in pts]
    b = [star_bm.verts.new((p[0], 0.0, p[1])) for p in pts]
    try:
        star_bm.faces.new(f)
        star_bm.faces.new(list(reversed(b)))
        for i in range(10):
            j = (i + 1) % 10
            star_bm.faces.new([f[i], f[j], b[j], b[i]])
    except Exception:
        pass
    mesh_from_bm(f"CC_Star_{loc[0]:.2f}", star_bm, coll, "CC_EmblemGold", (loc[0], loc[1] - 0.02, loc[2] + 0.04))
    return obj


def build_roof_gear(root, ops_loc, ops_dim, ent_loc, ent_dim):
    coll = get_or_make_coll("CC_RoofGear", root)
    ox, oy, oz = ops_loc
    roof_z = oz + ops_dim[2] * 0.5 + 0.22

    # three HVAC units
    for i, xoff in enumerate((-3.6, -0.15, 3.2)):
        hx, hy = ox + xoff, oy + 0.15
        make_cube(f"CC_HVAC_{i}", (hx, hy, roof_z + 0.38), (1.55, 1.55, 0.72), coll, "CC_DarkMetal", bevel=0.03)
        make_cube(f"CC_HVACBase_{i}", (hx, hy, roof_z + 0.06), (1.7, 1.7, 0.12), coll, "CC_LightMetal", bevel=0.015)
        # fan ring + hub
        make_cylinder(f"CC_FanRing_{i}", (hx, hy, roof_z + 0.76), 0.58, 0.08, coll, "CC_LightMetal", segs=20)
        make_cylinder(f"CC_FanHub_{i}", (hx, hy, roof_z + 0.78), 0.12, 0.1, coll, "CC_DarkMetal", segs=12)
        for b in range(6):
            blade = make_cube(
                f"CC_Blade_{i}_{b}",
                (hx, hy, roof_z + 0.78),
                (0.95, 0.10, 0.02),
                coll,
                "CC_DarkMetal",
            )
            blade.rotation_euler[2] = math.radians(b * 60)
        # grate bars
        for g in range(5):
            gy = hy - 0.48 + g * 0.24
            make_cube(f"CC_Grate_{i}_{g}", (hx, gy, roof_z + 0.82), (1.15, 0.035, 0.02), coll, "CC_LightMetal")
        # side vents
        make_cube(f"CC_HVACvent_{i}", (hx + 0.82, hy, roof_z + 0.38), (0.08, 1.1, 0.45), coll, "CC_Black")

    # roof hatches
    for i, xoff in enumerate((-2.0, 1.6)):
        make_cube(
            f"CC_Hatch_{i}",
            (ox + xoff, oy - 1.55, roof_z + 0.05),
            (0.95, 0.7, 0.08),
            coll,
            "CC_DarkMetal",
            bevel=0.015,
        )

    # entrance roof: antenna + lattice + small vent
    ex, ey, ez = ent_loc
    eroot = ez + ent_dim[2] * 0.5 + 0.2
    make_cube("CC_EntVent", (ex - 1.8, ey + 0.8, eroot + 0.22), (0.95, 0.95, 0.4), coll, "CC_DarkMetal", bevel=0.02)
    make_cylinder("CC_EntVentFan", (ex - 1.8, ey + 0.8, eroot + 0.44), 0.32, 0.06, coll, "CC_LightMetal", segs=16)

    # mast
    make_cylinder("CC_MastLow", (ex + 1.55, ey - 0.4, eroot + 1.15), 0.07, 2.3, coll, "CC_LightMetal", segs=10)
    make_cylinder("CC_MastMid", (ex + 1.55, ey - 0.4, eroot + 2.55), 0.045, 1.15, coll, "CC_LightMetal", segs=10)
    make_cylinder("CC_MastTip", (ex + 1.55, ey - 0.4, eroot + 3.25), 0.02, 0.45, coll, "CC_DarkMetal", segs=8)
    make_cube("CC_MastBase", (ex + 1.55, ey - 0.4, eroot + 0.08), (0.45, 0.45, 0.16), coll, "CC_DarkMetal", bevel=0.02)
    # dishes
    dish1 = make_cylinder(
        "CC_Dish1",
        (ex + 1.55, ey - 0.4, eroot + 1.85),
        0.38,
        0.05,
        coll,
        "CC_LightMetal",
        segs=18,
        rot=(math.radians(68), 0, math.radians(25)),
    )
    dish2 = make_cylinder(
        "CC_Dish2",
        (ex + 1.85, ey - 0.15, eroot + 2.35),
        0.22,
        0.04,
        coll,
        "CC_LightMetal",
        segs=16,
        rot=(math.radians(55), 0, math.radians(-40)),
    )
    make_cube("CC_Blinker", (ex + 1.55, ey - 0.4, eroot + 3.52), (0.06, 0.06, 0.08), coll, "CC_EmblemRed")

    # triangular lattice boom
    build_lattice(coll, (ex - 0.2, ey + 0.15, eroot + 0.08), length=3.4, height=1.55, width=0.55)


def build_lattice(coll, loc, length=3.4, height=1.55, width=0.55):
    lx, ly, lz = loc
    # two top rails and one keel — classic roof crane/truss
    segs = 7
    rail_r = 0.028
    # rails as long cubes (cheaper, still readable)
    make_cube("CC_TrussKeel", (lx, ly, lz + 0.03), (length, 0.055, 0.055), coll, "CC_LightMetal")
    make_cube(
        "CC_TrussL",
        (lx, ly - width * 0.5, lz + height),
        (length, 0.045, 0.045),
        coll,
        "CC_LightMetal",
    )
    make_cube(
        "CC_TrussR",
        (lx, ly + width * 0.5, lz + height),
        (length, 0.045, 0.045),
        coll,
        "CC_LightMetal",
    )
    for i in range(segs + 1):
        t = -length * 0.5 + (length * i / segs)
        make_cube(f"CC_TrussUpr_{i}a", (lx + t, ly - width * 0.25, lz + height * 0.5), (0.04, 0.04, height), coll, "CC_LightMetal")
        make_cube(f"CC_TrussUpr_{i}b", (lx + t, ly + width * 0.25, lz + height * 0.5), (0.04, 0.04, height), coll, "CC_LightMetal")
        if i < segs:
            t2 = t + length / segs
            mid = (t + t2) * 0.5
            brace = make_cube(
                f"CC_TrussBr_{i}",
                (lx + mid, ly, lz + height * 0.55),
                (length / segs * 1.05, 0.035, 0.035),
                coll,
                "CC_LightMetal",
            )
            brace.rotation_euler[1] = math.radians(32 if i % 2 == 0 else -32)
    make_cube("CC_TrussFootL", (lx - length * 0.42, ly, lz + 0.02), (0.35, 0.35, 0.08), coll, "CC_DarkMetal", bevel=0.01)
    make_cube("CC_TrussFootR", (lx + length * 0.42, ly, lz + 0.02), (0.35, 0.35, 0.08), coll, "CC_DarkMetal", bevel=0.01)


def build_courtyard_props(root, ops_loc, ops_dim, ent_loc, ent_dim, pad_z):
    coll = get_or_make_coll("CC_Props", root)
    # courtyard in front of ops, left of entrance
    gx, gy = -1.15, -2.35

    make_cube("CC_GenBody", (gx, gy, pad_z + 0.62), (3.4, 1.85, 1.15), coll, "CC_GreenGen", bevel=0.05, bevel_seg=2)
    make_cube("CC_GenTop", (gx, gy, pad_z + 1.24), (3.15, 1.6, 0.16), coll, "CC_DarkMetal", bevel=0.02)
    # cooling fins
    for i in range(14):
        x = gx - 1.45 + i * 0.22
        make_cube(f"CC_GenFin_{i}", (x, gy + 0.95, pad_z + 0.7), (0.06, 0.18, 0.85), coll, "CC_DarkMetal")
    make_cube("CC_GenPanel", (gx, gy - 0.95, pad_z + 0.7), (2.6, 0.08, 0.7), coll, "CC_DarkMetal")
    make_cube("CC_GenLight", (gx + 1.45, gy - 0.98, pad_z + 0.95), (0.08, 0.04, 0.08), coll, "CC_Yellow")

    # two tanks
    for i, tx in enumerate((-3.55, -2.55)):
        make_cylinder(f"CC_Tank_{i}", (tx, gy - 0.15, pad_z + 0.55), 0.38, 1.05, coll, "CC_Tank", segs=18)
        make_cylinder(f"CC_TankCap_{i}", (tx, gy - 0.15, pad_z + 1.1), 0.4, 0.08, coll, "CC_LightMetal", segs=16)
        make_cylinder(f"CC_TankBand_{i}", (tx, gy - 0.15, pad_z + 0.55), 0.40, 0.07, coll, "CC_Yellow", segs=16)

    # pipes from tanks/gen to ops
    make_cube("CC_Pipe1", (-3.0, 0.15, pad_z + 0.42), (0.12, 3.6, 0.12), coll, "CC_DarkMetal", bevel=0.015)
    make_cube("CC_Pipe2", (-1.15, -0.9, pad_z + 0.55), (0.1, 1.7, 0.1), coll, "CC_DarkMetal")
    make_cube("CC_PipeRiser", (-3.0, 1.8, pad_z + 1.1), (0.12, 0.12, 1.4), coll, "CC_DarkMetal")
    make_cube("CC_Conduit", (0.4, -2.35, pad_z + 0.22), (2.6, 0.18, 0.12), coll, "CC_DarkMetal")

    # flood lights on corners
    corners = [
        (-8.4, 5.0, 5.55),
        (8.4, 0.4, 4.75),
        (-8.4, 0.1, 5.55),
    ]
    for i, (x, y, z) in enumerate(corners):
        make_cube(f"CC_FloodArm_{i}", (x, y, z), (0.12, 0.12, 0.55), coll, "CC_DarkMetal")
        make_cube(f"CC_FloodHead_{i}", (x, y - 0.2, z - 0.15), (0.28, 0.22, 0.16), coll, "CC_LightMetal", bevel=0.01)
        make_cube(f"CC_FloodLens_{i}", (x, y - 0.32, z - 0.15), (0.18, 0.04, 0.1), coll, "CC_Yellow")

    # sandbags / jersey-ish barrier near pad front-left
    for i in range(5):
        make_cube(
            f"CC_Barrier_{i}",
            (-7.4 + i * 0.85, -6.35, pad_z + 0.28),
            (0.8, 0.32, 0.55),
            coll,
            "CC_Concrete",
            bevel=0.03,
        )


def count_polys():
    faces = 0
    tris = 0
    meshes = 0
    for obj in bpy.data.objects:
        if obj.type != "MESH":
            continue
        meshes += 1
        mesh = obj.data
        faces += len(mesh.polygons)
        mesh.calc_loop_triangles()
        tris += len(mesh.loop_triangles)
    return faces, tris, meshes


def frame_viewport():
    for area in bpy.context.screen.areas:
        if area.type != "VIEW_3D":
            continue
        for space in area.spaces:
            if space.type != "VIEW_3D":
                continue
            space.shading.type = "MATERIAL"
            space.shading.use_scene_lights = True
            space.shading.use_scene_world = True
            r3d = space.region_3d
            r3d.view_location = Vector((0.4, -0.6, 2.2))
            r3d.view_distance = 28.0
            r3d.view_rotation = Euler((math.radians(58), 0, math.radians(46)), "XYZ").to_quaternion()
            r3d.view_perspective = "PERSP"


def build():
    clear_scene()
    make_materials()
    root = get_or_make_coll("CommandCenter")
    setup_world_and_lights(get_or_make_coll("CC_Studio", root))
    build_ground_and_pad(root)
    layout = build_buildings(root)
    build_canopy(root, layout["ent_loc"], layout["ent_dim"], layout["pad_z"])
    build_roof_gear(root, layout["ops_loc"], layout["ops_dim"], layout["ent_loc"], layout["ent_dim"])
    build_courtyard_props(root, layout["ops_loc"], layout["ops_dim"], layout["ent_loc"], layout["ent_dim"], layout["pad_z"])
    try:
        frame_viewport()
    except Exception as e:
        print("viewport frame skipped", e)
    faces, tris, meshes = count_polys()
    print(f"DONE faces={faces} tris={tris} meshes={meshes}")
    return faces, tris, meshes


if __name__ == "__main__":
    build()
