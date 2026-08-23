"use client";

import {
  SCENE_VARIANT_LABELS,
  SCENE_VARIANTS,
  type SceneVariant,
} from "@/lib/scene-lighting";
import {
  yardChromeIconButtonActiveClass,
  yardChromeIconButtonClass,
  yardChromePopoverClass,
} from "@/components/yard-chrome-styles";

type DynamicSceneButtonProps = {
  isEnabled: boolean;
  onToggle: () => void;
  variant: SceneVariant;
  onVariantChange: (variant: SceneVariant) => void;
};

function LiveSceneIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      className="size-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <circle cx="10" cy="10" r="3.25" />
      <path
        d="M10 2.5v1.5M10 16v1.5M2.5 10h1.5M16 10h1.5M4.8 4.8l1.1 1.1M14.1 14.1l1.1 1.1M4.8 15.2l1.1-1.1M14.1 5.9l1.1-1.1"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function DynamicSceneButton({
  isEnabled,
  onToggle,
  variant,
  onVariantChange,
}: DynamicSceneButtonProps) {
  return (
    <div className="relative">
      <button
        type="button"
        aria-pressed={isEnabled}
        aria-expanded={isEnabled}
        aria-label={isEnabled ? "Turn off live scene" : "Turn on live scene"}
        title={isEnabled ? "Live scene on" : "Live scene off"}
        onClick={onToggle}
        className={`${yardChromeIconButtonClass} ${
          isEnabled ? yardChromeIconButtonActiveClass : ""
        }`}
      >
        <LiveSceneIcon />
      </button>
      {isEnabled ? (
        <div
          role="radiogroup"
          aria-label="Live scene weather"
          className={`${yardChromePopoverClass} w-auto min-w-[11rem] gap-1 p-1`}
        >
          <div className="grid grid-cols-2 gap-1">
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
        </div>
      ) : null}
    </div>
  );
}
