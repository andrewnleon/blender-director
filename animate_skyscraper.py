"""SimCity-style skyscraper construction — site, crane drops, tower complete."""
from __future__ import annotations

import math
import os

import bpy
from mathutils import Vector

FPS = 24

# Per-drop pause after piece lands (foundation through systems).
DROP_HOLD = 8
CRANE_BUILD_START = 36
SITE_END = 35

# Slower crane cycles — longer boom sweep + hook travel than the 360f cut.
DROP_DURATIONS = {
    "foundation": 18,
    "footings": 19,
    "floor": 20,
    "structure": 22,
    "wall": 18,
    "roof": 18,
    "system": 16,
}


def _estimate_crane_build_end() -> int:
    """Last frame of post-drop hold before crane drives off."""
    frame = CRANE_BUILD_START
    sequence = (
        [DROP_DURATIONS["foundation"]]
        + [DROP_DURATIONS["footings"]]
        + [DROP_DURATIONS["floor"]] * 12
        + [DROP_DURATIONS["structure"]]
        + [DROP_DURATIONS["wall"]] * 12
        + [DROP_DURATIONS["roof"]] * 2
        + [DROP_DURATIONS["system"]] * 5
    )
    for duration in sequence:
        frame += duration + DROP_HOLD
    return frame


CRANE_BUILD_END = _estimate_crane_build_end()
CRANE_LEAVE_START = CRANE_BUILD_END
CRANE_LEAVE_END = CRANE_LEAVE_START + 18
COMPLETE_START = CRANE_LEAVE_END + 3
END = COMPLETE_START + 48

# Phase 1 site · Phase 2 crane build · Phase 3 complete
STAGES = {
    "site": (1, SITE_END),
    "crane_build": (CRANE_BUILD_START, CRANE_BUILD_END - 1),
    "complete": (COMPLETE_START, END),
}

# Boom angles (local Z) sweep over the pad — negative Z aims inward over the build.
BOOM_ANGLES = (-158, -176, -108, -172, -128, -110, -168, -136, -112, -174, -150, -132)


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


def pop_in(obj, frame_on: int) -> None:
    """Scale pop-in at fixed height — exports cleanly to glTF for the web viewer."""
    sc = obj.scale.copy()
    appear(obj, frame_on)
    pre = max(1, frame_on - 1)
    obj.scale = (sc.x * 0.04, sc.y * 0.04, sc.z * 0.04)
    obj.keyframe_insert("scale", frame=pre)
    obj.keyframe_insert("scale", frame=frame_on)
    obj.scale = sc
    obj.keyframe_insert("scale", frame=frame_on + 2)


def grow(obj, f_on, f_done, f_off=None):
    """C&C-style vertical grow — squashed at f_on, full size at f_done (ported from animate_construction)."""
    loc = obj.location.copy()
    sc = obj.scale.copy()
    height = max(obj.dimensions.z, 0.08)
    appear(obj, f_on, f_off)
    obj.scale = (sc.x, sc.y, 0.04)
    obj.location = (loc.x, loc.y, loc.z - height * 0.48)
    obj.keyframe_insert("scale", frame=f_on)
    obj.keyframe_insert("location", frame=f_on)
    obj.scale = sc
    obj.location = loc
    obj.keyframe_insert("scale", frame=f_done)
    obj.keyframe_insert("location", frame=f_done)


def hide_tree(root, frame_on, frame_off=None):
    if root is None:
        return
    stack = [root]
    while stack:
        obj = stack.pop()
        appear(obj, frame_on, frame_off)
        stack.extend(obj.children)


def clear_anim(obj):
    if obj.animation_data:
        obj.animation_data_clear()


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
                for keyframe in fcu.keyframe_points:
                    keyframe.interpolation = "CONSTANT"


def _floor_index_from_name(name: str, prefix: str) -> int | None:
    if not name.startswith(prefix):
        return None
    suffix = name[len(prefix) :]
    if suffix.isdigit():
        return int(suffix)
    if suffix.startswith("F") and suffix[1:].isdigit():
        return int(suffix[1:])
    return None


