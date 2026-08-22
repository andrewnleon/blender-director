"""Realistic skyscraper construction — phased site work, crane lifts, floor overlap."""
from __future__ import annotations

import math
import os
from dataclasses import dataclass

import bpy
from mathutils import Vector

FPS = 24
DROP_HOLD = 6
BOLT_HOLD = 4
CURE_HOLD = 8

# Boom sweep angles — crane rotates over the pad.
BOOM_ANGLES = (-158, -176, -108, -172, -128, -110, -168, -136, -112, -174, -150, -132)

LIFT_DURATIONS = {
    "light": 16,
    "steel": 22,
    "deck": 18,
    "panel": 14,
    "roof": 20,
    "core": 18,
}


@dataclass(frozen=True)
class PhaseMarker:
    label: str
    frame: int


def _floor_index_from_name(name: str, prefix: str) -> int | None:
    if not name.startswith(prefix):
        return None
    suffix = name[len(prefix) :]
    if suffix.isdigit():
        return int(suffix)
    if suffix.startswith("F") and suffix[1:].isdigit():
        return int(suffix[1:])
    return None


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
    """Snap-in at fixed height — used for windows after steel inspection."""
    sc = obj.scale.copy()
    appear(obj, frame_on)
    pre = max(1, frame_on - 1)
    obj.scale = (sc.x * 0.04, sc.y * 0.04, sc.z * 0.04)
    obj.keyframe_insert("scale", frame=pre)
    obj.keyframe_insert("scale", frame=frame_on)
    obj.scale = sc
    obj.keyframe_insert("scale", frame=frame_on + 2)


def pour_spread(obj, frame_start: int, duration: int = 18) -> int:
    """Concrete pour at fixed elevation — spreads in plan, not vertical grow."""
    sc = obj.scale.copy()
    appear(obj, frame_start)
    obj.scale = (sc.x * 0.05, sc.y * 0.05, sc.z)
    obj.keyframe_insert("scale", frame=frame_start)
    obj.scale = sc
    obj.keyframe_insert("scale", frame=frame_start + duration)
    return frame_start + duration + CURE_HOLD


def show_tree(root, frame_on):
    if root is None:
        return
    stack = [root]
    while stack:
        obj = stack.pop()
        appear(obj, frame_on)
        stack.extend(obj.children)


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


def classify():
    always = {"ST_DirtGround", "ST_Sun", "ST_Fill", "ST_Camera"}
    site_prep = []
    earthwork = []
    utilities = []
    foundation = []
    footings = []
    core_lifts = []
    frame_floors = []
    decks = []
    slabs = []
    curtain_by_floor: dict[int, list] = {}
    windows_by_floor: dict[int, list] = {}
    roof = []
    systems = []
    activation = []
    equipment = []

    def add_curtain(floor: int, obj) -> None:
        curtain_by_floor.setdefault(floor, []).append(obj)

    def add_windows(floor: int, obj) -> None:
        windows_by_floor.setdefault(floor, []).append(obj)

    for obj in bpy.data.objects:
        name = obj.name
        if name in always or obj.type in {"CAMERA", "LIGHT"}:
            continue
        if name in {"ST_Pad"} or name.startswith("ST_SiteCrate"):
            site_prep.append(obj)
        elif name.startswith("ST_Stake") or name.startswith("ST_Fence") or name == "ST_TempOffice":
            site_prep.append(obj)
        elif name == "ST_Foundation":
            foundation.append(obj)
        elif name == "ST_ExcavPit":
            earthwork.append(obj)
        elif name == "ST_UtilRun":
            utilities.append(obj)
        elif name == "ST_Footings":
            footings.append(obj)
        elif name.startswith("ST_CoreLift_"):
            core_lifts.append(obj)
        elif name.startswith("ST_FrameFloor_"):
            frame_floors.append(obj)
        elif name.startswith("ST_Deck_"):
            decks.append(obj)
        elif name.startswith("ST_FloorSlab_"):
            slabs.append(obj)
        elif name.startswith("ST_CWPanel_"):
            rest = name[len("ST_CWPanel_") :]
            floor_token = rest.split("_", 1)[0]
            if floor_token.isdigit():
                add_curtain(int(floor_token), obj)
        elif name.startswith("ST_RibBand_"):
            floor = _floor_index_from_name(name, "ST_RibBand_")
            if floor is not None:
                add_curtain(floor, obj)
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
        elif name.startswith("ST_Crane") or name.startswith("ST_Mixer") or name.startswith("ST_Dozer"):
            equipment.append(obj)

    frame_floors.sort(key=lambda item: item.name)
    decks.sort(key=lambda item: item.name)
    slabs.sort(key=lambda item: item.name)
    core_lifts.sort(key=lambda item: item.name)

    curtain_floors = [curtain_by_floor[floor] for floor in sorted(curtain_by_floor)]
    window_floors = [windows_by_floor[floor] for floor in sorted(windows_by_floor)]

    return {
        "site_prep": site_prep,
        "earthwork": earthwork,
        "utilities": utilities,
        "foundation": foundation,
        "footings": footings,
        "core_lifts": core_lifts,
        "frame_floors": frame_floors,
        "decks": decks,
        "slabs": slabs,
        "curtain_floors": curtain_floors,
        "window_floors": window_floors,
        "roof": roof,
        "systems": systems,
        "activation": activation,
        "equipment": equipment,
    }


