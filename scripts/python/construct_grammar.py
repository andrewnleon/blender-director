"""Shared construction-clip grammar for staged buildings.

Timing only. Blender I/O lives in construction_crane.py / export scripts.
"""
from __future__ import annotations

FPS = 24
GROW_START_SCALE = 0.04
SNAP_FRAMES = 2
DROP_HOLD = 6
BOLT_HOLD = 4
LIFT_DURATION = 16
FOUNDATION_LIFT = 18
MAST_RAISE_FRAMES = 8
CRANE_APPEAR = 1
FOUNDATION_START = 12
CRANE_COLLAPSE_SPAN = 16
STORY_M = 3.0
MIN_FLOORS = 2
MAX_FLOORS = 8
JIB_CLEARANCE = 2.4
HOOK_ABOVE = 0.35

BOOM_ANGLES = (-158, -176, -108, -172, -128, -110, -168, -136, -112, -174, -150, -132)


def floor_count_for_height(height: float) -> int:
    """How many height slices a pack mesh gets. Short hulls stay 1."""
    if height < 1.2:
        return 1
    stories = int(round(height / STORY_M))
    return max(MIN_FLOORS, min(MAX_FLOORS, stories))


def frames_per_slice() -> int:
    return LIFT_DURATION + BOLT_HOLD + DROP_HOLD + MAST_RAISE_FRAMES


def construct_clip_end(part_count: int) -> int:
    """Inclusive scene end — last collapse key sits here."""
    count = max(1, part_count)
    return FOUNDATION_START + count * frames_per_slice() + CRANE_COLLAPSE_SPAN


def boom_angle_for_index(index: int) -> float:
    return float(BOOM_ANGLES[index % len(BOOM_ANGLES)])


def lift_duration_for_index(index: int) -> int:
    if index == 0:
        return FOUNDATION_LIFT
    return LIFT_DURATION


def crane_site_xyz(
    width: float,
    depth: float,
    pad_z: float = 0.0,
) -> tuple[float, float, float]:
    """Park crane at the +X/+Y pad corner, still on a 10 m lot."""
    site_x = min(4.6, width * 0.5 + 0.8)
    site_y = min(4.6, depth * 0.5 + 0.8)
    return (site_x, site_y, pad_z)


def crane_boom_len(site_xyz: tuple[float, float, float]) -> float:
    reach = (site_xyz[0] ** 2 + site_xyz[1] ** 2) ** 0.5
    return min(9.0, max(5.2, reach + 0.6))


if __name__ == "__main__":
    assert floor_count_for_height(0.8) == 1
    assert floor_count_for_height(6.0) == 2
    assert floor_count_for_height(18.0) == 6
    assert floor_count_for_height(40.0) == MAX_FLOORS
    assert construct_clip_end(1) > FOUNDATION_START
    assert construct_clip_end(6) > construct_clip_end(3)
    print("construct_grammar ok")
