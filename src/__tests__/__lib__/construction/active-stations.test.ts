import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { activeStationLabels } from "@/lib/construction/active-stations";
import type { Agent, AgentTask } from "@/types/openclaw";

const agent: Agent = {
  id: "development",
  name: "Development",
  role: "Build",
  description: "Build",
  status: "working",
  capabilities: [],
  emoji: "🔧",
  color: "#d97706",
};

describe("activeStationLabels", () => {
  it("maps busy agents to station labels", () => {
    const tasks: AgentTask[] = [
      {
        id: "task-1",
        title: "Build feature",
        description: "",
        status: "in-progress",
        priority: "medium",
        assignedAgentIds: ["development"],
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
    ];
    assert.deepEqual(activeStationLabels([agent], tasks), [
      "Development Center",
    ]);
  });
});
