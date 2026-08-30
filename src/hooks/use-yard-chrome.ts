"use client";

import { useCallback, useEffect, useState } from "react";
import type { OpenClawEvent } from "@/types/openclaw-event";
import { useAgentStream } from "@/hooks/use-agent-stream";
import { useAgentYard } from "@/hooks/use-agent-yard";
import { useDynamicScene } from "@/hooks/use-dynamic-scene";
import { useLibraryExclusions } from "@/hooks/use-library-exclusions";
import {
  DEFAULT_PLACE_CATALOG_ID,
  readPlaceCatalogIdFromSession,
  readYardObjectsFromSession,
  writePlaceCatalogIdToSession,
  writeYardObjectsToSession,
} from "@/lib/yard-session";
import {
  appendUserPlacement,
  removeUserPlacement,
} from "@/lib/stage-placements";
import type { PlacedObject } from "@/lib/catalog";

const SANDBOX_MODE_SESSION_KEY = "openclaw-yard.sandbox-mode";

function readSandboxModeFromSession(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  try {
    return sessionStorage.getItem(SANDBOX_MODE_SESSION_KEY) === "1";
  } catch {
    return false;
  }
}

function writeSandboxModeToSession(isEnabled: boolean): void {
  try {
    sessionStorage.setItem(SANDBOX_MODE_SESSION_KEY, isEnabled ? "1" : "0");
  } catch {
    // sessionStorage may be unavailable in private browsing
  }
}

export function useYardChrome() {
  const [placeCatalogId, setPlaceCatalogId] = useState<string | null>(() =>
    readPlaceCatalogIdFromSession(),
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [userPlacements, setUserPlacements] = useState<PlacedObject[]>(() =>
    readYardObjectsFromSession(),
  );
  const [isSandboxMode, setIsSandboxMode] = useState(() =>
    readSandboxModeFromSession(),
  );
  const [lastStreamEvent, setLastStreamEvent] = useState<OpenClawEvent | null>(
    null,
  );
  const libraryExclusions = useLibraryExclusions();
  const { excludedIds, resetExclusions } = libraryExclusions;
  const { isDynamicScene, toggleDynamicScene, sceneVariant, selectSceneVariant } =
    useDynamicScene();
  const agentStream = useAgentStream({ onEvent: setLastStreamEvent });
  const agentYard = useAgentYard({
    streamEnabled: agentStream.isEnabled,
    streamConnected: agentStream.status === "connected",
    lastStreamEvent,
  });

  useEffect(() => {
    writeYardObjectsToSession(userPlacements);
  }, [userPlacements]);

  const placeUserObject = useCallback(
    (
      catalogId: string,
      position: [number, number, number],
      stagePlacements: readonly PlacedObject[],
    ) => {
      setUserPlacements((currentPlacements) => {
        const nextPlacements = appendUserPlacement({
          catalogId,
          position,
          userPlacements: currentPlacements,
          stagePlacements,
          isSandboxMode,
        });
        return nextPlacements ?? currentPlacements;
      });
    },
    [isSandboxMode],
  );

  const removeUserObject = useCallback((placementId: string) => {
    setUserPlacements((currentPlacements) =>
      removeUserPlacement(currentPlacements, placementId),
    );
  }, []);

  const toggleSandboxMode = useCallback(() => {
    setIsSandboxMode((enabled) => {
      const nextEnabled = !enabled;
      writeSandboxModeToSession(nextEnabled);
      return nextEnabled;
    });
  }, []);

  useEffect(() => {
    writePlaceCatalogIdToSession(placeCatalogId);
  }, [placeCatalogId]);

  useEffect(() => {
    if (placeCatalogId && excludedIds.includes(placeCatalogId)) {
      setPlaceCatalogId(null);
    }
  }, [excludedIds, placeCatalogId]);

  const handleResetYard = useCallback(() => {
    setSelectedId(null);
    setPlaceCatalogId(DEFAULT_PLACE_CATALOG_ID);
    setUserPlacements([]);
    resetExclusions();
  }, [resetExclusions]);

  return {
    placeCatalogId,
    setPlaceCatalogId,
    selectedId,
    setSelectedId,
    userPlacements,
    placeUserObject,
    removeUserObject,
    isSandboxMode,
    toggleSandboxMode,
    excludedIds,
    excludeCatalogId: libraryExclusions.excludeCatalogId,
    saveError: libraryExclusions.saveError,
    isDynamicScene,
    toggleDynamicScene,
    sceneVariant,
    selectSceneVariant,
    agentStream,
    agentYard,
    lastStreamEvent,
    handleResetYard,
  };
}
