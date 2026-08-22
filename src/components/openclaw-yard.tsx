"use client";

import Link from "next/link";
import { useCallback, useId, useState } from "react";
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

function nextId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
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

  const handlePlace = useCallback((position: [number, number, number]) => {
    if (!placeCatalogId) return;
    setObjects((prev) => {
      if (!canPlaceCatalogItem(placeCatalogId, prev)) {
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
    if (item?.maxCount === 1) {
      setPlaceCatalogId(null);
    }
  }, [placeCatalogId]);

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
    placeCatalogId && canPlaceCatalogItem(placeCatalogId, objects)
      ? getCatalogItem(placeCatalogId)
      : null;
  const skyscraperAtCap = !canPlaceCatalogItem("skyscraper", objects);
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
        className="absolute bottom-4 left-4 right-4 flex flex-col gap-3 md:right-auto md:w-88"
        aria-labelledby={titleId}
      >
        <div className="rounded-lg border border-white/10 bg-black/60 p-3 backdrop-blur-md">
          <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">
              Palette
            </p>
            {placementHint ? (
              <p
                className={`text-[11px] ${
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
          <div className="max-h-48 overflow-y-auto">
            <div className="flex flex-wrap gap-2">
            {CATALOG.map((item) => {
              const active = placeCatalogId === item.id && canPlaceCatalogItem(item.id, objects);
              const isAtCap =
                item.maxCount !== undefined &&
                countPlaced(objects, item.id) >= item.maxCount;
              return (
                <button
                  key={item.id}
                  type="button"
                  disabled={isAtCap}
                  aria-disabled={isAtCap}
                  title={isAtCap ? `${item.label} already in yard` : undefined}
                  onClick={() =>
                    setPlaceCatalogId((current) =>
                      current === item.id ? null : item.id,
                    )
                  }
                  className={`rounded-md border px-3 py-2 text-left text-sm transition ${
                    isAtCap
                      ? "cursor-not-allowed border-white/10 bg-white/5 text-zinc-500"
                      : active
                        ? "border-amber-300/70 bg-amber-200/10 text-amber-100"
                        : "border-white/10 bg-white/5 text-zinc-200 hover:border-white/25"
                  }`}
                >
                  <span className="block font-medium">{item.label}</span>
                  <span className="block text-[11px] text-zinc-500">
                    {isAtCap
                      ? "already in yard"
                      : `${item.role}${item.kind === "glb" ? " · GLB" : " · primitive"}`}
                  </span>
                </button>
              );
            })}
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              href="/library"
              className="inline-flex rounded-md border border-white/10 px-3 py-1.5 text-sm text-zinc-300 hover:bg-white/5"
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

        <div className="max-h-40 overflow-auto rounded-lg border border-white/10 bg-black/60 p-3 backdrop-blur-md">
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
                        isSelected ? "bg-white/10 text-white" : "text-zinc-300"
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
      </aside>
    </div>
  );
}
