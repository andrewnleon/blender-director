"""Shared tower crane rig for staged construction assets (any PREFIX)."""
from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Callable

import bmesh
import bpy
from mathutils import Euler, Vector

from construct_grammar import (
    GROW_START_SCALE,
    HOOK_ABOVE,
    JIB_CLEARANCE,
    SNAP_FRAMES,
)

ObjectFactory = Callable[..., bpy.types.Object]
CollectionFactory = Callable[[str], bpy.types.Collection]
LinkFn = Callable[[bpy.types.Object, bpy.types.Collection], bpy.types.Object]


@dataclass(frozen=True)
class CraneConfig:
    prefix: str
    site_xyz: tuple[float, float, float]
    pad_z: float
    track_h: float = 0.22
    base_h: float = 0.42
    tower_rest_h: float = 3.2
    boom_len: float = 5.8
    mat_yellow: str = "ConstrYellow"
    mat_black: str = "ConstrBlack"
    mat_cab: str = "ConstrCab"
    mat_payload: str = "Steel"
    collection_name: str = "Construction"

    @property
    def crane_name(self) -> str:
        return f"{self.prefix}Crane"

    @property
    def boom_pivot_name(self) -> str:
        return f"{self.prefix}CraneBoomPivot"

    @property
    def track_z(self) -> float:
        return self.track_h * 0.5

    @property
    def base_z(self) -> float:
        return self.track_h + self.base_h * 0.5

    @property
    def tower_base_z(self) -> float:
        return self.track_h + self.base_h

    @property
    def boom_rest_z(self) -> float:
        return self.tower_base_z + self.tower_rest_h - 0.22

    @property
    def cab_rest_z(self) -> float:
        return self.boom_rest_z - 0.03

    @property
    def hook_x(self) -> float:
        return self.boom_len - 0.25

    @property
    def hook_rest(self) -> tuple[float, float, float]:
        return (self.hook_x, 0.0, -0.85)


def crane_mesh_names(prefix: str) -> tuple[str, ...]:
    return (
        f"{prefix}CraneBase",
        f"{prefix}CraneTrackL",
        f"{prefix}CraneTrackR",
        f"{prefix}CraneTower",
        f"{prefix}CraneCab",
        f"{prefix}CraneBoom",
        f"{prefix}CraneBoom2",
        f"{prefix}CraneCable",
        f"{prefix}CraneHook",
        f"{prefix}CranePayload",
    )


def crane_root_names(prefix: str) -> tuple[str, ...]:
    return (f"{prefix}Crane", f"{prefix}CraneBoomPivot")


def is_crane_object_name(name: str, prefix: str) -> bool:
    if name in crane_root_names(prefix):
        return True
    return name in crane_mesh_names(prefix)


def parent_parts(root: bpy.types.Object, parts: tuple[bpy.types.Object, ...]) -> None:
    for part in parts:
        part.parent = root


