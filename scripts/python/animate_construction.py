"""10-stage C&C construction animation for the Command Center.

DEPRECATED: use animate_skyscraper.py for the hero skyscraper pipeline.
"""
import os
import bpy
import bmesh
import math
from mathutils import Vector

FPS = 24
END = 360

# Stage windows (inclusive). Long pad + yellow-frame hold so the web clip reads as a site.
STAGES = {
    "site": (1, 23),
    "foundation": (24, 51),
    "footings": (52, 75),
    "frame": (76, 167),
    "structure": (168, 195),
    "walls": (196, 223),
    "roof": (224, 247),
    "systems": (248, 271),
    "activation": (272, 300),
    "complete": (301, END),
}


def mat(name, color, roughness=0.5, metallic=0.0, emit=0.0):
    m = bpy.data.materials.get(name)
    if m is None:
        m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    bsdf = next((n for n in nt.nodes if n.type == "BSDF_PRINCIPLED"), None)
    if bsdf is None:
        nt.nodes.clear()
        bsdf = nt.nodes.new("ShaderNodeBsdfPrincipled")
        out = nt.nodes.new("ShaderNodeOutputMaterial")
        nt.links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])
    bsdf.inputs["Base Color"].default_value = (*color, 1.0)
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = metallic
    if emit > 0 and "Emission Strength" in bsdf.inputs:
        if "Emission Color" in bsdf.inputs:
            bsdf.inputs["Emission Color"].default_value = (*color, 1.0)
        bsdf.inputs["Emission Strength"].default_value = emit
    m.diffuse_color = (*color, 1.0)
    return m


def link_coll(obj, name):
    coll = bpy.data.collections.get(name)
    if coll is None:
        coll = bpy.data.collections.new(name)
        bpy.context.scene.collection.children.link(coll)
    for c in list(obj.users_collection):
        c.objects.unlink(obj)
    coll.objects.link(obj)
    return obj


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


def mesh_obj(name, bm, mat_name, loc=(0, 0, 0), coll="CC_Construction"):
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    obj = bpy.data.objects.new(name, me)
    obj.location = loc
    link_coll(obj, coll)
    obj.data.materials.append(bpy.data.materials[mat_name])
    if obj.data.polygons:
        obj.data.polygons.foreach_set("use_smooth", [True] * len(obj.data.polygons))
    return obj


def cube(name, loc, dims, mat_name, coll="CC_Construction"):
    bm = bmesh.new()
    add_box(bm, (0, 0, 0), dims)
    return mesh_obj(name, bm, mat_name, loc, coll)


def cylinder(name, loc, r, depth, mat_name, segs=12, rot=(0, 0, 0), coll="CC_Construction"):
    me = bpy.data.meshes.new(name)
    obj = bpy.data.objects.new(name, me)
    link_coll(obj, coll)
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=segs, radius1=r, radius2=r, depth=depth)
    bm.to_mesh(me)
    bm.free()
    obj.location = loc
    obj.rotation_euler = rot
    obj.data.materials.append(bpy.data.materials[mat_name])
    return obj


def nuke_prefix(*prefixes):
    for obj in list(bpy.data.objects):
        if any(obj.name.startswith(p) for p in prefixes):
            bpy.data.objects.remove(obj, do_unlink=True)


def make_construction_assets():
    nuke_prefix(
        "CX_",
        "CC_SteelFrame",
        "CC_Footings",
        "CC_FloorSlab",
        "CC_SatDish",
        "CC_SatBoom",
        "CC_BuildLight",
        "CC_WeldSpark",
    )
    mat("CC_Steel", (0.18, 0.19, 0.21), 0.4, 0.78)
    mat("CC_ConstrYellow", (0.93, 0.74, 0.07), 0.42, 0.15)
    mat("CC_ConstrCab", (0.12, 0.28, 0.62), 0.4, 0.1)
    mat("CC_ConstrBlack", (0.04, 0.04, 0.04), 0.55, 0.2)
    mat("CC_ConstrOrange", (0.75, 0.28, 0.06), 0.45, 0.1)
    mat("CC_Weld", (0.4, 0.75, 1.0), 0.2, 0.0, emit=8.0)
    mat("CC_ActivateGlow", (1.0, 0.85, 0.35), 0.25, 0.0, emit=4.0)

    make_steel_frame()
    make_footings()
    make_floor_slabs()
    make_dozer()
    make_crane()
    make_mixer()
    make_sat_dish()
    make_weld_sparks()
    make_activate_lights()


