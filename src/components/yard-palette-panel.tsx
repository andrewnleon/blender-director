"use client";

import { useCallback, useId, useMemo, useState } from "react";
import { preloadCatalogGlbById } from "@/hooks/use-catalog-glb-preload";
import {
  canPlaceCatalogItem,
  countPlaced,
  getVisibleCatalogItems,
  type PlacedObject,
} from "@/lib/catalog";
import {
  yardChromeDockedPanelClass,
  yardChromeIconButtonClass,
  yardChromeIconButtonActiveClass,
} from "@/components/yard-chrome-styles";

const PANEL_VISIBLE_SESSION_KEY = "openclaw-yard.palette-visible";

type YardPalettePanelProps = {
  objects: PlacedObject[];
  placeCatalogId: string | null;
  isSandboxMode: boolean;
  onPlaceCatalogIdChange: (catalogId: string | null) => void;
  placementHint: string | null;
  hoverCanPlace: boolean | null;
  excludedCatalogIds: readonly string[];
};

function readPanelVisibleFromSession(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  try {
    const stored = sessionStorage.getItem(PANEL_VISIBLE_SESSION_KEY);
    if (stored === "0") {
      return false;
    }
    if (stored === "1") {
      return true;
    }
  } catch {
    return false;
  }
  return false;
}

function writePanelVisibleToSession(isVisible: boolean): void {
  try {
    sessionStorage.setItem(PANEL_VISIBLE_SESSION_KEY, isVisible ? "1" : "0");
  } catch {
    // sessionStorage may be unavailable in private browsing
  }
}

function ChevronIcon({ direction }: { direction: "left" }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      className="size-3.5 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
    >
      <path d="M10 3 5 8l5 5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PaletteIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      className="size-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <path
        d="M10 3.5a6.5 6.5 0 0 0-6.5 6.5c0 1.2.3 2.3.9 3.3L10 18l5.6-4.7a6.4 6.4 0 0 0 .9-3.3A6.5 6.5 0 0 0 10 3.5Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="7.5" cy="9" r="1" fill="currentColor" stroke="none" />
      <circle cx="10" cy="7.5" r="1" fill="currentColor" stroke="none" />
      <circle cx="12.5" cy="9" r="1" fill="currentColor" stroke="none" />
      <circle cx="11" cy="11.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

type YardPalettePanelTriggerProps = {
  isOpen: boolean;
  onToggle: () => void;
  hasActivePlacement: boolean;
  panelId: string;
};

export function YardPalettePanelTrigger({
  isOpen,
  onToggle,
  hasActivePlacement,
  panelId,
}: YardPalettePanelTriggerProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={isOpen}
      aria-controls={panelId}
      aria-label={isOpen ? "Hide building palette" : "Show building palette"}
      title="Palette"
      className={`${yardChromeIconButtonClass} ${
        isOpen ? yardChromeIconButtonActiveClass : ""
      }`}
    >
      <PaletteIcon />
      {hasActivePlacement ? (
        <span
          className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-amber-200"
          aria-hidden="true"
        />
      ) : null}
    </button>
  );
}

type YardPalettePanelSurfaceProps = YardPalettePanelProps & {
  panelId: string;
  onClose: () => void;
};

export function YardPalettePanelSurface({
  objects,
  placeCatalogId,
  isSandboxMode,
  onPlaceCatalogIdChange,
  placementHint,
  hoverCanPlace,
  excludedCatalogIds,
  panelId,
  onClose,
}: YardPalettePanelSurfaceProps) {
  const visibleCatalog = useMemo(
    () => getVisibleCatalogItems(excludedCatalogIds),
    [excludedCatalogIds],
  );

  return (
    <div
      id={panelId}
      className={yardChromeDockedPanelClass}
    >
      <header className="flex shrink-0 items-center justify-between gap-2 border-b border-white/10 px-3 py-2">
        <div>
          <p className="text-[10px] uppercase tracking-[0.18em] text-amber-200/70">
            Yard
          </p>
          <h2 className="text-sm font-medium text-zinc-100">Building palette</h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-expanded={true}
          aria-controls={panelId}
          aria-label="Hide building palette"
          className="flex size-8 items-center justify-center rounded-md border border-white/10 text-zinc-400 transition hover:border-white/20 hover:bg-white/5 hover:text-zinc-200"
        >
          <ChevronIcon direction="left" />
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3">
        {placementHint ? (
          <p
            className={`mb-3 rounded-md border px-2 py-1.5 text-[11px] leading-snug ${
              hoverCanPlace === false
                ? "border-rose-400/30 bg-rose-950/30 text-rose-200/90"
                : "border-amber-300/25 bg-amber-200/5 text-amber-100/90"
            }`}
            aria-live="polite"
          >
            {placementHint}
          </p>
        ) : (
          <p className="mb-3 text-[11px] text-zinc-500">
            Select a building, then click the grid to place.
          </p>
        )}

        <p className="mb-2 text-xs font-medium text-zinc-200">
          Buildings
          <span className="ml-2 rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] font-medium text-zinc-400">
            {visibleCatalog.length}
          </span>
        </p>

        <div className="grid grid-cols-2 gap-2">
          {visibleCatalog.map((item) => {
            const active =
              placeCatalogId === item.id &&
              canPlaceCatalogItem(item.id, objects, isSandboxMode);
            const isAtCap =
              !isSandboxMode &&
              item.maxCount !== undefined &&
              countPlaced(objects, item.id) >= item.maxCount;
            return (
              <button
                key={item.id}
                type="button"
                disabled={isAtCap}
                aria-disabled={isAtCap}
                aria-pressed={active}
                title={isAtCap ? `${item.label} already in yard` : undefined}
                onMouseEnter={() => preloadCatalogGlbById(item.id)}
                onFocus={() => preloadCatalogGlbById(item.id)}
                onClick={() =>
                  onPlaceCatalogIdChange(
                    placeCatalogId === item.id ? null : item.id,
                  )
                }
                className={`rounded-md border px-2 py-2 text-left text-sm transition ${
                  isAtCap
                    ? "cursor-not-allowed border-white/10 bg-white/5 text-zinc-500"
                    : active
                      ? "border-amber-300/70 bg-amber-200/10 text-amber-100"
                      : "border-white/10 bg-white/5 text-zinc-200 hover:border-white/25"
                }`}
              >
                <span className="block text-xs font-medium leading-tight">
                  {item.label}
                </span>
                <span className="mt-0.5 block text-[10px] leading-snug text-zinc-500">
                  {isAtCap
                    ? "already in yard"
                    : `${item.role}${item.kind === "glb" ? " · GLB" : " · primitive"}`}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function YardPalettePanel(props: YardPalettePanelProps) {
  const panelId = useId();
  const [isPanelVisible, setIsPanelVisible] = useState(() =>
    readPanelVisibleFromSession(),
  );

  const togglePanelVisible = useCallback(() => {
    setIsPanelVisible((visible) => {
      const nextVisible = !visible;
      writePanelVisibleToSession(nextVisible);
      return nextVisible;
    });
  }, []);

  return (
    <>
      <YardPalettePanelTrigger
        isOpen={isPanelVisible}
        onToggle={togglePanelVisible}
        hasActivePlacement={Boolean(props.placeCatalogId)}
        panelId={panelId}
      />
      {isPanelVisible ? (
        <YardPalettePanelSurface
          {...props}
          panelId={panelId}
          onClose={togglePanelVisible}
        />
      ) : null}
    </>
  );
}
