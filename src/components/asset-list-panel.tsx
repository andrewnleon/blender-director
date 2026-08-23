"use client";

import { useEffect, useId, useRef, useState } from "react";
import { getCatalogItem, type PlacedObject } from "@/lib/catalog";

type AssetListPanelProps = {
  placements: readonly PlacedObject[];
  selectedId: string | null;
  onSelectPlacement: (placementId: string | null) => void;
  onRemovePlacement: (placementId: string) => void;
};

export function AssetListPanel({
  placements,
  selectedId,
  onSelectPlacement,
  onRemovePlacement,
}: AssetListPanelProps) {
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
        Asset List
      </button>

      {isOpen ? (
        <div
          id={panelId}
          role="dialog"
          aria-label="Asset list"
          className="absolute bottom-full right-0 z-20 mb-2 w-88 max-w-[min(22rem,calc(100vw-2rem))] rounded-lg border border-white/10 bg-black/75 p-3 shadow-xl backdrop-blur-md"
        >
          <p className="mb-2 text-[11px] uppercase tracking-[0.16em] text-zinc-500">
            Staged · {placements.length}
          </p>
          <ul className="max-h-[min(70dvh,36rem)] space-y-1 overflow-y-auto text-sm">
            {placements.map((placement, index) => {
              const item = getCatalogItem(placement.catalogId);
              const label = item?.label ?? placement.catalogId;
              const footprint = item?.footprint;
              const isSelected = placement.id === selectedId;
              return (
                <li
                  key={placement.id}
                  className={`flex items-center gap-1 rounded ${
                    isSelected ? "bg-white/10" : ""
                  }`}
                >
                  <button
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => onSelectPlacement(placement.id)}
                    className={`flex min-h-9 min-w-0 flex-1 items-center justify-between rounded px-2 py-1 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-100 ${
                      isSelected
                        ? "text-white"
                        : "text-zinc-300 hover:bg-white/5"
                    }`}
                  >
                    <span className="truncate">
                      <span className="font-mono text-[11px] text-zinc-500">
                        {String(index + 1).padStart(2, "0")}
                      </span>{" "}
                      {label}
                    </span>
                    <span className="ml-2 shrink-0 font-mono text-[11px] text-zinc-500">
                      {footprint
                        ? `${footprint.width}×${footprint.depth}`
                        : "default"}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onRemovePlacement(placement.id)}
                    aria-label={`Remove ${label} from project`}
                    className="flex size-8 shrink-0 items-center justify-center rounded-md border border-rose-300/25 text-rose-200/90 transition hover:border-rose-300/50 hover:bg-rose-400/10 hover:text-rose-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-200"
                  >
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 16 16"
                      className="size-3.5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    >
                      <path
                        d="M3.5 4.5h9M6 4.5V3.25h4V4.5M5 4.5l.4 8h5.2l.4-8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
