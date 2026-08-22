"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useState } from "react";
import { canPlaceAt } from "@/lib/placement-collision";
import { AnimationSettingsPanel } from "@/components/animation-settings-panel";
import { CameraSettingsPanel } from "@/components/camera-settings-panel";
import { StageCanvas } from "@/components/stage-canvas";
import {
  CATALOG,
  canPlaceCatalogItem,
  countPlaced,
  getCatalogItem,
  type PlacedObject,
} from "@/lib/catalog";
import {
  DEFAULT_ANIMATION_SETTINGS,
  type AnimationSettings,
} from "@/lib/animation-settings";
import { DEFAULT_CAMERA_SETTINGS, type CameraSettings } from "@/lib/camera-settings";

const PALETTE_VISIBLE_SESSION_KEY = "openclaw-yard.palette-visible";
const SANDBOX_MODE_SESSION_KEY = "openclaw-yard.sandbox-mode";

function readPaletteVisibleFromSession(): boolean {
  if (typeof window === "undefined") {
    return true;
  }
  try {
    const stored = sessionStorage.getItem(PALETTE_VISIBLE_SESSION_KEY);
    if (stored === "0") {
      return false;
    }
    if (stored === "1") {
      return true;
    }
  } catch {
    return true;
  }
  return true;
}

function writePaletteVisibleToSession(isVisible: boolean): void {
  try {
    sessionStorage.setItem(PALETTE_VISIBLE_SESSION_KEY, isVisible ? "1" : "0");
  } catch {
    // sessionStorage may be unavailable in private browsing
  }
}

function readSandboxModeFromSession(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  try {
    return sessionStorage.getItem(SANDBOX_MODE_SESSION_KEY) === "1";
  } catch {
    return false;
  }
}

function writeSandboxModeToSession(isEnabled: boolean): void {
  try {
    sessionStorage.setItem(SANDBOX_MODE_SESSION_KEY, isEnabled ? "1" : "0");
  } catch {
    // sessionStorage may be unavailable in private browsing
  }
}

function nextId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

function ChevronIcon({ direction }: { direction: "left" | "right" }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      className="size-3.5 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
    >
      {direction === "left" ? (
        <path d="M10 3 5 8l5 5" strokeLinecap="round" strokeLinejoin="round" />
      ) : (
        <path d="M6 3l5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
      )}
    </svg>
  );
}

