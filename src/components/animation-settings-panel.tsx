"use client";

import { useEffect, useId, useRef, useState } from "react";
import { AnimationSettingsFields } from "@/components/animation-settings-fields";
import type { AnimationSettings } from "@/lib/animation-settings";

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
          <p className="mb-3 text-[11px] uppercase tracking-[0.16em] text-zinc-500">
            Clip playback
          </p>
          <AnimationSettingsFields settings={settings} onChange={onChange} />
        </div>
      ) : null}
    </div>
  );
}
