export type CameraSettings = {
  viewDistance: number;
  rotateSpeed: number;
  panSpeed: number;
  zoomSpeed: number;
  dampingFactor: number;
  minDistance: number;
  maxDistance: number;
};

export const DEFAULT_CAMERA_SETTINGS: CameraSettings = {
  viewDistance: 38,
  rotateSpeed: 0.55,
  panSpeed: 0.45,
  zoomSpeed: 0.65,
  dampingFactor: 0.085,
  minDistance: 8,
  maxDistance: 72,
};

/** Placement mode uses a slower rotate feel relative to the user's base rotate speed. */
export const PLACING_ROTATE_SPEED_RATIO = 0.4 / 0.55;

export type CameraSettingKey = keyof CameraSettings;

export const CAMERA_SETTING_BOUNDS: Record<
  CameraSettingKey,
  { min: number; max: number; step: number; label: string }
> = {
  viewDistance: { min: 6, max: 96, step: 1, label: "View distance" },
  rotateSpeed: { min: 0.15, max: 1.5, step: 0.05, label: "Rotate speed" },
  panSpeed: { min: 0.1, max: 1.5, step: 0.05, label: "Pan speed" },
  zoomSpeed: { min: 0.15, max: 2, step: 0.05, label: "Zoom speed" },
  dampingFactor: { min: 0.02, max: 0.25, step: 0.005, label: "Damping" },
  minDistance: { min: 4, max: 24, step: 1, label: "Min zoom distance" },
  maxDistance: { min: 24, max: 96, step: 2, label: "Max zoom distance" },
};

export const PRIMARY_CAMERA_KEYS: CameraSettingKey[] = [
  "viewDistance",
  "rotateSpeed",
  "zoomSpeed",
  "panSpeed",
  "dampingFactor",
];

/** Linear fog distances scaled to orbit zoom so max pull-back stays visible. */
export function getSceneFogDistances(settings: CameraSettings): {
  near: number;
  far: number;
} {
  const zoomExtent = Math.max(settings.maxDistance, settings.viewDistance);
  return {
    near: Math.max(24, settings.minDistance * 2.5),
    far: zoomExtent + 56,
  };
}

function clampViewDistance(settings: CameraSettings): CameraSettings {
  const viewDistance = Math.min(
    settings.maxDistance,
    Math.max(settings.minDistance, settings.viewDistance),
  );
  return {
    ...settings,
    viewDistance: clampCameraSetting("viewDistance", viewDistance),
  };
}

export function clampCameraSetting(key: CameraSettingKey, value: number): number {
  const { min, max, step } = CAMERA_SETTING_BOUNDS[key];
  const clamped = Math.min(max, Math.max(min, value));
  const steps = Math.round((clamped - min) / step);
  return Number((min + steps * step).toFixed(3));
}

export function patchCameraSettings(
  current: CameraSettings,
  key: CameraSettingKey,
  value: number,
): CameraSettings {
  const next = { ...current, [key]: clampCameraSetting(key, value) };
  if (next.minDistance >= next.maxDistance) {
    if (key === "minDistance") {
      next.maxDistance = clampCameraSetting("maxDistance", next.minDistance + 8);
    } else if (key === "maxDistance") {
      next.minDistance = clampCameraSetting("minDistance", next.maxDistance - 8);
    }
  }
  return clampViewDistance(next);
}
