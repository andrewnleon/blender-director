"use client";

import { useGLTF } from "@react-three/drei";
import { useEffect } from "react";
import { getCatalogGlbUrl } from "@/lib/catalog";

/** Warm drei + HTTP cache for one catalog GLB. Safe to call many times. */
export function preloadCatalogGlbById(catalogId: string): void {
  const url = getCatalogGlbUrl(catalogId);
  if (!url) {
    return;
  }
  useGLTF.preload(url);
}

/** Preload selected palette item while user aims at the grid. */
export function useCatalogGlbPreload(catalogId: string | null): void {
  useEffect(() => {
    if (!catalogId) {
      return;
    }
    preloadCatalogGlbById(catalogId);
  }, [catalogId]);
}
