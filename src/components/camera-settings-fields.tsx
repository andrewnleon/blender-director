"use client";

import { useId } from "react";
import {
  CAMERA_SETTING_BOUNDS,
  DEFAULT_CAMERA_SETTINGS,
  PRIMARY_CAMERA_KEYS,
  patchCameraSettings,
  type CameraSettingKey,
  type CameraSettings,
} from "@/lib/camera-settings";

type CameraSettingsFieldsProps = {
  settings: CameraSettings;
  onChange: (settings: CameraSettings) => void;
  placementHint?: string | null;
  idPrefix?: string;
};

function formatSettingValue(key: CameraSettingKey, value: number): string {
  if (key === "dampingFactor") {
    return value.toFixed(3);
  }
  if (key === "minDistance" || key === "maxDistance" || key === "viewDistance") {
    return `${Math.round(value)}m`;
  }
  return value.toFixed(2);
}

export function CameraSettingsFields({
  settings,
  onChange,
  placementHint,
  idPrefix = "camera",
}: CameraSettingsFieldsProps) {
  const panelId = useId();
  const prefix = `${idPrefix}-${panelId}`;

  function handleSliderChange(key: CameraSettingKey, rawValue: string) {
    onChange(patchCameraSettings(settings, key, Number(rawValue)));
  }

  function handleReset() {
    onChange(DEFAULT_CAMERA_SETTINGS);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs text-zinc-400">
          Orbit navigation. Placement mode still disables pan.
        </p>
        <button
          type="button"
          onClick={handleReset}
          className="shrink-0 rounded-md border border-white/10 px-2 py-1 text-[11px] text-zinc-300 hover:bg-white/5"
        >
          Reset
        </button>
      </div>

      {placementHint ? (
        <p
          className="rounded-md border border-amber-300/25 bg-amber-200/5 px-2 py-1.5 text-[11px] text-amber-100/90"
          aria-live="polite"
        >
          {placementHint}
        </p>
      ) : null}

      <div className="space-y-3">
        {PRIMARY_CAMERA_KEYS.map((key) => {
          const bounds = CAMERA_SETTING_BOUNDS[key];
          const value = settings[key];
          const sliderId = `${prefix}-${key}`;
          return (
            <div key={key}>
              <div className="mb-1 flex items-center justify-between gap-2">
                <label htmlFor={sliderId} className="text-xs text-zinc-300">
                  {bounds.label}
                </label>
                <span className="font-mono text-[11px] text-zinc-500">
                  {formatSettingValue(key, value)}
                </span>
              </div>
              <input
                id={sliderId}
                type="range"
                min={bounds.min}
                max={bounds.max}
                step={bounds.step}
                value={value}
                onChange={(event) => handleSliderChange(key, event.target.value)}
                className="h-1.5 w-full cursor-pointer accent-amber-300/80"
              />
            </div>
          );
        })}
      </div>

      <details className="border-t border-white/10 pt-3">
        <summary className="cursor-pointer text-[11px] text-zinc-500 hover:text-zinc-400">
          Zoom limits
        </summary>
        <div className="mt-3 space-y-3">
          {(["minDistance", "maxDistance"] as const).map((key) => {
            const bounds = CAMERA_SETTING_BOUNDS[key];
            const value = settings[key];
            const sliderId = `${prefix}-${key}`;
            return (
              <div key={key}>
                <div className="mb-1 flex items-center justify-between gap-2">
                  <label htmlFor={sliderId} className="text-xs text-zinc-300">
                    {bounds.label}
                  </label>
                  <span className="font-mono text-[11px] text-zinc-500">
                    {formatSettingValue(key, value)}
                  </span>
                </div>
                <input
                  id={sliderId}
                  type="range"
                  min={bounds.min}
                  max={bounds.max}
                  step={bounds.step}
                  value={value}
                  onChange={(event) => handleSliderChange(key, event.target.value)}
                  className="h-1.5 w-full cursor-pointer accent-amber-300/80"
                />
              </div>
            );
          })}
        </div>
      </details>
    </div>
  );
}
