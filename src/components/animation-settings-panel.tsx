"use client";

import { useEffect, useId, useRef, useState } from "react";
import {
  ANIMATION_SETTING_BOUNDS,
  DEFAULT_ANIMATION_SETTINGS,
  formatPlaybackSpeed,
  patchAnimationSettings,
  type AnimationSettings,
} from "@/lib/animation-settings";

type AnimationSettingsPanelProps = {
  settings: AnimationSettings;
  onChange: (settings: AnimationSettings) => void;
};

export function AnimationSettingsPanel({
  settings,
  onChange,
}: AnimationSettingsPanelProps) {
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const sliderId = `${panelId}-playbackSpeed`;
  const bounds = ANIMATION_SETTING_BOUNDS.playbackSpeed;

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

  function handleSliderChange(rawValue: string) {
    onChange(patchAnimationSettings(settings, "playbackSpeed", Number(rawValue)));
  }

  function handleReset() {
    onChange(DEFAULT_ANIMATION_SETTINGS);
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
        Animation speed
      </button>

      {isOpen ? (
        <div
          id={panelId}
          role="dialog"
          aria-label="Animation speed"
          className="absolute top-full right-0 z-20 mt-2 w-72 rounded-lg border border-white/10 bg-black/75 p-3 shadow-xl backdrop-blur-md"
        >
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">
                Clip playback
              </p>
              <p className="mt-0.5 text-xs text-zinc-400">
                One speed for every construct clip in the yard.
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
      ) : null}
    </div>
  );
}
