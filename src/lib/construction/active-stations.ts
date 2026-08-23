import type { Agent, AgentTask } from "@/types/openclaw";
import {
  BUILDING_DEFINITIONS,
  STATION_LABEL,
  stationIdForAgent,
} from "@/lib/construction/asset-registry";

function agentIdsWithActiveTasks(tasks: readonly AgentTask[]): Set<string> {
  const activeStatuses = new Set<AgentTask["status"]>([
    "assigned",
    "in-progress",
    "review",
    "blocked",
  ]);
  const agentIds = new Set<string>();
  for (const task of tasks) {
    if (!activeStatuses.has(task.status)) {
      continue;
    }
    for (const agentId of task.assignedAgentIds) {
      agentIds.add(agentId);
    }
  }
  return agentIds;
}

/** Hero station labels with live agent work — for stream chrome. */
export function activeStationLabels(
  agents: readonly Agent[],
  tasks: readonly AgentTask[],
): string[] {
  const busyAgentIds = agentIdsWithActiveTasks(tasks);
  for (const agent of agents) {
    if (agent.status === "working" || agent.status === "thinking") {
      busyAgentIds.add(agent.id);
    }
  }

  const labels: string[] = [];
  for (const agentId of busyAgentIds) {
    const stationId = stationIdForAgent(agentId);
    const label = STATION_LABEL[stationId];
    if (label && !labels.includes(label)) {
      labels.push(label);
    }
  }
  return labels;
}

export function catalogIdsForAgent(agentId: string): string[] {
  return BUILDING_DEFINITIONS.filter((definition) =>
    definition.agentIds.includes(agentId),
  ).map((definition) => definition.catalogId);
}