def build_tower_crane(
    config: CraneConfig,
    box: ObjectFactory,
    coll: CollectionFactory,
    link: LinkFn,
) -> tuple[bpy.types.Object, bpy.types.Object]:
    """Place tower crane beside pad — root empty + boom pivot hierarchy."""
    construction = coll(config.collection_name)
    root = bpy.data.objects.new(config.crane_name, None)
    root.empty_display_size = 1.2
    root.location = config.site_xyz
    root.rotation_euler = (0.0, 0.0, 0.0)
    link(root, construction)

    base = box(
        f"{config.prefix}CraneBase",
        (0, 0, config.base_z),
        (0.9, 0.9, config.base_h),
        config.mat_yellow,
        config.collection_name,
    )
    track_l = box(
        f"{config.prefix}CraneTrackL",
        (0, 0.42, config.track_z),
        (1.1, 0.26, config.track_h),
        config.mat_black,
        config.collection_name,
    )
    track_r = box(
        f"{config.prefix}CraneTrackR",
        (0, -0.42, config.track_z),
        (1.1, 0.26, config.track_h),
        config.mat_black,
        config.collection_name,
    )
    tower = box(
        f"{config.prefix}CraneTower",
        (0, 0, config.tower_base_z + config.tower_rest_h * 0.5),
        (0.26, 0.26, config.tower_rest_h),
        config.mat_yellow,
        config.collection_name,
    )
    cab = box(
        f"{config.prefix}CraneCab",
        (0.28, 0, config.cab_rest_z),
        (0.46, 0.46, 0.46),
        config.mat_cab,
        config.collection_name,
    )
    for part in (base, track_l, track_r, tower, cab):
        part.rotation_euler = (0.0, 0.0, 0.0)
    parent_parts(root, (base, track_l, track_r, tower, cab))

    boom_root = bpy.data.objects.new(config.boom_pivot_name, None)
    boom_root.empty_display_size = 0.7
    boom_root.parent = root
    boom_root.location = (0.0, 0.0, config.boom_rest_z)
    link(boom_root, construction)

    hook_x = config.hook_x
    boom_half = config.boom_len * 0.5
    boom = box(
        f"{config.prefix}CraneBoom",
        (boom_half, 0, 0),
        (config.boom_len, 0.16, 0.16),
        config.mat_yellow,
        config.collection_name,
    )
    boom2 = box(
        f"{config.prefix}CraneBoom2",
        (hook_x, 0, -0.12),
        (0.14, 0.14, 0.7),
        config.mat_yellow,
        config.collection_name,
    )
    cable = box(
        f"{config.prefix}CraneCable",
        (hook_x, 0, -0.45),
        (0.04, 0.04, 0.8),
        config.mat_black,
        config.collection_name,
    )
    hook = box(
        f"{config.prefix}CraneHook",
        config.hook_rest,
        (0.11, 0.11, 0.24),
        config.mat_black,
        config.collection_name,
    )
    payload = box(
        f"{config.prefix}CranePayload",
        (hook_x, 0, -1.15),
        (0.55, 0.32, 0.16),
        config.mat_payload,
        config.collection_name,
    )
    parent_parts(boom_root, (boom, boom2, cable, hook, payload))
    return root, boom_root


def hide_at(obj: bpy.types.Object, frame: int, hidden: bool) -> None:
    prefs = bpy.context.preferences.edit
    prev = prefs.keyframe_new_interpolation_type
    prefs.keyframe_new_interpolation_type = "CONSTANT"
    obj.hide_viewport = hidden
    obj.hide_render = hidden
    obj.keyframe_insert("hide_viewport", frame=frame)
    obj.keyframe_insert("hide_render", frame=frame)
    prefs.keyframe_new_interpolation_type = prev


def appear_crane(prefix: str, frame_on: int) -> None:
    root = bpy.data.objects.get(f"{prefix}Crane")
    if root is None:
        return
    hide_at(root, 1, True)
    if frame_on > 1:
        hide_at(root, frame_on - 1, True)
    hide_at(root, frame_on, False)


def hide_crane(prefix: str, frame_off: int) -> None:
    root = bpy.data.objects.get(f"{prefix}Crane")
    if root is None:
        return
    hide_at(root, frame_off - 1, False)
    hide_at(root, frame_off, True)


def key_crane_hook(
    prefix: str,
    frame: int,
    hook_z: float,
    hook_rest: tuple[float, float, float],
    cable_rest_h: float = 0.8,
) -> None:
    hook_x, hook_y, _ = hook_rest
    hook = bpy.data.objects.get(f"{prefix}CraneHook")
    cable = bpy.data.objects.get(f"{prefix}CraneCable")
    payload = bpy.data.objects.get(f"{prefix}CranePayload")
    if hook is not None:
        hook.location = (hook_x, hook_y, hook_z)
        hook.keyframe_insert("location", frame=frame)
    if cable is not None:
        length = max(0.35, abs(hook_z))
        cable.scale = (1.0, 1.0, length / cable_rest_h)
        cable.location = (hook_x, hook_y, hook_z * 0.5)
        cable.keyframe_insert("scale", frame=frame)
        cable.keyframe_insert("location", frame=frame)
    if payload is not None:
        payload.location = (hook_x, hook_y, hook_z - 0.45)
        payload.keyframe_insert("location", frame=frame)


