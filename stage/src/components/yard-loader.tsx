"use client";

import dynamic from "next/dynamic";

export const OpenClawYardLoader = dynamic(
  () =>
    import("@/components/openclaw-yard").then((mod) => mod.OpenClawYard),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-dvh items-center justify-center bg-[#1b1e1c] text-sm text-zinc-400">
        Booting OpenClaw Yard…
      </div>
    ),
  },
);
