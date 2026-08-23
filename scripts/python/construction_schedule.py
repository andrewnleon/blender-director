"""Single source of truth — floor beats tie structure reveal to crane height.

Customization knobs (edit here; export and restack scripts import this):

| Param | Role |
|-------|------|
| FLOORS, HEIGHT, PAD_Z | Tower geometry reference |
| FLOOR_SPAN | Restacked seconds per floor stack window |
| STACK_T0 | Restacked time when floor 1 column pour starts |
| FOUNDATION_END, FOOTINGS_END | Pre-stack foundation / footing beats |
| CRANE_LIFT_T0 | Restacked time when crane first lifts (foundation) |
| INTER_FLOOR_GAP | Slab complete → next column pour (mast grow window) |
| MAST_GROW | Same as INTER_FLOOR_GAP — one mast raise duration |
| MAST_GROW_FRACTION | MAST_GROW / FLOOR_SPAN — sync Blender + restack |
| ROLE_OFFSET | Stagger within a floor (column → frame → slab) |
| WALL_*, WINDOW_* | Envelope timing after frame stack |
| MAST_RAISE_FRAMES | Blender frames for one crane mast grow |
| JIB_CLEARANCE, HOOK_ABOVE | crane_pose_for_top offsets |

Each FloorBeat.complete_at is when that floor's slab is done. The next floor's
structure starts after that beat; crane mast targets crane_mast_z at the same beat.
"""
from __future__ import annotations

from dataclasses import dataclass

# --- Geometry reference ---
PAD_Z = 0.32
HEIGHT = 18.0
FLOORS = 12

# --- Restacked clip timing (seconds) ---
GROW_DUR = 0.08
FOUNDATION_END = 4.2
FOOTINGS_END = 5.2
STACK_T0 = 6.0
CRANE_LIFT_T0 = FOUNDATION_END - GROW_DUR
FLOOR_SPAN = 2.55
WALL_GAP = 0.35
WALL_SPAN = 0.50
WINDOW_GAP = 0.25
WINDOW_SPAN = 0.35
LOWER_SPAN = 2.2
ROOF_AFTER_ENVELOPE = 1.4

# --- Crane pose offsets (crane_pose_for_top) ---
JIB_CLEARANCE = 2.4
HOOK_ABOVE = 0.35
CRANE_TOWER_REST_H = 4.2
CRANE_TOWER_BASE_Z = 0.64  # CRANE_TRACK_H + CRANE_BASE_H

ROLE_OFFSET = {
    "column": 0.00,
    "core": 0.20,
    "frame": 0.60,
    "deck": 0.90,
    "slab": 1.30,
}

# --- Mast grow (Option C: fill inter-floor gap, slab done → next column) ---
INTER_FLOOR_GAP = FLOOR_SPAN - ROLE_OFFSET["slab"]
MAST_GROW = INTER_FLOOR_GAP
MAST_GROW_FRACTION = MAST_GROW / FLOOR_SPAN

# --- Blender animation (sync raise frames to restack grow fraction) ---
# Mirror construct lift chain: column, core, steel, deck, slab + overhead.
_BLENDER_LIFT_DURATIONS = (18, 16, 20, 16, 16)
_BLENDER_LIFT_OVERHEAD = 10  # BOLT_HOLD(4) + DROP_HOLD(6)
BLENDER_FLOOR_FRAMES = sum(d + _BLENDER_LIFT_OVERHEAD for d in _BLENDER_LIFT_DURATIONS)
MAST_RAISE_FRAMES = max(4, round(BLENDER_FLOOR_FRAMES * MAST_GROW_FRACTION))
FPS = 24

WALL_ROLES = frozenset({"panel", "rib"})
WINDOW_ROLES = frozenset({"window"})
SKIN_ROLES = WALL_ROLES | WINDOW_ROLES
STRUCTURAL_ROLES = frozenset(
    {"foundation", "footing", "column", "core", "frame", "deck", "slab", "roof"}
)


@dataclass(frozen=True)
class FloorBeat:
    """One construction beat — floor done → crane ready for next pour."""

    floor_index: int  # 0 = foundation pad, 1..N = numbered floors
    slab_z: float  # world Z of slab pour
    complete_at: float  # restacked seconds when floor slab is done
    crane_mast_z: float  # world Z target for mast top after this beat
    crane_hook_z: float  # hook local Z on jib after this beat


def floor_height() -> float:
    return HEIGHT / FLOORS


def floor_ring_z(floor: int) -> float:
    """World Z of the top of floor *floor* (ring / pour elevation)."""
    return PAD_Z + floor_height() * floor


def floor_slab_z(floor: int) -> float:
    return PAD_Z + floor_height() * floor - 0.08


