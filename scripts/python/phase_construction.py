"""Phase-based construction system for RTS game buildings.

Provides:
- NLA-driven phased construction animation
- Phase markers with metadata
- Three export profiles: Construction, Runtime, LOD
- Metadata manifests per phase
- Optimization for 20-100 buildings simultaneous display
"""
from __future__ import annotations

import bpy
import json
import os
from dataclasses import dataclass, asdict
from mathutils import Vector
from typing import List, Optional, Dict, Any


# ── Constants ──────────────────────────────────────────────────────────
FPS = 24
CONSTRUCTION_PHASES = [
    "Foundation",
    "Frame",
    "Floors",
    "Core",
    "Finishing",
    "Complete",
]

PHASE_MARKER_PREFIX = "PM_"
CONSTRUCT_NLA_NAME = "construct"


# ── Dataclasses ────────────────────────────────────────────────────────
@dataclass
class PhaseMeta:
    name: str
    start_frame: int
    end_frame: int
    duration_frames: int
    triangle_count: int
    material_count: int
    pivot_location: Vector
    bounding_box_min: Vector
    bounding_box_max: Vector
    scale: float
    mesh_names: List[str]
    description: str = ""


@dataclass
class BuildingMetadata:
    building_id: str
    version: str
    lod_version: str
    runtime_version: str
    phases: List[PhaseMeta]
    total_triangles: int
    total_materials: int
    pivot: Vector
    bounding_box: dict
    scale: float
    recommendations: List[str] = None

    def to_json(self) -> dict:
        return {
            "building_id": self.building_id,
            "version": self.version,
            "lod_version": self.lod_version,
            "runtime_version": self.runtime_version,
            "phases": [
                {
                    "name": p.name,
                    "start_frame": p.start_frame,
                    "end_frame": p.end_frame,
                    "duration_frames": p.duration_frames,
                    "triangle_count": p.triangle_count,
                    "material_count": p.material_count,
                    "pivot_location": {
                        "x": p.pivot_location.x,
                        "y": p.pivot_location.y,
                        "z": p.pivot_location.z,
                    },
                    "bounding_box_min": {
                        "x": p.bounding_box_min.x,
                        "y": p.bounding_box_min.y,
                        "z": p.bounding_box_min.z,
                    },
                    "bounding_box_max": {
                        "x": p.bounding_box_max.x,
                        "y": p.bounding_box_max.y,
                        "z": p.bounding_box_max.z,
                    },
                    "scale": p.scale,
                    "mesh_names": p.mesh_names,
                    "description": p.description,
                }
                for p in self.phases
            ],
            "total_triangles": self.total_triangles,
            "total_materials": self.total_materials,
            "pivot": {
                "x": self.pivot.x,
                "y": self.pivot.y,
                "z": self.pivot.z,
            },
            "bounding_box": {
                "min": {
                    "x": self.bounding_box_min.x,
                    "y": self.bounding_box_min.y,
                    "z": self.bounding_box_min.z,
                },
                "max": {
                    "x": self.bounding_box_max.x,
                    "y": self.bounding_box_max.y,
                    "z": self.bounding_box_max.z,
                },
            },
            "scale": self.scale,
            "recommendations": self.recommendations or [],
        }

    @staticmethod
    def from_json(data: dict) -> "BuildingMetadata":
        import mathutils
        phases = []
        for pdata in data.get("phases", []):
            pivot = mathutils.Vector((
                pdata["pivot_location"]["x"],
                pdata["pivot_location"]["y"],
                pdata["pivot_location"]["z"],
            ))
            bbox_min = mathutils.Vector((
                pdata["bounding_box_min"]["x"],
                pdata["bounding_box_min"]["y"],
                pdata["bounding_box_min"]["z"],
            ))
            bbox_max = mathutils.Vector((
                pdata["bounding_box_max"]["x"],
                pdata["bounding_box_max"]["y"],
                pdata["bounding_box_max"]["z"],
            ))
            phases.append(PhaseMeta(
                name=pdata["name"],
                start_frame=pdata["start_frame"],
                end_frame=pdata["end_frame"],
                duration_frames=pdata["duration_frames"],
                triangle_count=pdata["triangle_count"],
                material_count=pdata["material_count"],
                pivot_location=pivot,
                bounding_box_min=bbox_min,
                bounding_box_max=bbox_max,
                scale=pdata["scale"],
                mesh_names=pdata["mesh_names"],
                description=pdata.get("description", ""),
            ))
        return BuildingMetadata(
            building_id=data["building_id"],
            version=data.get("version", "1.0"),
            lod_version=data.get("lod_version", "1.0"),
            runtime_version=data.get("runtime_version", "1.0"),
            phases=phases,
            total_triangles=data.get("total_triangles", 0),
            total_materials=data.get("total_materials", 0),
            pivot=mathutils.Vector((
                data.get("pivot", {}).get("x", 0),
                data.get("pivot", {}).get("y", 0),
                data.get("pivot", {}).get("z", 0),
            )),
            bounding_box={
                "min": mathutils.Vector((
                    data.get("bounding_box", {}).get("min", {}).get("x", 0),
                    data.get("bounding_box", {}).get("min", {}).get("y", 0),
                    data.get("bounding_box", {}).get("min", {}).get("z", 0),
                )),
                "max": mathutils.Vector((
                    data.get("bounding_box", {}).get("max", {}).get("x", 0),
                    data.get("bounding_box", {}).get("max", {}).get("y", 0),
                    data.get("bounding_box", {}).get("max", {}).get("z", 0),
                )),
            },
            scale=data.get("scale", 1.0),
            recommendations=data.get("recommendations", []),
        )


