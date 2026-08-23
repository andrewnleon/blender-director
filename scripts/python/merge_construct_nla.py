"""Push per-object actions onto one NLA track for merged glTF export."""
from __future__ import annotations

import bpy


def push_prefix_actions_to_nla(prefix: str, track_name: str = "construct") -> int:
    pushed = 0
    for obj in bpy.data.objects:
        if not obj.name.startswith(prefix):
            continue
        action = None
        if obj.animation_data and obj.animation_data.action:
            action = obj.animation_data.action
        if action is None:
            continue

        if obj.animation_data is None:
            obj.animation_data_create()
        ad = obj.animation_data

        for track in list(ad.nla_tracks):
            ad.nla_tracks.remove(track)

        track = ad.nla_tracks.new()
        track.name = track_name
        track.strips.new(action.name, int(bpy.context.scene.frame_start), action)
        ad.action = None
        pushed += 1

    return pushed


if __name__ == "__main__":
    import sys

    from agent_station_specs import get_agent_station_spec

    building_id = sys.argv[-1] if len(sys.argv) > 1 else "skyscraper"
    prefix = "ST_" if building_id == "skyscraper" else get_agent_station_spec(building_id).prefix
    count = push_prefix_actions_to_nla(prefix)
    print("NLA_PUSHED", count)
