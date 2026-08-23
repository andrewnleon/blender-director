"use client";

import { useState } from "react";
import {
  formatStageCameraPose,
  formatStageCameraPoseShort,
  type StageCameraPose,
} from "@/lib/camera-settings";
import { yardChromeCardClass } from "@/components/yard-chrome-styles";

type StageCompassProps = {
  headingDegrees: number;
  compact?: boolean;
};

export function StageCompass({
  headingDegrees,
  compact = false,
}: StageCompassProps) {
  const rounded = Math.round(headingDegrees);
  const dialSize = compact ? "size-10" : "size-16";

  return (
    <div
      className="flex shrink-0 flex-col items-center gap-0.5"
      role="img"
      aria-label={`Stage compass. North is minus Z. View heading ${rounded} degrees.`}
    >
      <div
        className={`relative ${dialSize} rounded-full border border-white/15 bg-black/50`}
      >
        <div
          className="absolute inset-1"
          style={{ transform: `rotate(${headingDegrees}deg)` }}
        >
          <span className="absolute top-0 left-1/2 -translate-x-1/2 text-[9px] font-semibold text-amber-200">
            N
          </span>
          <span className="absolute top-1/2 right-0 -translate-y-1/2 text-[8px] font-medium text-zinc-400">
            E
          </span>
          <span className="absolute bottom-0 left-1/2 -translate-x-1/2 text-[8px] font-medium text-zinc-500">
            S
          </span>
          <span className="absolute top-1/2 left-0 -translate-y-1/2 text-[8px] font-medium text-zinc-400">
            W
          </span>
          <span
            aria-hidden="true"
            className="absolute top-2 left-1/2 h-3 w-0 -translate-x-1/2 border-x-[2.5px] border-b-[7px] border-x-transparent border-b-amber-200"
          />
        </div>
      </div>
      {!compact ? (
        <p className="text-[10px] uppercase tracking-[0.14em] text-zinc-400">
          North
        </p>
      ) : (
        <p className="font-mono text-[9px] tabular-nums text-zinc-500">
          {rounded}°
        </p>
      )}
    </div>
  );
}

function CopyIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      className="size-3.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <path
        d="M5.5 3.5h5a1 1 0 0 1 1 1v7.5a1 1 0 0 1-1 1h-5a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M3.5 6.5h-.5a1 1 0 0 0-1 1v5a1 1 0 0 0 1 1h5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

type StageCameraPoseReadoutProps = {
  pose: StageCameraPose | null;
};

export function StageCameraPoseReadout({ pose }: StageCameraPoseReadoutProps) {
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "failed">(
    "idle",
  );

  async function handleCopy() {
    if (!pose) {
      return;
    }
    const text = formatStageCameraPose(pose);
    try {
      await navigator.clipboard.writeText(text);
      setCopyStatus("copied");
    } catch {
      setCopyStatus("failed");
    }
    window.setTimeout(() => {
      setCopyStatus("idle");
    }, 1600);
  }

  const copyLabel =
    copyStatus === "copied"
      ? "Copied camera pose"
      : copyStatus === "failed"
        ? "Copy failed"
        : "Copy camera pose text";

  return (
    <div className="min-w-0 flex-1 text-right">
      <div className="flex items-start justify-end gap-1.5">
        <div className="min-w-0 space-y-0.5">
          <p className="font-mono text-[10px] leading-tight text-zinc-100 tabular-nums">
            <span className="text-zinc-500">pos </span>
            {pose ? formatStageCameraPoseShort(pose) : "—  —  —"}
          </p>
          <p className="font-mono text-[10px] leading-tight text-zinc-400 tabular-nums">
            <span className="text-zinc-500">rot </span>
            {pose
              ? `${pose.headingDegrees.toFixed(0)}° hdg · ${pose.polar.toFixed(2)} pol`
              : "—"}
          </p>
        </div>
        <button
          type="button"
          disabled={!pose}
          aria-label={copyLabel}
          title={copyLabel}
          onClick={() => {
            void handleCopy();
          }}
          className="mt-px flex size-6 shrink-0 items-center justify-center rounded border border-white/10 text-zinc-400 transition hover:border-white/20 hover:bg-white/5 hover:text-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-100 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <CopyIcon />
        </button>
      </div>
      <p
        className="sr-only"
        aria-live="polite"
        aria-atomic="true"
      >
        {copyStatus === "copied"
          ? "Camera pose copied"
          : copyStatus === "failed"
            ? "Could not copy camera pose"
            : ""}
      </p>
    </div>
  );
}

type StageNavigationReadoutProps = {
  headingDegrees: number;
  pose: StageCameraPose | null;
};

export function StageNavigationReadout({
  headingDegrees,
  pose,
}: StageNavigationReadoutProps) {
  return (
    <div
      className={`${yardChromeCardClass} flex w-full min-w-0 items-start gap-2 px-2 py-1.5`}
    >
      <StageCompass headingDegrees={headingDegrees} compact />
      <StageCameraPoseReadout pose={pose} />
    </div>
  );
}
