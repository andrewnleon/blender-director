import type { Agent, AgentTask } from "@/types/openclaw";
import {
  BUILDING_DEFINITIONS,
  getBuildingDefinition,
} from "@/lib/construction/asset-registry";
import {
  constructionStageForCatalog,
  primaryAgentStatus,
  progressFromStage,
  progressFromTaskStatuses,
  tasksForAgent,
  tasksForStation,
} from "@/lib/construction/progress-map";
import type { ConstructionState } from "@/lib/construction/types";

/** Bind-pose scrub when no OpenClaw tasks are driving this catalog entry yet. */
export const EMPTY_CONSTRUCTION_STATE: ConstructionState = {
  stage: 0,
  progress: 0,
  isLive: false,
};

export type ConstructDriveMode = "auto" | "scrub";

/**
 * OpenClaw yard construct drive — **not** library mode.
 * Library uses `staticPreview` + `libraryConstructPlayback()` in stage-canvas;
 * yard uses this helper only (never library layout / replay rules).
 *
 * Yard always scrubs: bind pose at progress 0 on page load / idle map;
 * live stream or preview mock maps advance progress without auto-playing clips.
 * Catalog id / state kept for call-site stability (progress read elsewhere).
 */
export function constructDriveModeForCatalog(
  _catalogId: string,
  _constructionState: ConstructionState | undefined,
): ConstructDriveMode {
  return "scrub";
}

export function constructionStateForCatalog(
  catalogId: string,
  agents: readonly Agent[],
  tasks: readonly AgentTask[],
  isLive: boolean,
): ConstructionState {
  const definition = getBuildingDefinition(catalogId);
  if (!definition) {
    return { stage: 3, progress: 1, isLive };
  }

  let relevantTasks: AgentTask[] = [];
  switch (definition.bindMode) {
    case "all-tasks":
      relevantTasks = [...tasks];
      break;
    case "station-tasks":
      relevantTasks = tasksForStation(definition.stationId, agents, tasks);
      break;
    case "agent-tasks":
      relevantTasks = tasksForAgent(definition.agentId, tasks);
      break;
    default:
      relevantTasks = [...tasks];
  }

  const stage = constructionStageForCatalog(catalogId, agents, tasks);
  const progress =
    relevantTasks.length > 0
      ? progressFromTaskStatuses(relevantTasks.map((task) => task.status))
      : progressFromStage(stage);
  const agentStatus = primaryAgentStatus(definition.agentIds, agents);

  return {
    stage,
    progress,
    agentStatus,
    isLive,
  };
}

export function buildConstructionMap(
  agents: readonly Agent[],
  tasks: readonly AgentTask[],
  isLive: boolean,
): Record<string, ConstructionState> {
  const map: Record<string, ConstructionState> = {};
  for (const definition of BUILDING_DEFINITIONS) {
    map[definition.catalogId] = constructionStateForCatalog(
      definition.catalogId,
      agents,
      tasks,
      isLive,
    );
  }
  return map;
}

export function clipTimeForProgress(
  clipDuration: number,
  progress: number,
): number {
  const clamped = Math.min(1, Math.max(0, progress));
  return clamped * clipDuration;
}

export function isConstructionComplete(progress: number): boolean {
  return progress >= 0.99;
}

/** Library rest — hollow-complete (clip end). Replay grows from 0. */
export const LIBRARY_REST_PROGRESS = 1;

export function libraryConstructPlayback(isReplay: boolean): {
  driveMode: ConstructDriveMode;
  progress: number;
} {
  if (isReplay) {
    return { driveMode: "auto", progress: 0 };
  }
  return { driveMode: "scrub", progress: LIBRARY_REST_PROGRESS };
}