export function OpenClawYard() {
  const titleId = useId();
  const [objects, setObjects] = useState<PlacedObject[]>([]);
  const [placeCatalogId, setPlaceCatalogId] = useState<string | null>("skyscraper");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [cameraSettings, setCameraSettings] = useState<CameraSettings>(
    DEFAULT_CAMERA_SETTINGS,
  );
  const [animationSettings, setAnimationSettings] = useState<AnimationSettings>(
    DEFAULT_ANIMATION_SETTINGS,
  );
  const [hoverCanPlace, setHoverCanPlace] = useState<boolean | null>(null);
  const [isPaletteVisible, setIsPaletteVisible] = useState(true);
  const [isSandboxMode, setIsSandboxMode] = useState(false);

  useEffect(() => {
    setIsPaletteVisible(readPaletteVisibleFromSession());
    setIsSandboxMode(readSandboxModeFromSession());
  }, []);

  const togglePaletteVisible = useCallback(() => {
    setIsPaletteVisible((visible) => {
      const nextVisible = !visible;
      writePaletteVisibleToSession(nextVisible);
      return nextVisible;
    });
  }, []);

  const toggleSandboxMode = useCallback(() => {
    setIsSandboxMode((enabled) => {
      const nextEnabled = !enabled;
      writeSandboxModeToSession(nextEnabled);
      return nextEnabled;
    });
  }, []);

  const handlePlace = useCallback((position: [number, number, number]) => {
    if (!placeCatalogId) return;
    setObjects((prev) => {
      if (!canPlaceCatalogItem(placeCatalogId, prev, isSandboxMode)) {
        return prev;
      }
      if (!canPlaceAt(placeCatalogId, position, prev)) {
        return prev;
      }
      return [
        ...prev,
        { id: nextId(placeCatalogId), catalogId: placeCatalogId, position },
      ];
    });
    const item = getCatalogItem(placeCatalogId);
    if (!isSandboxMode && item?.maxCount === 1) {
      setPlaceCatalogId(null);
    }
  }, [placeCatalogId, isSandboxMode]);

  const handleSelect = useCallback((id: string | null) => {
    setSelectedId(id);
  }, []);

  function handleReset() {
    setObjects([]);
    setSelectedId(null);
    setPlaceCatalogId("skyscraper");
  }

  function handleRemoveSelected() {
    if (!selectedId) return;
    setObjects((prev) => prev.filter((object) => object.id !== selectedId));
    setSelectedId(null);
  }

  const placing =
    placeCatalogId && canPlaceCatalogItem(placeCatalogId, objects, isSandboxMode)
      ? getCatalogItem(placeCatalogId)
      : null;
  const skyscraperAtCap =
    !isSandboxMode && !canPlaceCatalogItem("skyscraper", objects);
  const placementHint = placing
    ? hoverCanPlace === false
      ? `Placing ${placing.label} · cell occupied — pick another spot`
      : `Placing ${placing.label} · hover grid, click to snap`
    : skyscraperAtCap
      ? "Skyscraper already in yard · reset to place again"
      : null;

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-[#1b1e1c] text-zinc-100">
      <StageCanvas
        objects={objects}
        selectedId={selectedId}
        placeCatalogId={placing ? placeCatalogId : null}
        cameraSettings={cameraSettings}
        animationSettings={animationSettings}
        onPlace={handlePlace}
        onSelect={handleSelect}
        onPlacementHoverChange={setHoverCanPlace}
      />

      <header className="pointer-events-none absolute top-0 left-0 right-0 flex items-start justify-between gap-4 p-4">
        <div className="pointer-events-auto max-w-md rounded-lg border border-white/10 bg-black/55 px-4 py-3 backdrop-blur-md">
          <h1
            id={titleId}
            className="text-[11px] uppercase tracking-[0.18em] text-amber-200/80"
          >
            OpenClaw Yard
          </h1>
        </div>
        <div className="flex items-start gap-2">
          <button
            type="button"
            onClick={toggleSandboxMode}
            aria-pressed={isSandboxMode}
            className={`pointer-events-auto rounded-lg border px-3 py-2 text-xs backdrop-blur-md transition ${
              isSandboxMode
                ? "border-amber-300/70 bg-amber-200/10 text-amber-100 hover:border-amber-300/80 hover:bg-amber-200/15"
                : "border-white/10 bg-black/55 text-zinc-200 hover:border-white/20 hover:bg-black/65"
            }`}
          >
            Sandbox mode
          </button>
          <AnimationSettingsPanel
            settings={animationSettings}
            onChange={setAnimationSettings}
          />
          <CameraSettingsPanel
            settings={cameraSettings}
            onChange={setCameraSettings}
            placementHint={placementHint}
          />
        </div>
      </header>

      <aside
        id="openclaw-yard-palette-sidebar"
        aria-labelledby={titleId}
        className={`pointer-events-none absolute top-0 left-0 z-10 flex h-full flex-col pt-20 pb-4 pl-4 transition-[width] duration-200 ease-out ${
          isPaletteVisible ? "w-72" : "w-14"
        }`}
      >
        <div className="pointer-events-auto relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-white/10 bg-black/60 backdrop-blur-md">
          {isPaletteVisible ? (
            <button
              type="button"
              onClick={togglePaletteVisible}
              aria-expanded={isPaletteVisible}
              aria-controls="openclaw-yard-palette-sidebar"
              aria-label="Collapse palette sidebar"
              className="absolute top-3 -right-3 z-10 flex size-7 items-center justify-center rounded-full border border-white/10 bg-black/80 text-zinc-200 shadow-sm backdrop-blur-md transition hover:border-white/25 hover:bg-black/90"
            >
              <ChevronIcon direction="left" />
            </button>
          ) : null}

          {isPaletteVisible ? (
            <>
              <div className="flex shrink-0 flex-col gap-3 p-3 pr-4">
                <div className="space-y-1">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">
                    Palette
                  </p>
                  {placementHint ? (
                    <p
                      className={`text-[11px] leading-snug ${
                        hoverCanPlace === false
                          ? "text-rose-300/90"
                          : "text-amber-200/80"
                      }`}
                      aria-live="polite"
                    >
                      {placementHint}
                    </p>
                  ) : (
                    <p className="text-[11px] text-zinc-600">Orbit mode</p>
                  )}
                </div>

                <div className="max-h-64 overflow-y-auto">
                  <div className="grid grid-cols-2 gap-2">
                    {CATALOG.map((item) => {
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
                          title={
                            isAtCap ? `${item.label} already in yard` : undefined
                          }
                          onClick={() =>
                            setPlaceCatalogId((current) =>
                              current === item.id ? null : item.id,
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

                <div className="flex flex-col gap-2">
                  <Link
                    href="/library"
                    className="inline-flex rounded-md border border-white/10 px-3 py-1.5 text-center text-sm text-zinc-300 hover:bg-white/5"
                  >
                    Asset library grid
                  </Link>
                  <button
                    type="button"
                    onClick={handleReset}
                    className="rounded-md border border-white/10 px-3 py-1.5 text-sm text-zinc-300 hover:bg-white/5"
                  >
                    Reset yard
                  </button>
                  <button
                    type="button"
                    onClick={handleRemoveSelected}
                    disabled={!selectedId}
                    className="rounded-md border border-white/10 px-3 py-1.5 text-sm text-zinc-300 hover:bg-white/5 disabled:opacity-40"
                  >
                    Remove selected
                  </button>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto border-t border-white/10 p-3 pr-4">
                <p className="mb-2 text-[11px] uppercase tracking-[0.16em] text-zinc-500">
                  Placed · {objects.length}
                </p>
                {objects.length === 0 ? (
                  <p className="text-sm text-zinc-500">Yard is empty.</p>
                ) : (
                  <ul className="space-y-1 text-sm">
                    {objects.map((object) => {
                      const item = getCatalogItem(object.catalogId);
                      const isSelected = object.id === selectedId;
                      return (
                        <li key={object.id}>
                          <button
                            type="button"
                            onClick={() => setSelectedId(object.id)}
                            className={`flex w-full items-center justify-between rounded px-2 py-1 text-left ${
                              isSelected
                                ? "bg-white/10 text-white"
                                : "text-zinc-300"
                            }`}
                          >
                            <span>{item?.label ?? object.catalogId}</span>
                            <span className="font-mono text-[11px] text-zinc-500">
                              {object.position[0]}, {object.position[2]}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center gap-3 px-1 py-4">
              <button
                type="button"
                onClick={togglePaletteVisible}
                aria-label="Expand palette sidebar"
                className="flex size-9 items-center justify-center rounded-md border border-white/10 bg-white/5 text-zinc-300 transition hover:border-white/25 hover:bg-white/10"
              >
                <ChevronIcon direction="right" />
              </button>
              <span
                className="text-[10px] font-medium uppercase tracking-[0.2em] text-zinc-500 [writing-mode:vertical-rl]"
                aria-hidden="true"
              >
                Palette
              </span>
              {objects.length > 0 ? (
                <span
                  className="flex size-6 items-center justify-center rounded-full bg-amber-200/15 text-[10px] font-medium text-amber-100"
                  aria-label={`${objects.length} placed in yard`}
                >
                  {objects.length}
                </span>
              ) : null}
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
