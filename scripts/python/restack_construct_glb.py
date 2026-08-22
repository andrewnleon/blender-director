"""Rewrite skyscraper.glb so the clip reads as an RC frame stack.

Hidden Blender objects bake to origin in glTF. This patch does not need Blender:
it keeps rest height from the last key and Lego-snaps members in place
(footings → columns/beams → slab → next floor). No sky drop.

Timing + crane plateaus come from construction_schedule.py (single source of truth).
"""
from __future__ import annotations

import array
import json
import os
import struct
import sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
SCRIPTS = os.path.dirname(os.path.abspath(__file__))
if SCRIPTS not in sys.path:
    sys.path.insert(0, SCRIPTS)

import construction_schedule as sched

GLB_PATH = os.path.join(ROOT, "public", "models", "skyscraper.glb")

GROW_DUR = sched.GROW_DUR
GROW_START_SCALE = 0.04
FOUNDATION_END = sched.FOUNDATION_END
FOOTINGS_END = sched.FOOTINGS_END
STACK_T0 = sched.STACK_T0
CRANE_LIFT_T0 = sched.CRANE_LIFT_T0
FLOOR_SPAN = sched.FLOOR_SPAN
WALL_GAP = sched.WALL_GAP
WALL_SPAN = sched.WALL_SPAN
WINDOW_GAP = sched.WINDOW_GAP
WINDOW_SPAN = sched.WINDOW_SPAN
FLOOR_COUNT = sched.FLOORS
LOWER_SPAN = sched.LOWER_SPAN
MAST_GROW = sched.MAST_GROW

JSON_CHUNK = 0x4E4F534A
BIN_CHUNK = 0x004E4942

WALL_ROLES = sched.WALL_ROLES
WINDOW_ROLES = sched.WINDOW_ROLES
SKIN_ROLES = sched.SKIN_ROLES
STRUCTURAL_ROLES = sched.STRUCTURAL_ROLES
ROLE_OFFSET = sched.ROLE_OFFSET


def parse_floor_index(name: str) -> int | None:
    found: int | None = None
    for token in name.split("_"):
        if token.isdigit():
            found = int(token)
        elif token.startswith("F") and token[1:].isdigit():
            found = int(token[1:])
    return found


def stack_role(name: str) -> str | None:
    if name == "ST_Foundation":
        return "foundation"
    if name == "ST_Footings":
        return "footing"
    if name.startswith("ST_Columns_"):
        return "column"
    if name.startswith("ST_CoreLift_"):
        return "core"
    if name.startswith("ST_FrameFloor_"):
        return "frame"
    if name.startswith("ST_Deck_"):
        return "deck"
    if name.startswith("ST_FloorSlab_"):
        return "slab"
    if name.startswith("ST_CWPanel_"):
        return "panel"
    if name.startswith("ST_RibBand_"):
        return "rib"
    if "Windows_F" in name:
        return "window"
    if name in {"ST_Roof", "ST_Parapet"}:
        return "roof"
    if name.startswith("ST_HVAC") or name.startswith("ST_Vent") or name.startswith("ST_Sat") or name.startswith("ST_Antenna"):
        return "roof"
    return None


def last_slab_end() -> float:
    return sched.last_slab_end()


def last_wall_end() -> float:
    return sched.last_wall_end()


def last_window_end() -> float:
    return sched.last_window_end()


def desired_drop_end(floor: int, role: str) -> float:
    return sched.role_complete_at(floor, role)


def remap_times(times: list[float], desired_end: float) -> list[float]:
    old_end = times[-1] if times else 0.0
    if old_end <= 0:
        return list(times)
    scale = desired_end / old_end
    return [time * scale for time in times]


# glTF Y-up: Blender SITE_CRANE (7.2, 7.0, 0.32). Stay parked; mast lowers.
CRANE_PAD = (7.2, 0.32, -7.0)


def height_rises(
    times: list[float], heights: list[float], jump: float = 0.05
) -> list[tuple[float, float, float]]:
    """(start, end, height) for each mast grow."""
    if not times or not heights:
        return []
    rises: list[tuple[float, float, float]] = []
    peak = heights[0]
    start: float | None = None
    for time, height in zip(times, heights):
        if start is None and height > peak + 0.02:
            start = time
            peak = height
        elif start is not None:
            if height > peak + 0.01:
                peak = height
            elif height >= peak - 0.02:
                if peak - (rises[-1][2] if rises else heights[0]) > jump:
                    rises.append((start, time, peak))
                start = None
    return rises


