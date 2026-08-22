"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { OpenClawEvent } from "@/types/openclaw-event";

export type AgentStreamStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "reconnecting";

const DEFAULT_RECONNECT_MS = 3000;
const STREAM_ENABLED_SESSION_KEY = "openclaw-yard.stream-enabled";

function readStreamEnabledFromSession(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  try {
    return sessionStorage.getItem(STREAM_ENABLED_SESSION_KEY) === "1";
  } catch {
    return false;
  }
}

function writeStreamEnabledToSession(isEnabled: boolean): void {
  try {
    sessionStorage.setItem(STREAM_ENABLED_SESSION_KEY, isEnabled ? "1" : "0");
  } catch {
    // sessionStorage may be unavailable in private browsing
  }
}

type UseAgentStreamOptions = {
  /** SSE URL. Defaults to same-origin `/api/events`. */
  eventsUrl?: string;
  reconnectMs?: number;
  onEvent?: (event: OpenClawEvent) => void;
};

export function useAgentStream(options: UseAgentStreamOptions = {}) {
  const {
    eventsUrl = "/api/events",
    reconnectMs = DEFAULT_RECONNECT_MS,
    onEvent,
  } = options;

  const [isEnabled, setIsEnabled] = useState(false);
  const [status, setStatus] = useState<AgentStreamStatus>("disconnected");
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  useEffect(() => {
    setIsEnabled(readStreamEnabledFromSession());
  }, []);

  const connect = useCallback(() => {
    writeStreamEnabledToSession(true);
    setIsEnabled(true);
  }, []);

  const disconnect = useCallback(() => {
    writeStreamEnabledToSession(false);
    setIsEnabled(false);
    setStatus("disconnected");
  }, []);

  const toggle = useCallback(() => {
    if (isEnabled) {
      disconnect();
    } else {
      connect();
    }
  }, [connect, disconnect, isEnabled]);

  useEffect(() => {
    if (!isEnabled) {
      return;
    }

    let source: EventSource | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let attempt = 0;
    let lastEventId: string | null = null;
    let closed = false;

    function clearReconnectTimer() {
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
    }

    function closeSource() {
      if (source) {
        source.onopen = null;
        source.onerror = null;
        source.close();
        source = null;
      }
    }

    function openSource() {
      if (closed) {
        return;
      }

      clearReconnectTimer();
      closeSource();
      setStatus(attempt > 0 ? "reconnecting" : "connecting");

      const url = lastEventId
        ? `${eventsUrl}?Last-Event-ID=${encodeURIComponent(lastEventId)}`
        : eventsUrl;

      try {
        source = new EventSource(url);
      } catch {
        setStatus("reconnecting");
        attempt += 1;
        const backoff = Math.min(
          reconnectMs * 2 ** Math.min(attempt, 4),
          30_000,
        );
        reconnectTimer = setTimeout(openSource, backoff);
        return;
      }

      source.onopen = () => {
        attempt = 0;
        setStatus("connected");
      };

      source.addEventListener("connected", () => {
        attempt = 0;
        setStatus("connected");
      });

      source.addEventListener("event", (messageEvent: MessageEvent) => {
        try {
          const event = JSON.parse(messageEvent.data) as OpenClawEvent;
          lastEventId = event.id;
          onEventRef.current?.(event);
        } catch {
          // ignore malformed payloads
        }
      });

      source.onerror = () => {
        closeSource();
        if (closed) {
          return;
        }
        setStatus("reconnecting");
        attempt += 1;
        const backoff = Math.min(
          reconnectMs * 2 ** Math.min(attempt, 4),
          30_000,
        );
        reconnectTimer = setTimeout(openSource, backoff);
      };
    }

    openSource();

    return () => {
      closed = true;
      clearReconnectTimer();
      closeSource();
    };
  }, [isEnabled, eventsUrl, reconnectMs]);

  return {
    isEnabled,
    status,
    connect,
    disconnect,
    toggle,
  };
}