def _animate_crane_rig(frame_start: int, duration: int, boom_deg: float, hook_high: float, hook_low: float):
    boom = bpy.data.objects.get("ST_CraneBoomPivot")
    hook = bpy.data.objects.get("ST_CraneHook")
    payload = bpy.data.objects.get("ST_CranePayload")

    f_pick = frame_start
    f_swing = frame_start + max(4, round(duration * 0.24))
    f_lower = frame_start + max(f_swing + 4, round(duration * 0.58))
    f_place = frame_start + duration

    if payload is not None:
        hide_at(payload, f_pick - 1, True)
        hide_at(payload, f_pick, False)
        hide_at(payload, f_place - 1, False)
        hide_at(payload, f_place, True)

    if boom is not None:
        boom.rotation_euler = (0.0, 0.0, math.radians(boom_deg - 12))
        boom.keyframe_insert("rotation_euler", frame=f_pick)
        boom.rotation_euler = (0.0, 0.0, math.radians(boom_deg + 6))
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

    return f_place


def crane_lift(
    piece,
    frame_start: int,
    *,
    duration: int = 20,
    boom_deg: float = -150.0,
    hook_high: float = -1.0,
    hook_low: float = -2.4,
    floor_index: int | None = None,
) -> int:
    """Drop cargo onto the stack — hover just above the floor below, then seat in place."""
    final_loc = piece.location.copy()

    f_swing = frame_start + max(4, round(duration * 0.24))
    f_lower = max(f_swing + 4, frame_start + round(duration * 0.58))
    f_place = frame_start + duration
    f_bolt = f_place + BOLT_HOLD

    base_top = stack_top_z(floor_index) if floor_index is not None else final_loc.z - 0.5
    hover_z = max(final_loc.z + 0.35, base_top + 1.4)
    hover = Vector((final_loc.x, final_loc.y, hover_z))

    hide_at(piece, 1, True)
    piece.location = final_loc
    piece.keyframe_insert("location", frame=1)
    if f_lower > 1:
        hide_at(piece, f_lower - 1, True)
    hide_at(piece, f_lower, False)

    piece.location = hover
    piece.keyframe_insert("location", frame=f_lower)
    piece.keyframe_insert("location", frame=f_place - 1)
    piece.location = final_loc
    piece.keyframe_insert("location", frame=f_place)
    piece.keyframe_insert("location", frame=f_bolt)

    _animate_crane_rig(frame_start, duration, boom_deg, hook_high, hook_low)
    return f_bolt + DROP_HOLD


