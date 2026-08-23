"use client";

import dynamic from "next/dynamic";
import { StagePreloaderShell } from "@/components/stage-preloader";

export const OpenClawYardLoader = dynamic(
  () =>
    import("@/components/stage-yard-root").then((mod) => mod.StageYardRoot),
  {
    ssr: false,
    loading: () => (
      <StagePreloaderShell
        loadedPercent={6}
        statusText="Booting stage viewer"
      />
    ),
  },
);
