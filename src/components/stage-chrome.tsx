"use client";

import { useCallback, useId, useState } from "react";
import { DynamicSceneButton } from "@/components/dynamic-scene-button";
import { StageNavigationReadout } from "@/components/stage-compass";
import {
  ResetYardButton,
  YardControlPanelSurface,
  YardControlPanelTrigger,
} from "@/components/yard-control-panel";
import {
  YardPalettePanelSurface,
  YardPalettePanelTrigger,
} from "@/components/yard-palette-panel";
import { yardChromeBarClass } from "@/components/yard-chrome-styles";
import type { AgentStreamStatus } from "@/hooks/use-agent-stream";
import type { AnimationSettings } from "@/lib/animation-settings";
import type { CameraSettings, StageCameraPose } from "@/lib/camera-settings";
import type { PlacedObject } from "@/lib/catalog";
import type { SceneVariant } from "@/lib/scene-lighting";

const CONTROLS_VISIBLE_SESSION_KEY = "openclaw-yard.controls-visible";
const PALETTE_VISIBLE_SESSION_KEY = "openclaw-yard.palette-visible";

function readPanelVisibleFromSession(key: string): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  try {
    const stored = sessionStorage.getItem(key);
    if (stored === "0") {
      return false;
    }
    if (stored === "1") {
      return true;
    }
  } catch {
    return false;
  }
  return false;
}

function writePanelVisibleToSession(key: string, isVisible: boolean): void {
  try {
    sessionStorage.setItem(key, isVisible ? "1" : "0");
  } catch {
    // sessionStorage may be unavailable in private browsing
  }
}

type StageChromeProps = {
  isDynamicScene: boolean;
  onToggleDynamicScene: () => void;
  sceneVariant: SceneVariant;
  onSceneVariantChange: (variant: SceneVariant) => void;
  objects: PlacedObject[];
  selectedId: string | null;
  isSandboxMode: boolean;
  onToggleSandboxMode: () => void;
  onSelectObject: (id: string) => void;
  onResetYard: () => void;
  onRemoveObject: (id: string) => void;
  resetYardTitle?: string;
  isResetYardDisabled?: boolean;
  placementHint: string | null;
  hoverCanPlace: boolean | null;
  cameraSettings: CameraSettings;
  onCameraSettingsChange: (settings: CameraSettings) => void;
  animationSettings: AnimationSettings;
  onAnimationSettingsChange: (settings: AnimationSettings) => void;
  streamEnabled: boolean;
  streamStatus: AgentStreamStatus;
  onStreamToggle: () => void;
  isStreamLive: boolean;
  streamFetchError: string | null;
  lastStreamEventAt?: string | null;
  activeStationLabels?: readonly string[];
  agentCount?: number;
  taskCount?: number;
  isStreamFrozen?: boolean;
  placeCatalogId: string | null;
  onPlaceCatalogIdChange: (catalogId: string | null) => void;
  excludedCatalogIds: readonly string[];
  cameraPose: StageCameraPose | null;
};