def grow_crane_mast(
    prefix: str,
    frame_start: int,
    frame_end: int,
    tower_rest_h: float,
    tower_base_z: float,
) -> None:
    tower = bpy.data.objects.get(f"{prefix}CraneTower")
    cab = bpy.data.objects.get(f"{prefix}CraneCab")
    boom = bpy.data.objects.get(f"{prefix}CraneBoomPivot")
    if tower is None:
        return
    target_center_z = tower_base_z + tower_rest_h * 0.5
    boom_z = tower_base_z + tower_rest_h - 0.22
    cab_z = boom_z - 0.03
    tower.location.z = target_center_z
    tower.keyframe_insert("location", frame=frame_start)
    tower.keyframe_insert("location", frame=frame_end)
    if cab is not None:
        cab.location.z = cab_z
        cab.keyframe_insert("location", frame=frame_start)
        cab.keyframe_insert("location", frame=frame_end)
    if boom is not None:
        boom.location.z = boom_z
        boom.keyframe_insert("location", frame=frame_start)
        boom.keyframe_insert("location", frame=frame_end)


def animate_crane_lift(
    prefix: str,
    frame_start: int,
    duration: int,
    boom_deg: float,
    hook_high: float,
    hook_low: float,
    hook_rest: tuple[float, float, float],
) -> int:
    """Boom sweep + hook drop for one staged lift. Returns placement frame."""
    boom = bpy.data.objects.get(f"{prefix}CraneBoomPivot")
    payload = bpy.data.objects.get(f"{prefix}CranePayload")

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
        boom.rotation_euler = Euler((0.0, 0.0, math.radians(boom_deg - 12)), "XYZ")
        boom.keyframe_insert("rotation_euler", frame=f_pick)
        boom.rotation_euler = Euler((0.0, 0.0, math.radians(boom_deg + 6)), "XYZ")
        boom.keyframe_insert("rotation_euler", frame=f_swing)
        boom.rotation_euler = Euler((0.0, 0.0, math.radians(boom_deg)), "XYZ")
        boom.keyframe_insert("rotation_euler", frame=f_lower)
        boom.keyframe_insert("rotation_euler", frame=f_place)

    key_crane_hook(prefix, f_pick, hook_high, hook_rest)
    key_crane_hook(prefix, f_swing, hook_high, hook_rest)
    key_crane_hook(prefix, f_lower, hook_low, hook_rest)
    key_crane_hook(prefix, f_place, hook_high, hook_rest)
    return f_place


def linear_crane_fcurves(prefix: str) -> None:
    for obj in bpy.data.objects:
        if not obj.name.startswith(f"{prefix}Crane"):
            continue
        if obj.animation_data is None or obj.animation_data.action is None:
            continue
        action = obj.animation_data.action
        fcurves = getattr(action, "fcurves", None)
        if fcurves is None:
            continue
        for fcu in fcurves:
            if "hide" in fcu.data_path:
                continue
            for keyframe in fcu.keyframe_points:
                keyframe.interpolation = "LINEAR"


CONSTRUCT_CLIP = "construct"

CRANE_MATERIAL_SPECS = (
    ("ConstrYellow", (0.93, 0.74, 0.07), 0.42, 0.15),
    ("ConstrBlack", (0.12, 0.12, 0.14), 0.55, 0.25),
    ("ConstrCab", (0.28, 0.32, 0.36), 0.45, 0.2),
    ("Steel", (0.68, 0.70, 0.74), 0.35, 0.9),
)


def name_construct_action(obj: bpy.types.Object) -> None:
    if obj.animation_data and obj.animation_data.action:
        obj.animation_data.action.name = CONSTRUCT_CLIP


def ensure_collection(name: str) -> bpy.types.Collection:
    collection = bpy.data.collections.get(name)
    if collection is None:
        collection = bpy.data.collections.new(name)
        bpy.context.scene.collection.children.link(collection)
    return collection


