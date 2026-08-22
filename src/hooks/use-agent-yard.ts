"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { buildConstructionMap } from "@/lib/construction/driver";
import type { ConstructionState } from "@/lib/construction/types";
import type { OpenClawEvent } from "@/types/openclaw-event";
import type { Agent, AgentTask } from "@/types/openclaw";

const REFRESH_DEBOUNCE_MS = 400;

type UseAgentYardOptions = {
  /** Stream toggle on — fetch + listen for events. */
  streamEnabled: boolean;
  /** Stream socket is open. */
  streamConnected: boolean;
  /** Latest SSE payload from parent hook. */
  lastStreamEvent?: OpenClawEvent | null;
};

function isAgentArray(value: unknown): value is Agent[] {
  return Array.isArray(value);
}

function isTaskArray(value: unknown): value is AgentTask[] {
  return Array.isArray(value);
}

export function useAgentYard(options: UseAgentYardOptions) {
  const { streamEnabled, streamConnected, lastStreamEvent } = options;
  const [agents, setAgents] = useState<Agent[]>([]);
  const [tasks, setTasks] = useState<AgentTask[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [frozenConstructionByCatalogId, setFrozenConstructionByCatalogId] =
    useState<Record<string, ConstructionState>>({});
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [agentsResponse, tasksResponse] = await Promise.all([
        fetch("/api/agents", { cache: "no-store" }),
        fetch("/api/tasks", { cache: "no-store" }),
      ]);

      if (!agentsResponse.ok || !tasksResponse.ok) {
        setFetchError("OpenClaw API unavailable");
        return;
      }

      const agentsPayload: unknown = await agentsResponse.json();
      const tasksPayload: unknown = await tasksResponse.json();

      if (isAgentArray(agentsPayload)) {
        setAgents(agentsPayload);
      }
      if (isTaskArray(tasksPayload)) {
        setTasks(tasksPayload);
      }
      setFetchError(null);
      setIsLoaded(true);
    } catch {
      setFetchError("OpenClaw API unavailable");
    }
  }, []);

  const scheduleRefresh = useCallback(() => {
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
    }
    refreshTimerRef.current = setTimeout(() => {
      void refresh();
    }, REFRESH_DEBOUNCE_MS);
  }, [refresh]);

  useEffect(() => {
    if (!streamEnabled) {
      setIsLoaded(false);
      setAgents([]);
      setTasks([]);
      setFetchError(null);
      return;
    }
    void refresh();
  }, [streamEnabled, refresh]);

  useEffect(() => {
    if (!streamEnabled || !lastStreamEvent) {
      return;
    }
    scheduleRefresh();
  }, [lastStreamEvent, scheduleRefresh, streamEnabled]);

  useEffect(() => {
    return () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }
    };
  }, []);

  const isLive = streamEnabled && streamConnected && isLoaded;
  const liveConstructionByCatalogId = useMemo(
    () => (isLive ? buildConstructionMap(agents, tasks, true) : {}),
    [agents, tasks, isLive],
  );

  useEffect(() => {
    if (!isLive) {
      return;
    }
    setFrozenConstructionByCatalogId(liveConstructionByCatalogId);
  }, [isLive, liveConstructionByCatalogId]);

  const constructionByCatalogId = useMemo(() => {
    if (isLive) {
      return liveConstructionByCatalogId;
    }
    if (streamEnabled && Object.keys(frozenConstructionByCatalogId).length > 0) {
      return Object.fromEntries(
        Object.entries(frozenConstructionByCatalogId).map(([catalogId, state]) => [
          catalogId,
          { ...state, isLive: false },
        ]),
      );
    }
    if (!streamEnabled && Object.keys(frozenConstructionByCatalogId).length > 0) {
      return Object.fromEntries(
        Object.entries(frozenConstructionByCatalogId).map(([catalogId, state]) => [
          catalogId,
          { ...state, isLive: false },
        ]),
      );
    }
    return {};
  }, [
    frozenConstructionByCatalogId,
    isLive,
    liveConstructionByCatalogId,
    streamEnabled,
  ]);

  return {
    agents,
    tasks,
    isLoaded,
    fetchError,
    isLive,
    constructionByCatalogId,
    refresh,
  };
}
