/** Resolve mission-control origin for API + SSE proxy routes. */

export function getOpenClawUpstreamOrigin(): string | null {
  const eventsUpstream = process.env.OPENCLAW_EVENTS_UPSTREAM;
  if (eventsUpstream) {
    try {
      return new URL(eventsUpstream).origin;
    } catch {
      // ignore invalid URL
    }
  }

  const origin = process.env.OPENCLAW_UPSTREAM_ORIGIN;
  if (origin) {
    try {
      return new URL(origin).origin;
    } catch {
      return null;
    }
  }

  return null;
}

export function getOpenClawEventsUrl(origin: string): string {
  return `${origin}/api/events`;
}
