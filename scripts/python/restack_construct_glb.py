"""Rewrite skyscraper.glb so the clip reads as an RC frame stack.

Hidden Blender objects bake to origin in glTF. This patch does not need Blender:
it keeps rest height from the last key and C&C-grows members in place
(footings → columns/beams → slab → next floor). No sky drop.

Also shrinks curtain/window/deck scale during the frame stack so the hero is
columns + beams + colored slabs, not a glass pile at the origin.
"""
from __future__ import annotations

import array
import json
import os
import struct
import sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
GLB_PATH = os.path.join(ROOT, "public", "models", "skyscraper.glb")

GROW_DUR = 0.55
GROW_START_SCALE = 0.04
FOUNDATION_END = 4.2
FOOTINGS_END = 5.2
STACK_T0 = 6.0
FLOOR_SPAN = 2.55
WALL_GAP = 0.35
WALL_SPAN = 0.50
WINDOW_GAP = 0.25
WINDOW_SPAN = 0.35
FLOOR_COUNT = 12

JSON_CHUNK = 0x4E4F534A
BIN_CHUNK = 0x004E4942

WALL_ROLES = {"panel", "rib"}
WINDOW_ROLES = {"window"}
SKIN_ROLES = WALL_ROLES | WINDOW_ROLES
STRUCTURAL_ROLES = {"foundation", "footing", "column", "core", "frame", "deck", "slab", "roof"}
ROLE_OFFSET = {
    "column": 0.00,
    "core": 0.20,
    "frame": 0.60,
    "deck": 0.90,
    "slab": 1.30,
}


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
    if name.startswith("ST_Windows_F") or name.startswith("ST_N_Windows_F"):
        return "window"
    if name in {"ST_Roof", "ST_Parapet"}:
        return "roof"
    if name.startswith("ST_HVAC") or name.startswith("ST_Vent") or name == "ST_Antenna":
        return "roof"
    return None


def last_slab_end() -> float:
    return STACK_T0 + (FLOOR_COUNT - 1) * FLOOR_SPAN + ROLE_OFFSET["slab"]


def last_wall_end() -> float:
    return last_slab_end() + WALL_GAP + FLOOR_COUNT * WALL_SPAN


def last_window_end() -> float:
    return last_wall_end() + WINDOW_GAP + FLOOR_COUNT * WINDOW_SPAN


def desired_drop_end(floor: int, role: str) -> float:
    if role == "foundation":
        return FOUNDATION_END
    if role == "footing":
        return FOOTINGS_END
    if role == "roof":
        return last_window_end() + 1.4
    if role in WALL_ROLES:
        return last_slab_end() + WALL_GAP + max(1, floor) * WALL_SPAN
    if role in WINDOW_ROLES:
        return last_wall_end() + WINDOW_GAP + max(1, floor) * WINDOW_SPAN
    story = max(1, floor)
    return STACK_T0 + (story - 1) * FLOOR_SPAN + ROLE_OFFSET[role]


def remap_times(times: list[float], desired_end: float) -> list[float]:
    old_end = times[-1] if times else 0.0
    if old_end <= 0:
        return list(times)
    scale = desired_end / old_end
    return [time * scale for time in times]


# glTF Y-up: Blender SITE_CRANE (5.8, 5.0, 0.32). Stay parked; mast lowers.
CRANE_PAD = (5.8, 0.32, -5.0)
LOWER_SPAN = 2.2


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


def crane_time_anchors(
    old_times: list[float], rises: list[tuple[float, float, float]]
) -> list[tuple[float, float]]:
    """Hold short mast until floor 1, then one grow per restacked floor."""
    roof_t = last_window_end() + 1.4
    lower_t = roof_t + LOWER_SPAN
    if not old_times:
        return [(0.0, 0.0)]
    anchors: list[tuple[float, float]] = [(old_times[0], 0.0)]
    if not rises:
        anchors.append((old_times[-1], lower_t))
        return anchors
    anchors.append((rises[0][0], STACK_T0))
    for index, (_start, end, _height) in enumerate(rises):
        if index < FLOOR_COUNT - 1:
            anchors.append((end, STACK_T0 + (index + 1) * FLOOR_SPAN))
        else:
            anchors.append((end, roof_t))
    if anchors[-1][0] < old_times[-1]:
        anchors.append((old_times[-1], lower_t))
    return anchors


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


