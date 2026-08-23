"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { AnimationSettingsPanel } from "@/components/animation-settings-panel";
import { AssetListPanel } from "@/components/asset-list-panel";
import { CameraSettingsPanel } from "@/components/camera-settings-panel";
import { ConstructReplayButton } from "@/components/construct-replay-button";
import { StageCanvas } from "@/components/stage-canvas";
import {
  DEFAULT_ANIMATION_SETTINGS,
  type AnimationSettings,
} from "@/lib/animation-settings";
import { DEFAULT_CAMERA_SETTINGS, type CameraSettings } from "@/lib/camera-settings";
import { getCatalogItem, type PlacedObject } from "@/lib/catalog";
import {
  buildLibraryPlacements,
  getLibraryBounds,
  getLibraryCatalogItems,
  getLibraryGroundExtent,
  getLibraryViewDistance,
  LIBRARY_CELL_PADDING,
  LIBRARY_COLUMN_COUNT,
} from "@/lib/library-layout";

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
  const libraryItems = useMemo(() => getLibraryCatalogItems(), []);
  const placements = useMemo(
    () => buildLibraryPlacements(libraryItems),
    [libraryItems],
  );
  const bounds = useMemo(() => getLibraryBounds(placements), [placements]);
  const groundExtent = useMemo(() => getLibraryGroundExtent(bounds), [bounds]);
  const [cameraSettings, setCameraSettings] = useState<CameraSettings>(() => ({
    ...DEFAULT_CAMERA_SETTINGS,
    viewDistance: getLibraryViewDistance(bounds),
  }));
  const [animationSettings, setAnimationSettings] = useState<AnimationSettings>(
    DEFAULT_ANIMATION_SETTINGS,
  );
  const [constructReplayId, setConstructReplayId] = useState(0);
  const [isConstructReplaying, setIsConstructReplaying] = useState(false);
  const pendingReplayFinishesRef = useRef(0);
  const constructCapableCount = useMemo(
    () => countConstructCapable(placements),
    [placements],
  );

  function handleConstructReplay() {
    pendingReplayFinishesRef.current = constructCapableCount;
    setConstructReplayId((replayId) => replayId + 1);
    setIsConstructReplaying(constructCapableCount > 0);
  }

  function handleConstructReplayFinished() {
    pendingReplayFinishesRef.current = Math.max(
      0,
      pendingReplayFinishesRef.current - 1,
    );
    if (pendingReplayFinishesRef.current === 0) {
      setIsConstructReplaying(false);
    }
  }

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-[#1b1e1c] text-zinc-100">
      <StageCanvas
        objects={placements}
        selectedId={null}
        placeCatalogId={null}
        cameraSettings={cameraSettings}
        animationSettings={animationSettings}
        onPlace={() => {}}
        onSelect={() => {}}
        readOnly
        staticPreview
        cameraTarget={bounds.center}
        groundExtent={groundExtent}
        constructReplayId={constructReplayId}
        onConstructReplayFinished={handleConstructReplayFinished}
      />

      <header className="pointer-events-none absolute top-0 left-0 right-0 flex items-start justify-between gap-4 p-4">
        <Link
          href="/"
          className="pointer-events-auto inline-flex min-h-9 items-center rounded-lg border border-white/10 bg-black/55 px-3 py-2 text-xs text-zinc-200 backdrop-blur-md transition hover:border-white/20 hover:bg-black/65 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-100 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900"
        >
          Back to yard
        </Link>
        <div className="flex items-start gap-2">
          <AnimationSettingsPanel
            settings={animationSettings}
            onChange={setAnimationSettings}
          />
          <ConstructReplayButton
            isPlaying={isConstructReplaying}
            onReplay={handleConstructReplay}
          />
          <AssetListPanel placements={placements} />
          <CameraSettingsPanel
            settings={cameraSettings}
            onChange={setCameraSettings}
            placementHint={`${libraryItems.length} assets · ${LIBRARY_COLUMN_COUNT}-col grid · ${LIBRARY_CELL_PADDING}u pad`}
          />
        </div>
      </header>
    </div>
  );
}