def make_steel_frame():
    bm = bmesh.new()
    beam = 0.13

    def bay_frame(center, size, bays, floors):
        cx, cy = center[0], center[1]
        sx, sy, sz = size
        z0 = 0.34
        xs = [cx - sx * 0.5 + i * (sx / bays[0]) for i in range(bays[0] + 1)]
        ys = [cy - sy * 0.5 + j * (sy / bays[1]) for j in range(bays[1] + 1)]
        zs = [z0 + k * (sz / floors) for k in range(floors + 1)]
        for x in xs:
            for y in ys:
                add_box(bm, (x, y, z0 + sz * 0.5), (beam, beam, sz))
        for z in zs[1:]:
            for y in ys:
                add_box(bm, (cx, y, z), (sx + beam, beam, beam))
            for x in xs:
                add_box(bm, (x, cy, z), (beam, sy + beam, beam))
        # X braces on long faces
        for k in range(floors):
            zmid = zs[k] + (zs[k + 1] - zs[k]) * 0.5
            for y in (ys[0], ys[-1]):
                add_box(bm, (cx, y, zmid), (sx * 0.92, 0.06, 0.06))

    bay_frame((-2.15, 2.55), (12.8, 5.2, 5.65), (4, 2), 2)
    bay_frame((4.85, -2.55), (7.35, 6.15, 4.85), (3, 2), 2)
    bay_frame((2.55, 0.55), (3.15, 2.55, 3.25), (1, 1), 1)
    # Surrounding cityscape steel
    bay_frame((-14.0, 11.0), (5.2, 5.2, 14.5), (2, 2), 5)
    bay_frame((15.5, 9.5), (4.5, 4.5, 11.8), (2, 2), 4)
    bay_frame((-12.0, -13.5), (6.0, 5.5, 9.5), (2, 2), 3)
    bay_frame((17.0, -5.5), (10.5, 8.0, 4.2), (3, 2), 1)
    bay_frame((-17.5, -8.0), (11.0, 7.0, 3.8), (3, 2), 1)
    bay_frame((10.5, -15.0), (8.5, 6.5, 3.6), (2, 2), 1)
    mesh_obj("CC_SteelFrame", bm, "CC_Steel")


def make_footings():
    bm = bmesh.new()
    cols = []
    for x in (-8.15, -5.0, -2.15, 0.7, 3.85):
        for y in (0.15, 2.55, 4.95):
            cols.append((x, y))
    for x in (1.6, 4.85, 8.1):
        for y in (-5.4, -2.55, 0.3):
            cols.append((x, y))
    # Cityscape footings
    city_sites = [
        (-14.0, 11.0, 5.2, 5.2),
        (15.5, 9.5, 4.5, 4.5),
        (-12.0, -13.5, 6.0, 5.5),
        (17.0, -5.5, 10.5, 8.0),
        (-17.5, -8.0, 11.0, 7.0),
        (10.5, -15.0, 8.5, 6.5),
    ]
    for cx, cy, sx, sy in city_sites:
        for dx in (-0.42, 0.0, 0.42):
            for dy in (-0.42, 0.0, 0.42):
                cols.append((cx + dx * sx, cy + dy * sy))
    for x, y in cols:
        add_box(bm, (x, y, 0.55), (0.55, 0.55, 0.46))
        add_box(bm, (x, y, 0.82), (0.38, 0.38, 0.18))
    mesh_obj("CC_Footings", bm, "CC_Concrete")


