"use client";

import { useProgress } from "@react-three/drei";

type StagePreloaderShellProps = {
  loadedPercent: number;
  statusText: string;
};

function clampPercent(loadedPercent: number): number {
  return Math.min(100, Math.max(0, loadedPercent));
}

/** Shared boot chrome — works before drei hydrates. */
export function StagePreloaderShell({
  loadedPercent,
  statusText,
}: StagePreloaderShellProps) {
  const clampedPercent = clampPercent(loadedPercent);

  return (
    <div
      className="flex h-dvh w-full flex-col items-center justify-center bg-[#1b1e1c] px-6"
      role="status"
      aria-live="polite"
      aria-busy={clampedPercent < 100}
    >
      <p className="text-[11px] uppercase tracking-[0.18em] text-amber-200/80">
        OpenClaw Stage
      </p>
      <p className="mt-3 text-center text-sm text-zinc-300">{statusText}</p>
      <div
        className="mt-5 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-zinc-800"
        aria-hidden
      >
        <div
          className="h-full rounded-full bg-amber-200/85 transition-[width] duration-200 ease-out"
          style={{ width: `${clampedPercent}%` }}
        />
      </div>
      <p className="mt-2 text-xs tabular-nums text-zinc-400">
        {Math.round(clampedPercent)}%
      </p>
    </div>
  );
}

function shortAssetName(url: string): string {
  const path = url.split("?")[0] ?? url;
  const fileName = path.split("/").pop();
  return fileName && fileName.length > 0 ? fileName : "models";
}

/** Progress overlay while drei loaders pull first-wave GLBs and textures. */
export function StagePreloader() {
  const { progress, item, active } = useProgress();
  const statusText = active && item
    ? `Loading ${shortAssetName(item)}`
    : "Loading models";

  return (
    <StagePreloaderShell loadedPercent={progress} statusText={statusText} />
  );
}
