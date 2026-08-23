import type { Agent, AgentTask, TaskStatus } from "@/types/openclaw";

const MOCK_TIMESTAMP = "2026-01-01T00:00:00.000Z";

/** Agents referenced by staged building definitions in the asset registry. */
export const MOCK_OPENCLAW_AGENTS: Agent[] = [
  {
    id: "orcha",
    name: "Orcha",
    role: "Orchestrator",
    description: "Coordinates specialist agents",
    status: "working",
    capabilities: ["planning", "delegation"],
    emoji: "🎯",
    color: "#7c5cbf",
  },
  {
    id: "research-planning",
    name: "Research",
    role: "Planning",
    description: "Plans features and architecture",
    status: "working",
    capabilities: ["research", "planning"],
    emoji: "📋",
    color: "#22c55e",
  },
  {
    id: "development",
    name: "Development",
    role: "Build",
    description: "Implements approved work",
    status: "working",
    capabilities: ["implementation"],
    emoji: "🔧",
    color: "#d97706",
  },
  {
    id: "qa-review",
    name: "QA Review",
    role: "Review",
    description: "Validates quality and regressions",
    status: "working",
    capabilities: ["review", "testing"],
    emoji: "✅",
    color: "#38bdf8",
  },
  {
    id: "operations",
    name: "Operations",
    role: "Deploy",
    description: "Ships and monitors releases",
    status: "working",
    capabilities: ["deploy", "ops"],
    emoji: "🚀",
    color: "#e879f9",
  },
];

const PREVIEW_TASK_STATUSES: TaskStatus[] = [
  "queued",
  "in-progress",
  "review",
  "completed",
];

/**
 * Mock OpenClaw tasks for preview — one task per agent, all advance together
 * so every staged lot grows in sync (like a live orchestrator run).
 */
export function mockOpenClawTasksForPreviewStep(step: number): AgentTask[] {
  const status =
    PREVIEW_TASK_STATUSES[Math.min(step, PREVIEW_TASK_STATUSES.length - 1)];

  return MOCK_OPENCLAW_AGENTS.map((agent) => ({
    id: `preview-task-${agent.id}`,
    title: `Preview work for ${agent.name}`,
    description: "Mock OpenClaw task driving yard construct scrub",
    status,
    priority: "medium",
    assignedAgentIds: [agent.id],
    createdAt: MOCK_TIMESTAMP,
    updatedAt: MOCK_TIMESTAMP,
  }));
}

export const OPENCLAW_PREVIEW_STEP_COUNT = PREVIEW_TASK_STATUSES.length;
export const OPENCLAW_PREVIEW_STEP_MS = 2800;