def hook_depth_for_floor(floor_index: int) -> float:
    return -1.5 - floor_index * 0.36


def stack_top_z(floor_index: int) -> float:
    """Elevation of the finished floor below this lift."""
    import build_skyscraper as site

    if floor_index <= 1:
        return site.PAD_Z
    return site.floor_ring_z(floor_index - 1)


class ConstructionDirector:
    """Schedules phased construction with realistic overlap."""

    def __init__(self, groups: dict):
        self.groups = groups
        self.frame = 1
        self.boom_index = 0
        self.markers: list[PhaseMarker] = []

    def mark(self, label: str) -> None:
        self.markers.append(PhaseMarker(label, self.frame))

    def next_boom(self) -> float:
        angle = BOOM_ANGLES[self.boom_index % len(BOOM_ANGLES)]
        self.boom_index += 1
        return angle

    def advance(self, frames: int) -> None:
        self.frame += frames

    def vehicle_path(self, root_name: str, keyframes: list[tuple[int, tuple[float, float, float]]]) -> None:
        root = bpy.data.objects.get(root_name)
        if root is None:
            return
        clear_anim(root)
        for frame, loc in keyframes:
            root.location = loc
            root.keyframe_insert("location", frame=frame)

    def run(self) -> int:
        import build_skyscraper as site

        road = site.SITE_ROAD
        crane_xy = site.SITE_CRANE
        mixer_xy = site.SITE_MIXER
        dozer_xy = site.SITE_DOZER
        pad_z = site.PAD_Z

        # Phase 0 — survey & site prep
        self.mark("P00_Survey")
        for obj in self.groups["site_prep"]:
            if obj.name == "ST_Pad":
                appear(obj, self.frame + 24)
            elif obj.name.startswith("ST_Stake"):
                appear(obj, self.frame + 4 + int(obj.name.split("_")[-1]) * 2)
            elif obj.name.startswith("ST_Fence"):
                appear(obj, self.frame + 12 + int(obj.name.split("_")[-1]) * 2)
            elif obj.name == "ST_TempOffice":
                appear(obj, self.frame + 18)
            else:
                appear(obj, self.frame + 8)
        self.advance(36)

        # Phase 1 — earthwork
        self.mark("P01_Earthwork")
        show_tree(bpy.data.objects.get("ST_Dozer"), self.frame)
        self.vehicle_path(
            "ST_Dozer",
            [
                (self.frame, (road[0], road[1], pad_z)),
                (self.frame + 14, (dozer_xy[0] - 0.6, dozer_xy[1], pad_z)),
                (self.frame + 28, (dozer_xy[0] + 1.0, dozer_xy[1] + 0.8, pad_z)),
                (self.frame + 42, (dozer_xy[0], dozer_xy[1], pad_z)),
            ],
        )
        self.advance(48)

        # Phase 2 — excavation
        self.mark("P02_Excavation")
        for index, obj in enumerate(self.groups["earthwork"]):
            appear(obj, self.frame + index * 6)
        self.advance(36)

        # Phase 3 — utilities
        self.mark("P03_Utilities")
        for obj in self.groups["utilities"]:
            appear(obj, self.frame + 8)
        self.advance(32)

        # Phase 4 — foundation pour
        self.mark("P04_Foundation")
        show_tree(bpy.data.objects.get("ST_Mixer"), self.frame - 8)
        self.vehicle_path(
            "ST_Mixer",
            [
                (self.frame - 8, (road[0] + 2, road[1] + 1, pad_z)),
                (self.frame, mixer_xy),
                (self.frame + 40, (mixer_xy[0] + 0.4, mixer_xy[1], pad_z)),
            ],
        )
        for obj in self.groups["footings"]:
            end = crane_lift(
                obj,
                self.frame,
                duration=LIFT_DURATIONS["core"],
                boom_deg=self.next_boom(),
                hook_low=-1.6,
            )
            self.frame = end
        for obj in self.groups["foundation"]:
            end = crane_lift(
                obj,
                self.frame,
                duration=LIFT_DURATIONS["core"],
                boom_deg=self.next_boom(),
                hook_low=-1.4,
            )
            self.frame = end

        # Phase 5 — elevator core slip-form
        self.mark("P05_Core")
        show_tree(bpy.data.objects.get("ST_Crane"), self.frame - 12)
        self.vehicle_path(
            "ST_Crane",
            [
                (self.frame - 12, (road[0] + 4, road[1] + 3, pad_z)),
                (self.frame, crane_xy),
            ],
        )
        boom = bpy.data.objects.get("ST_CraneBoomPivot")
        if boom:
            clear_anim(boom)
            boom.rotation_euler = (0.0, 0.0, math.radians(-95))
            boom.keyframe_insert("rotation_euler", frame=self.frame)

        for index, obj in enumerate(self.groups["core_lifts"], start=1):
            end = crane_lift(
                obj,
                self.frame,
                duration=LIFT_DURATIONS["core"],
                boom_deg=self.next_boom(),
                hook_low=hook_depth_for_floor(index) + 1.2,
            )
            self.frame = end

        # Phases 6–11 — stack one complete floor at a time (steel → windows → deck → slab → curtain)
        self.mark("P06_StackStart")
        floor_count = len(self.groups["frame_floors"])
        decks = self.groups["decks"]
        slabs = self.groups["slabs"]
        windows = self.groups["window_floors"]
        curtains = self.groups["curtain_floors"]

        for floor_index in range(1, floor_count + 1):
            self.mark(f"P06_Floor_{floor_index:02d}")

            frame_obj = self.groups["frame_floors"][floor_index - 1]
            end = crane_lift(
                frame_obj,
                self.frame,
                duration=LIFT_DURATIONS["steel"],
                boom_deg=self.next_boom(),
                hook_low=hook_depth_for_floor(floor_index),
                floor_index=floor_index,
            )
            window_pieces = windows[floor_index - 1] if floor_index - 1 < len(windows) else []
            for window in window_pieces:
                pop_in(window, end - DROP_HOLD - BOLT_HOLD)

            if floor_index - 1 < len(decks):
                end = crane_lift(
                    decks[floor_index - 1],
                    self.frame,
                    duration=LIFT_DURATIONS["deck"],
                    boom_deg=self.next_boom(),
                    hook_low=hook_depth_for_floor(floor_index) - 0.2,
                    floor_index=floor_index,
                )

            if floor_index - 1 < len(slabs):
                end = pour_spread(slabs[floor_index - 1], self.frame, duration=18)

            if floor_index - 1 < len(curtains):
                for panel in curtains[floor_index - 1]:
                    end = crane_lift(
                        panel,
                        self.frame,
                        duration=LIFT_DURATIONS["panel"],
                        boom_deg=self.next_boom(),
                        hook_low=hook_depth_for_floor(floor_index) - 0.35,
                        floor_index=floor_index,
                    )

            self.frame = end

        self.mark("P11_CurtainDone")

        # Phase 12 — roof
        self.mark("P12_Roof")
        for obj in self.groups["roof"]:
            end = crane_lift(
                obj,
                self.frame,
                duration=LIFT_DURATIONS["roof"],
                boom_deg=self.next_boom(),
                hook_low=-6.2,
            )
            self.frame = end

        # Phase 13 — MEP / roof systems
        self.mark("P13_Systems")
        for index, obj in enumerate(self.groups["systems"]):
            end = crane_lift(
                obj,
                self.frame,
                duration=LIFT_DURATIONS["light"],
                boom_deg=self.next_boom(),
                hook_low=-6.0 - index * 0.15,
            )
            self.frame = end

        crane_leave = self.frame
        crane = bpy.data.objects.get("ST_Crane")
        if crane:
            clear_anim(crane)
            crane.location = crane_xy
            crane.keyframe_insert("location", frame=crane_leave)
            crane.location = (crane_xy[0] + 6.5, crane_xy[1] + 4.0, pad_z)
            crane.keyframe_insert("location", frame=crane_leave + 18)

        mixer = bpy.data.objects.get("ST_Mixer")
        if mixer:
            hide_tree(mixer, 1, crane_leave - 20)

        dozer = bpy.data.objects.get("ST_Dozer")
        if dozer:
            hide_tree(dozer, 1, crane_leave - 60)

        hide_tree(crane, 1, crane_leave + 18)

        # Phase 17 — commissioning
        self.mark("P17_Commission")
        complete_start = crane_leave + 24
        for obj in self.groups["activation"]:
            appear(obj, complete_start + 6)

        lights_on = complete_start + 10
        for index, obj in enumerate(o for o in bpy.data.objects if o.name.startswith("ST_BuildLight")):
            clear_anim(obj)
            obj.data.energy = 0
            obj.data.keyframe_insert("energy", frame=1)
            obj.data.keyframe_insert("energy", frame=crane_leave)
            obj.data.energy = 220 + index * 40
            obj.data.keyframe_insert("energy", frame=lights_on + index * 2)

        self.frame = complete_start + 48
        return self.frame