export function StageChrome({
  isDynamicScene,
  onToggleDynamicScene,
  sceneVariant,
  onSceneVariantChange,
  objects,
  selectedId,
  isSandboxMode,
  onToggleSandboxMode,
  onSelectObject,
  onResetYard,
  onRemoveObject,
  resetYardTitle,
  isResetYardDisabled,
  placementHint,
  hoverCanPlace,
  cameraSettings,
  onCameraSettingsChange,
  animationSettings,
  onAnimationSettingsChange,
  streamEnabled,
  streamStatus,
  onStreamToggle,
  isStreamLive,
  streamFetchError,
  lastStreamEventAt = null,
  activeStationLabels = [],
  agentCount = 0,
  taskCount = 0,
  isStreamFrozen = false,
  placeCatalogId,
  onPlaceCatalogIdChange,
  excludedCatalogIds,
  cameraPose,
}: StageChromeProps) {
  const controlsPanelId = useId();
  const palettePanelId = useId();
  const [isControlsOpen, setIsControlsOpen] = useState(() =>
    readPanelVisibleFromSession(CONTROLS_VISIBLE_SESSION_KEY),
  );
  const [isPaletteOpen, setIsPaletteOpen] = useState(() =>
    readPanelVisibleFromSession(PALETTE_VISIBLE_SESSION_KEY),
  );

  const closeControls = useCallback(() => {
    setIsControlsOpen(false);
    writePanelVisibleToSession(CONTROLS_VISIBLE_SESSION_KEY, false);
  }, []);

  const closePalette = useCallback(() => {
    setIsPaletteOpen(false);
    writePanelVisibleToSession(PALETTE_VISIBLE_SESSION_KEY, false);
  }, []);

  const toggleControls = useCallback(() => {
    setIsControlsOpen((open) => {
      const nextOpen = !open;
      writePanelVisibleToSession(CONTROLS_VISIBLE_SESSION_KEY, nextOpen);
      if (nextOpen) {
        setIsPaletteOpen(false);
        writePanelVisibleToSession(PALETTE_VISIBLE_SESSION_KEY, false);
      }
      return nextOpen;
    });
  }, []);

  const togglePalette = useCallback(() => {
    setIsPaletteOpen((open) => {
      const nextOpen = !open;
      writePanelVisibleToSession(PALETTE_VISIBLE_SESSION_KEY, nextOpen);
      if (nextOpen) {
        setIsControlsOpen(false);
        writePanelVisibleToSession(CONTROLS_VISIBLE_SESSION_KEY, false);
      }
      return nextOpen;
    });
  }, []);

  return (
    <div className="pointer-events-none absolute top-4 right-4 z-20 flex w-[min(calc(100vw-2rem),20rem)] flex-col items-end gap-1.5">
      <div className={yardChromeBarClass}>
        <DynamicSceneButton
          isEnabled={isDynamicScene}
          onToggle={onToggleDynamicScene}
          variant={sceneVariant}
          onVariantChange={onSceneVariantChange}
        />
        <ResetYardButton
          onResetYard={onResetYard}
          title={resetYardTitle}
          isDisabled={isResetYardDisabled}
        />
        <YardControlPanelTrigger
          isOpen={isControlsOpen}
          onToggle={toggleControls}
          objectCount={objects.length}
          panelId={controlsPanelId}
        />
        <YardPalettePanelTrigger
          isOpen={isPaletteOpen}
          onToggle={togglePalette}
          hasActivePlacement={Boolean(placeCatalogId)}
          panelId={palettePanelId}
        />
      </div>

      <StageNavigationReadout
        headingDegrees={cameraPose?.headingDegrees ?? 0}
        pose={cameraPose}
      />

      {isControlsOpen ? (
        <YardControlPanelSurface
          objects={objects}
          selectedId={selectedId}
          isSandboxMode={isSandboxMode}
          onToggleSandboxMode={onToggleSandboxMode}
          onSelectObject={onSelectObject}
          onResetYard={onResetYard}
          onRemoveObject={onRemoveObject}
          resetYardTitle={resetYardTitle}
          isResetYardDisabled={isResetYardDisabled}
          cameraSettings={cameraSettings}
          onCameraSettingsChange={onCameraSettingsChange}
          animationSettings={animationSettings}
          onAnimationSettingsChange={onAnimationSettingsChange}
          streamEnabled={streamEnabled}
          streamStatus={streamStatus}
          onStreamToggle={onStreamToggle}
          isStreamLive={isStreamLive}
          streamFetchError={streamFetchError}
          lastStreamEventAt={lastStreamEventAt}
          activeStationLabels={activeStationLabels}
          agentCount={agentCount}
          taskCount={taskCount}
          isStreamFrozen={isStreamFrozen}
          panelId={controlsPanelId}
          onClose={closeControls}
        />
      ) : null}

      {isPaletteOpen ? (
        <YardPalettePanelSurface
          objects={objects}
          placeCatalogId={placeCatalogId}
          isSandboxMode={isSandboxMode}
          onPlaceCatalogIdChange={onPlaceCatalogIdChange}
          placementHint={placementHint}
          hoverCanPlace={hoverCanPlace}
          excludedCatalogIds={excludedCatalogIds}
          panelId={palettePanelId}
          onClose={closePalette}
        />
      ) : null}
    </div>
  );
}