def classify():
    always = {"ST_DirtGround", "ST_Sun", "ST_Fill", "ST_Camera"}
    site = []
    foundation = []
    footings = []
    frame_floors = []
    slabs = []
    structure = []
    envelope_by_floor: dict[int, list] = {}
    windows_by_floor: dict[int, list] = {}
    roof = []
    systems = []
    activation = []
    equipment = []

    def add_envelope(floor: int, obj) -> None:
        envelope_by_floor.setdefault(floor, []).append(obj)

    def add_windows(floor: int, obj) -> None:
        windows_by_floor.setdefault(floor, []).append(obj)

    for obj in bpy.data.objects:
        name = obj.name
        if name in always or obj.type in {"CAMERA", "LIGHT"}:
            continue
        if name.startswith("ST_SiteCrate"):
            site.append(obj)
        elif name == "ST_Pad":
            site.append(obj)
        elif name == "ST_Foundation":
            foundation.append(obj)
        elif name == "ST_Footings":
            footings.append(obj)
        elif name.startswith("ST_FrameFloor_"):
            frame_floors.append(obj)
        elif name.startswith("ST_FloorSlab_"):
            slabs.append(obj)
        elif name == "ST_Body":
            structure.append(obj)
        elif name.startswith("ST_ShellBand_"):
            floor = _floor_index_from_name(name, "ST_ShellBand_")
            if floor is not None:
                add_envelope(floor, obj)
        elif name.startswith("ST_RibBand_"):
            floor = _floor_index_from_name(name, "ST_RibBand_")
            if floor is not None:
                add_envelope(floor, obj)
        elif name.startswith("ST_Windows_F") or name.startswith("ST_N_Windows_F"):
            prefix = "ST_Windows_F" if name.startswith("ST_Windows_F") else "ST_N_Windows_F"
            floor = _floor_index_from_name(name, prefix)
            if floor is not None:
                add_windows(floor, obj)
        elif name in {"ST_Roof", "ST_Parapet"}:
            roof.append(obj)
        elif name.startswith("ST_HVAC") or name.startswith("ST_Vent") or name == "ST_Antenna":
            systems.append(obj)
        elif name == "ST_Beacon":
            activation.append(obj)
        elif (
            name.startswith("ST_Crane")
            or name.startswith("ST_Mixer")
            or name.startswith("ST_Dozer")
        ):
            equipment.append(obj)

    frame_floors.sort(key=lambda item: item.name)
    slabs.sort(key=lambda item: item.name)
    envelope_floors = [
        envelope_by_floor[floor]
        for floor in sorted(envelope_by_floor)
    ]
    window_floors = [
        windows_by_floor[floor]
        for floor in sorted(windows_by_floor)
    ]
    return {
        "site": site,
        "foundation": foundation,
        "footings": footings,
        "frame_floors": frame_floors,
        "slabs": slabs,
        "structure": structure,
        "envelope_floors": envelope_floors,
        "window_floors": window_floors,
        "roof": roof,
        "systems": systems,
        "activation": activation,
        "equipment": equipment,
    }