def _link(obj: bpy.types.Object, collection: bpy.types.Collection) -> bpy.types.Object:
    for user_collection in list(obj.users_collection):
        user_collection.objects.unlink(obj)
    collection.objects.link(obj)
    return obj


def ensure_material(
    name: str,
    color: tuple[float, float, float],
    roughness: float,
    metallic: float,
) -> bpy.types.Material:
    mat = bpy.data.materials.get(name)
    if mat is None:
        mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    nodes.clear()
    output = nodes.new("ShaderNodeOutputMaterial")
    bsdf = nodes.new("ShaderNodeBsdfPrincipled")
    bsdf.inputs["Base Color"].default_value = (*color, 1.0)
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = metallic
    links.new(bsdf.outputs["BSDF"], output.inputs["Surface"])
    mat.diffuse_color = (*color, 1.0)
    return mat


def ensure_crane_materials(prefix: str) -> dict[str, str]:
    """Unique material names per prefix so pack exports do not clash."""
    names: dict[str, str] = {}
    for suffix, color, roughness, metallic in CRANE_MATERIAL_SPECS:
        material_name = f"{prefix}{suffix}"
        ensure_material(material_name, color, roughness, metallic)
        names[suffix] = material_name
    return names


def make_box(
    name: str,
    loc: tuple[float, float, float],
    dims: tuple[float, float, float],
    mat_name: str,
    collection_name: str,
) -> bpy.types.Object:
    mesh = bpy.data.meshes.new(name)
    obj = bpy.data.objects.new(name, mesh)
    _link(obj, ensure_collection(collection_name))
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    for vert in bm.verts:
        vert.co.x *= dims[0]
        vert.co.y *= dims[1]
        vert.co.z *= dims[2]
    bm.to_mesh(mesh)
    bm.free()
    obj.location = Vector(loc)
    material = bpy.data.materials.get(mat_name)
    if material is not None:
        obj.data.materials.append(material)
    return obj


def build_standalone_crane(config: CraneConfig) -> tuple[bpy.types.Object, bpy.types.Object]:
    """Materials + box factory + tower crane — no host building required."""
    material_names = ensure_crane_materials(config.prefix)
    built = CraneConfig(
        prefix=config.prefix,
        site_xyz=config.site_xyz,
        pad_z=config.pad_z,
        track_h=config.track_h,
        base_h=config.base_h,
        tower_rest_h=config.tower_rest_h,
        boom_len=config.boom_len,
        mat_yellow=material_names["ConstrYellow"],
        mat_black=material_names["ConstrBlack"],
        mat_cab=material_names["ConstrCab"],
        mat_payload=material_names["Steel"],
        collection_name=config.collection_name,
    )
    return build_tower_crane(built, make_box, ensure_collection, _link)


def crane_export_objects(prefix: str) -> list[bpy.types.Object]:
    objects: list[bpy.types.Object] = []
    for name in crane_root_names(prefix) + crane_mesh_names(prefix):
        obj = bpy.data.objects.get(name)
        if obj is not None:
            objects.append(obj)
    return objects


def crane_pose_for_height(
    config: CraneConfig,
    world_top_z: float,
) -> tuple[float, float, float, float]:
    """Mast scale/center, jib Z, hook local Z so the hook sits on world_top_z."""
    jib_z = max(config.boom_rest_z, world_top_z - config.pad_z + JIB_CLEARANCE)
    tower_h = max(config.tower_rest_h, jib_z - config.tower_base_z + 0.2)
    tower_center_z = config.tower_base_z + tower_h * 0.5
    tower_scale_z = tower_h / config.tower_rest_h
    hook_z = world_top_z + HOOK_ABOVE - config.pad_z - jib_z
    return tower_scale_z, tower_center_z, jib_z, hook_z


