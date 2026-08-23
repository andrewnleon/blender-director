import type { AgentStatus } from "@/types/openclaw";

export type BuildingStage = 0 | 1 | 2 | 3;

export type ConstructionTier = "staged" | "scheduled";

export type ConstructionBindMode = "agent-tasks" | "station-tasks" | "all-tasks";

export type ConstructionState = {
  stage: BuildingStage;
  /** Normalized 0–1 scrub position for GLB construct clips. */
  progress: number;
  agentStatus?: AgentStatus;
  isLive: boolean;
};

/** Shared 0–1 construct clock — pack site kit follows the building mixer. */
export type ConstructClock = {
  progress01: number;
  isPlaying: boolean;
};