def first_value_change(
    times: list[float], values: array.array, components: int, epsilon: float = 1e-4
) -> float | None:
    if not times:
        return None
    first = values[:components]
    for index in range(1, len(times)):
        chunk = values[index * components : (index + 1) * components]
        if any(abs(left - right) > epsilon for left, right in zip(first, chunk)):
            return float(times[index])
    return None


def crane_time_anchors(
    old_times: list[float],
    rises: list[tuple[float, float, float]],
    first_motion: float | None = None,
) -> list[tuple[float, float]]:
    """Map crane motion onto floor-beat plateaus from BUILD_SCHEDULE."""
    roof_t = sched.crane_plateau_for_rise(FLOOR_COUNT)
    lower_t = sched.crane_lower_end()
    if not old_times:
        return [(0.0, 0.0)]
    anchors: list[tuple[float, float]] = [(old_times[0], 0.0)]
    if first_motion is not None:
        anchors.append((first_motion, CRANE_LIFT_T0))
    if not rises:
        anchors.append((old_times[-1], lower_t))
        return _dedupe_time_anchors(anchors)
    for index, (start, end, _height) in enumerate(rises):
        grow_start = sched.crane_raise_start_for_rise(index)
        plateau = sched.crane_plateau_for_rise(index)
        anchors.append((start, grow_start))
        if index < len(rises) - 1:
            anchors.append((end, plateau))
        else:
            anchors.append((end, roof_t))
    if anchors[-1][0] < old_times[-1]:
        anchors.append((old_times[-1], lower_t))
    return _dedupe_time_anchors(anchors)


def _dedupe_time_anchors(anchors: list[tuple[float, float]]) -> list[tuple[float, float]]:
    ordered = sorted(anchors, key=lambda pair: pair[0])
    deduped: list[tuple[float, float]] = []
    for old_t, new_t in ordered:
        if not deduped:
            deduped.append((old_t, new_t))
            continue
        prev_old, prev_new = deduped[-1]
        if old_t <= prev_old + 1e-6:
            deduped[-1] = (prev_old, new_t)
            continue
        deduped.append((old_t, new_t))
    return deduped


def warp_time(old_t: float, anchors: list[tuple[float, float]]) -> float:
    if not anchors:
        return old_t
    if old_t <= anchors[0][0]:
        return anchors[0][1]
    if old_t >= anchors[-1][0]:
        return anchors[-1][1]
    for index in range(len(anchors) - 1):
        time_a, new_a = anchors[index]
        time_b, new_b = anchors[index + 1]
        if time_a <= old_t <= time_b:
            span = time_b - time_a
            mix = 0.0 if span <= 0 else (old_t - time_a) / span
            return new_a + mix * (new_b - new_a)
    return anchors[-1][1]


def remap_crane_time(
    old_t: float,
    *,
    first_motion: float | None,
    old_end: float,
) -> float:
    """Uniform crane clock — fallback when mast rises cannot be read from the GLB."""
    lower_t = sched.crane_lower_end()
    if old_end <= 0:
        return 0.0
    if first_motion is not None and first_motion > 0 and old_t <= first_motion:
        return CRANE_LIFT_T0 * (old_t / first_motion)
    old_lo = first_motion if first_motion is not None else 0.0
    if old_end <= old_lo:
        return CRANE_LIFT_T0
    mix = (old_t - old_lo) / (old_end - old_lo)
    return CRANE_LIFT_T0 + mix * (lower_t - CRANE_LIFT_T0)


def extract_tower_rises(
    gltf: dict, blob: bytearray, nodes: list
) -> tuple[list[float], list[tuple[float, float, float]]]:
    """Mast grow segments from ST_CraneTower scale (glTF Y-up height axis)."""
    for animation in gltf.get("animations", []):
        for channel in animation.get("channels", []):
            node = nodes[channel["target"]["node"]]
            if node.get("name") != "ST_CraneTower":
                continue
            if channel["target"]["path"] != "scale":
                continue
            sampler = animation["samplers"][channel["sampler"]]
            times, _, components = _accessor_floats(gltf, blob, sampler["input"])
            values, _, components = _accessor_floats(gltf, blob, sampler["output"])
            if components < 2 or not times:
                return [], []
            height_axis = 1
            time_list = [float(times[index]) for index in range(len(times))]
            heights = [
                float(values[index * components + height_axis]) for index in range(len(times))
            ]
            return time_list, height_rises(time_list, heights)
    return [], []


