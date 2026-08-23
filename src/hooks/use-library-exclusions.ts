import { useCallback, useEffect, useState } from "react";
import {
  parseExcludedCatalogIds,
  readLocalExcludedCatalogIds,
  writeLocalExcludedCatalogIds,
} from "@/lib/library-exclusions";

function parseExclusionsResponse(payload: unknown): string[] | null {
  if (typeof payload !== "object" || payload === null) {
    return null;
  }
  if (!("data" in payload)) {
    return null;
  }
  return parseExcludedCatalogIds(payload.data);
}

export function useLibraryExclusions() {
  const [excludedIds, setExcludedIds] = useState<string[]>(() =>
    readLocalExcludedCatalogIds(),
  );
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;

    async function loadExclusions() {
      try {
        const response = await fetch("/api/library/exclusions", {
          cache: "no-store",
        });
        const payload: unknown = await response.json();
        const catalogIds = parseExclusionsResponse(payload);
        if (!response.ok || !catalogIds) {
          return;
        }
        if (!isCancelled) {
          setExcludedIds(catalogIds);
          writeLocalExcludedCatalogIds(catalogIds);
        }
      } catch {
        // Keep local exclusions when the project file is unavailable.
      }
    }

    void loadExclusions();
    return () => {
      isCancelled = true;
    };
  }, []);

  const excludeCatalogId = useCallback(async (catalogId: string) => {
    setSaveError(null);
    setExcludedIds((currentIds) => {
      if (currentIds.includes(catalogId)) {
        return currentIds;
      }
      const nextIds = [...currentIds, catalogId];
      writeLocalExcludedCatalogIds(nextIds);
      return nextIds;
    });

    try {
      const response = await fetch("/api/library/exclusions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ catalogId }),
      });
      const payload: unknown = await response.json();
      const catalogIds = parseExclusionsResponse(payload);
      if (response.ok && catalogIds) {
        setExcludedIds(catalogIds);
        writeLocalExcludedCatalogIds(catalogIds);
        return;
      }
      setSaveError("Removed in this browser. Project file did not update.");
    } catch {
      setSaveError("Removed in this browser. Project file did not update.");
    }
  }, []);

  return { excludedIds, excludeCatalogId, saveError };
}