def crane_drop(
    pieces,
    frame_start: int,
    *,
    duration: int = 20,
    boom_deg: float = -150.0,
    hook_high: float = -1.0,
    hook_low: float = -2.4,
    appear_pieces=None,
):
    """Crane swing + hook travel; building pieces grow from ground at placement."""
    if not isinstance(pieces, list):
        pieces = [pieces]
    if appear_pieces is None:
        appear_pieces = []
    elif not isinstance(appear_pieces, list):
        appear_pieces = [appear_pieces]

    boom = bpy.data.objects.get("ST_CraneBoomPivot")
    hook = bpy.data.objects.get("ST_CraneHook")
    payload = bpy.data.objects.get("ST_CranePayload")

    f_pick = frame_start
    f_swing = frame_start + max(4, round(duration * 0.22))
    f_lower = frame_start + max(f_swing + 4, round(duration * 0.58))
    f_place = frame_start + duration
    f_grow_start = f_swing
    f_grow_done = f_place

    for piece in pieces:
        grow(piece, f_grow_start, f_grow_done)

    for piece in appear_pieces:
        pop_in(piece, f_place)

    if payload is not None:
        hide_at(payload, f_pick - 1, True)
        hide_at(payload, f_pick, False)
        hide_at(payload, f_place - 1, False)
        hide_at(payload, f_place, True)

    if boom is not None:
        boom.rotation_euler = (0.0, 0.0, math.radians(boom_deg - 10))
        boom.keyframe_insert("rotation_euler", frame=f_pick)
        boom.rotation_euler = (0.0, 0.0, math.radians(boom_deg + 5))
        boom.keyframe_insert("rotation_euler", frame=f_swing)
        boom.rotation_euler = (0.0, 0.0, math.radians(boom_deg))
        boom.keyframe_insert("rotation_euler", frame=f_lower)
        boom.keyframe_insert("rotation_euler", frame=f_place)

    if hook is not None:
        hook.location.z = hook_high
        hook.keyframe_insert("location", frame=f_pick)
        hook.keyframe_insert("location", frame=f_swing)
        hook.location.z = hook_low
        hook.keyframe_insert("location", frame=f_lower)
        hook.location.z = hook_high
        hook.keyframe_insert("location", frame=f_place)


def hook_depth_for_floor(floor_index: int) -> float:
    """Lower hook further as floors rise."""
    return -1.6 - floor_index * 0.38


def animate_site_equipment():
    """Phase 1 — dirt pad, clutter, vehicles; crane on site before lifts."""
    import build_skyscraper as site

    crane_xy = site.SITE_CRANE
    mixer_xy = site.SITE_MIXER
    dozer_xy = site.SITE_DOZER
    pad_z = site.PAD_Z

    dozer = bpy.data.objects.get("ST_Dozer")
    mixer = bpy.data.objects.get("ST_Mixer")
    crane = bpy.data.objects.get("ST_Crane")
    boom = bpy.data.objects.get("ST_CraneBoomPivot")

    hide_tree(dozer, 1, 280)
    hide_tree(mixer, 1, CRANE_LEAVE_START - 40)
    hide_tree(crane, 1, CRANE_LEAVE_END)

    if dozer:
        clear_anim(dozer)
        dozer.location = (dozer_xy[0] - 1.2, dozer_xy[1] - 0.6, pad_z)
        dozer.rotation_euler.z = math.radians(-32)
        dozer.keyframe_insert("location", frame=1)
        dozer.keyframe_insert("rotation_euler", frame=1)
        dozer.location = (dozer_xy[0] + 0.8, dozer_xy[1], pad_z)
        dozer.rotation_euler.z = math.radians(-12)
        dozer.keyframe_insert("location", frame=28)
        dozer.keyframe_insert("rotation_euler", frame=28)
        dozer.location = (dozer_xy[0] - 0.4, dozer_xy[1] + 1.0, pad_z)
        dozer.keyframe_insert("location", frame=55)

    if mixer:
        clear_anim(mixer)
        mixer.location = (mixer_xy[0] + 1.4, mixer_xy[1] - 1.0, pad_z)
        mixer.keyframe_insert("location", frame=1)
        mixer.location = mixer_xy
        mixer.keyframe_insert("location", frame=22)
        mixer.location = (mixer_xy[0] + 0.5, mixer_xy[1] - 0.4, pad_z)
        mixer.keyframe_insert("location", frame=CRANE_LEAVE_START - 55)

    if crane:
        clear_anim(crane)
        crane.location = (crane_xy[0] + 1.0, crane_xy[1] + 0.8, pad_z)
        crane.keyframe_insert("location", frame=1)
        crane.location = crane_xy
        crane.keyframe_insert("location", frame=18)
        crane.keyframe_insert("location", frame=CRANE_LEAVE_START)
        crane.location = (crane_xy[0] + 6.5, crane_xy[1] + 4.0, pad_z)
        crane.keyframe_insert("location", frame=CRANE_LEAVE_END)

    if boom:
        clear_anim(boom)
        boom.rotation_euler = (0.0, 0.0, math.radians(-90))
        boom.keyframe_insert("rotation_euler", frame=1)
        boom.keyframe_insert("rotation_euler", frame=18)

    hook = bpy.data.objects.get("ST_CraneHook")
    if hook:
        clear_anim(hook)
        hook.location.z = -1.0
        hook.keyframe_insert("location", frame=1)
        hook.keyframe_insert("location", frame=18)


