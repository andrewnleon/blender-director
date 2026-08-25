"use client";

import { useGLTF, useTexture } from "@react-three/drei";
import { Suspense, type ReactNode } from "react";
import { StagePreloader } from "@/components/stage-preloader";
import {
  getLibraryCatalogItems,
  getLibraryPreloadPriority,
} from "@/lib/library-layout";
import {
  catalogIdsToGlbUrls,
  getFirstWaveCatalogIds,
  getStageTexturePreloadUrls,
} from "@/lib/stage-preload";

const FIRST_WAVE_GLB_URLS = catalogIdsToGlbUrls(
  getFirstWaveCatalogIds(getLibraryPreloadPriority(getLibraryCatalogItems())),
);
const STAGE_TEXTURE_PRELOAD_URLS = getStageTexturePreloadUrls();

for (const url of FIRST_WAVE_GLB_URLS) {
  useGLTF.preload(url);
}
useTexture.preload([...STAGE_TEXTURE_PRELOAD_URLS]);

type StageBootGateProps = {
  children: ReactNode;
};

/** Suspend until hero GLBs + first-paint textures sit in the drei cache. */
export function StageBootGate({ children }: StageBootGateProps) {
  return (
    <Suspense fallback={<StagePreloader />}>{children}</Suspense>
  );
}