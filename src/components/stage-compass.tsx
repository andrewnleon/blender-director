"use client";

import { useState } from "react";
import {
  formatStageCameraPose,
  formatStageCameraPoseShort,
  type StageCameraPose,
} from "@/lib/camera-settings";

type StageCompassProps = {
  headingDegrees: number;
};

export function StageCompass({ headingDegrees }: StageCompassProps) {
  const rounded = Math.round(headingDegrees);

  return (
    <div
      className="pointer-events-auto flex flex-col items-center gap-1"
      role="img"
      aria-label={`Stage compass. North is minus Z. View heading ${rounded} degrees.`}
    >
      <div className="relative size-16 rounded-full border border-white/15 bg-black/70 shadow-lg backdrop-blur-md">
        <div
          className="absolute inset-1"
          style={{ transform: `rotate(${headingDegrees}deg)` }}
        >
          <span className="absolute top-0 left-1/2 -translate-x-1/2 text-[10px] font-semibold text-amber-200">
            N
          </span>
          <span className="absolute right-0.5 top-1/2 -translate-y-1/2 text-[9px] text-zinc-400">
            E
          </span>
          <span className="absolute bottom-0 left-1/2 -translate-x-1/2 text-[9px] text-zinc-500">
            S
          </span>
          <span className="absolute top-1/2 left-0.5 -translate-y-1/2 text-[9px] text-zinc-400">
            W
          </span>
          <span
            aria-hidden="true"
            className="absolute top-3.5 left-1/2 h-4 w-0 -translate-x-1/2 border-x-[4px] border-b-[9px] border-x-transparent border-b-amber-200"
          />
        </div>
      </div>
      <p className="text-[10px] uppercase tracking-[0.14em] text-zinc-400">
        North
      </p>
    </div>
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
      ? "Copied"
      : copyStatus === "failed"
        ? "Copy failed"
        : "Copy text";

  return (
    <div className="pointer-events-auto flex w-28 flex-col items-end gap-0.5 text-right">
      <p className="font-mono text-[10px] leading-tight text-zinc-200 tabular-nums">
        {pose ? formatStageCameraPoseShort(pose) : "—  —  —"}
      </p>
      <button
        type="button"
        disabled={!pose}
        onClick={() => {
          void handleCopy();
        }}
        className="text-[10px] text-amber-200/90 underline decoration-amber-200/40 underline-offset-2 hover:text-amber-100 disabled:cursor-not-allowed disabled:text-zinc-500 disabled:no-underline"
      >
        {copyLabel}
      </button>
    </div>
  );
}
