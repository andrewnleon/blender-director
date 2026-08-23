"use client";

import { useEffect, useMemo, useState } from "react";
import { preloadCatalogGlbById } from "@/hooks/use-catalog-glb-preload";
import { getCatalogGlbUrl } from "@/lib/catalog";
import {
  getBackgroundCatalogIds,
  getFirstWaveCatalogIds,
  STAGE_BACKGROUND_CONCURRENCY,
} from "@/lib/stage-preload";

type UseProgressiveCatalogPreloadOptions = {
  /** Loaded first — hover target, stream hero, etc. */
  priorityCatalogIds?: readonly string[];
  /** Yard lots restored from session or placed on grid. */
  catalogIds?: readonly string[];
  /** Delay between starting each preload (ms). Unused when concurrency is set. */
  staggerMs?: number;
  backgroundConcurrency?: number;
};

function warmCatalogGlb(catalogId: string): Promise<void> {
  const url = getCatalogGlbUrl(catalogId);
  preloadCatalogGlbById(catalogId);
  if (!url) {
    return Promise.resolve();
  }
  return fetch(url, { credentials: "same-origin" }).then(() => undefined);
}

/**
 * First-wave ids mount immediately (boot gate already parsed them).
 * Background pack GLBs stay at placeholders until HTTP cache is warm.
 */
export function useProgressiveCatalogPreload(
  options: UseProgressiveCatalogPreloadOptions,
): ReadonlySet<string> {
  const {
    priorityCatalogIds = [],
    catalogIds = [],
    backgroundConcurrency = STAGE_BACKGROUND_CONCURRENCY,
  } = options;
  const firstWaveKey = useMemo(
    () => getFirstWaveCatalogIds(priorityCatalogIds).join("\0"),
    [priorityCatalogIds],
  );
  const backgroundKey = useMemo(
    () => getBackgroundCatalogIds(priorityCatalogIds, catalogIds).join("\0"),
    [catalogIds, priorityCatalogIds],
  );

  const [readyCatalogIds, setReadyCatalogIds] = useState<ReadonlySet<string>>(
    () => new Set(getFirstWaveCatalogIds(priorityCatalogIds)),
  );

  useEffect(() => {
    const firstWaveIds = firstWaveKey.length > 0 ? firstWaveKey.split("\0") : [];
    const backgroundIds =
      backgroundKey.length > 0 ? backgroundKey.split("\0") : [];

    let cancelled = false;
    const ready = new Set(firstWaveIds);
    setReadyCatalogIds(new Set(ready));

    if (backgroundIds.length === 0) {
      return;
    }

    function markReady(catalogId: string) {
      if (cancelled) {
        return;
      }
      ready.add(catalogId);
      setReadyCatalogIds(new Set(ready));
    }

    let nextIndex = 0;
    const workerCount = Math.max(1, backgroundConcurrency);

    async function runWorker() {
      while (!cancelled && nextIndex < backgroundIds.length) {
        const catalogId = backgroundIds[nextIndex];
        nextIndex += 1;
        if (!catalogId) {
          break;
        }
        try {
          await warmCatalogGlb(catalogId);
        } catch {
          preloadCatalogGlbById(catalogId);
        }
        markReady(catalogId);
      }
    }

    void Promise.all(
      Array.from({ length: Math.min(workerCount, backgroundIds.length) }, () =>
        runWorker(),
      ),
    );

    return () => {
      cancelled = true;
    };
  }, [backgroundConcurrency, backgroundKey, firstWaveKey]);

  return readyCatalogIds;
}