def stacked_sample_y(time: float, rest_y: float, drop_start: float, drop_dur: float, gap: float) -> float:
    """Keep the seated height. Sky-drop was the spawn bug (frames already in)."""
    del time, drop_start, drop_dur, gap
    return rest_y


def grow_scale(time: float, rest: float, reveal_at: float, duration: float = GROW_DUR) -> float:
    """Lego step — hidden until reveal, then full size (no smooth grow)."""
    if time < reveal_at:
        return GROW_START_SCALE * rest
    if duration <= 0 or time >= reveal_at + duration:
        return rest
    return rest


def skin_scale(time: float, rest: float, reveal_at: float) -> float:
    """Curtain/window snap-in."""
    if time < reveal_at:
        return 0.001
    if time >= reveal_at + GROW_DUR:
        return rest
    return rest


def _read_glb(path: str) -> tuple[dict, bytearray]:
    with open(path, "rb") as handle:
        magic, _version, _length = struct.unpack("<4sII", handle.read(12))
        if magic != b"glTF":
            raise ValueError(f"{path} is not a GLB")
        json_len, json_type = struct.unpack("<II", handle.read(8))
        if json_type != JSON_CHUNK:
            raise ValueError("missing JSON chunk")
        gltf = json.loads(handle.read(json_len).decode("utf-8"))
        bin_len, bin_type = struct.unpack("<II", handle.read(8))
        if bin_type != BIN_CHUNK:
            raise ValueError("missing BIN chunk")
        blob = bytearray(handle.read(bin_len))
    return gltf, blob


def _write_glb(path: str, gltf: dict, blob: bytes) -> None:
    json_bytes = json.dumps(gltf, separators=(",", ":")).encode("utf-8")
    while len(json_bytes) % 4:
        json_bytes += b" "
    bin_bytes = bytes(blob)
    while len(bin_bytes) % 4:
        bin_bytes += b"\x00"
    total = 12 + 8 + len(json_bytes) + 8 + len(bin_bytes)
    with open(path, "wb") as handle:
        handle.write(struct.pack("<4sII", b"glTF", 2, total))
        handle.write(struct.pack("<II", len(json_bytes), JSON_CHUNK))
        handle.write(json_bytes)
        handle.write(struct.pack("<II", len(bin_bytes), BIN_CHUNK))
        handle.write(bin_bytes)


def _accessor_floats(gltf: dict, blob: bytearray, accessor_index: int) -> tuple[array.array, int, int]:
    accessor = gltf["accessors"][accessor_index]
    if accessor["componentType"] != 5126:
        raise ValueError("expected float32 accessor")
    view = gltf["bufferViews"][accessor["bufferView"]]
    offset = (view.get("byteOffset") or 0) + (accessor.get("byteOffset") or 0)
    count = accessor["count"]
    components = {"SCALAR": 1, "VEC2": 2, "VEC3": 3, "VEC4": 4}[accessor["type"]]
    floats = array.array("f")
    floats.frombytes(blob[offset : offset + count * components * 4])
    return floats, offset, components


def _write_accessor_minmax(gltf: dict, accessor_index: int, values: array.array, components: int) -> None:
    accessor = gltf["accessors"][accessor_index]
    if components == 1:
        accessor["min"] = [float(min(values))]
        accessor["max"] = [float(max(values))]
        return
    mins = []
    maxs = []
    for axis in range(components):
        lane = values[axis::components]
        mins.append(float(min(lane)))
        maxs.append(float(max(lane)))
    accessor["min"] = mins
    accessor["max"] = maxs