def make_floor_slabs():
    specs = [
        ("CC_FloorSlab_Ops1", (-2.15, 2.55, 3.14), (12.5, 5.0, 0.16)),
        ("CC_FloorSlab_Ops2", (-2.15, 2.55, 5.85), (12.5, 5.0, 0.16)),
        ("CC_FloorSlab_Ent1", (4.85, -2.55, 2.7), (7.05, 5.85, 0.16)),
        ("CC_FloorSlab_Ent2", (4.85, -2.55, 5.05), (7.05, 5.85, 0.16)),
        ("CC_FloorSlab_Conn", (2.55, 0.55, 3.5), (3.0, 2.4, 0.14)),
        ("CC_FloorSlab_SkyA_1", (-14.0, 11.0, 2.2), (4.8, 4.8, 0.14)),
        ("CC_FloorSlab_SkyA_2", (-14.0, 11.0, 5.8), (4.8, 4.8, 0.14)),
        ("CC_FloorSlab_SkyA_3", (-14.0, 11.0, 9.4), (4.8, 4.8, 0.14)),
        ("CC_FloorSlab_SkyB_1", (15.5, 9.5, 2.0), (4.2, 4.2, 0.14)),
        ("CC_FloorSlab_SkyB_2", (15.5, 9.5, 5.2), (4.2, 4.2, 0.14)),
        ("CC_FloorSlab_IndA", (17.0, -5.5, 2.35), (10.0, 7.5, 0.14)),
        ("CC_FloorSlab_IndB", (-17.5, -8.0, 2.15), (10.5, 6.5, 0.14)),
    ]
    for name, loc, dims in specs:
        cube(name, loc, dims, "CC_Concrete")


def make_dozer():
    root = bpy.data.objects.new("CX_Dozer", None)
    link_coll(root, "CC_Construction")
    root.empty_display_size = 1.2
    root.location = (-6.8, -5.4, 0.32)
    parts = [
        cube("CX_DozerBody", (0, 0.1, 0.55), (2.1, 1.15, 0.7), "CC_ConstrYellow"),
        cube("CX_DozerCab", (-0.35, 0.1, 1.15), (0.9, 1.0, 0.7), "CC_ConstrCab"),
        cube("CX_DozerGlass", (-0.05, 0.1, 1.2), (0.08, 0.85, 0.42), "CC_Window"),
        cube("CX_DozerBlade", (1.25, 0.1, 0.55), (0.16, 1.7, 0.95), "CC_ConstrYellow"),
        cube("CX_DozerBladeLip", (1.35, 0.1, 0.12), (0.12, 1.75, 0.12), "CC_ConstrBlack"),
        cube("CX_DozerTrackL", (0.05, 0.72, 0.22), (2.0, 0.32, 0.4), "CC_ConstrBlack"),
        cube("CX_DozerTrackR", (0.05, -0.52, 0.22), (2.0, 0.32, 0.4), "CC_ConstrBlack"),
        cube("CX_DozerStack", (-0.7, 0.1, 1.55), (0.16, 0.16, 0.4), "CC_ConstrBlack"),
    ]
    for p in parts:
        p.parent = root
    return root


