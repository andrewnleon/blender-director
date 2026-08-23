"use client";

import { useEffect, useId, useRef, useState } from "react";
import { getCatalogItem, type PlacedObject } from "@/lib/catalog";

type AssetListPanelProps = {
  placements: readonly PlacedObject[];
};

export function AssetListPanel({ placements }: AssetListPanelProps) {
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
          className="absolute top-full right-0 z-20 mt-2 w-88 max-w-[min(22rem,calc(100vw-2rem))] rounded-lg border border-white/10 bg-black/75 p-3 shadow-xl backdrop-blur-md"
        >
          <p className="mb-2 text-[11px] uppercase tracking-[0.16em] text-zinc-500">
            Staged · {placements.length}
          </p>
          <ul className="max-h-[min(70dvh,36rem)] space-y-1 overflow-y-auto text-sm">
            {placements.map((placement, index) => {
              const item = getCatalogItem(placement.catalogId);
              const footprint = item?.footprint;
              return (
                <li
                  key={placement.id}
                  className="flex items-center justify-between rounded px-2 py-1 text-zinc-300"
                >
                  <span>
                    <span className="font-mono text-[11px] text-zinc-500">
                      {String(index + 1).padStart(2, "0")}
                    </span>{" "}
                    {item?.label ?? placement.catalogId}
                  </span>
                  <span className="font-mono text-[11px] text-zinc-500">
                    {footprint
                      ? `${footprint.width}×${footprint.depth}`
                      : "default"}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