def key_crane_mast_to_height(
    config: CraneConfig,
    frame: int,
    world_top_z: float,
) -> float:
    """Grow the yellow mast and ride the jib up. Returns hook local Z."""
    tower_scale_z, tower_center_z, jib_z, hook_z = crane_pose_for_height(
        config,
        world_top_z,
    )
    prefix = config.prefix
    tower = bpy.data.objects.get(f"{prefix}CraneTower")
    cab = bpy.data.objects.get(f"{prefix}CraneCab")
    boom = bpy.data.objects.get(f"{prefix}CraneBoomPivot")
    if tower is not None:
        tower.scale = (1.0, 1.0, tower_scale_z)
        tower.location = (0.0, 0.0, tower_center_z)
        tower.keyframe_insert("scale", frame=frame)
        tower.keyframe_insert("location", frame=frame)
        name_construct_action(tower)
    if cab is not None:
        cab.location = (0.28, 0.0, jib_z - 0.03)
        cab.keyframe_insert("location", frame=frame)
        name_construct_action(cab)
    if boom is not None:
        boom.location = (0.0, 0.0, jib_z)
        boom.keyframe_insert("location", frame=frame)
        name_construct_action(boom)
    key_crane_hook(prefix, frame, hook_z, config.hook_rest)
    return hook_z


def lego_snap_in(
    obj: bpy.types.Object,
    place_frame: int,
    clip_end: int,
    grow_start: float = GROW_START_SCALE,
    snap_frames: int = SNAP_FRAMES,
) -> None:
    """Lego snap at seated height — tiny bind pose, constant scale keys."""
    prefs = bpy.context.preferences.edit
    previous_interp = prefs.keyframe_new_interpolation_type
    prefs.keyframe_new_interpolation_type = "CONSTANT"
    rest = obj.scale.copy()
    loc = obj.location.copy()
    tiny = (rest.x * grow_start, rest.y * grow_start, rest.z * grow_start)
    hold_end = max(place_frame, clip_end - 1)
    obj.location = loc
    obj.keyframe_insert("location", frame=1)
    obj.keyframe_insert("location", frame=place_frame)
    obj.keyframe_insert("location", frame=hold_end)
    obj.scale = tiny
    obj.keyframe_insert("scale", frame=1)
    pre = max(1, place_frame - snap_frames)
    obj.keyframe_insert("scale", frame=pre)
    obj.scale = rest
    obj.keyframe_insert("scale", frame=place_frame)
    obj.keyframe_insert("scale", frame=hold_end)
    name_construct_action(obj)
    prefs.keyframe_new_interpolation_type = previous_interp


def crane_place_piece(
    config: CraneConfig,
    obj: bpy.types.Object,
    frame_start: int,
    duration: int,
    boom_deg: float,
    world_top_z: float,
    clip_end: int,
) -> int:
    """Boom swing + hook drop, then Lego snap when the hook sets."""
    _scale, _center, _jib, hook_on_roof = crane_pose_for_height(config, world_top_z)
    hook_high = hook_on_roof
    hook_low = hook_on_roof - 0.45
    place_frame = animate_crane_lift(
        config.prefix,
        frame_start,
        duration,
        boom_deg,
        hook_high,
        hook_low,
        config.hook_rest,
    )
    lego_snap_in(obj, place_frame, clip_end)
    return place_frame


def collapse_crane_scale(
    prefix: str,
    frame_on: int,
    clip_end: int,
    grow_start: float = GROW_START_SCALE,
) -> None:
    """Scale-collapse crane meshes so rest pose is a clean pad (no hide_viewport)."""
    prefs = bpy.context.preferences.edit
    previous_interp = prefs.keyframe_new_interpolation_type
    prefs.keyframe_new_interpolation_type = "CONSTANT"
    pre = max(1, frame_on - 1)
    for name in crane_mesh_names(prefix):
        obj = bpy.data.objects.get(name)
        if obj is None:
            continue
        rest = obj.scale.copy()
        tiny = (rest.x * grow_start, rest.y * grow_start, rest.z * grow_start)
        obj.scale = rest
        obj.keyframe_insert("scale", frame=pre)
        obj.scale = tiny
        obj.keyframe_insert("scale", frame=frame_on)
        obj.keyframe_insert("scale", frame=clip_end)
        name_construct_action(obj)
    prefs.keyframe_new_interpolation_type = previous_interp