def make_crane():
    root = bpy.data.objects.new("CX_Crane", None)
    link_coll(root, "CC_Construction")
    root.empty_display_size = 1.4
    root.location = (10.6, 3.4, 0.32)
    base = cube("CX_CraneBase", (0, 0, 0.35), (1.6, 1.6, 0.5), "CC_ConstrYellow")
    track_l = cube("CX_CraneTrackL", (0, 0.7, 0.16), (1.9, 0.35, 0.28), "CC_ConstrBlack")
    track_r = cube("CX_CraneTrackR", (0, -0.7, 0.16), (1.9, 0.35, 0.28), "CC_ConstrBlack")
    tower = cube("CX_CraneTower", (0, 0, 3.3), (0.38, 0.38, 5.4), "CC_ConstrYellow")
    cab = cube("CX_CraneCab", (0.45, 0, 5.7), (0.7, 0.7, 0.7), "CC_ConstrCab")
    for p in (base, track_l, track_r, tower, cab):
        p.parent = root

    boom_root = bpy.data.objects.new("CX_CraneBoomPivot", None)
    link_coll(boom_root, "CC_Construction")
    boom_root.location = (10.6, 3.4, 6.05)
    boom = cube("CX_CraneBoom", (2.4, 0, 0), (5.2, 0.22, 0.22), "CC_ConstrYellow")
    boom2 = cube("CX_CraneBoom2", (4.6, 0, -0.15), (0.18, 0.18, 1.1), "CC_ConstrYellow")
    hook = cube("CX_CraneHook", (4.6, 0, -1.15), (0.16, 0.16, 0.35), "CC_ConstrBlack")
    for p in (boom, boom2, hook):
        p.parent = boom_root
    return root, boom_root


def make_mixer():
    root = bpy.data.objects.new("CX_Mixer", None)
    link_coll(root, "CC_Construction")
    root.location = (8.6, -7.2, 0.32)
    root.rotation_euler.z = math.radians(18)
    parts = [
        cube("CX_MixerCab", (-1.15, 0, 0.85), (1.1, 1.15, 1.1), "CC_ConstrCab"),
        cube("CX_MixerBed", (0.7, 0, 0.7), (2.4, 1.2, 0.45), "CC_ConstrYellow"),
        cylinder("CX_MixerDrum", (0.85, 0, 1.25), 0.55, 2.0, "CC_ConstrYellow", 14, (0, math.radians(90), 0)),
        cube("CX_MixerWheelFL", (-1.2, 0.62, 0.28), (0.45, 0.22, 0.45), "CC_ConstrBlack"),
        cube("CX_MixerWheelFR", (-1.2, -0.62, 0.28), (0.45, 0.22, 0.45), "CC_ConstrBlack"),
        cube("CX_MixerWheelRL", (1.15, 0.62, 0.28), (0.45, 0.22, 0.45), "CC_ConstrBlack"),
        cube("CX_MixerWheelRR", (1.15, -0.62, 0.28), (0.45, 0.22, 0.45), "CC_ConstrBlack"),
    ]
    for p in parts:
        p.parent = root
    return root


def make_sat_dish():
    pivot = bpy.data.objects.new("CC_SatBoom", None)
    link_coll(pivot, "CC_RoofGear")
    pivot.location = (-4.6, 2.55, 6.25)
    dish = cylinder("CC_SatDish", (0, 0, 0.85), 1.15, 0.1, "CC_LightMetal", 24, (math.radians(18), 0, 0), "CC_RoofGear")
    dish.parent = pivot
    arm = cube("CC_SatArm", (0, 0, 0.4), (0.1, 0.1, 0.8), "CC_LightMetal", "CC_RoofGear")
    arm.parent = pivot
    hub = cube("CC_SatHub", (0, 0.15, 0.95), (0.12, 0.35, 0.12), "CC_DarkMetal", "CC_RoofGear")
    hub.parent = pivot
    return pivot


def make_weld_sparks():
    spots = [
        (-6.2, 0.2, 2.4), (1.4, 2.4, 3.2), (5.8, -4.8, 2.2), (3.0, 0.6, 2.8), (-2.0, 4.8, 4.0),
        (-14.2, 10.8, 4.5), (15.8, 9.2, 3.8), (-11.8, -13.2, 3.2), (16.8, -5.8, 2.4), (-17.2, -7.8, 2.0),
    ]
    for i, loc in enumerate(spots):
        obj = cylinder(f"CC_WeldSpark_{i}", loc, 0.08, 0.16, "CC_Weld", 8)