def restack_glb(path: str = GLB_PATH) -> dict[str, float]:
    gltf, blob = _read_glb(path)
    nodes = gltf["nodes"]
    patched = 0
    drop_ends: dict[str, float] = {}
    # Curtain clips share time accessors with slabs. Never rewrite those
    # accessors for skin — last write would make upper slabs seat first.

    for animation in gltf.get("animations", []):
        for channel in animation.get("channels", []):
            if channel["target"]["path"] != "translation":
                continue
            node = nodes[channel["target"]["node"]]
            name = node.get("name") or ""
            role = stack_role(name)
            if role not in STRUCTURAL_ROLES:
                continue
            floor = parse_floor_index(name)
            if floor is None:
                floor = FLOOR_COUNT if role == "roof" else 0
            sampler = animation["samplers"][channel["sampler"]]
            times, time_offset, _ = _accessor_floats(gltf, blob, sampler["input"])
            values, value_offset, components = _accessor_floats(gltf, blob, sampler["output"])
            if components != 3:
                continue
            desired_end = desired_drop_end(floor, role)
            new_times = remap_times(list(times), desired_end)
            rest_y = values[(len(times) - 1) * 3 + 1]
            for index, time in enumerate(new_times):
                times[index] = time
                values[index * 3 + 1] = stacked_sample_y(
                    time, rest_y, 0.0, GROW_DUR, 0.0
                )
            blob[time_offset : time_offset + len(times) * 4] = times.tobytes()
            blob[value_offset : value_offset + len(values) * 4] = values.tobytes()
            _write_accessor_minmax(gltf, sampler["input"], times, 1)
            _write_accessor_minmax(gltf, sampler["output"], values, components)
            patched += 1
            drop_ends[name] = desired_end

    # Walls/windows stay on the long Blender clock unless remapped.
    # Their time accessors are per-node (or N/S window pairs), never shared with slabs.
    remapped_skin: set[int] = set()
    for animation in gltf.get("animations", []):
        for channel in animation.get("channels", []):
            node = nodes[channel["target"]["node"]]
            name = node.get("name") or ""
            role = stack_role(name)
            if role not in SKIN_ROLES:
                continue
            sampler = animation["samplers"][channel["sampler"]]
            input_index = sampler["input"]
            if input_index in remapped_skin:
                continue
            times, time_offset, _ = _accessor_floats(gltf, blob, input_index)
            if not times:
                continue
            floor = parse_floor_index(name) or 1
            desired_end = desired_drop_end(floor, role)
            new_times = remap_times(list(times), desired_end)
            for index, time in enumerate(new_times):
                times[index] = time
            blob[time_offset : time_offset + len(times) * 4] = times.tobytes()
            _write_accessor_minmax(gltf, input_index, times, 1)
            remapped_skin.add(input_index)
            patched += 1
            drop_ends[name] = desired_end

    # Uniform linear clock for all crane channels (mast, hook, boom).
    first_motion: float | None = None
    crane_old_end = 0.0
    for animation in gltf.get("animations", []):
        for channel in animation.get("channels", []):
            node = nodes[channel["target"]["node"]]
            name = node.get("name") or ""
            if name not in {"ST_CraneHook", "ST_CranePayload"}:
                continue
            sampler = animation["samplers"][channel["sampler"]]
            times, _, _ = _accessor_floats(gltf, blob, sampler["input"])
            values, _, components = _accessor_floats(gltf, blob, sampler["output"])
            changed = first_value_change(list(times), values, components)
            if changed is None:
                continue
            if first_motion is None or changed < first_motion:
                first_motion = changed
            crane_old_end = max(crane_old_end, float(times[-1]))
    for animation in gltf.get("animations", []):
        for channel in animation.get("channels", []):
            node = nodes[channel["target"]["node"]]
            name = node.get("name") or ""
            if not name.startswith("ST_Crane"):
                continue
            sampler = animation["samplers"][channel["sampler"]]
            times, _, _ = _accessor_floats(gltf, blob, sampler["input"])
            if times:
                crane_old_end = max(crane_old_end, float(times[-1]))
    drop_ends["ST_CraneFirstMotion"] = float(first_motion or 0.0)
    drop_ends["ST_CraneOldEnd"] = crane_old_end

    tower_times, tower_rises = extract_tower_rises(gltf, blob, nodes)
    drop_ends["ST_CraneRises"] = float(len(tower_rises))
    anchor_times = tower_times if tower_times else [0.0, crane_old_end]
    crane_anchors = crane_time_anchors(anchor_times, tower_rises, first_motion)

    def remap_crane_channel(old_t: float) -> float:
        if tower_rises:
            return warp_time(old_t, crane_anchors)
        return remap_crane_time(
            old_t,
            first_motion=first_motion,
            old_end=crane_old_end,
        )

    remapped_inputs: set[int] = set()
    for animation in gltf.get("animations", []):
        for channel in animation.get("channels", []):
            node = nodes[channel["target"]["node"]]
            name = node.get("name") or ""
            if not name.startswith("ST_Crane"):
                continue
            sampler = animation["samplers"][channel["sampler"]]
            input_index = sampler["input"]
            if input_index in remapped_inputs:
                continue
            times, time_offset, _ = _accessor_floats(gltf, blob, input_index)
            if not times:
                continue
            for index in range(len(times)):
                times[index] = remap_crane_channel(float(times[index]))
            blob[time_offset : time_offset + len(times) * 4] = times.tobytes()
            _write_accessor_minmax(gltf, input_index, times, 1)
            remapped_inputs.add(input_index)
            patched += 1
            drop_ends[name] = float(times[-1])

    for node in nodes:
        if node.get("name") == "ST_Crane":
            node["translation"] = list(CRANE_PAD)

    for animation in gltf.get("animations", []):
        for channel in animation.get("channels", []):
            node = nodes[channel["target"]["node"]]
            if node.get("name") != "ST_Crane" or channel["target"]["path"] != "translation":
                continue
            sampler = animation["samplers"][channel["sampler"]]
            values, value_offset, components = _accessor_floats(gltf, blob, sampler["output"])
            if components != 3:
                continue
            count = len(values) // 3
            for index in range(count):
                values[index * 3] = CRANE_PAD[0]
                values[index * 3 + 1] = CRANE_PAD[1]
                values[index * 3 + 2] = CRANE_PAD[2]
            blob[value_offset : value_offset + len(values) * 4] = values.tobytes()
            _write_accessor_minmax(gltf, sampler["output"], values, components)

    for node in nodes:
        role = stack_role(node.get("name") or "")
        if role in SKIN_ROLES or role in STRUCTURAL_ROLES:
            node["scale"] = [GROW_START_SCALE, GROW_START_SCALE, GROW_START_SCALE]

    _write_glb(path, gltf, blob)
    return {"patched": float(patched), **{f"drop:{name}": end for name, end in drop_ends.items()}}


