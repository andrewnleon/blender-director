export type AnimationSettings = {
  playbackSpeed: number;
};

export const DEFAULT_ANIMATION_SETTINGS: AnimationSettings = {
  playbackSpeed: 1,
};

export type AnimationSettingKey = keyof AnimationSettings;

export const ANIMATION_SETTING_BOUNDS: Record<
  AnimationSettingKey,
  { min: number; max: number; step: number; label: string }
> = {
  playbackSpeed: { min: 0.25, max: 4, step: 0.25, label: "Playback speed" },
};

export function clampAnimationSetting(key: AnimationSettingKey, value: number): number {
  const { min, max, step } = ANIMATION_SETTING_BOUNDS[key];
  const clamped = Math.min(max, Math.max(min, value));
  const steps = Math.round((clamped - min) / step);
  return Number((min + steps * step).toFixed(3));
}

export function patchAnimationSettings(
  current: AnimationSettings,
  key: AnimationSettingKey,
  value: number,
): AnimationSettings {
  return { ...current, [key]: clampAnimationSetting(key, value) };
}

export function formatPlaybackSpeed(speed: number): string {
  const rounded = Number(speed.toFixed(2));
  return `${rounded}×`;
}
