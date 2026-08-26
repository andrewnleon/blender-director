"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AssetListPanel } from "@/components/asset-list-panel";
import { OpenClawPreviewButton } from "@/components/openclaw-preview-button";
import { StageCanvas } from "@/components/stage-canvas";
import { StageChrome } from "@/components/stage-chrome";
import {
  DEFAULT_ANIMATION_SETTINGS,
  type AnimationSettings,
} from "@/lib/animation-settings";
import {
  DEFAULT_CAMERA_SETTINGS,
  type CameraSettings,
  type StageCameraPose,
} from "@/lib/camera-settings";
import {
  catalogHasConstructClip,
  getCatalogItem,
  type PlacedObject,
} from "@/lib/catalog";
import { getBuildingDefinition } from "@/lib/construction/asset-registry";
import { activeStationLabels } from "@/lib/construction/active-stations";
import { OPENCLAW_PREVIEW_STEP_COUNT } from "@/lib/construction/mock-openclaw-data";
import { useConstructionPreview } from "@/hooks/use-construction-preview";
import { useYardChrome } from "@/hooks/use-yard-chrome";
import {
  buildLibraryPlacements,
  getLibraryBounds,
  getLibraryCatalogItems,
  getLibraryPreloadPriority,
  getLibraryViewDistance,
} from "@/lib/library-layout";
import { SHARED_STAGE_EXTENT } from "@/lib/stage-world";

function countPackConstructPlacements(
  placements: readonly PlacedObject[],
): number {
  let total = 0;
  for (const placement of placements) {
    if (
      catalogHasConstructClip(placement.catalogId) &&
      getBuildingDefinition(placement.catalogId) === undefined
    ) {
      total += 1;
    }
  }
  return total;
}

