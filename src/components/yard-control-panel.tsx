"use client";

import Link from "next/link";
import { useCallback, useId, useState, type ReactNode } from "react";
import type { AgentStreamStatus } from "@/hooks/use-agent-stream";
import { AgentStreamConnectButton } from "@/components/agent-stream-connect-button";
import { AnimationSettingsFields } from "@/components/animation-settings-fields";
import { CameraSettingsFields } from "@/components/camera-settings-fields";
import { getCatalogItem, type PlacedObject } from "@/lib/catalog";
import type { AnimationSettings } from "@/lib/animation-settings";
import type { CameraSettings } from "@/lib/camera-settings";

const PANEL_VISIBLE_SESSION_KEY = "openclaw-yard.controls-visible";

type YardTabId = "assets" | "view" | "stream";

type YardControlPanelProps = {
  objects: PlacedObject[];
  selectedId: string | null;
  isSandboxMode: boolean;
  onToggleSandboxMode: () => void;
  onSelectObject: (id: string) => void;
  onResetYard: () => void;
  onRemoveObject: (id: string) => void;
  placementHint: string | null;
  hoverCanPlace: boolean | null;
  cameraSettings: CameraSettings;
  onCameraSettingsChange: (settings: CameraSettings) => void;
  animationSettings: AnimationSettings;
  onAnimationSettingsChange: (settings: AnimationSettings) => void;
  streamEnabled: boolean;
  streamStatus: AgentStreamStatus;
  onStreamToggle: () => void;
  isStreamLive: boolean;
  streamFetchError: string | null;
};

function readPanelVisibleFromSession(): boolean {
  if (typeof window === "undefined") {
    return true;
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
    return true;
  }
  return true;
}

function writePanelVisibleToSession(isVisible: boolean): void {
  try {
    sessionStorage.setItem(PANEL_VISIBLE_SESSION_KEY, isVisible ? "1" : "0");
  } catch {
    // sessionStorage may be unavailable in private browsing
  }
}