# ── Phase Marker Utilities ────────────────────────────────────────────
def add_phase_markers(obj: bpy.types.Object, phase_frames: Dict[str, int]) -> None:
    """Add frame markers for each construction phase.

    phase_frames: dict mapping phase name to start frame
    """
    scene = bpy.context.scene
    for phase_name, start_frame in phase_frames.items():
        marker_name = PHASE_MARKER_PREFIX + phase_name
        if marker_name not in bpy.data.markers:
            bpy.context.scene.frame_set(start_frame)
            bpy.ops.object.mark_curve_menu(type="MARKER")
            marker = bpy.data.markers[-1]
            marker.name = marker_name
            marker.frame = start_frame


def get_phase_frame(marker_name: str) -> int:
    """Get the frame of a phase marker."""
    marker_name_full = PHASE_MARKER_PREFIX + marker_name
    if marker_name_full in bpy.data.markers:
        return bpy.data.markers[marker_name_full].frame
    return -1


def get_all_phase_markers() -> Dict[str, int]:
    """Return dict of phase name -> start frame."""
    result = {}
    for marker in bpy.data.markers:
        if marker.name.startswith(PHASE_MARKER_PREFIX):
            phase_name = marker.name[len(PHASE_MARKER_PREFIX):]
            result[phase_name] = marker.frame
    return result


