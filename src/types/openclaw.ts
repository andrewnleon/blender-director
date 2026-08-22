/** OpenClaw agent + task shapes (aligned with mission-control). */

export type AgentStatus =
  | "idle"
  | "thinking"
  | "working"
  | "waiting"
  | "blocked"
  | "offline"
  | "error";

export type TaskStatus =
  | "queued"
  | "assigned"
  | "in-progress"
  | "review"
  | "blocked"
  | "completed"
  | "failed";

export type TaskPriority = "low" | "medium" | "high" | "critical";

export interface Agent {
  id: string;
  name: string;
  role: string;
  description: string;
  status: AgentStatus;
  currentTaskId?: string;
  currentSessionId?: string;
  lastActivityAt?: string;
  capabilities: string[];
  emoji: string;
  color: string;
}

export interface AgentTask {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignedAgentIds: string[];
  createdAt: string;
  updatedAt: string;
  parentTaskId?: string;
  dependencies?: string[];
  outputSummary?: string;
}