def animate_crane_build(groups):
    """Phase 2 — all steel frames first (bottom→top), then envelope bottom→top."""
    drop_frame = CRANE_BUILD_START
    boom_index = 0

    def next_boom() -> float:
        nonlocal boom_index
        angle = BOOM_ANGLES[boom_index % len(BOOM_ANGLES)]
        boom_index += 1
        return angle

    def schedule(pieces, *, duration=20, hook_low=-2.2, appear_pieces=None):
        nonlocal drop_frame
        piece_list = pieces if isinstance(pieces, list) else [pieces]
        crane_drop(
            piece_list,
            drop_frame,
            duration=duration,
            boom_deg=next_boom(),
            hook_low=hook_low,
            appear_pieces=appear_pieces,
        )
        drop_frame += duration + DROP_HOLD

    for obj in groups["foundation"]:
        schedule(obj, duration=DROP_DURATIONS["foundation"], hook_low=-1.8)

    for obj in groups["footings"]:
        schedule(obj, duration=DROP_DURATIONS["footings"], hook_low=-2.0)

    floor_pairs = list(zip(groups["frame_floors"], groups["slabs"], strict=False))
    window_floors = groups.get("window_floors", [])
    for floor_index, (frame_obj, slab_obj) in enumerate(floor_pairs, start=1):
        depth = hook_depth_for_floor(floor_index)
        floor_windows = window_floors[floor_index - 1] if floor_index - 1 < len(window_floors) else []
        schedule(
            [frame_obj, slab_obj],
            duration=DROP_DURATIONS["floor"],
            hook_low=depth,
            appear_pieces=floor_windows,
        )

    for obj in groups["structure"]:
        schedule(obj, duration=DROP_DURATIONS["structure"], hook_low=-4.8)

    for floor_index, envelope_pieces in enumerate(groups["envelope_floors"], start=1):
        schedule(
            envelope_pieces,
            duration=DROP_DURATIONS["wall"],
            hook_low=-5.2 - floor_index * 0.12,
        )

    for obj in groups["roof"]:
        schedule(obj, duration=DROP_DURATIONS["roof"], hook_low=-5.8)

    for index, obj in enumerate(groups["systems"]):
        schedule(obj, duration=DROP_DURATIONS["system"], hook_low=-6.0 - index * 0.12)


def animate_groups(groups):
    for obj in bpy.data.objects:
        if obj.name.startswith("ST_") and obj.type not in {"CAMERA", "LIGHT"}:
            if obj.name in {"ST_Sun", "ST_Fill", "ST_Camera", "ST_DirtGround"}:
                continue
            clear_anim(obj)

    dirt = bpy.data.objects.get("ST_DirtGround")
    if dirt:
        clear_anim(dirt)
        hide_at(dirt, 1, False)

    for obj in groups["site"]:
        hide_at(obj, 1, False)

    buildables = (
        groups["foundation"]
        + groups["footings"]
        + groups["frame_floors"]
        + groups["slabs"]
        + groups["structure"]
        + [obj for floor in groups["window_floors"] for obj in floor]
        + [obj for floor in groups["envelope_floors"] for obj in floor]
        + groups["roof"]
        + groups["systems"]
    )
    for obj in buildables:
        hide_at(obj, 1, True)

    payload = bpy.data.objects.get("ST_CranePayload")
    if payload:
        hide_at(payload, 1, True)

    animate_site_equipment()
    animate_crane_build(groups)

    for obj in groups["activation"]:
        grow(obj, COMPLETE_START + 3, COMPLETE_START + 12)

    lights_on = COMPLETE_START + 12
    for index, obj in enumerate(o for o in bpy.data.objects if o.name.startswith("ST_BuildLight")):
        clear_anim(obj)
        obj.data.energy = 0
        obj.data.keyframe_insert("energy", frame=1)
        obj.data.keyframe_insert("energy", frame=CRANE_BUILD_END - 1)
        obj.data.energy = 220 + index * 40
        obj.data.keyframe_insert("energy", frame=lights_on + index * 2)

    constant_hides()


