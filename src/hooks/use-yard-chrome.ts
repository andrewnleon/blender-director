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
  const [objects, setObjects] = useState<PlacedObject[]>(() =>
    readYardObjectsFromSession(),
  );
  const [placeCatalogId, setPlaceCatalogId] = useState<string | null>(() =>
    readPlaceCatalogIdFromSession(),
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isSandboxMode, setIsSandboxMode] = useState(() =>
    readSandboxModeFromSession(),
  );
  const [lastStreamEvent, setLastStreamEvent] = useState<OpenClawEvent | null>(
    null,
  );
  const libraryExclusions = useLibraryExclusions();
  const { excludedIds } = libraryExclusions;
  const { isDynamicScene, toggleDynamicScene, sceneVariant, selectSceneVariant } =
    useDynamicScene();
  const agentStream = useAgentStream({ onEvent: setLastStreamEvent });
  const agentYard = useAgentYard({
    streamEnabled: agentStream.isEnabled,
    streamConnected: agentStream.status === "connected",
    lastStreamEvent,
  });

  const toggleSandboxMode = useCallback(() => {
    setIsSandboxMode((enabled) => {
      const nextEnabled = !enabled;
      writeSandboxModeToSession(nextEnabled);
      return nextEnabled;
    });
  }, []);

  useEffect(() => {
    writeYardObjectsToSession(objects);
  }, [objects]);

  useEffect(() => {
    writePlaceCatalogIdToSession(placeCatalogId);
  }, [placeCatalogId]);

  useEffect(() => {
    if (placeCatalogId && excludedIds.includes(placeCatalogId)) {
      setPlaceCatalogId(null);
    }
  }, [excludedIds, placeCatalogId]);

  const handleResetYard = useCallback(() => {
    setObjects([]);
    setSelectedId(null);
    setPlaceCatalogId(DEFAULT_PLACE_CATALOG_ID);
  }, []);

  const handleRemoveObject = useCallback((objectId: string) => {
    setObjects((prev) => prev.filter((object) => object.id !== objectId));
    setSelectedId((currentId) => (currentId === objectId ? null : currentId));
  }, []);

  return {
    objects,
    setObjects,
    placeCatalogId,
    setPlaceCatalogId,
    selectedId,
    setSelectedId,
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
    handleResetYard,
    handleRemoveObject,
  };
}
