"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { buildConstructionMap } from "@/lib/construction/driver";
import {
  MOCK_OPENCLAW_AGENTS,
  mockOpenClawTasksForPreviewStep,
  OPENCLAW_PREVIEW_STEP_COUNT,
  OPENCLAW_PREVIEW_STEP_MS,
} from "@/lib/construction/mock-openclaw-data";
import type { ConstructionState } from "@/lib/construction/types";

type UseConstructionPreviewOptions = {
  /** Real OpenClaw stream is driving construction — preview stays off. */
  isStreamDriving: boolean;
  /** Matches construct clip timeScale in the canvas. */
  playbackSpeed: number;
};

function previewStepDurationMs(playbackSpeed: number): number {
  const speed = playbackSpeed > 0 ? playbackSpeed : 1;
  return Math.ceil(OPENCLAW_PREVIEW_STEP_MS / speed);
}

export function useConstructionPreview(options: UseConstructionPreviewOptions) {
  const { isStreamDriving, playbackSpeed } = options;
  const [isPreviewActive, setIsPreviewActive] = useState(false);
  const [previewStep, setPreviewStep] = useState(0);

  const stepDurationMs = previewStepDurationMs(playbackSpeed);
  const maxPreviewStep = OPENCLAW_PREVIEW_STEP_COUNT - 1;
  const previewProgress =
    maxPreviewStep > 0 ? previewStep / maxPreviewStep : 0;

  const stopPreview = useCallback(() => {
    setIsPreviewActive(false);
    setPreviewStep(0);
  }, []);

  const togglePreview = useCallback(() => {
    if (isPreviewActive) {
      stopPreview();
      return;
    }
    if (isStreamDriving) {
      return;
    }
    setIsPreviewActive(true);
    setPreviewStep(0);
  }, [isPreviewActive, isStreamDriving, stopPreview]);

  useEffect(() => {
    if (isStreamDriving && isPreviewActive) {
      stopPreview();
    }
  }, [isStreamDriving, isPreviewActive, stopPreview]);

  useEffect(() => {
    if (!isPreviewActive) {
      return;
    }

    setPreviewStep(0);
    let currentStep = 0;
    const intervalId = window.setInterval(() => {
      currentStep += 1;
      if (currentStep >= maxPreviewStep) {
        setPreviewStep(maxPreviewStep);
        window.clearInterval(intervalId);
        return;
      }
      setPreviewStep(currentStep);
    }, stepDurationMs);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [isPreviewActive, maxPreviewStep, stepDurationMs]);

  const previewConstructionByCatalogId = useMemo((): Record<
    string,
    ConstructionState
  > => {
    if (!isPreviewActive) {
      return {};
    }
    return buildConstructionMap(
      MOCK_OPENCLAW_AGENTS,
      mockOpenClawTasksForPreviewStep(previewStep),
      true,
    );
  }, [isPreviewActive, previewStep]);

  return {
    isPreviewActive,
    previewProgress,
    previewStep,
    isPackConstructReplaying: isPreviewActive,
    previewConstructionByCatalogId,
    togglePreview,
    stopPreview,
  };
}