def crane_hook_local_z(world_top_z: float) -> float:
    """Hook local Z so the hook sits just above world_top_z."""
    jib_z = max(3.2, world_top_z - PAD_Z + JIB_CLEARANCE)
    return world_top_z + HOOK_ABOVE - PAD_Z - jib_z


def role_complete_at(floor: int, role: str) -> float:
    """Restacked time when a member role finishes on *floor*."""
    if role == "foundation":
        return FOUNDATION_END
    if role == "footing":
        return FOOTINGS_END
    if role == "roof":
        return last_window_end() + ROOF_AFTER_ENVELOPE
    if role in WALL_ROLES:
        return last_slab_end() + WALL_GAP + max(1, floor) * WALL_SPAN
    if role in WINDOW_ROLES:
        return last_wall_end() + WINDOW_GAP + max(1, floor) * WINDOW_SPAN
    story = max(1, floor)
    return STACK_T0 + (story - 1) * FLOOR_SPAN + ROLE_OFFSET[role]


def last_slab_end() -> float:
    return role_complete_at(FLOORS, "slab")


def last_wall_end() -> float:
    return last_slab_end() + WALL_GAP + FLOORS * WALL_SPAN


def last_window_end() -> float:
    return last_wall_end() + WINDOW_GAP + FLOORS * WINDOW_SPAN


def build_schedule() -> list[FloorBeat]:
    """Derive BUILD_SCHEDULE from FLOORS, HEIGHT, FLOOR_SPAN."""
    beats: list[FloorBeat] = []

    pad_top = floor_ring_z(0)
    beats.append(
        FloorBeat(
            floor_index=0,
            slab_z=PAD_Z,
            complete_at=FOOTINGS_END,
            crane_mast_z=pad_top,
            crane_hook_z=crane_hook_local_z(pad_top + 0.5),
        )
    )

    for floor in range(1, FLOORS + 1):
        top_z = floor_ring_z(floor)
        beats.append(
            FloorBeat(
                floor_index=floor,
                slab_z=floor_slab_z(floor),
                complete_at=role_complete_at(floor, "slab"),
                crane_mast_z=top_z,
                crane_hook_z=crane_hook_local_z(top_z),
            )
        )

    return beats


BUILD_SCHEDULE: list[FloorBeat] = build_schedule()


def beat_for_floor(floor_index: int) -> FloorBeat:
    """Lookup beat by floor index (0 = foundation, 1..N = floors)."""
    for beat in BUILD_SCHEDULE:
        if beat.floor_index == floor_index:
            return beat
    raise KeyError(f"no beat for floor {floor_index}")


def mast_grow_start_for_rise(rise_index: int) -> float:
    """Restacked time when mast grow *rise_index* begins (floor slab complete)."""
    completed_floor = rise_index + 1
    if completed_floor <= FLOORS:
        return beat_for_floor(completed_floor).complete_at
    return last_window_end()


def mast_grow_end_for_rise(rise_index: int) -> float:
    """Restacked time when mast grow *rise_index* finishes (next column pour)."""
    completed_floor = rise_index + 1
    if completed_floor < FLOORS:
        return role_complete_at(completed_floor + 1, "column")
    if completed_floor == FLOORS:
        return beat_for_floor(FLOORS).complete_at + INTER_FLOOR_GAP
    return last_window_end() + ROOF_AFTER_ENVELOPE


def mast_grow_duration() -> float:
    """Seconds for one mast raise — fills the inter-floor gap beat."""
    return INTER_FLOOR_GAP


def crane_raise_start_for_rise(rise_index: int) -> float:
    """Restacked time when mast grow *rise_index* begins."""
    start = mast_grow_start_for_rise(rise_index)
    if rise_index == 0:
        return max(CRANE_LIFT_T0, start)
    return start


def crane_mast_target_for_rise(rise_index: int) -> float:
    """World Z mast reaches when grow *rise_index* finishes."""
    completed_floor = rise_index + 1
    if completed_floor == 1:
        return beat_for_floor(2).crane_mast_z
    if completed_floor <= FLOORS:
        return beat_for_floor(completed_floor).crane_mast_z
    return beat_for_floor(FLOORS).crane_mast_z


def crane_plateau_for_rise(rise_index: int) -> float:
    """Restacked time when mast grow *rise_index* finishes.

    rise[0] ends when floor 2 column pour starts — mast ready for next stack.
    """
    return mast_grow_end_for_rise(rise_index)


def crane_lower_end() -> float:
    return last_window_end() + ROOF_AFTER_ENVELOPE + LOWER_SPAN


def mast_height_after_completed(completed_floors: int) -> float:
    """World Z mast top after *completed_floors* slabs (0 = pad only)."""
    return floor_ring_z(max(0, completed_floors))


def mast_target_for_floor(floor_index: int) -> float:
    """Mast top while building floor *floor_index* — just above last completed pour."""
    return mast_height_after_completed(max(0, floor_index - 1))
