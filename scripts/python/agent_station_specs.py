"""Agent station build specs — research, development, QA, deploy."""
from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class AgentStationSpec:
    building_id: str
    prefix: str
    accent_rgb: tuple[float, float, float]
    body_rgb: tuple[float, float, float]
    trim_rgb: tuple[float, float, float]
    core_r: float = 3.4
    wall_h: float = 6.0
    tower_rest_h: float = 6.2
    boom_len: float = 8.4
    variant: str = "radome"


AGENT_STATION_SPECS: dict[str, AgentStationSpec] = {
    "research-center": AgentStationSpec(
        building_id="research-center",
        prefix="RC_",
        accent_rgb=(0.13, 0.77, 0.37),
        body_rgb=(0.18, 0.32, 0.24),
        trim_rgb=(0.35, 0.82, 0.52),
        core_r=3.2,
        wall_h=5.8,
        variant="greenhouse",
    ),
    "development-center": AgentStationSpec(
        building_id="development-center",
        prefix="DC_",
        accent_rgb=(0.85, 0.47, 0.04),
        body_rgb=(0.28, 0.24, 0.20),
        trim_rgb=(0.92, 0.62, 0.18),
        core_r=3.8,
        wall_h=5.2,
        variant="factory",
    ),
    "qa-center": AgentStationSpec(
        building_id="qa-center",
        prefix="QA_",
        accent_rgb=(0.22, 0.74, 0.97),
        body_rgb=(0.20, 0.28, 0.36),
        trim_rgb=(0.45, 0.78, 0.96),
        core_r=2.5,
        wall_h=8.6,
        tower_rest_h=7.4,
        boom_len=9.0,
        variant="tower",
    ),
    "deploy-pad": AgentStationSpec(
        building_id="deploy-pad",
        prefix="DP_",
        accent_rgb=(0.91, 0.47, 0.98),
        body_rgb=(0.24, 0.22, 0.30),
        trim_rgb=(0.72, 0.42, 0.88),
        core_r=3.0,
        wall_h=4.2,
        variant="rocket",
    ),
}


def get_agent_station_spec(building_id: str) -> AgentStationSpec:
    spec = AGENT_STATION_SPECS.get(building_id)
    if spec is None:
        known = ", ".join(sorted(AGENT_STATION_SPECS))
        raise KeyError(f"Unknown agent station {building_id!r} — expected one of: {known}")
    return spec