def make_activate_lights():
    spots = [
        (4.85, -5.7, 2.7),
        (-6.5, -0.1, 3.4),
        (8.4, -2.5, 3.0),
        (-2.15, 2.55, 6.6),
        (-14.0, 11.0, 12.5),
        (15.5, 9.5, 10.0),
        (17.0, -5.5, 3.8),
    ]
    for i, loc in enumerate(spots):
        data = bpy.data.lights.new(f"CC_BuildLight_{i}", "POINT")
        data.energy = 0
        data.color = (1.0, 0.88, 0.55)
        data.shadow_soft_size = 0.6
        obj = bpy.data.objects.new(f"CC_BuildLight_{i}", data)
        link_coll(obj, "CC_Studio")
        obj.location = loc


# --- animation helpers ---

def clear_anim(obj):
    if obj.animation_data:
        obj.animation_data_clear()


def hide_at(obj, frame, hidden):
    prefs = bpy.context.preferences.edit
    prev = prefs.keyframe_new_interpolation_type
    prefs.keyframe_new_interpolation_type = "CONSTANT"
    obj.hide_viewport = hidden
    obj.hide_render = hidden
    obj.keyframe_insert("hide_viewport", frame=frame)
    obj.keyframe_insert("hide_render", frame=frame)
    prefs.keyframe_new_interpolation_type = prev


def appear(obj, frame_on, frame_off=None):
    hide_at(obj, 1, True)
    if frame_on > 1:
        hide_at(obj, frame_on - 1, True)
    hide_at(obj, frame_on, False)
    if frame_off is not None:
        hide_at(obj, frame_off - 1, False)
        hide_at(obj, frame_off, True)


def grow(obj, f_on, f_done, f_off=None):
    loc = obj.location.copy()
    sc = obj.scale.copy()
    h = max(obj.dimensions.z, 0.08)
    appear(obj, f_on, f_off)
    obj.scale = (sc.x, sc.y, 0.04)
    obj.location = (loc.x, loc.y, loc.z - h * 0.48)
    obj.keyframe_insert("scale", frame=f_on)
    obj.keyframe_insert("location", frame=f_on)
    obj.scale = sc
    obj.location = loc
    obj.keyframe_insert("scale", frame=f_done)
    obj.keyframe_insert("location", frame=f_done)


