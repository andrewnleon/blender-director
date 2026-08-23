"use client";

import { useCallback, useEffect, useState } from "react";
import type { OpenClawEvent } from "@/types/openclaw-event";
import { canPlaceAt } from "@/lib/placement-collision";
import { useAgentStream } from "@/hooks/use-agent-stream";
import { useAgentYard } from "@/hooks/use-agent-yard";
import { useDynamicScene } from "@/hooks/use-dynamic-scene";
import { useLibraryExclusions } from "@/hooks/use-library-exclusions";
import { DynamicSceneButton } from "@/components/dynamic-scene-button";
import { StageCanvas } from "@/components/stage-canvas";
import {
  StageCameraPoseReadout,
  StageCompass,
} from "@/components/stage-compass";
import { YardControlPanel } from "@/components/yard-control-panel";
import { YardPalettePanel } from "@/components/yard-palette-panel";
import {
  canPlaceCatalogItem,
  getCatalogItem,
  type PlacedObject,
} from "@/lib/catalog";
import {
  DEFAULT_ANIMATION_SETTINGS,
  type AnimationSettings,
} from "@/lib/animation-settings";
import {
  DEFAULT_CAMERA_SETTINGS,
  type CameraSettings,
  type StageCameraPose,
} from "@/lib/camera-settings";
import { SHARED_STAGE_EXTENT } from "@/lib/stage-world";

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

function nextId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

export function OpenClawYard() {
  const [objects, setObjects] = useState<PlacedObject[]>([]);
  const [placeCatalogId, setPlaceCatalogId] = useState<string | null>("skyscraper");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [cameraSettings, setCameraSettings] = useState<CameraSettings>(
    DEFAULT_CAMERA_SETTINGS,
  );
  const [animationSettings, setAnimationSettings] = useState<AnimationSettings>(
    DEFAULT_ANIMATION_SETTINGS,
  );
  const [hoverCanPlace, setHoverCanPlace] = useState<boolean | null>(null);
  const [isSandboxMode, setIsSandboxMode] = useState(() =>
    readSandboxModeFromSession(),
  );
  const [lastStreamEvent, setLastStreamEvent] = useState<OpenClawEvent | null>(null);
  const { excludedIds } = useLibraryExclusions();
  const { isDynamicScene, toggleDynamicScene, sceneVariant, selectSceneVariant } =
    useDynamicScene();
  const [cameraPose, setCameraPose] = useState<StageCameraPose | null>(null);
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

  const handlePlace = useCallback((position: [number, number, number]) => {
    if (!placeCatalogId) return;
    setObjects((prev) => {
      if (!canPlaceCatalogItem(placeCatalogId, prev, isSandboxMode)) {
        return prev;
      }
      if (!canPlaceAt(placeCatalogId, position, prev)) {
        return prev;
      }
      return [
        ...prev,
        { id: nextId(placeCatalogId), catalogId: placeCatalogId, position },
      ];
    });
    const item = getCatalogItem(placeCatalogId);
    if (!isSandboxMode && item?.maxCount === 1) {
      setPlaceCatalogId(null);
    }
  }, [placeCatalogId, isSandboxMode]);

  const handleSelect = useCallback((id: string | null) => {
    setSelectedId(id);
  }, []);

  useEffect(() => {
    if (placeCatalogId && excludedIds.includes(placeCatalogId)) {
      setPlaceCatalogId(null);
    }
  }, [excludedIds, placeCatalogId]);

  function handleReset() {
    setObjects([]);
    setSelectedId(null);
    setPlaceCatalogId("skyscraper");
  }

  const handleRemoveObject = useCallback((objectId: string) => {
    setObjects((prev) => prev.filter((object) => object.id !== objectId));
    setSelectedId((currentId) => (currentId === objectId ? null : currentId));
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Delete" && event.key !== "Backspace") {
        return;
      }
      const target = event.target;
      if (target instanceof HTMLElement) {
        const tagName = target.tagName;
        if (
          tagName === "INPUT" ||
          tagName === "TEXTAREA" ||
          tagName === "SELECT" ||
          target.isContentEditable
        ) {
          return;
        }
      }
      if (!selectedId) {
        return;
      }
      event.preventDefault();
      handleRemoveObject(selectedId);
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleRemoveObject, selectedId]);

  const placing =
    placeCatalogId && canPlaceCatalogItem(placeCatalogId, objects, isSandboxMode)
      ? getCatalogItem(placeCatalogId)
      : null;
  const skyscraperAtCap =
    !isSandboxMode && !canPlaceCatalogItem("skyscraper", objects);
  const placementHint = placing
    ? hoverCanPlace === false
      ? `Placing ${placing.label} · cell occupied — pick another spot`
      : `Placing ${placing.label} · hover grid, click to snap`
    : skyscraperAtCap
      ? "Skyscraper already in yard · reset to place again"
      : null;

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-[#1b1e1c] text-zinc-100">
      <StageCanvas
        objects={objects}
        selectedId={selectedId}
        placeCatalogId={placing ? placeCatalogId : null}
        cameraSettings={cameraSettings}
        animationSettings={animationSettings}
        constructionByCatalogId={agentYard.constructionByCatalogId}
        onPlace={handlePlace}
        onSelect={handleSelect}
        onPlacementHoverChange={setHoverCanPlace}
        isDynamicScene={isDynamicScene}
        sceneVariant={sceneVariant}
        groundExtent={SHARED_STAGE_EXTENT}
        onCameraPoseChange={setCameraPose}
      />

      <header className="pointer-events-none absolute top-0 left-0 p-4">
        <div className="pointer-events-auto rounded-lg border border-white/10 bg-black/55 px-4 py-3 backdrop-blur-md">
          <h1 className="text-[11px] uppercase tracking-[0.18em] text-amber-200/80">
            OpenClaw Yard
          </h1>
        </div>
      </header>

      <div className="pointer-events-none absolute top-4 right-4 z-20 flex items-start gap-2">
        <DynamicSceneButton
          isEnabled={isDynamicScene}
          onToggle={toggleDynamicScene}
          variant={sceneVariant}
          onVariantChange={selectSceneVariant}
        />
        <YardControlPanel
          objects={objects}
          selectedId={selectedId}
          isSandboxMode={isSandboxMode}
          onToggleSandboxMode={toggleSandboxMode}
          onSelectObject={setSelectedId}
          onResetYard={handleReset}
          onRemoveObject={handleRemoveObject}
          placementHint={placementHint}
          hoverCanPlace={hoverCanPlace}
          cameraSettings={cameraSettings}
          onCameraSettingsChange={setCameraSettings}
          animationSettings={animationSettings}
          onAnimationSettingsChange={setAnimationSettings}
          streamEnabled={agentStream.isEnabled}
          streamStatus={agentStream.status}
          onStreamToggle={agentStream.toggle}
          isStreamLive={agentYard.isLive}
          streamFetchError={agentYard.fetchError}
        />
        <div className="flex flex-col items-end gap-2">
          <YardPalettePanel
            objects={objects}
            placeCatalogId={placeCatalogId}
            isSandboxMode={isSandboxMode}
            onPlaceCatalogIdChange={setPlaceCatalogId}
            placementHint={placementHint}
            hoverCanPlace={hoverCanPlace}
            excludedCatalogIds={excludedIds}
          />
          <StageCompass headingDegrees={cameraPose?.headingDegrees ?? 0} />
          <StageCameraPoseReadout pose={cameraPose} />
        </div>
      </div>
    </div>
  );
}