CRANE_BUILD_END = 900  # overwritten in setup
COMPLETE_START = 920
END = 968


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

    buildables = (
        groups["foundation"]
        + groups["earthwork"]
        + groups["utilities"]
        + groups["footings"]
        + groups["core_lifts"]
        + groups["frame_floors"]
        + groups["decks"]
        + groups["slabs"]
        + [obj for floor in groups["window_floors"] for obj in floor]
        + [obj for floor in groups["curtain_floors"] for obj in floor]
        + groups["roof"]
        + groups["systems"]
        + groups["activation"]
    )
    pad = bpy.data.objects.get("ST_Foundation")
    if pad and pad not in buildables:
        buildables.append(pad)
    for obj in buildables:
        hide_at(obj, 1, True)

    payload = bpy.data.objects.get("ST_CranePayload")
    if payload:
        hide_at(payload, 1, True)

    for vehicle_name in ("ST_Crane", "ST_Mixer", "ST_Dozer"):
        vehicle = bpy.data.objects.get(vehicle_name)
        if vehicle:
            hide_at(vehicle, 1, True)

    director = ConstructionDirector(groups)
    global CRANE_BUILD_END, COMPLETE_START, END
    END = director.run()
    CRANE_BUILD_END = END - 72
    COMPLETE_START = END - 48

    constant_hides()
    return director.markers


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


def mark_timeline(markers: list[PhaseMarker]):
    scene = bpy.context.scene
    scene.timeline_markers.clear()
    for marker in markers:
        scene.timeline_markers.new(marker.label, frame=marker.frame)


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

    root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
    if root not in sys.path:
        sys.path.insert(0, root)

    import build_skyscraper

    importlib.reload(build_skyscraper)
    build_skyscraper.build_skyscraper()
    make_build_lights()
    groups = classify()
    markers = animate_groups(groups)
    mark_timeline(markers)
    set_scene()

    if save_path:
        os.makedirs(os.path.dirname(save_path), exist_ok=True)
        bpy.ops.wm.save_as_mainfile(filepath=save_path)

    print("SKYSCRAPER ANIM READY", bpy.context.scene.frame_start, bpy.context.scene.frame_end)
    return {key: len(value) for key, value in groups.items()}


if __name__ == "__main__":
    root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
    blend_path = os.path.join(root, "projects", "skyscraper", "skyscraper.blend")
    setup(blend_path)