def classify():
    always = {"CC_DirtGround", "CC_Sun", "CC_Fill", "CC_Camera"}
    site = []
    foundation = []
    footings = []
    frame = []
    structure = []
    walls = []
    roof = []
    systems = []
    activation = []
    vehicles = []

    wall_keys = (
        "Ribs", "Stripe", "Windows", "Door", "PanelSeams", "DenseRibs", "Bolts",
        "Mullions", "CornerArmor", "Skirting",
    )
    roof_keys = ("Roof", "Parapet", "Rails", "Hatch", "RoofBox", "RoofPipes")
    act_keys = (
        "YellowMarks", "Num03", "PadStar", "Bollard", "Jersey", "Barrier",
        "DoorLight", "FloodLens", "Blinker", "GenLight",
    )
    sys_keys = (
        "HVAC", "Fan", "Blade", "Grate", "Mast", "Dish", "Antenna", "Truss",
        "Gen", "Tank", "Pipe", "Canopy", "Stairs", "AC_", "Ladder", "FloodArm",
        "FloodHead", "Plinth", "Shield", "Star_", "Conduit", "Cable", "Sat",
        "Stack", "Vent", "Beacon",
    )
    city_keys = ("SkyTower", "IndFactory", "IndPlant")

    for obj in bpy.data.objects:
        n = obj.name
        if n in always or obj.type in {"CAMERA", "LIGHT"} and n.startswith("CC_") and "BuildLight" not in n:
            continue
        if n.startswith("CX_"):
            vehicles.append(obj)
            continue
        if n.startswith("CC_WeldSpark") or n.startswith("CC_BuildLight"):
            continue
        if n in {"CC_Pad", "CC_PadLip", "CC_PadPanels"}:
            foundation.append(obj)
        elif n.startswith("CC_Footings"):
            footings.append(obj)
        elif n.startswith("CC_SteelFrame"):
            frame.append(obj)
        elif n.startswith("CC_FloorSlab"):
            frame.append(obj)  # show with structure, hide later — handled separately
        elif any(k in n for k in city_keys):
            if n.endswith("_Body"):
                structure.append(obj)
            elif any(n.endswith(s) for s in ("_Shell", "_Ribs", "_Windows", "_Stripe")) or "_Door_" in n:
                walls.append(obj)
            elif any(n.endswith(s) for s in ("_Roof", "_Parapet")):
                roof.append(obj)
            elif any(s in n for s in ("Antenna", "Beacon", "Stack", "HVAC", "Vent", "Tank", "Gen", "Pipe")):
                systems.append(obj)
            elif obj.type == "MESH":
                walls.append(obj)
        elif n in {"CC_OpsWing", "CC_EntranceWing", "CC_Connector"}:
            structure.append(obj)
        elif any(k in n for k in act_keys):
            activation.append(obj)
        elif any(k in n for k in roof_keys):
            roof.append(obj)
        elif any(k in n for k in wall_keys):
            walls.append(obj)
        elif any(k in n for k in sys_keys):
            systems.append(obj)
        elif n.startswith("CC_Crate") or n.startswith("CC_Drum"):
            site.append(obj)
        elif obj.type == "MESH" and n.startswith("CC_"):
            systems.append(obj)

    slabs = [o for o in bpy.data.objects if o.name.startswith("CC_FloorSlab")]
    frame = [o for o in frame if o not in slabs]
    return {
        "site": site,
        "foundation": foundation,
        "footings": footings,
        "frame": frame,
        "slabs": slabs,
        "structure": structure,
        "walls": walls,
        "roof": roof,
        "systems": systems,
        "activation": activation,
        "vehicles": vehicles,
    }


def iter_fcurves(obj):
    ad = obj.animation_data
    if not ad or not ad.action:
        return
    action = ad.action
    if hasattr(action, "fcurves"):
        try:
            for fcu in action.fcurves:
                yield fcu
            return
        except Exception:
            pass
    slot = getattr(ad, "action_slot", None)
    layers = getattr(action, "layers", None)
    if not layers:
        return
    for layer in layers:
        for strip in getattr(layer, "strips", []):
            bag = None
            try:
                bag = strip.channelbag(slot) if slot is not None else None
            except Exception:
                bag = None
            if bag is None:
                bags = getattr(strip, "channelbags", None)
                if bags:
                    bag = bags[0]
            if bag is None:
                continue
            for fcu in bag.fcurves:
                yield fcu


def constant_hides():
    for obj in bpy.data.objects:
        for fcu in iter_fcurves(obj):
            if "hide" in fcu.data_path:
                for kp in fcu.keyframe_points:
                    kp.interpolation = "CONSTANT"


