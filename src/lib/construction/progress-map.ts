import type { Agent, AgentTask, AgentStatus, TaskStatus } from "@/types/openclaw";
import type { BuildingStage } from "@/lib/construction/types";
import {
  getBuildingDefinition,
  stationIdForAgent,
} from "@/lib/construction/asset-registry";

export function stageForTaskStatus(status: TaskStatus): BuildingStage {
  switch (status) {
    case "queued":
      return 0;
    case "assigned":
    case "in-progress":
      return 1;
    case "review":
    case "blocked":
      return 2;
    case "completed":
      return 3;
    case "failed":
      return 1;
    default:
      return 3;
  }
}

export function stageFromTaskStatuses(statuses: TaskStatus[]): BuildingStage {
  if (statuses.length === 0) {
    return 3;
  }
  let best: BuildingStage = 0;
  for (const status of statuses) {
    const stage = stageForTaskStatus(status);
    if (stage > best) {
      best = stage;
    }
  }
  return best;
}

export function progressFromStage(stage: BuildingStage): number {
  if (stage <= 0) {
    return 0;
  }
  return stage / 3;
}

export function tasksForAgent(agentId: string, tasks: readonly AgentTask[]): AgentTask[] {
  return tasks.filter((task) => task.assignedAgentIds.includes(agentId));
}

export function tasksForStation(
  stationId: string,
  agents: readonly Agent[],
  tasks: readonly AgentTask[],
): AgentTask[] {
  const agentIds = new Set(
    agents
      .filter((agent) => stationIdForAgent(agent.id) === stationId)
      .map((agent) => agent.id),
  );
  return tasks.filter((task) =>
    task.assignedAgentIds.some((id) => agentIds.has(id)),
  );
}

export function primaryAgentStatus(
  agentIds: readonly string[],
  agents: readonly Agent[],
): AgentStatus | undefined {
  for (const agentId of agentIds) {
    const agent = agents.find((entry) => entry.id === agentId);
    if (agent) {
      return agent.status;
    }
  }
  return undefined;
}

export function constructionStageForCatalog(
  catalogId: string,
  agents: readonly Agent[],
  tasks: readonly AgentTask[],
): BuildingStage {
  const definition = getBuildingDefinition(catalogId);
  if (!definition) {
    return 3;
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

  return stageFromTaskStatuses(relevantTasks.map((task) => task.status));
}
