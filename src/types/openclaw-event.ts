/** SSE payloads from OpenClaw / mission-control `/api/events`. */

export type OpenClawEventType =
  | "agent.status.changed"
  | "session.started"
  | "session.updated"
  | "session.completed"
  | "task.created"
  | "task.assigned"
  | "task.updated"
  | "task.completed"
  | "message.created"
  | "error.created"
  | "file.changed"
  | "connection.status";

export interface OpenClawEvent {
  type: OpenClawEventType;
  timestamp: string;
  agentId?: string;
  sessionId?: string;
  taskId?: string;
  payload: Record<string, unknown>;
  id: string;
}