function ChevronIcon({ direction }: { direction: "up" | "down" | "left" }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      className="size-3.5 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
    >
      {direction === "up" ? (
        <path
          d="M4 10l4-4 4 4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : direction === "down" ? (
        <path
          d="M4 6l4 4 4-4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : (
        <path
          d="M10 3 5 8l5 5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      className="size-3.5 shrink-0"
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
  );
}

function PanelIcon() {
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
        d="M3.5 4.5h13M3.5 10h9M3.5 15.5h13"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ResetYardButton({ onResetYard }: { onResetYard: () => void }) {
  return (
    <button
      type="button"
      onClick={onResetYard}
      className="pointer-events-auto shrink-0 rounded-lg border border-white/10 bg-black/70 px-3 py-2 text-sm text-zinc-300 shadow-lg backdrop-blur-md transition hover:border-white/20 hover:bg-black/80"
    >
      Reset yard
    </button>
  );
}

function AccordionSection({
  title,
  badge,
  defaultOpen = true,
  children,
}: {
  title: string;
  badge?: string | number;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const sectionId = useId();

  return (
    <div className="border-b border-white/8 last:border-b-0">
      <button
        type="button"
        id={`${sectionId}-trigger`}
        aria-expanded={isOpen}
        aria-controls={`${sectionId}-panel`}
        onClick={() => setIsOpen((open) => !open)}
        className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left transition hover:bg-white/3"
      >
        <span className="text-xs font-medium text-zinc-200">{title}</span>
        <span className="flex items-center gap-2">
          {badge !== undefined ? (
            <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] font-medium text-zinc-400">
              {badge}
            </span>
          ) : null}
          <ChevronIcon direction={isOpen ? "up" : "down"} />
        </span>
      </button>
      {isOpen ? (
        <div
          id={`${sectionId}-panel`}
          role="region"
          aria-labelledby={`${sectionId}-trigger`}
          className="px-3 pb-3"
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}

const TAB_LABELS: Record<YardTabId, string> = {
  assets: "Assets",
  view: "View",
  stream: "Stream",
};

export function YardControlPanel({
  objects,
  selectedId,
  isSandboxMode,
  onToggleSandboxMode,
  onSelectObject,
  onResetYard,
  onRemoveObject,
  placementHint,
  hoverCanPlace,
  cameraSettings,
  onCameraSettingsChange,
  animationSettings,
  onAnimationSettingsChange,
  streamEnabled,
  streamStatus,
  onStreamToggle,
  isStreamLive,
  streamFetchError,
}: YardControlPanelProps) {
  const panelId = useId();
  const [isPanelVisible, setIsPanelVisible] = useState(() =>
    readPanelVisibleFromSession(),
  );
  const [activeTab, setActiveTab] = useState<YardTabId>("assets");

  const togglePanelVisible = useCallback(() => {
    setIsPanelVisible((visible) => {
      const nextVisible = !visible;
      writePanelVisibleToSession(nextVisible);
      return nextVisible;
    });
  }, []);

  if (!isPanelVisible) {
    return (
      <div className="flex items-start gap-2">
        <ResetYardButton onResetYard={onResetYard} />
        <button
          type="button"
          onClick={togglePanelVisible}
          aria-expanded={false}
          aria-controls={panelId}
          aria-label="Show yard controls"
          className="pointer-events-auto flex items-center gap-2 rounded-lg border border-white/10 bg-black/70 px-3 py-2 text-xs text-zinc-200 shadow-lg backdrop-blur-md transition hover:border-white/20 hover:bg-black/80"
        >
          <PanelIcon />
          <span>Controls</span>
          {objects.length > 0 ? (
            <span
              className="rounded-full bg-amber-200/15 px-1.5 py-0.5 text-[10px] font-medium text-amber-100"
              aria-label={`${objects.length} placed in yard`}
            >
              {objects.length}
            </span>
          ) : null}
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2">
      <ResetYardButton onResetYard={onResetYard} />
      <div
        id={panelId}
        className="pointer-events-auto flex max-h-[calc(100dvh-2rem)] w-[min(100vw-2rem,20rem)] flex-col overflow-hidden rounded-xl border border-white/10 bg-black/75 shadow-2xl backdrop-blur-xl"
      >
        <header className="flex shrink-0 items-center justify-between gap-2 border-b border-white/10 px-3 py-2.5">
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-amber-200/70">
              Yard
            </p>
            <h2 className="text-sm font-medium text-zinc-100">Control panel</h2>
          </div>
          <button
            type="button"
            onClick={togglePanelVisible}
            aria-expanded={true}
            aria-controls={panelId}
            aria-label="Hide yard controls"
            className="flex size-8 items-center justify-center rounded-md border border-white/10 text-zinc-400 transition hover:border-white/20 hover:bg-white/5 hover:text-zinc-200"
          >
            <ChevronIcon direction="left" />
          </button>
        </header>

        <div
          role="tablist"
          aria-label="Yard control sections"
          className="flex shrink-0 border-b border-white/10 px-2 pt-1"
        >
          {(Object.keys(TAB_LABELS) as YardTabId[]).map((tabId) => {
            const isActive = activeTab === tabId;
            return (
              <button
                key={tabId}
                type="button"
                role="tab"
                id={`${panelId}-tab-${tabId}`}
                aria-selected={isActive}
                aria-controls={`${panelId}-tabpanel-${tabId}`}
                onClick={() => setActiveTab(tabId)}
                className={`relative px-3 py-2 text-xs font-medium transition ${
                  isActive
                    ? "text-amber-100"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {TAB_LABELS[tabId]}
                {isActive ? (
                  <span
                    className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-amber-300/80"
                    aria-hidden="true"
                  />
                ) : null}
              </button>
            );
          })}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {activeTab === "assets" ? (
            <div
              role="tabpanel"
              id={`${panelId}-tabpanel-assets`}
              aria-labelledby={`${panelId}-tab-assets`}
            >
              <AccordionSection
                title="Placed in yard"
                badge={objects.length}
              >
                {objects.length === 0 ? (
                  <p className="text-sm text-zinc-500">
                    Yard is empty. Place a model, then select it here or in the
                    scene to delete it.
                  </p>
                ) : (
                  <div className="flex flex-col gap-2">
                    <ul className="space-y-1 text-sm">
                      {objects.map((object) => {
                        const item = getCatalogItem(object.catalogId);
                        const label = item?.label ?? object.catalogId;
                        const isSelected = object.id === selectedId;
                        return (
                          <li
                            key={object.id}
                            className={`flex items-center gap-1 rounded ${
                              isSelected ? "bg-white/10" : ""
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() => onSelectObject(object.id)}
                              aria-pressed={isSelected}
                              className={`flex min-h-9 min-w-0 flex-1 items-center justify-between rounded px-2 py-1.5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-100 ${
                                isSelected
                                  ? "text-white"
                                  : "text-zinc-300 hover:bg-white/5"
                              }`}
                            >
                              <span className="truncate">{label}</span>
                              <span className="ml-2 shrink-0 font-mono text-[11px] text-zinc-500">
                                {object.position[0]}, {object.position[2]}
                              </span>
                            </button>
                            <button
                              type="button"
                              onClick={() => onRemoveObject(object.id)}
                              aria-label={`Delete ${label} from scene`}
                              className="mr-1 flex size-8 shrink-0 items-center justify-center rounded-md border border-rose-300/25 text-rose-200/90 transition hover:border-rose-300/50 hover:bg-rose-400/10 hover:text-rose-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-200"
                            >
                              <TrashIcon />
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                    <button
                      type="button"
                      onClick={() => {
                        if (selectedId) {
                          onRemoveObject(selectedId);
                        }
                      }}
                      disabled={!selectedId}
                      className="rounded-md border border-rose-300/30 px-3 py-2 text-sm text-rose-100 transition hover:bg-rose-400/10 disabled:border-white/10 disabled:text-zinc-500 disabled:opacity-40 disabled:hover:bg-transparent"
                    >
                      Delete selected from scene
                    </button>
                    <p className="text-[11px] text-zinc-500">
                      Click a model in the list or yard to select it. Delete key
                      also removes the selection.
                    </p>
                  </div>
                )}
              </AccordionSection>

              <AccordionSection
                title="Yard actions"
                defaultOpen={false}
              >
                <div className="flex flex-col gap-2">
                  <Link
                    href="/library"
                    className="inline-flex rounded-md border border-white/10 px-3 py-2 text-center text-sm text-zinc-300 transition hover:bg-white/5"
                  >
                    Asset library grid
                  </Link>
                </div>
              </AccordionSection>
            </div>
          ) : null}

          {activeTab === "view" ? (
            <div
              role="tabpanel"
              id={`${panelId}-tabpanel-view`}
              aria-labelledby={`${panelId}-tab-view`}
            >
              <AccordionSection
                title="Camera"
                defaultOpen
              >
                <CameraSettingsFields
                  settings={cameraSettings}
                  onChange={onCameraSettingsChange}
                  placementHint={placementHint}
                  idPrefix="yard-camera"
                />
              </AccordionSection>

              <AccordionSection
                title="Animation"
                defaultOpen={false}
              >
                <AnimationSettingsFields
                  settings={animationSettings}
                  onChange={onAnimationSettingsChange}
                  idPrefix="yard-animation"
                />
              </AccordionSection>
            </div>
          ) : null}

          {activeTab === "stream" ? (
            <div
              role="tabpanel"
              id={`${panelId}-tabpanel-stream`}
              aria-labelledby={`${panelId}-tab-stream`}
            >
              <AccordionSection
                title="OpenClaw connection"
                defaultOpen
              >
                <div className="space-y-3">
                  <AgentStreamConnectButton
                    isEnabled={streamEnabled}
                    status={streamStatus}
                    onToggle={onStreamToggle}
                    layout="block"
                  />
                  <p className="text-xs text-zinc-400">
                    {isStreamLive
                      ? "Live — building progress follows agent tasks."
                      : streamEnabled
                        ? "Waiting for connection or task data."
                        : "Connect to drive construction from agent work."}
                  </p>
                  {streamFetchError ? (
                    <p className="text-xs text-rose-300/90">
                      {streamFetchError}
                    </p>
                  ) : null}
                </div>
              </AccordionSection>

              <AccordionSection
                title="Sandbox"
                defaultOpen={false}
              >
                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={onToggleSandboxMode}
                    aria-pressed={isSandboxMode}
                    className={`w-full rounded-md border px-3 py-2 text-sm transition ${
                      isSandboxMode
                        ? "border-amber-300/70 bg-amber-200/10 text-amber-100"
                        : "border-white/10 bg-white/5 text-zinc-200 hover:border-white/25"
                    }`}
                  >
                    {isSandboxMode ? "Sandbox mode on" : "Enable sandbox mode"}
                  </button>
                  <p className="text-xs text-zinc-400">
                    Unlimited placements and no per-asset caps while sandbox is
                    active.
                  </p>
                </div>
              </AccordionSection>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
