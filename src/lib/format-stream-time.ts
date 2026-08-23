/** Short relative label for OpenClaw SSE timestamps. */
export function formatStreamEventTime(isoTimestamp: string, nowMs = Date.now()): string {
  const eventMs = Date.parse(isoTimestamp);
  if (Number.isNaN(eventMs)) {
    return "unknown time";
  }
  const deltaSeconds = Math.max(0, Math.round((nowMs - eventMs) / 1000));
  if (deltaSeconds < 5) {
    return "just now";
  }
  if (deltaSeconds < 60) {
    return `${deltaSeconds}s ago`;
  }
  const deltaMinutes = Math.round(deltaSeconds / 60);
  if (deltaMinutes < 60) {
    return `${deltaMinutes}m ago`;
  }
  return new Date(eventMs).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}
