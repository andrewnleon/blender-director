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
# C&C grow — tiny at spawn so the yard click is an empty pad, not an installed frame.
GROW_START_SCALE = 0.04

# Boom sweep angles — crane rotates over the pad.
BOOM_ANGLES = (-158, -176, -108, -172, -128, -110, -168, -136, -112, -174, -150, -132)

LIFT_DURATIONS = {
    "light": 16,
    "steel": 20,
    "column": 18,
    "deck": 16,
    "slab": 16,
    "panel": 12,
    "roof": 18,
    "core": 16,
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
    loc = obj.location.copy()
    # Keep location seated. hide_viewport bakes glTF translation to origin.
    obj.location = loc
    obj.keyframe_insert("location", frame=1)
    obj.scale = (sc.x * 0.04, sc.y * 0.04, sc.z * 0.04)
    obj.keyframe_insert("scale", frame=1)
    pre = max(1, frame_on - 1)
    obj.keyframe_insert("scale", frame=pre)
    obj.scale = sc
    obj.keyframe_insert("scale", frame=frame_on + 2)
    obj.keyframe_insert("location", frame=frame_on + 2)


def pour_spread(obj, frame_start: int, duration: int = 18) -> int:
    """Concrete pour at fixed elevation — spreads in plan, not vertical grow."""
    sc = obj.scale.copy()
    loc = obj.location.copy()
    done = frame_start + duration + CURE_HOLD
    obj.location = loc
    obj.keyframe_insert("location", frame=1)
    obj.keyframe_insert("location", frame=done)
    obj.scale = (sc.x * 0.05, sc.y * 0.05, sc.z)
    obj.keyframe_insert("scale", frame=1)
    pre = max(1, frame_start - 1)
    obj.keyframe_insert("scale", frame=pre)
    obj.scale = sc
    obj.keyframe_insert("scale", frame=frame_start + duration)
    return done


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
    columns = []
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
        elif name.startswith("ST_Columns_"):
            columns.append(obj)
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
        elif name.startswith("ST_Crane"):
            equipment.append(obj)

    def _floor_sort(obj) -> int:
        suffix = obj.name.rsplit("_", 1)[-1]
        return int(suffix) if suffix.isdigit() else 0

    columns.sort(key=_floor_sort)
    frame_floors.sort(key=_floor_sort)
    decks.sort(key=_floor_sort)
    slabs.sort(key=_floor_sort)
    core_lifts.sort(key=_floor_sort)

    curtain_floors = [curtain_by_floor[floor] for floor in sorted(curtain_by_floor)]
    window_floors = [windows_by_floor[floor] for floor in sorted(windows_by_floor)]

    return {
        "site_prep": site_prep,
        "earthwork": earthwork,
        "utilities": utilities,
        "foundation": foundation,
        "footings": footings,
        "core_lifts": core_lifts,
        "columns": columns,
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


def crane_pose_for_top(world_top_z: float, pad_z: float) -> tuple[float, float, float, float]:
    """Mast scale/center, jib local Z, hook local Z so the hook sits on the roof."""
    import build_skyscraper as site

    jib_clearance = 2.4
    hook_above = 0.35
    jib_z = max(3.2, world_top_z - pad_z + jib_clearance)
    tower_h = max(2.6, jib_z - site.CRANE_TOWER_BASE_Z + 0.2)
    tower_center_z = site.CRANE_TOWER_BASE_Z + tower_h * 0.5
    tower_scale_z = tower_h / site.CRANE_TOWER_REST_H
    hook_z = world_top_z + hook_above - pad_z - jib_z
    return tower_scale_z, tower_center_z, jib_z, hook_z


def key_crane_mast(frame: int, world_top_z: float, pad_z: float) -> float:
    """Grow the yellow mast and ride the jib up. Returns hook local Z on that roof."""
    import build_skyscraper as site

    tower_scale_z, tower_center_z, jib_z, hook_z = crane_pose_for_top(world_top_z, pad_z)
    tower = bpy.data.objects.get("ST_CraneTower")
    cab = bpy.data.objects.get("ST_CraneCab")
    boom = bpy.data.objects.get("ST_CraneBoomPivot")
    if tower is not None:
        tower.scale = (1.0, 1.0, tower_scale_z)
        tower.location = (0.0, 0.0, tower_center_z)
        tower.keyframe_insert("scale", frame=frame)
        tower.keyframe_insert("location", frame=frame)
    if cab is not None:
        cab.location = (0.45, 0.0, jib_z)
        cab.keyframe_insert("location", frame=frame)
    if boom is not None:
        boom.location = (0.0, 0.0, jib_z)
        boom.keyframe_insert("location", frame=frame)
    key_crane_hook(frame, hook_z, site.CRANE_HOOK_REST)
    return hook_z


def key_crane_hook(frame: int, hook_z: float, hook_rest: tuple[float, float, float]) -> None:
    hook = bpy.data.objects.get("ST_CraneHook")
    cable = bpy.data.objects.get("ST_CraneCable")
    payload = bpy.data.objects.get("ST_CranePayload")
    hook_x, hook_y, _hook_rest_z = hook_rest
    if hook is not None:
        hook.location = (hook_x, hook_y, hook_z)
        hook.keyframe_insert("location", frame=frame)
    cable_rest_h = 1.0
    if cable is not None:
        length = max(0.4, abs(hook_z))
        cable.scale = (1.0, 1.0, length / cable_rest_h)
        cable.location = (hook_x, hook_y, hook_z * 0.5)
        cable.keyframe_insert("scale", frame=frame)
        cable.keyframe_insert("location", frame=frame)
    if payload is not None:
        payload.location = (hook_x, hook_y, hook_z - 0.5)
        payload.keyframe_insert("location", frame=frame)


def _animate_crane_rig(frame_start: int, duration: int, boom_deg: float, hook_high: float, hook_low: float):
    import build_skyscraper as site

    boom = bpy.data.objects.get("ST_CraneBoomPivot")
    payload = bpy.data.objects.get("ST_CranePayload")
    hook_rest = site.CRANE_HOOK_REST

    f_pick = frame_start
    f_swing = frame_start + max(4, round(duration * 0.24))
    f_lower = frame_start + max(f_swing + 4, round(duration * 0.58))
    f_place = frame_start + duration

    if payload is not None:
        payload.scale = (0.04, 0.04, 0.04)
        payload.keyframe_insert("scale", frame=max(1, f_pick - 1))
        payload.scale = (1.0, 1.0, 1.0)
        payload.keyframe_insert("scale", frame=f_pick)
        payload.keyframe_insert("scale", frame=f_place - 1)
        payload.scale = (0.04, 0.04, 0.04)
        payload.keyframe_insert("scale", frame=f_place)

    if boom is not None:
        boom.rotation_euler = (0.0, 0.0, math.radians(boom_deg - 12))
        boom.keyframe_insert("rotation_euler", frame=f_pick)
        boom.rotation_euler = (0.0, 0.0, math.radians(boom_deg + 6))
        boom.keyframe_insert("rotation_euler", frame=f_swing)
        boom.rotation_euler = (0.0, 0.0, math.radians(boom_deg))
        boom.keyframe_insert("rotation_euler", frame=f_lower)
        boom.keyframe_insert("rotation_euler", frame=f_place)

    key_crane_hook(f_pick, hook_high, hook_rest)
    key_crane_hook(f_swing, hook_high, hook_rest)
    key_crane_hook(f_lower, hook_low, hook_rest)
    key_crane_hook(f_place, hook_high, hook_rest)

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
    top_z: float | None = None,
) -> int:
    """C&C scale-up from the seated pad. Never explode from the sky.

    Tiny scale at frame 1 so spawn / glTF bind pose has no installed frame.
    Do not key hide_viewport on exported meshes — the baker records hidden
    transforms as origin. Hook hangs on the current roof.
    """
    import build_skyscraper as site

    pad_z = site.PAD_Z
    if top_z is None:
        top_z = site.floor_ring_z(floor_index) if floor_index is not None else pad_z + 0.9
    _tower_s, _tower_z, _jib_z, hook_on_roof = crane_pose_for_top(top_z, pad_z)
    del hook_high, hook_low
    hook_high = hook_on_roof
    hook_low = hook_on_roof - 0.45

    final_loc = piece.location.copy()
    rest_scale = piece.scale.copy()
    height = max(float(piece.dimensions.z), 0.08)
    tiny = (
        rest_scale.x * GROW_START_SCALE,
        rest_scale.y * GROW_START_SCALE,
        rest_scale.z * GROW_START_SCALE,
    )

    f_place = frame_start + duration
    f_bolt = f_place + BOLT_HOLD
    pre = max(1, frame_start - 1)
    grow_from = Vector((final_loc.x, final_loc.y, final_loc.z - height * 0.48))

    piece.location = final_loc
    piece.scale = tiny
    piece.keyframe_insert("location", frame=1)
    piece.keyframe_insert("scale", frame=1)
    piece.keyframe_insert("location", frame=pre)
    piece.keyframe_insert("scale", frame=pre)

    piece.location = grow_from
    piece.scale = tiny
    piece.keyframe_insert("location", frame=frame_start)
    piece.keyframe_insert("scale", frame=frame_start)

    piece.location = final_loc
    piece.scale = rest_scale
    piece.keyframe_insert("location", frame=f_place)
    piece.keyframe_insert("scale", frame=f_place)
    piece.keyframe_insert("location", frame=f_bolt)
    piece.keyframe_insert("scale", frame=f_bolt)

    _animate_crane_rig(frame_start, duration, boom_deg, hook_high, hook_low)
    return f_bolt + DROP_HOLD


class ConstructionDirector:
    """Schedules phased construction with realistic overlap."""

    def __init__(self, groups: dict):
        self.groups = groups
        self.frame = 1
        self.boom_index = 0
        self.markers: list[PhaseMarker] = []
        self.crane_top_z = 0.0

    def mark(self, label: str) -> None:
        self.markers.append(PhaseMarker(label, self.frame))

    def next_boom(self) -> float:
        angle = BOOM_ANGLES[self.boom_index % len(BOOM_ANGLES)]
        self.boom_index += 1
        return angle

    def advance(self, frames: int) -> None:
        self.frame += frames

    def raise_crane(self, top_z: float) -> None:
        """Grow the mast so the hook rides the new roof."""
        import build_skyscraper as site

        pad_z = site.PAD_Z
        if self.crane_top_z <= 0.0:
            key_crane_mast(1, top_z, pad_z)
            self.crane_top_z = top_z
            return
        if abs(top_z - self.crane_top_z) < 0.05:
            return
        hold = max(1, self.frame)
        key_crane_mast(hold, self.crane_top_z, pad_z)
        grow_end = hold + 10
        key_crane_mast(grow_end, top_z, pad_z)
        self.crane_top_z = top_z
        self.frame = grow_end

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

        crane_xy = site.SITE_CRANE
        pad_z = site.PAD_Z
        self.crane_top_z = site.floor_ring_z(1)
        key_crane_mast(1, self.crane_top_z, pad_z)
        crane = bpy.data.objects.get("ST_Crane")
        if crane is not None:
            crane.location = crane_xy
            crane.keyframe_insert("location", frame=1)

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

        # Phase 1 — earthwork (no earth movers — crane only)
        self.mark("P01_Earthwork")
        self.advance(16)

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
        for obj in self.groups["footings"]:
            end = crane_lift(
                obj,
                self.frame,
                duration=LIFT_DURATIONS["core"],
                boom_deg=self.next_boom(),
                top_z=self.crane_top_z,
            )
            self.frame = end
        for obj in self.groups["foundation"]:
            end = crane_lift(
                obj,
                self.frame,
                duration=LIFT_DURATIONS["core"],
                boom_deg=self.next_boom(),
                top_z=self.crane_top_z,
            )
            self.frame = end

        # Phase 5 — crane already on the pad (frame 1). Do not wipe boom location.
        self.mark("P05_Crane")
        if crane is not None:
            crane.location = crane_xy
            crane.keyframe_insert("location", frame=self.frame)
        key_crane_mast(self.frame, self.crane_top_z, pad_z)
        boom = bpy.data.objects.get("ST_CraneBoomPivot")
        if boom is not None:
            boom.rotation_euler = (0.0, 0.0, math.radians(-95))
            boom.keyframe_insert("rotation_euler", frame=1)
            boom.keyframe_insert("rotation_euler", frame=self.frame)

        # Phases 6–11 — RC load path per story: columns → beams → slab
        self.mark("P06_StackStart")
        floor_count = max(
            len(self.groups["frame_floors"]),
            len(self.groups["columns"]),
            len(self.groups["slabs"]),
        )
        columns = self.groups["columns"]
        cores = self.groups["core_lifts"]
        decks = self.groups["decks"]
        slabs = self.groups["slabs"]
        windows = self.groups["window_floors"]
        curtains = self.groups["curtain_floors"]

        for floor_index in range(1, floor_count + 1):
            self.mark(f"P06_Floor_{floor_index:02d}")
            floor_top = site.floor_ring_z(floor_index)
            self.raise_crane(floor_top)

            if floor_index - 1 < len(columns):
                self.frame = crane_lift(
                    columns[floor_index - 1],
                    self.frame,
                    duration=LIFT_DURATIONS["column"],
                    boom_deg=self.next_boom(),
                    floor_index=floor_index,
                    top_z=floor_top,
                )
            if floor_index - 1 < len(cores):
                self.frame = crane_lift(
                    cores[floor_index - 1],
                    self.frame,
                    duration=LIFT_DURATIONS["core"],
                    boom_deg=self.next_boom(),
                    floor_index=floor_index,
                    top_z=floor_top,
                )
            if floor_index - 1 < len(self.groups["frame_floors"]):
                self.frame = crane_lift(
                    self.groups["frame_floors"][floor_index - 1],
                    self.frame,
                    duration=LIFT_DURATIONS["steel"],
                    boom_deg=self.next_boom(),
                    floor_index=floor_index,
                    top_z=floor_top,
                )
            if floor_index - 1 < len(decks):
                self.frame = crane_lift(
                    decks[floor_index - 1],
                    self.frame,
                    duration=LIFT_DURATIONS["deck"],
                    boom_deg=self.next_boom(),
                    floor_index=floor_index,
                    top_z=floor_top,
                )
            if floor_index - 1 < len(slabs):
                self.frame = crane_lift(
                    slabs[floor_index - 1],
                    self.frame,
                    duration=LIFT_DURATIONS["slab"],
                    boom_deg=self.next_boom(),
                    floor_index=floor_index,
                    top_z=floor_top,
                )

        self.mark("P11_FrameDone")

        # Envelope after the RC frame — walls first, glass after, never same beat.
        self.mark("P11_Walls")
        crown_z = site.floor_ring_z(max(1, floor_count))
        self.raise_crane(crown_z)
        for floor_index in range(1, floor_count + 1):
            if floor_index - 1 < len(curtains):
                for panel in curtains[floor_index - 1]:
                    self.frame = crane_lift(
                        panel,
                        self.frame,
                        duration=LIFT_DURATIONS["panel"],
                        boom_deg=self.next_boom(),
                        floor_index=floor_index,
                        top_z=crown_z,
                    )

        self.mark("P11_Windows")
        for floor_index in range(1, floor_count + 1):
            window_pieces = windows[floor_index - 1] if floor_index - 1 < len(windows) else []
            for window in window_pieces:
                pop_in(window, self.frame)
            if window_pieces:
                self.advance(8)

        self.mark("P11_EnvelopeDone")

        # Phase 12 — roof
        self.mark("P12_Roof")
        roof_top = pad_z + site.HEIGHT + 0.32
        self.raise_crane(roof_top)
        for obj in self.groups["roof"]:
            self.frame = crane_lift(
                obj,
                self.frame,
                duration=LIFT_DURATIONS["roof"],
                boom_deg=self.next_boom(),
                floor_index=max(1, floor_count),
                top_z=roof_top,
            )

        # Phase 13 — MEP / roof systems
        self.mark("P13_Systems")
        for obj in self.groups["systems"]:
            self.frame = crane_lift(
                obj,
                self.frame,
                duration=LIFT_DURATIONS["light"],
                boom_deg=self.next_boom(),
                floor_index=max(1, floor_count),
                top_z=roof_top,
            )

        crane_leave = self.frame
        crane = bpy.data.objects.get("ST_Crane")
        if crane is not None:
            crane.location = crane_xy
            crane.keyframe_insert("location", frame=crane_leave)
            crane.location = (crane_xy[0] + 5.4, crane_xy[1] + 5.0, pad_z)
            crane.keyframe_insert("location", frame=crane_leave + 22)
            key_crane_mast(crane_leave + 22, roof_top, pad_z)

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

    # Spawn pose is tiny scale (crane_lift / pop_in / pour_spread), not hide_viewport.

    payload = bpy.data.objects.get("ST_CranePayload")
    if payload is not None:
        payload.scale = (0.04, 0.04, 0.04)
        payload.keyframe_insert("scale", frame=1)

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
    scripts_dir = os.path.dirname(os.path.abspath(__file__))
    for path in (scripts_dir, root):
        if path not in sys.path:
            sys.path.insert(0, path)

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
