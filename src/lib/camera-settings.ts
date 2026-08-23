import { SHARED_STAGE_EXTENT } from "@/lib/stage-world";

/** Yard clear / fog / page chrome — keep in sync with `openclaw-yard` shell. */
export const YARD_SCENE_COLOR = "#1b1e1c";

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
  viewDistance: 120.647,
  rotateSpeed: 0.55,
  panSpeed: 0.45,
  zoomSpeed: 0.65,
  dampingFactor: 0.085,
  minDistance: 8,
  maxDistance: 180,
};

/** Polar from +Y. Default matches a captured north-facing yard pose. */
export const MIN_ORBIT_POLAR = 0.28;
export const DEFAULT_NORTH_POLAR = 1.3608;
export const DEFAULT_NORTH_AZIMUTH = Math.atan2(0.585, 117.995);
export const MAX_ORBIT_POLAR = Math.PI / 2.08;

export type StageCameraPose = {
  position: [number, number, number];
  target: [number, number, number];
  distance: number;
  polar: number;
  headingDegrees: number;
};

export function formatStageCameraPose(pose: StageCameraPose): string {
  const [x, y, z] = pose.position;
  const [tx, ty, tz] = pose.target;
  return [
    `pos ${x.toFixed(3)} ${y.toFixed(3)} ${z.toFixed(3)}`,
    `target ${tx.toFixed(3)} ${ty.toFixed(3)} ${tz.toFixed(3)}`,
    `distance ${pose.distance.toFixed(3)}`,
    `polar ${pose.polar.toFixed(4)}`,
    `heading ${pose.headingDegrees.toFixed(1)}`,
  ].join(" | ");
}

function formatAxisTriplet(values: readonly [number, number, number]): string {
  return values.map((value) => value.toFixed(2)).join("  ");
}

export function formatStageCameraPoseShort(pose: StageCameraPose): string {
  return formatAxisTriplet(pose.position);
}

export function northFacingCameraPosition(
  target: readonly [number, number, number],
  distance: number,
): [number, number, number] {
  const height = Math.cos(DEFAULT_NORTH_POLAR) * distance;
  const horizon = Math.sin(DEFAULT_NORTH_POLAR) * distance;
  return [
    target[0] + Math.sin(DEFAULT_NORTH_AZIMUTH) * horizon,
    target[1] + height,
    target[2] + Math.cos(DEFAULT_NORTH_AZIMUTH) * horizon,
  ];
}

/** Placement mode uses a slower rotate feel relative to the user's base rotate speed. */
export const PLACING_ROTATE_SPEED_RATIO = 0.4 / 0.55;

export type CameraSettingKey = keyof CameraSettings;

export const CAMERA_SETTING_BOUNDS: Record<
  CameraSettingKey,
  { min: number; max: number; step: number; label: string }
> = {
  viewDistance: { min: 6, max: 288, step: 1, label: "View distance" },
  rotateSpeed: { min: 0.15, max: 1.5, step: 0.05, label: "Rotate speed" },
  panSpeed: { min: 0.1, max: 1.5, step: 0.05, label: "Pan speed" },
  zoomSpeed: { min: 0.15, max: 2, step: 0.05, label: "Zoom speed" },
  dampingFactor: { min: 0.02, max: 0.25, step: 0.005, label: "Damping" },
  minDistance: { min: 4, max: 24, step: 1, label: "Min zoom distance" },
  maxDistance: { min: 24, max: 288, step: 4, label: "Max zoom distance" },
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
    near: Math.max(140, settings.viewDistance * 2.2),
    far: Math.max(settings.maxDistance * 1.6, SHARED_STAGE_EXTENT * 4.2),
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
