"use client";

import { DynamicSceneButton } from "@/components/dynamic-scene-button";
import {
  StageCameraPoseReadout,
  StageCompass,
} from "@/components/stage-compass";
import { YardControlPanel } from "@/components/yard-control-panel";
import { YardPalettePanel } from "@/components/yard-palette-panel";
import type { AgentStreamStatus } from "@/hooks/use-agent-stream";
import type { AnimationSettings } from "@/lib/animation-settings";
import type { CameraSettings, StageCameraPose } from "@/lib/camera-settings";
import type { PlacedObject } from "@/lib/catalog";
import type { SceneVariant } from "@/lib/scene-lighting";

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
  placeCatalogId,
  onPlaceCatalogIdChange,
  excludedCatalogIds,
  cameraPose,
}: StageChromeProps) {
  return (
    <div className="pointer-events-none absolute top-4 right-4 z-20 flex items-start gap-2">
      <DynamicSceneButton
        isEnabled={isDynamicScene}
        onToggle={onToggleDynamicScene}
        variant={sceneVariant}
        onVariantChange={onSceneVariantChange}
      />
      <YardControlPanel
        objects={objects}
        selectedId={selectedId}
        isSandboxMode={isSandboxMode}
        onToggleSandboxMode={onToggleSandboxMode}
        onSelectObject={onSelectObject}
        onResetYard={onResetYard}
        onRemoveObject={onRemoveObject}
        resetYardTitle={resetYardTitle}
        isResetYardDisabled={isResetYardDisabled}
        placementHint={placementHint}
        hoverCanPlace={hoverCanPlace}
        cameraSettings={cameraSettings}
        onCameraSettingsChange={onCameraSettingsChange}
        animationSettings={animationSettings}
        onAnimationSettingsChange={onAnimationSettingsChange}
        streamEnabled={streamEnabled}
        streamStatus={streamStatus}
        onStreamToggle={onStreamToggle}
        isStreamLive={isStreamLive}
        streamFetchError={streamFetchError}
      />
      <div className="flex flex-col items-end gap-2">
        <YardPalettePanel
          objects={objects}
          placeCatalogId={placeCatalogId}
          isSandboxMode={isSandboxMode}
          onPlaceCatalogIdChange={onPlaceCatalogIdChange}
          placementHint={placementHint}
          hoverCanPlace={hoverCanPlace}
          excludedCatalogIds={excludedCatalogIds}
        />
        <StageCompass headingDegrees={cameraPose?.headingDegrees ?? 0} />
        <StageCameraPoseReadout pose={cameraPose} />
      </div>
    </div>
  );
}