export function OpenClawYard() {
  const {
    placeCatalogId,
    setPlaceCatalogId,
    isSandboxMode,
    toggleSandboxMode,
    excludedIds,
    excludeCatalogId,
    saveError,
    isDynamicScene,
    toggleDynamicScene,
    sceneVariant,
    selectSceneVariant,
    agentStream,
    agentYard,
    lastStreamEvent,
    handleResetYard,
  } = useYardChrome();

  const libraryItems = useMemo(
    () => getLibraryCatalogItems(excludedIds),
    [excludedIds],
  );
  const placements = useMemo(
    () => buildLibraryPlacements(libraryItems),
    [libraryItems],
  );
  const bounds = useMemo(() => getLibraryBounds(placements), [placements]);
  const packConstructCount = useMemo(
    () => countPackConstructPlacements(placements),
    [placements],
  );
  const priorityPreloadCatalogIds = useMemo(
    () => getLibraryPreloadPriority(libraryItems),
    [libraryItems],
  );

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [cameraSettings, setCameraSettings] = useState<CameraSettings>(() => ({
    ...DEFAULT_CAMERA_SETTINGS,
    viewDistance: getLibraryViewDistance(bounds),
  }));
  const [animationSettings, setAnimationSettings] = useState<AnimationSettings>(
    DEFAULT_ANIMATION_SETTINGS,
  );
  const [cameraPose, setCameraPose] = useState<StageCameraPose | null>(null);
  const pendingPackReplayFinishesRef = useRef(0);

  const isStreamDriving = agentStream.isEnabled && agentYard.isLive;
  const streamActiveStationLabels = useMemo(
    () => activeStationLabels(agentYard.agents, agentYard.tasks),
    [agentYard.agents, agentYard.tasks],
  );
  const isStreamFrozen =
    agentStream.isEnabled &&
    !agentYard.isLive &&
    Object.keys(agentYard.constructionByCatalogId).length > 0;
  const constructionPreview = useConstructionPreview({
    isStreamDriving,
    playbackSpeed: animationSettings.playbackSpeed,
  });

  const constructionByCatalogId = isStreamDriving
    ? agentYard.constructionByCatalogId
    : constructionPreview.previewConstructionByCatalogId;

  const isConstructReplaying =
    !isStreamDriving && constructionPreview.isPackConstructReplaying;

  useEffect(() => {
    if (isConstructReplaying && packConstructCount > 0) {
      pendingPackReplayFinishesRef.current = packConstructCount;
    }
  }, [isConstructReplaying, packConstructCount]);

  const handleConstructReplayFinished = useCallback(() => {
    if (pendingPackReplayFinishesRef.current <= 0) {
      return;
    }
    pendingPackReplayFinishesRef.current -= 1;
  }, []);

  useEffect(() => {
    setCameraSettings((currentSettings) => ({
      ...currentSettings,
      viewDistance: getLibraryViewDistance(bounds),
    }));
  }, [bounds]);

  const selectedPlacement = placements.find(
    (placement) => placement.id === selectedId,
  );
  const selectedItem = selectedPlacement
    ? getCatalogItem(selectedPlacement.catalogId)
    : undefined;
  const placeItem = placeCatalogId ? getCatalogItem(placeCatalogId) : undefined;

  const placementHint = constructionPreview.isPreviewActive
    ? `OpenClaw preview · mock tasks · step ${constructionPreview.previewStep + 1}/${OPENCLAW_PREVIEW_STEP_COUNT}`
    : isStreamFrozen
      ? "Stream paused · construction frozen at last event"
      : isStreamDriving
        ? "Live OpenClaw stream driving construction"
        : placeItem
          ? `Selected ${placeItem.label} · use palette to hide from grid`
          : `${libraryItems.length} assets · Preview simulates agent tasks · Connect stream for live traffic`;

  const handleRemovePlacement = useCallback(
    (placementId: string) => {
      const placement = placements.find((entry) => entry.id === placementId);
      if (!placement) {
        return;
      }
      void excludeCatalogId(placement.catalogId);
      setSelectedId((currentId) =>
        currentId === placementId ? null : currentId,
      );
    },
    [excludeCatalogId, placements],
  );

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
      handleRemovePlacement(selectedId);
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleRemovePlacement, selectedId]);

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-[#1b1e1c] text-zinc-100">
      <StageCanvas
        objects={placements}
        selectedId={selectedId}
        placeCatalogId={null}
        cameraSettings={cameraSettings}
        animationSettings={animationSettings}
        constructionByCatalogId={constructionByCatalogId}
        onPlace={() => {}}
        onSelect={setSelectedId}
        staticPreview={!constructionPreview.isPreviewActive && !isStreamDriving}
        cameraTarget={bounds.center}
        groundExtent={SHARED_STAGE_EXTENT}
        isConstructReplaying={isConstructReplaying}
        onConstructReplayFinished={handleConstructReplayFinished}
        isDynamicScene={isDynamicScene}
        sceneVariant={sceneVariant}
        onCameraPoseChange={setCameraPose}
        priorityPreloadCatalogIds={priorityPreloadCatalogIds}
      />

      <header className="pointer-events-none absolute top-0 left-0 p-4">
        <div className="flex flex-col items-start gap-2">
          <div className="pointer-events-auto rounded-lg border border-white/10 bg-black/55 px-4 py-3 backdrop-blur-md">
            <h1 className="text-[11px] uppercase tracking-[0.18em] text-amber-200/80">
              OpenClaw Stage
            </h1>
            <p className="mt-1 max-w-xs text-[11px] text-zinc-400">
              Library grid at root. Preview runs mock agent tasks; live stream
              replaces preview when connected.
            </p>
          </div>
          {selectedPlacement ? (
            <button
              type="button"
              onClick={() => handleRemovePlacement(selectedPlacement.id)}
              className="pointer-events-auto inline-flex min-h-9 items-center rounded-lg border border-rose-300/40 bg-rose-950/50 px-3 py-2 text-xs text-rose-100 backdrop-blur-md transition hover:border-rose-200/70 hover:bg-rose-900/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-200 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900"
            >
              Remove {selectedItem?.label ?? selectedPlacement.catalogId} from
              project
            </button>
          ) : null}
          {saveError ? (
            <p className="pointer-events-none max-w-xs text-[11px] text-amber-200/90">
              {saveError}
            </p>
          ) : null}
        </div>
      </header>

      <StageChrome
        isDynamicScene={isDynamicScene}
        onToggleDynamicScene={toggleDynamicScene}
        sceneVariant={sceneVariant}
        onSceneVariantChange={selectSceneVariant}
        objects={placements}
        selectedId={selectedId}
        isSandboxMode={isSandboxMode}
        onToggleSandboxMode={toggleSandboxMode}
        onSelectObject={setSelectedId}
        onResetYard={handleResetYard}
        onRemoveObject={handleRemovePlacement}
        resetYardTitle="Clear hidden assets and restore default palette selection"
        isResetYardDisabled={excludedIds.length === 0}
        placementHint={placementHint}
        hoverCanPlace={null}
        cameraSettings={cameraSettings}
        onCameraSettingsChange={setCameraSettings}
        animationSettings={animationSettings}
        onAnimationSettingsChange={setAnimationSettings}
        streamEnabled={agentStream.isEnabled}
        streamStatus={agentStream.status}
        onStreamToggle={agentStream.toggle}
        isStreamLive={agentYard.isLive}
        streamFetchError={agentYard.fetchError}
        lastStreamEventAt={lastStreamEvent?.timestamp ?? null}
        activeStationLabels={streamActiveStationLabels}
        agentCount={agentYard.agents.length}
        taskCount={agentYard.tasks.length}
        isStreamFrozen={isStreamFrozen}
        placeCatalogId={placeCatalogId}
        onPlaceCatalogIdChange={setPlaceCatalogId}
        excludedCatalogIds={excludedIds}
        cameraPose={cameraPose}
      />

      <div className="pointer-events-none absolute right-4 bottom-4 z-20 flex items-end gap-2">
        <AssetListPanel
          placements={placements}
          selectedId={selectedId}
          onSelectPlacement={setSelectedId}
          onRemovePlacement={handleRemovePlacement}
        />
        <OpenClawPreviewButton
          isActive={constructionPreview.isPreviewActive}
          isDisabled={isStreamDriving}
          onToggle={constructionPreview.togglePreview}
        />
      </div>
    </div>
  );
}
