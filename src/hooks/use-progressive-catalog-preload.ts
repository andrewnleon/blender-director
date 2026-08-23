"use client";

import { useEffect, useMemo, useState } from "react";
import { preloadCatalogGlbById } from "@/hooks/use-catalog-glb-preload";

type UseProgressiveCatalogPreloadOptions = {
  /** Loaded first — hover target, stream hero, etc. */
  priorityCatalogIds?: readonly string[];
  /** Yard lots restored from session or placed on grid. */
  catalogIds?: readonly string[];
  /** Delay between starting each preload (ms). */
  staggerMs?: number;
};

function uniqueCatalogIds(ids: readonly string[]): string[] {
  const seen = new Set<string>();
  const ordered: string[] = [];
  for (const catalogId of ids) {
    if (seen.has(catalogId)) {
      continue;
    }
    seen.add(catalogId);
    ordered.push(catalogId);
  }
  return ordered;
}

/**
 * Stagger GLB preloads so session restore does not fetch every pack at once.
 * Returns catalog ids safe to mount (priority first, then one-by-one).
 */
export function useProgressiveCatalogPreload(
  options: UseProgressiveCatalogPreloadOptions,
): ReadonlySet<string> {
  const { priorityCatalogIds = [], catalogIds = [], staggerMs = 48 } = options;
  const queueKey = useMemo(() => {
    const queue = uniqueCatalogIds([...priorityCatalogIds, ...catalogIds]);
    return queue.join("\0");
  }, [catalogIds, priorityCatalogIds]);

  const [readyCatalogIds, setReadyCatalogIds] = useState<ReadonlySet<string>>(
    () => new Set(),
  );

  useEffect(() => {
    const queue = queueKey.length > 0 ? queueKey.split("\0") : [];
    if (queue.length === 0) {
      setReadyCatalogIds(new Set());
      return;
    }

    let cancelled = false;
    let index = 0;
    const ready = new Set<string>();

    function markReady(catalogId: string) {
      if (cancelled) {
        return;
      }
      ready.add(catalogId);
      setReadyCatalogIds(new Set(ready));
    }

    function preloadNext() {
      if (cancelled || index >= queue.length) {
        return;
      }
      const catalogId = queue[index];
      index += 1;
      preloadCatalogGlbById(catalogId);
      markReady(catalogId);
      window.setTimeout(preloadNext, staggerMs);
    }

    preloadNext();

    return () => {
      cancelled = true;
    };
  }, [queueKey, staggerMs]);

  return readyCatalogIds;
}
