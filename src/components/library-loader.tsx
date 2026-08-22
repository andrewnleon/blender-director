"use client";

import dynamic from "next/dynamic";

export const AssetLibraryLoader = dynamic(
  () =>
    import("@/components/asset-library").then((mod) => mod.AssetLibrary),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-dvh items-center justify-center bg-[#1b1e1c] text-sm text-zinc-400">
        Loading asset library…
      </div>
    ),
  },
);