# ── NLA Animation Builder ─────────────────────────────────────────────
def build_construction_nla(obj: bpy.types.Object) -> None:
    """Build NLA track with phased construction strips."""

    # Ensure we have an action
    if not obj.animation_data:
        obj.animation_data_create()
    if not obj.animation_data.action:
        obj.animation_data.action = bpy.data.actions.new(name=CONSTRUCT_NLA_NAME)

    action = obj.animation_data.action
    action_groups = {s.name: s for s in action.nla_tracks} if action.nla_tracks else {}

    # Clear existing NLA strips for this object
    if CONSTRUCT_NLA_NAME in action_groups:
        for strip in list(action_groups[CONSTRUCT_NLA_NAME].strips):
            action_groups[CONSTRUCT_NLA_NAME].strips.remove(strip)

    # Build phase strips
    phase_frames = get_all_phase_markers()
    if not phase_frames:
        print("⚠ No phase markers found - using default frame positions")
        phase_frames = {
            "Foundation": 1,
            "Frame": 50,
            "Floors": 100,
            "Core": 150,
            "Finishing": 180,
            "Complete": 200,
        }

    # Sort phases by start frame
    sorted_phases = sorted(CONSTRUCTION_PHASES, key=lambda p: phase_frames.get(p, 999))

    for i, phase_name in enumerate(sorted_phases):
        start_frame = phase_frames.get(phase_name, (i * 50) + 1)
        end_frame = phase_frames.get(
            CONSTRUCTION_PHASES[min(i + 1, len(CONSTRUCTION_PHASES) - 1)], start_frame + 40
        )

        strip = action_groups[CONSTRUCT_NLA_NAME].strips.new(
            name=f"phase_{phase_name}",
            start=start_frame,
            end=end_frame,
        )

        # Add marker comment
        strip.name = f"phase_{phase_name}"
        strip.label = phase_name

        # Set action to influence scale
        if obj.type == "MESH":
            strip.action = obj.animation_data.action
            strip.axis = "SCALE"

            # Add keyframes for scale interpolation
            obj.keyframe_insert(data_path="scale", frame=start_frame, index=-1)
            obj.scale = (0.02, 0.02, 0.02)
            obj.keyframe_insert(data_path="scale", frame=end_frame, index=-1)
            obj.scale = (1.0, 1.0, 1.0)


def validate_construction_animation() -> List[str]:
    """Validate that construction animation works correctly.

    Returns list of issues found (empty = all good).
    """
    issues = []

    # Check phase markers exist
    markers = get_all_phase_markers()
    if len(markers) < len(CONSTRUCTION_PHASES):
        issues.append(f"Missing phase markers. Expected {len(CONSTRUCTION_PHASES)}, found {len(markers)}")

    # Check NLA track exists
    if bpy.context.object and bpy.context.object.animation_data:
        if not bpy.context.object.animation_data.action:
            issues.append("No action on selected object")
        elif bpy.context.object.animation_data.action.name != CONSTRUCT_NLA_NAME:
            issues.append(f"Action name is '{bpy.context.object.animation_data.action.name}', expected '{CONSTRUCT_NLA_NAME}'")

    # Check frame range is reasonable
    scene = bpy.context.scene
    if scene.frame_end - scene.frame_start < 100:
        issues.append(f"Frame range too short: {scene.frame_end - scene.frame_start}, need >= 100")

    # Check for duplicate markers
    marker_names = [m.name for m in bpy.data.markers]
    marker_prefixes = [m for m in marker_names if m.startswith(PHASE_MARKER_PREFIX)]
    if len(marker_prefixes) != len(set(marker_prefixes)):
        issues.append("Duplicate phase markers detected")

    return issues


# ── Mesh Statistics ───────────────────────────────────────────────────
def compute_mesh_stats(obj: bpy.types.Object) -> Dict[str, Any]:
    """Compute triangle count, material count, and mesh names for an object."""
    if obj.type != "MESH":
        return {"triangle_count": 0, "material_count": 0, "mesh_names": []}

    me = obj.data
    tri_count = len(me.polygons)
    materials = set()
    mesh_names = [obj.name]

    # Collect all child meshes and their materials
    for child in obj.children:
        if child.type == "MESH":
            tri_count += len(child.data.polygons)
            if child.data.materials:
                materials.update(child.data.materials)
            mesh_names.append(child.name)

    # Also check linked objects in same collection
    for other in bpy.data.objects:
        if other is obj or other in obj.children if obj.children else []:
            continue
        if other.type == "MESH" and other.users_collection[0].name == obj.users_collection[0].name:
            if other.name not in mesh_names:
                tri_count += len(other.data.polygons)
                if other.data.materials:
                    materials.update(other.data.materials)
                mesh_names.append(other.name)

    return {
        "triangle_count": tri_count,
        "material_count": len(materials),
        "mesh_names": mesh_names,
    }