def animate_groups(groups):
    for obj in bpy.data.objects:
        if obj.name.startswith("CC_") or obj.name.startswith("CX_"):
            if obj.type in {"CAMERA"}:
                continue
            if obj.name in {"CC_Sun", "CC_Fill", "CC_Camera", "CC_DirtGround"}:
                continue
            clear_anim(obj)

    # Dirt always on
    dirt = bpy.data.objects.get("CC_DirtGround")
    if dirt:
        clear_anim(dirt)
        hide_at(dirt, 1, False)

    # Site clutter stays through complete (base supplies)
    for obj in groups["site"]:
        hide_at(obj, 1, False)

    f_found, f_found_d = 24, 48
    f_foot, f_foot_d = 52, 72
    f_frame, f_frame_d = 76, 100
    f_struct, f_struct_d = 168, 192
    f_wall, f_wall_d = 196, 220
    f_roof, f_roof_d = 224, 244
    f_sys, f_sys_d = 248, 268
    f_act = 272

    for obj in groups["foundation"]:
        grow(obj, f_found, f_found_d)
    for obj in groups["footings"]:
        grow(obj, f_foot, f_foot_d, f_off=250)
    for obj in groups["frame"]:
        grow(obj, f_frame, f_frame_d, f_off=250)
    for obj in groups["slabs"]:
        grow(obj, f_struct, f_struct_d, f_off=246)
    for obj in groups["structure"]:
        grow(obj, f_struct, f_struct_d)
    for obj in groups["walls"]:
        grow(obj, f_wall, f_wall_d)
    for obj in groups["roof"]:
        grow(obj, f_roof, f_roof_d)
    for i, obj in enumerate(groups["systems"]):
        stagger = min(10, i % 6)
        grow(obj, f_sys + stagger, f_sys_d)
    for obj in groups["activation"]:
        appear(obj, f_act)

    def hide_tree(root, frame_on, frame_off):
        if root is None:
            return
        stack = [root]
        while stack:
            obj = stack.pop()
            appear(obj, frame_on, frame_off)
            stack.extend(obj.children)

    # Construction vehicles
    dozer = bpy.data.objects.get("CX_Dozer")
    crane = bpy.data.objects.get("CX_Crane")
    boom = bpy.data.objects.get("CX_CraneBoomPivot")
    mixer = bpy.data.objects.get("CX_Mixer")

    hide_tree(dozer, 1, 236)
    hide_tree(crane, 77, 245)
    hide_tree(boom, 77, 245)
    hide_tree(mixer, 29, 230)

    if dozer:
        dozer.location = (-6.8, -5.4, 0.32)
        dozer.rotation_euler = (0, 0, math.radians(-18))
        dozer.keyframe_insert("location", frame=1)
        dozer.keyframe_insert("rotation_euler", frame=1)
        dozer.location = (-3.6, -6.1, 0.32)
        dozer.rotation_euler = (0, 0, math.radians(12))
        dozer.keyframe_insert("location", frame=70)
        dozer.keyframe_insert("rotation_euler", frame=70)
        dozer.location = (-8.4, -6.6, 0.32)
        dozer.keyframe_insert("location", frame=160)
        dozer.location = (-16.5, -11.0, 0.32)
        dozer.rotation_euler = (0, 0, math.radians(-40))
        dozer.keyframe_insert("location", frame=230)
        dozer.keyframe_insert("rotation_euler", frame=230)

    if mixer:
        appear(mixer, 29, 230)
        mixer.location = (10.5, -8.4, 0.32)
        mixer.keyframe_insert("location", frame=29)
        mixer.location = (8.6, -7.2, 0.32)
        mixer.keyframe_insert("location", frame=50)
        mixer.location = (14.5, -12.0, 0.32)
        mixer.keyframe_insert("location", frame=220)

    if crane:
        crane.location = (11.2, 4.0, 0.32)
        crane.keyframe_insert("location", frame=77)
        crane.location = (9.5, 2.4, 0.32)
        crane.keyframe_insert("location", frame=92)
        crane.keyframe_insert("location", frame=216)
        crane.location = (17.5, 8.2, 0.32)
        crane.keyframe_insert("location", frame=240)
    if boom:
        # Boom local +X. Negative Z aims west/south over the building, never away.
        for f, deg in (
            (77, -158), (86, -176), (96, -108), (104, -172),
            (114, -128), (124, -110), (134, -168), (144, -136),
            (154, -112), (164, -174), (174, -150), (184, -176),
            (194, -132), (206, -160), (216, -148), (228, -90), (240, -70),
        ):
            boom.rotation_euler = (0.0, 0.0, math.radians(deg))
            boom.keyframe_insert("rotation_euler", frame=f)

    # Satellite deploys during systems
    sat = bpy.data.objects.get("CC_SatBoom")
    if sat:
        appear(sat, 200)
        sat.rotation_euler = (math.radians(78), 0, 0)
        sat.keyframe_insert("rotation_euler", frame=200)
        sat.rotation_euler = (0, 0, 0)
        sat.keyframe_insert("rotation_euler", frame=220)

    # Weld sparks blink during frame + walls
    for i, obj in enumerate(o for o in bpy.data.objects if o.name.startswith("CC_WeldSpark")):
        clear_anim(obj)
        hide_at(obj, 1, True)
        for t in range(80, 175, 7):
            on = t + (i * 2) % 6
            hide_at(obj, on, False)
            hide_at(obj, on + 3, True)
        hide_at(obj, 176, True)

    # Activation lights
    for i, obj in enumerate(o for o in bpy.data.objects if o.name.startswith("CC_BuildLight")):
        clear_anim(obj)
        obj.data.energy = 0
        obj.data.keyframe_insert("energy", frame=1)
        obj.data.keyframe_insert("energy", frame=216)
        obj.data.energy = 220 + i * 30
        obj.data.keyframe_insert("energy", frame=232)

    # Existing door/flood emission-ish objects pop at activation (already in activation group)

    constant_hides()


