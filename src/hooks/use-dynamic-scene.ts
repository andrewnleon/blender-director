"use client";

import { useCallback, useState } from "react";
import {
  DEFAULT_SCENE_VARIANT,
  isSceneVariant,
  type SceneVariant,
} from "@/lib/scene-lighting";

const DYNAMIC_SCENE_SESSION_KEY = "openclaw.dynamic-scene";
const SCENE_VARIANT_SESSION_KEY = "openclaw.scene-variant";

function readDynamicSceneFromSession(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  try {
    return sessionStorage.getItem(DYNAMIC_SCENE_SESSION_KEY) === "1";
  } catch {
    return false;
  }
}

function writeDynamicSceneToSession(isEnabled: boolean): void {
  try {
    sessionStorage.setItem(DYNAMIC_SCENE_SESSION_KEY, isEnabled ? "1" : "0");
  } catch {
    // sessionStorage may be unavailable in private browsing
  }
}

function readSceneVariantFromSession(): SceneVariant {
  if (typeof window === "undefined") {
    return DEFAULT_SCENE_VARIANT;
  }
  try {
    const stored = sessionStorage.getItem(SCENE_VARIANT_SESSION_KEY);
    if (stored && isSceneVariant(stored)) {
      return stored;
    }
  } catch {
    return DEFAULT_SCENE_VARIANT;
  }
  return DEFAULT_SCENE_VARIANT;
}

function writeSceneVariantToSession(variant: SceneVariant): void {
  try {
    sessionStorage.setItem(SCENE_VARIANT_SESSION_KEY, variant);
  } catch {
    // sessionStorage may be unavailable in private browsing
  }
}

export function useDynamicScene() {
  const [isDynamicScene, setIsDynamicScene] = useState(() =>
    readDynamicSceneFromSession(),
  );
  const [sceneVariant, setSceneVariant] = useState<SceneVariant>(() =>
    readSceneVariantFromSession(),
  );

  const toggleDynamicScene = useCallback(() => {
    setIsDynamicScene((enabled) => {
      const nextEnabled = !enabled;
      writeDynamicSceneToSession(nextEnabled);
      return nextEnabled;
    });
  }, []);

  const selectSceneVariant = useCallback((variant: SceneVariant) => {
    setSceneVariant(variant);
    writeSceneVariantToSession(variant);
    setIsDynamicScene((enabled) => {
      if (enabled) {
        return enabled;
      }
      writeDynamicSceneToSession(true);
      return true;
    });
  }, []);

  return {
    isDynamicScene,
    toggleDynamicScene,
    sceneVariant,
    selectSceneVariant,
  };
}