def inspect_glb(path: str = GLB_PATH) -> dict[str, float]:
    gltf, blob = _read_glb(path)
    nodes = gltf["nodes"]
    seats: dict[str, tuple[float, float]] = {}

    for animation in gltf.get("animations", []):
        for channel in animation.get("channels", []):
            if channel["target"]["path"] != "translation":
                continue
            name = nodes[channel["target"]["node"]].get("name") or ""
            role = stack_role(name)
            if role not in STRUCTURAL_ROLES:
                continue
            sampler = animation["samplers"][channel["sampler"]]
            times, _, _ = _accessor_floats(gltf, blob, sampler["input"])
            values, _, components = _accessor_floats(gltf, blob, sampler["output"])
            if components != 3:
                continue
            seats[name] = (float(times[-1]), float(values[-2]))

    errors: list[str] = []
    for floor in range(1, FLOOR_COUNT + 1):
        frame_key = f"ST_FrameFloor_{floor}"
        slab_key = f"ST_FloorSlab_{floor}"
        if frame_key not in seats or slab_key not in seats:
            errors.append(f"missing {frame_key} or {slab_key}")
            continue
        frame_t, frame_y = seats[frame_key]
        slab_t, slab_y = seats[slab_key]
        if floor > 1:
            prev_slab_t, _prev_y = seats[f"ST_FloorSlab_{floor - 1}"]
            if frame_t <= prev_slab_t:
                errors.append(f"floor {floor} frame {frame_t:.2f} <= prev slab {prev_slab_t:.2f}")
        if slab_t <= frame_t:
            errors.append(f"floor {floor} slab {slab_t:.2f} <= frame {frame_t:.2f}")
        if floor > 1 and abs(frame_y) < 0.2:
            errors.append(f"floor {floor} frame seated near Y=0 ({frame_y:.3f})")
        if slab_y <= frame_y:
            errors.append(f"floor {floor} slab Y {slab_y:.3f} not above frame {frame_y:.3f}")

    if errors:
        raise AssertionError("RC stack check failed:\n  " + "\n  ".join(errors))
    return {name: time for name, (time, _y) in seats.items()}


