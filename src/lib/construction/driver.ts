import type { Agent, AgentTask } from "@/types/openclaw";
import type { ConstructionState } from "@/lib/construction/types";
import {
  constructionStageForCatalog,
  primaryAgentStatus,
  progressFromStage,
} from "@/lib/construction/progress-map";
import {
  BUILDING_DEFINITIONS,
  getBuildingDefinition,
} from "@/lib/construction/asset-registry";

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

  const stage = constructionStageForCatalog(catalogId, agents, tasks);
  const progress = progressFromStage(stage);
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
