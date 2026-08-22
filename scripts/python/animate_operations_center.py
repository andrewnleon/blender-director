"""Staged construction animation — scale keyframes only (exports to glTF)."""
from __future__ import annotations

import bpy

from build_operations_center import OC_CRANE_CONFIG, PREFIX
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

STAGE_OBJECTS: dict[str, tuple[str, ...]] = {
    "foundation": ("OC_Podium", "OC_Foundation"),
    "frame": ("OC_Core", "OC_FrameRing") + tuple(f"OC_Buttress_{index}" for index in range(4)),
    "walls": (
        "OC_GlassBand",
        "OC_Canopy",
        "OC_CanopyPost_L",
        "OC_CanopyPost_R",
    ) + tuple(f"OC_WallPanel_{index}" for index in range(4)),
    "roof": ("OC_RoofDeck", "OC_Radome", "OC_DishArm", "OC_Dish"),
    "trim": (
        "OC_RadomeRing",
        "OC_Antenna",
        "OC_Beacon",
    ) + tuple(f"OC_RimLight_{index}" for index in range(4)),
}


def snap_reveal(obj: bpy.types.Object, frame_on: int) -> None:
    """Lego snap-in — scale keys export cleanly to glTF."""
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


def animate_stage(stage: str, frame_on: int) -> None:
    for name in STAGE_OBJECTS[stage]:
        obj = bpy.data.objects.get(name)
        if obj is not None:
            snap_reveal(obj, frame_on)


def crane_lift_for_stage(stage: str, place_frame: int) -> None:
    config = OC_CRANE_CONFIG
    lift_start = max(1, place_frame - LIFT_DURATION)
    hook_high = config.hook_rest[2]
    hook_low = hook_high - 0.55
    if stage == "roof":
        hook_low = hook_high - 0.75
    if stage == "trim":
        hook_low = hook_high - 0.95
    animate_crane_lift(
        PREFIX,
        lift_start,
        LIFT_DURATION,
        BOOM_ANGLES[stage],
        hook_high,
        hook_low,
        config.hook_rest,
    )
    if stage == "frame":
        grow_crane_mast(
            PREFIX,
            STAGE_FRAMES["foundation"] + 4,
            STAGE_FRAMES["frame"] - 4,
            config.tower_rest_h + 0.55,
            config.tower_base_z,
        )
    if stage == "roof":
        grow_crane_mast(
            PREFIX,
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


def create_construct_clip() -> None:
    for obj in bpy.data.objects:
        if obj.animation_data:
            obj.animation_data_clear()

    reveal_crane(PREFIX, 1)

    for stage in ("foundation", "frame", "walls", "roof", "trim"):
        crane_lift_for_stage(stage, STAGE_FRAMES[stage])
        animate_stage(stage, STAGE_FRAMES[stage])

    collapse_crane(PREFIX, END)
    setup_scene_timing()
    linear_crane_fcurves(PREFIX)


if __name__ == "__main__":
    create_construct_clip()