def mark_timeline():
    scene = bpy.context.scene
    scene.timeline_markers.clear()
    labels = [
        (1, "01_Site_0%"),
        (29, "02_Foundation_10%"),
        (53, "03_Footings_20%"),
        (77, "04_Frame_30%"),
        (109, "05_Structure_50%"),
        (141, "06_Walls_65%"),
        (169, "07_Roof_75%"),
        (193, "08_Systems_85%"),
        (217, "09_Activation_95%"),
        (241, "10_Complete_100%"),
    ]
    for f, name in labels:
        scene.timeline_markers.new(name, frame=f)


def set_scene():
    scene = bpy.context.scene
    scene.render.fps = FPS
    scene.frame_start = 1
    scene.frame_end = END
    scene.frame_current = 1
    cam = bpy.data.objects.get("CC_Camera")
    if cam:
        cam.location = (13.4, -19.8, 11.8)
        cam.rotation_euler = (math.radians(60.8), 0, math.radians(32))
        cam.data.lens = 45
        scene.camera = cam
    screen = bpy.context.screen
    if screen is None:
        return
    for area in screen.areas:
        if area.type != "VIEW_3D":
            continue
        for space in area.spaces:
            if space.type != "VIEW_3D":
                continue
            space.shading.type = "MATERIAL"
            space.shading.use_scene_lights = True
            space.shading.use_scene_world = True
            r3d = space.region_3d
            r3d.view_perspective = "PERSP"
            r3d.view_location = Vector((1.0, -1.8, 2.2))
            r3d.view_distance = 38.0
            from mathutils import Euler
            r3d.view_rotation = Euler((math.radians(60.8), 0, math.radians(32)), "XYZ").to_quaternion()


def summarize(groups):
    print("GROUP COUNTS")
    for k, v in groups.items():
        print(f"  {k}: {len(v)}")


def setup():
    import importlib
    import build_cityscape

    importlib.reload(build_cityscape)
    build_cityscape.build_cityscape()
    make_construction_assets()
    groups = classify()
    summarize(groups)
    animate_groups(groups)
    mark_timeline()
    set_scene()
    workshop_path = os.path.join(
        os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")),
        "projects",
        "workshop",
        "workshop.blend",
    )
    os.makedirs(os.path.dirname(workshop_path), exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=workshop_path)
    print("CONSTRUCTION ANIM READY", bpy.context.scene.frame_start, bpy.context.scene.frame_end)
    return {k: len(v) for k, v in groups.items()}
