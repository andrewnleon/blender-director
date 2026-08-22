"use client";

import type { AgentStreamStatus } from "@/hooks/use-agent-stream";

type AgentStreamConnectButtonProps = {
  isEnabled: boolean;
  status: AgentStreamStatus;
  onToggle: () => void;
  layout?: "inline" | "block";
};

function statusLabel(isEnabled: boolean, status: AgentStreamStatus): string {
  if (!isEnabled) {
    return "Connect";
  }
  switch (status) {
    case "connected":
      return "Disconnect";
    case "reconnecting":
      return "Reconnecting…";
    case "connecting":
      return "Connecting…";
    default:
      return "Disconnect";
  }
}

function statusAriaLabel(isEnabled: boolean, status: AgentStreamStatus): string {
  if (!isEnabled) {
    return "Connect to OpenClaw agent data stream";
  }
  switch (status) {
    case "connected":
      return "Disconnect OpenClaw agent data stream";
    case "reconnecting":
      return "Reconnecting to OpenClaw agent data stream";
    case "connecting":
      return "Connecting to OpenClaw agent data stream";
    default:
      return "Disconnect OpenClaw agent data stream";
  }
}

export function AgentStreamConnectButton({
  isEnabled,
  status,
  onToggle,
  layout = "inline",
}: AgentStreamConnectButtonProps) {
  const isConnected = isEnabled && status === "connected";
  const isPending =
    isEnabled && (status === "connecting" || status === "reconnecting");

  const stateClasses = isConnected
    ? "border-emerald-300/70 bg-emerald-200/10 text-emerald-100 hover:border-emerald-300/80 hover:bg-emerald-200/15"
    : isPending
      ? "border-amber-300/70 bg-amber-200/10 text-amber-100 hover:border-amber-300/80 hover:bg-amber-200/15"
      : "border-white/10 bg-black/55 text-zinc-200 hover:border-white/20 hover:bg-black/65";

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={isEnabled}
      aria-label={statusAriaLabel(isEnabled, status)}
      className={`pointer-events-auto rounded-lg border text-xs backdrop-blur-md transition ${
        layout === "block"
          ? `w-full px-3 py-2.5 text-sm ${stateClasses}`
          : `px-3 py-2 ${stateClasses}`
      }`}
    >
      <span className="flex items-center justify-center gap-2">
        {isEnabled ? (
          <span
            className={`size-1.5 shrink-0 rounded-full ${
              isConnected
                ? "bg-emerald-400"
                : isPending
                  ? "bg-amber-400 animate-pulse"
                  : "bg-zinc-500"
            }`}
            aria-hidden="true"
          />
        ) : null}
        {statusLabel(isEnabled, status)}
      </span>
    </button>
  );
}
