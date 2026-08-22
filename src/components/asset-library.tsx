"use client";

import Link from "next/link";
import { useId, useMemo, useState } from "react";
import { CameraSettingsPanel } from "@/components/camera-settings-panel";
import { StageCanvas } from "@/components/stage-canvas";
import { getCatalogItem } from "@/lib/catalog";
import { DEFAULT_CAMERA_SETTINGS, type CameraSettings } from "@/lib/camera-settings";
import {
  buildLibraryPlacements,
  getLibraryBounds,
  getLibraryCatalogItems,
  getLibraryGroundExtent,
  getLibraryViewDistance,
  LIBRARY_CELL_PADDING,
  LIBRARY_COLUMN_COUNT,
} from "@/lib/library-layout";

export function AssetLibrary() {
  const titleId = useId();
  const libraryItems = useMemo(() => getLibraryCatalogItems(), []);
  const placements = useMemo(
    () => buildLibraryPlacements(libraryItems),
    [libraryItems],
  );
  const bounds = useMemo(() => getLibraryBounds(placements), [placements]);
  const groundExtent = useMemo(() => getLibraryGroundExtent(bounds), [bounds]);
  const [cameraSettings, setCameraSettings] = useState<CameraSettings>(() => ({
    ...DEFAULT_CAMERA_SETTINGS,
    viewDistance: getLibraryViewDistance(bounds),
  }));

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-[#1b1e1c] text-zinc-100">
      <StageCanvas
        objects={placements}
        selectedId={null}
        placeCatalogId={null}
        cameraSettings={cameraSettings}
        onPlace={() => {}}
        onSelect={() => {}}
        readOnly
        staticPreview
        cameraTarget={bounds.center}
        groundExtent={groundExtent}
      />

      <header className="pointer-events-none absolute top-0 left-0 right-0 flex items-start justify-between gap-4 p-4">
        <div className="pointer-events-auto max-w-md rounded-lg border border-white/10 bg-black/55 px-4 py-3 backdrop-blur-md">
          <p className="text-[11px] uppercase tracking-[0.18em] text-amber-200/80">
            Asset library
          </p>
          <h1 id={titleId} className="mt-1 text-lg font-semibold tracking-tight">
            Building catalog preview
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            Auto-staged grid with footprint spacing — no overlap. Orbit to compare
            silhouettes before dropping assets in the yard.
          </p>
          <Link
            href="/"
            className="mt-3 inline-flex rounded-md border border-white/10 px-3 py-1.5 text-sm text-zinc-200 transition hover:border-white/25 hover:bg-white/5"
          >
            Back to yard
          </Link>
        </div>
        <CameraSettingsPanel
          settings={cameraSettings}
          onChange={setCameraSettings}
          placementHint={`${libraryItems.length} assets · ${LIBRARY_COLUMN_COUNT}-col grid · ${LIBRARY_CELL_PADDING}u pad`}
        />
      </header>

      <aside
        className="absolute bottom-4 left-4 right-4 flex flex-col gap-3 md:right-auto md:w-88"
        aria-labelledby={titleId}
      >
        <div className="rounded-lg border border-white/10 bg-black/60 p-3 backdrop-blur-md">
          <p className="mb-2 text-[11px] uppercase tracking-[0.16em] text-zinc-500">
            Staged · {libraryItems.length}
          </p>
          <ul className="space-y-1 text-sm">
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
      </aside>
    </div>
  );
}