def stacked_sample_y(time: float, rest_y: float, drop_start: float, drop_dur: float, gap: float) -> float:
    """Keep the seated height. Sky-drop was the spawn bug (frames already in)."""
    del time, drop_start, drop_dur, gap
    return rest_y


def grow_scale(time: float, rest: float, reveal_at: float, duration: float = GROW_DUR) -> float:
    if time < reveal_at:
        return GROW_START_SCALE * rest
    if duration <= 0:
        return rest
    ease = min(1.0, max(0.0, (time - reveal_at) / duration))
    ease = ease * ease * (3.0 - 2.0 * ease)
    start = GROW_START_SCALE * rest
    return start + (rest - start) * ease


def skin_scale(time: float, rest: float, reveal_at: float) -> float:
    if time < reveal_at:
        return 0.001
    ease = min(1.0, max(0.0, (time - reveal_at) / 0.8))
    ease = ease * ease * (3.0 - 2.0 * ease)
    return 0.001 + (rest - 0.001) * ease


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

    # Warp crane mast steps onto the same clock as each restacked floor.
    tower_times: list[float] = []
    tower_heights: list[float] = []
    for animation in gltf.get("animations", []):
        for channel in animation.get("channels", []):
            node = nodes[channel["target"]["node"]]
            if node.get("name") != "ST_CraneTower" or channel["target"]["path"] != "scale":
                continue
            sampler = animation["samplers"][channel["sampler"]]
            times, _, _ = _accessor_floats(gltf, blob, sampler["input"])
            values, _, components = _accessor_floats(gltf, blob, sampler["output"])
            if components != 3:
                continue
            tower_times = list(times)
            tower_heights = [values[index * 3 + 1] for index in range(len(times))]
    rises = height_rises(tower_times, tower_heights)
    if len(rises) < 6 and tower_times and tower_heights:
        max_h = max(tower_heights)
        base_h = tower_heights[0]
        climb_start = tower_times[0]
        climb_end = tower_times[-1]
        started = False
        for time, height in zip(tower_times, tower_heights):
            if not started and height > base_h + 0.04:
                climb_start = time
                started = True
            if height >= max_h - 0.04:
                climb_end = time
        fake: list[tuple[float, float, float]] = []
        for index in range(FLOOR_COUNT - 1):
            mix_a = index / max(1, FLOOR_COUNT - 1)
            mix_b = (index + 1) / max(1, FLOOR_COUNT - 1)
            start = climb_start + mix_a * (climb_end - climb_start)
            end = climb_start + mix_b * (climb_end - climb_start)
            fake.append((start, end, base_h + mix_b * (max_h - base_h)))
        rises = fake
    anchors = crane_time_anchors(tower_times, rises)
    drop_ends["ST_CranePlateaus"] = float(len(rises))

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
            if anchors:
                for index in range(len(times)):
                    times[index] = warp_time(float(times[index]), anchors)
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
    anchors = crane_time_anchors(old, rises)
    assert warp_time(0.0, anchors) == 0.0
    assert abs(warp_time(rises[0][0], anchors) - STACK_T0) < 0.05
    assert abs(warp_time(rises[0][1], anchors) - (STACK_T0 + FLOOR_SPAN)) < 0.05
    assert abs(warp_time(rises[10][1], anchors) - (STACK_T0 + 11 * FLOOR_SPAN)) < 0.05
    assert abs(warp_time(old[-1], anchors) - (last_window_end() + 1.4 + LOWER_SPAN)) < 0.05
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
