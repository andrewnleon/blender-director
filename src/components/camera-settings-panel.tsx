"use client";

import { useEffect, useId, useRef, useState } from "react";
import {
  CAMERA_SETTING_BOUNDS,
  DEFAULT_CAMERA_SETTINGS,
  PRIMARY_CAMERA_KEYS,
  patchCameraSettings,
  type CameraSettingKey,
  type CameraSettings,
} from "@/lib/camera-settings";

type CameraSettingsPanelProps = {
  settings: CameraSettings;
  onChange: (settings: CameraSettings) => void;
  placementHint?: string | null;
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

export function CameraSettingsPanel({
  settings,
  onChange,
  placementHint,
}: CameraSettingsPanelProps) {
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  function handleSliderChange(key: CameraSettingKey, rawValue: string) {
    onChange(patchCameraSettings(settings, key, Number(rawValue)));
  }

  function handleReset() {
    onChange(DEFAULT_CAMERA_SETTINGS);
  }

  return (
    <div ref={rootRef} className="pointer-events-auto relative">
      <button
        type="button"
        aria-expanded={isOpen}
        aria-controls={panelId}
        onClick={() => setIsOpen((open) => !open)}
        className="rounded-lg border border-white/10 bg-black/55 px-3 py-2 text-xs text-zinc-200 backdrop-blur-md transition hover:border-white/20 hover:bg-black/65"
      >
        Camera settings
      </button>

      {isOpen ? (
        <div
          id={panelId}
          role="dialog"
          aria-label="Camera settings"
          className="absolute top-full right-0 z-20 mt-2 w-72 rounded-lg border border-white/10 bg-black/75 p-3 shadow-xl backdrop-blur-md"
        >
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">
                Orbit feel
              </p>
              <p className="mt-0.5 text-xs text-zinc-400">
                Adjust navigation. Placement mode still disables pan.
              </p>
            </div>
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
              className="mb-3 rounded-md border border-amber-300/25 bg-amber-200/5 px-2 py-1.5 text-[11px] text-amber-100/90"
              aria-live="polite"
            >
              {placementHint}
            </p>
          ) : null}

          <div className="space-y-3">
            {PRIMARY_CAMERA_KEYS.map((key) => {
              const bounds = CAMERA_SETTING_BOUNDS[key];
              const value = settings[key];
              const sliderId = `${panelId}-${key}`;
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

          <details className="mt-3 border-t border-white/10 pt-3">
            <summary className="cursor-pointer text-[11px] text-zinc-500 hover:text-zinc-400">
              Zoom limits
            </summary>
            <div className="mt-3 space-y-3">
              {(["minDistance", "maxDistance"] as const).map((key) => {
                const bounds = CAMERA_SETTING_BOUNDS[key];
                const value = settings[key];
                const sliderId = `${panelId}-${key}`;
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
      ) : null}
    </div>
  );
}
