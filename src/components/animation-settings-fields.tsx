"use client";

import { useId } from "react";
import {
  ANIMATION_SETTING_BOUNDS,
  DEFAULT_ANIMATION_SETTINGS,
  formatPlaybackSpeed,
  patchAnimationSettings,
  type AnimationSettings,
} from "@/lib/animation-settings";

type AnimationSettingsFieldsProps = {
  settings: AnimationSettings;
  onChange: (settings: AnimationSettings) => void;
  idPrefix?: string;
};

export function AnimationSettingsFields({
  settings,
  onChange,
  idPrefix = "animation",
}: AnimationSettingsFieldsProps) {
  const panelId = useId();
  const prefix = `${idPrefix}-${panelId}`;
  const bounds = ANIMATION_SETTING_BOUNDS.playbackSpeed;
  const sliderId = `${prefix}-playbackSpeed`;

  function handleSliderChange(rawValue: string) {
    onChange(patchAnimationSettings(settings, "playbackSpeed", Number(rawValue)));
  }

  function handleReset() {
    onChange(DEFAULT_ANIMATION_SETTINGS);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs text-zinc-400">
          One speed for every construct clip in the yard.
        </p>
        <button
          type="button"
          onClick={handleReset}
          className="shrink-0 rounded-md border border-white/10 px-2 py-1 text-[11px] text-zinc-300 hover:bg-white/5"
        >
          Reset
        </button>
      </div>

      <div>
        <div className="mb-1 flex items-center justify-between gap-2">
          <label htmlFor={sliderId} className="text-xs text-zinc-300">
            {bounds.label}
          </label>
          <span className="font-mono text-[11px] text-zinc-500">
            {formatPlaybackSpeed(settings.playbackSpeed)}
          </span>
        </div>
        <input
          id={sliderId}
          type="range"
          min={bounds.min}
          max={bounds.max}
          step={bounds.step}
          value={settings.playbackSpeed}
          onChange={(event) => handleSliderChange(event.target.value)}
          className="h-1.5 w-full cursor-pointer accent-amber-300/80"
        />
      </div>
    </div>
  );
}
