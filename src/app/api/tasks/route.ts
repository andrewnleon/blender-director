import { NextResponse } from "next/server";
import { getOpenClawUpstreamOrigin } from "@/lib/openclaw-upstream";

export async function GET(request: Request) {
  const origin = getOpenClawUpstreamOrigin();
  if (!origin) {
    return NextResponse.json(
      { error: "OpenClaw upstream is not configured." },
      { status: 503 },
    );
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.toString();
  const upstreamUrl = query
    ? `${origin}/api/tasks?${query}`
    : `${origin}/api/tasks`;

  try {
    const response = await fetch(upstreamUrl, { cache: "no-store" });
    const payload = await response.json();
    if (!response.ok) {
      return NextResponse.json(payload, { status: response.status });
    }
    return NextResponse.json(payload);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Upstream failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
