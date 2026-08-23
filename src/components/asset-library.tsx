"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimationSettingsPanel } from "@/components/animation-settings-panel";
import { AssetListPanel } from "@/components/asset-list-panel";
import { CameraSettingsPanel } from "@/components/camera-settings-panel";
import { ConstructReplayButton } from "@/components/construct-replay-button";
import { DynamicSceneButton } from "@/components/dynamic-scene-button";
import { StageCanvas } from "@/components/stage-canvas";
import {
  DEFAULT_ANIMATION_SETTINGS,
  type AnimationSettings,
} from "@/lib/animation-settings";
import { DEFAULT_CAMERA_SETTINGS, type CameraSettings } from "@/lib/camera-settings";
import { getCatalogItem, type PlacedObject } from "@/lib/catalog";
import { useDynamicScene } from "@/hooks/use-dynamic-scene";
import { useLibraryExclusions } from "@/hooks/use-library-exclusions";
import {
  buildLibraryPlacements,
  getLibraryBounds,
  getLibraryCatalogItems,
  getLibraryViewDistance,
  LIBRARY_CELL_PADDING,
  LIBRARY_COLUMN_COUNT,
} from "@/lib/library-layout";
import { SHARED_STAGE_EXTENT } from "@/lib/stage-world";

function countConstructCapable(placements: readonly PlacedObject[]): number {
  let total = 0;
  for (const placement of placements) {
    const item = getCatalogItem(placement.catalogId);
    if (item?.kind === "glb" && item.clip) {
      total += 1;
    }
  }
  return total;
}

export function AssetLibrary() {
  const { excludedIds, excludeCatalogId, saveError } = useLibraryExclusions();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const libraryItems = useMemo(
    () => getLibraryCatalogItems(excludedIds),
    [excludedIds],
  );
  const placements = useMemo(
    () => buildLibraryPlacements(libraryItems),
    [libraryItems],
  );
  const bounds = useMemo(() => getLibraryBounds(placements), [placements]);
  const [cameraSettings, setCameraSettings] = useState<CameraSettings>(() => ({
    ...DEFAULT_CAMERA_SETTINGS,
    viewDistance: getLibraryViewDistance(bounds),
  }));
  const [animationSettings, setAnimationSettings] = useState<AnimationSettings>(
    DEFAULT_ANIMATION_SETTINGS,
  );
  const [isConstructReplaying, setIsConstructReplaying] = useState(false);
  const { isDynamicScene, toggleDynamicScene, sceneVariant, selectSceneVariant } =
    useDynamicScene();
  const constructCapableCount = useMemo(
    () => countConstructCapable(placements),
    [placements],
  );

  function handleConstructReplay() {
    if (isConstructReplaying) {
      setIsConstructReplaying(false);
      return;
    }
    setIsConstructReplaying(constructCapableCount > 0);
  }

  const selectedPlacement = placements.find(
    (placement) => placement.id === selectedId,
  );
  const selectedItem = selectedPlacement
    ? getCatalogItem(selectedPlacement.catalogId)
    : undefined;

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
    setCameraSettings((currentSettings) => ({
      ...currentSettings,
      viewDistance: getLibraryViewDistance(bounds),
    }));
  }, [bounds]);

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
        onPlace={() => {}}
        onSelect={setSelectedId}
        staticPreview
        cameraTarget={bounds.center}
        groundExtent={SHARED_STAGE_EXTENT}
        isConstructReplaying={isConstructReplaying}
        isDynamicScene={isDynamicScene}
        sceneVariant={sceneVariant}
      />

      <header className="pointer-events-none absolute top-0 left-0 right-0 flex items-start justify-between gap-4 p-4">
        <div className="flex flex-col items-start gap-2">
          <Link
            href="/"
            className="pointer-events-auto inline-flex min-h-9 items-center rounded-lg border border-white/10 bg-black/55 px-3 py-2 text-xs text-zinc-200 backdrop-blur-md transition hover:border-white/20 hover:bg-black/65 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-100 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900"
          >
            Back to yard
          </Link>
          <p className="pointer-events-none max-w-xs rounded-lg border border-white/10 bg-black/55 px-3 py-2 text-[11px] text-zinc-400 backdrop-blur-md">
            Click a building to select it, then remove it from the project.
          </p>
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
        <div className="flex items-start gap-2">
          <AnimationSettingsPanel
            settings={animationSettings}
            onChange={setAnimationSettings}
          />
          <DynamicSceneButton
            isEnabled={isDynamicScene}
            onToggle={toggleDynamicScene}
            variant={sceneVariant}
            onVariantChange={selectSceneVariant}
          />
          <CameraSettingsPanel
            settings={cameraSettings}
            onChange={setCameraSettings}
            placementHint={`${libraryItems.length} assets · ${LIBRARY_COLUMN_COUNT}-col grid · ${LIBRARY_CELL_PADDING}u pad`}
          />
        </div>
      </header>
      <div className="pointer-events-none absolute right-4 bottom-4 z-20 flex items-end gap-2">
        <AssetListPanel
          placements={placements}
          selectedId={selectedId}
          onSelectPlacement={setSelectedId}
          onRemovePlacement={handleRemovePlacement}
        />
        <ConstructReplayButton
          isPlaying={isConstructReplaying}
          onReplay={handleConstructReplay}
        />
      </div>
    </div>
  );
}
