"use client";

import { useCallback, useEffect, useState } from "react";
import { canPlaceAt } from "@/lib/placement-collision";
import { useYardChrome } from "@/hooks/use-yard-chrome";
import { StageCanvas } from "@/components/stage-canvas";
import { StageChrome } from "@/components/stage-chrome";
import {
  canPlaceCatalogItem,
  getCatalogItem,
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

function nextId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

export function OpenClawYard() {
  const {
    objects,
    setObjects,
    placeCatalogId,
    setPlaceCatalogId,
    selectedId,
    setSelectedId,
    isSandboxMode,
    toggleSandboxMode,
    excludedIds,
    isDynamicScene,
    toggleDynamicScene,
    sceneVariant,
    selectSceneVariant,
    agentStream,
    agentYard,
    handleResetYard,
    handleRemoveObject,
  } = useYardChrome();
  const [cameraSettings, setCameraSettings] = useState<CameraSettings>(
    DEFAULT_CAMERA_SETTINGS,
  );
  const [animationSettings, setAnimationSettings] = useState<AnimationSettings>(
    DEFAULT_ANIMATION_SETTINGS,
  );
  const [hoverCanPlace, setHoverCanPlace] = useState<boolean | null>(null);
  const [cameraPose, setCameraPose] = useState<StageCameraPose | null>(null);

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
  }, [isSandboxMode, placeCatalogId, setObjects, setPlaceCatalogId]);

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
        onSelect={setSelectedId}
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

      <StageChrome
        isDynamicScene={isDynamicScene}
        onToggleDynamicScene={toggleDynamicScene}
        sceneVariant={sceneVariant}
        onSceneVariantChange={selectSceneVariant}
        objects={objects}
        selectedId={selectedId}
        isSandboxMode={isSandboxMode}
        onToggleSandboxMode={toggleSandboxMode}
        onSelectObject={setSelectedId}
        onResetYard={handleResetYard}
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
        placeCatalogId={placeCatalogId}
        onPlaceCatalogIdChange={setPlaceCatalogId}
        excludedCatalogIds={excludedIds}
        cameraPose={cameraPose}
      />
    </div>
  );
}
