"use client";

import {
  SCENE_VARIANT_LABELS,
  SCENE_VARIANTS,
  type SceneVariant,
} from "@/lib/scene-lighting";

type DynamicSceneButtonProps = {
  isEnabled: boolean;
  onToggle: () => void;
  variant: SceneVariant;
  onVariantChange: (variant: SceneVariant) => void;
};

export function DynamicSceneButton({
  isEnabled,
  onToggle,
  variant,
  onVariantChange,
}: DynamicSceneButtonProps) {
  return (
    <div className="pointer-events-auto flex flex-col items-stretch gap-2">
      <button
        type="button"
        aria-pressed={isEnabled}
        aria-label={isEnabled ? "Turn off live scene" : "Turn on live scene"}
        onClick={onToggle}
        className={`rounded-lg border px-3 py-2 text-xs backdrop-blur-md transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-100 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900 ${
          isEnabled
            ? "border-amber-300/60 bg-amber-200/15 text-amber-100"
            : "border-white/10 bg-black/55 text-zinc-200 hover:border-white/20 hover:bg-black/65"
        }`}
      >
        Live scene
      </button>
      {isEnabled ? (
        <div
          role="radiogroup"
          aria-label="Live scene weather"
          className="grid grid-cols-2 gap-1 rounded-lg border border-white/10 bg-black/55 p-1 backdrop-blur-md"
        >
          {SCENE_VARIANTS.map((option) => {
            const isSelected = option === variant;
            return (
              <button
                key={option}
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() => onVariantChange(option)}
                className={`min-h-8 rounded-md px-2 text-[11px] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-100 ${
                  isSelected
                    ? "bg-white/15 text-zinc-50"
                    : "text-zinc-300 hover:bg-white/10 hover:text-zinc-100"
                }`}
              >
                {SCENE_VARIANT_LABELS[option]}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