# ── Bounding Box Computation ──────────────────────────────────────────
def compute_bounding_box(obj: bpy.types.Object) -> Dict[str, Any]:
    """Compute bounding box for an object in world space."""
    if obj.type != "MESH":
        return {"min": {"x": 0, "y": 0, "z": 0}, "max": {"x": 0, "y": 0, "z": 0}}

    mat = obj.matrix_world
    me = obj.data

    if not me.vertices:
        return {"min": {"x": 0, "y": 0, "z": 0}, "max": {"x": 0, "y": 0, "z": 0}}

    min_corner = Vector((float("inf"), float("inf"), float("inf")))
    max_corner = Vector((float("-inf"), float("-inf"), float("-inf")))

    for v in me.vertices:
        world_pos = mat @ v.co
        min_corner.x = min(min_corner.x, world_pos.x)
        min_corner.y = min(min_corner.y, world_pos.y)
        min_corner.z = min(min_corner.z, world_pos.z)
        max_corner.x = max(max_corner.x, world_pos.x)
        max_corner.y = max(max_corner.y, world_pos.y)
        max_corner.z = max(max_corner.z, world_pos.z)

    return {
        "min": {"x": min_corner.x, "y": min_corner.y, "z": min_corner.z},
        "max": {"x": max_corner.x, "y": max_corner.y, "z": max_corner.z},
    }


# ── Material Consolidation ────────────────────────────────────────────
def consolidate_materials(obj: bpy.types.Object) -> int:
    """Consolidate materials to reduce draw calls.

    Returns the new material count.
    """
    if obj.type != "MESH":
        return 0

    # Collect all materials used by object and children
    all_materials = set()

    # Main object materials
    if obj.data.materials:
        for mat in obj.data.materials:
            if mat:
                all_materials.add(mat)

    # Children materials
    for child in obj.children:
        if child.type == "MESH" and child.data.materials:
            for mat in child.data.materials:
                if mat:
                    all_materials.add(mat)

    # Assign a single merged material if we have multiple
    if len(all_materials) > 1 and obj.data.polygons:
        # Create a new merged material
        merged_name = f"{obj.name}_Merged"
        merged_mat = bpy.data.materials.new(name=merged_name)
        merged_mat.use_nodes = True

        # Set base color to average
        nodes = merged_mat.node_tree.nodes
        principled = None
        for node in nodes:
            if node.type == "Principled BSDF":
                principled = node
                break

        if principled:
            avg_color = (0.0, 0.0, 0.0, 1.0)
            count = 0
            for mat in all_materials:
                try:
                    mat_node = mat.node_tree.nodes.get("Principled BSDF")
                    if mat_node:
                        color_input = mat_node.inputs["Base Color"].default_value
                        avg_color = (
                            avg_color[0] + color_input[0],
                            avg_color[1] + color_input[1],
                            avg_color[2] + color_input[2],
                            avg_color[3],
                        )
                        count += 1
                except Exception:
                    pass

            if count > 0:
                avg_color = (
                    avg_color[0] / count,
                    avg_color[1] / count,
                    avg_color[2] / count,
                    avg_color[3],
                )
            principled.inputs["Base Color"].default_value = avg_color

        # Replace all material slots with the merged one
        while obj.data.materials:
            obj.data.materials.pop(index=0)
        obj.data.materials.append(merged_mat)

    return len(all_materials)


# ── Triangle Decimation ────────────────────────────────────────────────
def optimize_mesh_triangles(obj: bpy.types.Object, target_tris: int) -> bool:
    """Reduce triangle count to target via decimation.

    Returns True if optimization was applied.
    """
    if obj.type != "MESH":
        return False

    current