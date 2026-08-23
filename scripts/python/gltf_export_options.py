"""Shared glTF export kwargs for stage + pack pipelines."""

from __future__ import annotations

import os


def _env_flag(name: str) -> bool:
    return os.environ.get(name, "").strip().lower() in {"1", "true", "yes"}


def base_gltf_export_kwargs(*, export_animations: bool) -> dict[str, object]:
    """Blender glTF exporter options. Set GLTF_DRACO=1 when the add-on is enabled."""
    kwargs: dict[str, object] = {
        "export_format": "GLB",
        "export_apply": True,
        "export_yup": True,
        "export_animations": export_animations,
        "export_lights": False,
        "export_cameras": False,
        "export_image_format": "AUTO",
    }
    if _env_flag("GLTF_DRACO"):
        kwargs["export_draco_mesh_compression_enable"] = True
        kwargs["export_draco_mesh_compression_level"] = int(
            os.environ.get("GLTF_DRACO_LEVEL", "6"),
        )
    return kwargs


def skyscraper_gltf_export_kwargs() -> dict[str, object]:
    """Hero tower — one merged `construct` clip, optimized keyframes."""
    return {
        **base_gltf_export_kwargs(export_animations=True),
        "export_merge_animation": "NLA_TRACK",
        "export_nla_strips_merged_animation_name": "construct",
        "export_optimize_animation_size": True,
        "export_extra_animations": False,
    }
