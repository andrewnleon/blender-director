"""Staged construct clip for agent stations — scale keyframes only."""
from __future__ import annotations

import bpy

from agent_station_specs import AgentStationSpec, get_agent_station_spec
from construction_crane import (
    animate_crane_lift,
    crane_mesh_names,
    grow_crane_mast,
    linear_crane_fcurves,
)

FPS = 24
END = 120
GROW_START_SCALE = 0.04
SNAP_FRAMES = 2
LIFT_DURATION = 18

STAGE_FRAMES = {
    "foundation": 24,
    "frame": 48,
    "walls": 72,
    "roof": 96,
    "trim": END,
}

BOOM_ANGLES = {
    "foundation": -155,
    "frame": -132,
    "walls": -118,
    "roof": -148,
    "trim": -125,
}


def stage_objects(prefix: str) -> dict[str, tuple[str, ...]]:
    return {
        "foundation": (f"{prefix}Podium", f"{prefix}Foundation"),
        "frame": (f"{prefix}Core", f"{prefix}FrameRing")
        + tuple(f"{prefix}Buttress_{index}" for index in range(4)),
        "walls": (
            f"{prefix}GlassBand",
            f"{prefix}Canopy",
            f"{prefix}CanopyPost_L",
            f"{prefix}CanopyPost_R",
        )
        + tuple(f"{prefix}WallPanel_{index}" for index in range(4)),
        "roof": (f"{prefix}RoofDeck", f"{prefix}Radome", f"{prefix}DishArm", f"{prefix}Dish"),
        "trim": (
            f"{prefix}RadomeRing",
            f"{prefix}Antenna",
            f"{prefix}Beacon",
        )
        + tuple(f"{prefix}RimLight_{index}" for index in range(4)),
    }


def snap_reveal(obj: bpy.types.Object, frame_on: int) -> None:
    sc = obj.scale.copy()
    loc = obj.location.copy()
    obj.location = loc
    obj.keyframe_insert("location", frame=1)
    tiny = (sc.x * GROW_START_SCALE, sc.y * GROW_START_SCALE, sc.z * GROW_START_SCALE)
    obj.scale = tiny
    obj.keyframe_insert("scale", frame=1)
    pre = max(1, frame_on - 1)
    obj.keyframe_insert("scale", frame=pre)
    snap_end = frame_on + SNAP_FRAMES
    obj.scale = sc
    obj.keyframe_insert("scale", frame=snap_end)
    obj.keyframe_insert("location", frame=snap_end)


def collapse_crane(prefix: str, frame_on: int) -> None:
    for name in crane_mesh_names(prefix):
        obj = bpy.data.objects.get(name)
        if obj is None:
            continue
        sc = obj.scale.copy()
        obj.keyframe_insert("scale", frame=max(1, frame_on - 1))
        obj.scale = (
            sc.x * GROW_START_SCALE,
            sc.y * GROW_START_SCALE,
            sc.z * GROW_START_SCALE,
        )
        obj.keyframe_insert("scale", frame=frame_on)


def reveal_crane(prefix: str, frame_on: int) -> None:
    for name in crane_mesh_names(prefix):
        obj = bpy.data.objects.get(name)
        if obj is None:
            continue
        sc = obj.scale.copy()
        tiny = (sc.x * GROW_START_SCALE, sc.y * GROW_START_SCALE, sc.z * GROW_START_SCALE)
        obj.scale = tiny
        obj.keyframe_insert("scale", frame=1)
        pre = max(1, frame_on - 1)
        obj.keyframe_insert("scale", frame=pre)
        obj.scale = sc
        obj.keyframe_insert("scale", frame=frame_on + SNAP_FRAMES)


def animate_stage(prefix: str, stage: str, frame_on: int) -> None:
    for name in stage_objects(prefix)[stage]:
        obj = bpy.data.objects.get(name)
        if obj is not None:
            snap_reveal(obj, frame_on)


def crane_lift_for_stage(spec: AgentStationSpec, stage: str, place_frame: int) -> None:
    prefix = spec.prefix
    from construction_crane import CraneConfig
    from construct_grammar import crane_boom_len, crane_site_xyz

    site_xyz = crane_site_xyz(9.92, 9.92, 0.32)
    boom_len = spec.boom_len if spec.boom_len > 0 else crane_boom_len(site_xyz)
    config = CraneConfig(
        prefix=prefix,
        site_xyz=site_xyz,
        pad_z=0.32,
        tower_rest_h=spec.tower_rest_h,
        boom_len=boom_len,
    )
    lift_start = max(1, place_frame - LIFT_DURATION)
    hook_high = config.hook_rest[2]
    hook_low = hook_high - 0.55
    if stage == "roof":
        hook_low = hook_high - 0.75
    if stage == "trim":
        hook_low = hook_high - 0.95
    animate_crane_lift(
        prefix,
        lift_start,
        LIFT_DURATION,
        BOOM_ANGLES[stage],
        hook_high,
        hook_low,
        config.hook_rest,
    )
    if stage == "frame":
        grow_crane_mast(
            prefix,
            STAGE_FRAMES["foundation"] + 4,
            STAGE_FRAMES["frame"] - 4,
            config.tower_rest_h + 0.55,
            config.tower_base_z,
        )
    if stage == "roof":
        grow_crane_mast(
            prefix,
            STAGE_FRAMES["walls"] + 4,
            STAGE_FRAMES["roof"] - 4,
            config.tower_rest_h + 1.0,
            config.tower_base_z,
        )


def setup_scene_timing() -> None:
    scene = bpy.context.scene
    scene.frame_start = 1
    scene.frame_end = END
    scene.render.fps = FPS


def create_construct_clip(spec: AgentStationSpec) -> None:
    prefix = spec.prefix
    for obj in bpy.data.objects:
        if obj.animation_data:
            obj.animation_data_clear()

    reveal_crane(prefix, 1)

    for stage in ("foundation", "frame", "walls", "roof", "trim"):
        crane_lift_for_stage(spec, stage, STAGE_FRAMES[stage])
        animate_stage(prefix, stage, STAGE_FRAMES[stage])

    collapse_crane(prefix, END)
    setup_scene_timing()
    linear_crane_fcurves(prefix)


def animate_agent_station(building_id: str) -> AgentStationSpec:
    spec = get_agent_station_spec(building_id)
    create_construct_clip(spec)
    return spec


if __name__ == "__main__":
    import sys

    station_id = sys.argv[-1] if len(sys.argv) > 1 else "research-center"
    animate_agent_station(station_id)