def make_build_lights():
    spots = [(0, -2.8, 4.5), (2.5, 2.0, 8.0), (-2.2, 2.4, 12.5)]
    studio = bpy.data.collections.get("ST_Studio")
    for index, loc in enumerate(spots):
        for obj in list(bpy.data.objects):
            if obj.name == f"ST_BuildLight_{index}":
                bpy.data.objects.remove(obj, do_unlink=True)
        data = bpy.data.lights.new(f"ST_BuildLight_{index}", "POINT")
        data.energy = 0
        data.color = (1.0, 0.88, 0.55)
        obj = bpy.data.objects.new(f"ST_BuildLight_{index}", data)
        if studio:
            studio.objects.link(obj)
        else:
            bpy.context.scene.collection.objects.link(obj)
        obj.location = loc


def mark_timeline():
    scene = bpy.context.scene
    scene.timeline_markers.clear()
    floor_mid = CRANE_BUILD_START + (
        DROP_DURATIONS["foundation"]
        + DROP_DURATIONS["footings"]
        + 6 * (DROP_DURATIONS["floor"] + DROP_HOLD)
    )
    envelope = CRANE_BUILD_START + (
        DROP_DURATIONS["foundation"]
        + DROP_DURATIONS["footings"]
        + 12 * (DROP_DURATIONS["floor"] + DROP_HOLD)
        + DROP_DURATIONS["structure"]
    )
    labels = [
        (1, "01_Site"),
        (CRANE_BUILD_START, "02_CraneStart"),
        (floor_mid, "03_FloorsMid"),
        (envelope, "04_Envelope"),
        (COMPLETE_START, "05_Complete"),
    ]
    for frame, name in labels:
        scene.timeline_markers.new(name, frame=frame)


def set_scene():
    scene = bpy.context.scene
    scene.render.fps = FPS
    scene.frame_start = 1
    scene.frame_end = END
    scene.frame_current = 1
    cam = bpy.data.objects.get("ST_Camera")
    if cam:
        cam.location = Vector((16.5, -22, 14))
        cam.rotation_euler = (math.radians(58), 0, math.radians(30))
        cam.data.lens = 45
        scene.camera = cam


def setup(save_path: str | None = None) -> dict[str, int]:
    import importlib
    import sys

    root = os.path.dirname(os.path.abspath(__file__))
    if root not in sys.path:
        sys.path.insert(0, root)

    import build_skyscraper

    importlib.reload(build_skyscraper)
    build_skyscraper.build_skyscraper()
    make_build_lights()
    groups = classify()
    animate_groups(groups)
    mark_timeline()
    set_scene()

    if save_path:
        os.makedirs(os.path.dirname(save_path), exist_ok=True)
        bpy.ops.wm.save_as_mainfile(filepath=save_path)

    print("SKYSCRAPER ANIM READY", bpy.context.scene.frame_start, bpy.context.scene.frame_end)
    return {key: len(value) for key, value in groups.items()}


if __name__ == "__main__":
    root = os.path.dirname(os.path.abspath(__file__))
    blend_path = os.path.join(root, "projects", "skyscraper", "skyscraper.blend")
    setup(blend_path)