def _self_check() -> None:
    assert parse_floor_index("ST_FrameFloor_12") == 12
    assert parse_floor_index("ST_FloorSlab_10") == 10
    assert parse_floor_index("ST_Windows_F3") == 3
    assert parse_floor_index("ST_E_Windows_F12") == 12
    assert stack_role("ST_W_Windows_F4") == "window"
    assert stack_role("ST_Sat_0") == "roof"
    assert stack_role("ST_AntennaCollar") == "roof"
    assert parse_floor_index("ST_CWPanel_12_S") == 12
    assert stack_role("ST_Columns_2") == "column"
    assert stack_role("ST_FloorSlab_2") == "slab"
    y0 = stacked_sample_y(0.0, 4.0, 10.0, 0.5, 2.6)
    y_mid = stacked_sample_y(10.25, 4.0, 10.0, 0.5, 2.6)
    y_end = stacked_sample_y(11.0, 4.0, 10.0, 0.5, 2.6)
    assert abs(y0 - 4.0) < 1e-6, y0
    assert abs(y_mid - 4.0) < 1e-6, y_mid
    assert abs(y_end - 4.0) < 1e-6, y_end
    assert grow_scale(0.0, 1.0, 10.0) < 0.05
    assert abs(grow_scale(12.0, 1.0, 10.0) - 1.0) < 1e-6
    frames = [desired_drop_end(floor, "frame") for floor in range(1, 13)]
    slabs = [desired_drop_end(floor, "slab") for floor in range(1, 13)]
    assert frames == sorted(frames)
    assert slabs == sorted(slabs)
    for floor in range(1, 13):
        assert desired_drop_end(floor, "frame") < desired_drop_end(floor, "slab")
        if floor > 1:
            assert desired_drop_end(floor - 1, "slab") < desired_drop_end(floor, "frame")
    assert desired_drop_end(0, "footing") < desired_drop_end(1, "frame")
    assert desired_drop_end(12, "slab") < desired_drop_end(1, "panel")
    assert desired_drop_end(1, "panel") - desired_drop_end(12, "slab") < 1.0
    assert desired_drop_end(12, "panel") < desired_drop_end(1, "window")
    assert desired_drop_end(12, "window") < desired_drop_end(12, "roof")
    assert desired_drop_end(12, "slab") < desired_drop_end(12, "roof")
    rises = [(8.0 + index * 8.0, 10.0 + index * 8.0, 1.0 + (index + 1) * 0.2) for index in range(12)]
    old = [0.0, 5.0] + [end for _s, end, _h in rises] + [120.0]
    anchors = crane_time_anchors(old, rises, first_motion=4.0)
    assert warp_time(0.0, anchors) == 0.0
    assert abs(warp_time(4.0, anchors) - CRANE_LIFT_T0) < 0.05
    floor1_done = sched.mast_grow_end_for_rise(0)
    assert abs(warp_time(rises[0][1], anchors) - floor1_done) < 0.05
    assert abs(sched.mast_grow_end_for_rise(0) - sched.mast_grow_start_for_rise(0) - MAST_GROW) < 0.01
    assert abs(remap_crane_time(0.0, first_motion=4.0, old_end=120.0) - 0.0) < 1e-6
    assert abs(remap_crane_time(4.0, first_motion=4.0, old_end=120.0) - CRANE_LIFT_T0) < 0.05
    assert abs(remap_crane_time(120.0, first_motion=4.0, old_end=120.0) - sched.crane_lower_end()) < 0.05
    span_early = remap_crane_time(34.0, first_motion=4.0, old_end=120.0) - remap_crane_time(30.0, first_motion=4.0, old_end=120.0)
    span_late = remap_crane_time(94.0, first_motion=4.0, old_end=120.0) - remap_crane_time(90.0, first_motion=4.0, old_end=120.0)
    assert abs(span_early - span_late) < 0.02
    floor2_done = sched.mast_grow_end_for_rise(1)
    assert abs(warp_time(rises[1][1], anchors) - floor2_done) < 0.05
    floor5_done = sched.mast_grow_end_for_rise(4)
    assert abs(warp_time(rises[4][1], anchors) - floor5_done) < 0.05
    print("SELF_CHECK_OK")


if __name__ == "__main__":
    _self_check()
    if "--check" in sys.argv:
        if os.path.exists(GLB_PATH):
            inspect_glb()
            print("GLB_RC_STACK_OK")
        raise SystemExit(0)
    result = restack_glb()
    print("RESTACKED", int(result["patched"]), "clips")
    for floor in range(1, 13):
        frame_key = f"drop:ST_FrameFloor_{floor}"
        slab_key = f"drop:ST_FloorSlab_{floor}"
        if frame_key in result:
            print(f"  floor {floor:02d} frame t={result[frame_key]:.2f}s slab t={result.get(slab_key, 0):.2f}s")
    inspect_glb()
    print("GLB_RC_STACK_OK")
