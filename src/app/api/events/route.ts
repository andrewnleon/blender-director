import { getOpenClawEventsUrl, getOpenClawUpstreamOrigin } from "@/lib/openclaw-upstream";

/**
 * Proxies OpenClaw SSE from mission-control (or another upstream).
 * Set OPENCLAW_EVENTS_UPSTREAM or OPENCLAW_UPSTREAM_ORIGIN.
 */
export async function GET(request: Request) {
  const origin = getOpenClawUpstreamOrigin();

  if (!origin) {
    return new Response(
      "OpenClaw upstream is not configured. Set OPENCLAW_EVENTS_UPSTREAM or OPENCLAW_UPSTREAM_ORIGIN.",
      { status: 503 },
    );
  }

  const upstream = getOpenClawEventsUrl(origin);
  const lastEventId = request.headers.get("last-event-id");
  const upstreamUrl = lastEventId
    ? `${upstream}?Last-Event-ID=${encodeURIComponent(lastEventId)}`
    : upstream;

  try {
    const upstreamResponse = await fetch(upstreamUrl, {
      headers: {
        Accept: "text/event-stream",
        ...(lastEventId ? { "Last-Event-ID": lastEventId } : {}),
      },
      cache: "no-store",
    });

    if (!upstreamResponse.ok || !upstreamResponse.body) {
      return new Response(
        `Upstream events stream failed (${upstreamResponse.status})`,
        { status: upstreamResponse.status === 200 ? 502 : upstreamResponse.status },
      );
    }

    return new Response(upstreamResponse.body, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Upstream connection failed";
    return new Response(message, { status: 502 });
  }
}
