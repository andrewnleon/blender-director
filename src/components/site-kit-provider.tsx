"use client";

import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  type ReactNode,
  type RefObject,
} from "react";
import {
  FrontSide,
  Group,
  Material,
  Mesh,
  MeshStandardMaterial,
  type Object3D,
} from "three";
import { getCatalogGlbUrl } from "@/lib/catalog";
import {
  applySiteKitReveal,
  extractSiteKit,
  getSkyscraperGlbUrl,
  SKYSCRAPER_CATALOG_ID,
  type SiteKitTier,
} from "@/lib/construction/site-kit";
import type { ConstructClock } from "@/lib/construction/types";

const SITE_KIT_GLB_URL = getSkyscraperGlbUrl(getCatalogGlbUrl(SKYSCRAPER_CATALOG_ID));

if (SITE_KIT_GLB_URL) {
  useGLTF.preload(SITE_KIT_GLB_URL);
}

type RegisteredSiteKit = {
  kit: Group;
  constructClockRef: RefObject<ConstructClock>;
};

type SiteKitSourceContextValue = {
  cloneKit: (tier: SiteKitTier) => Group;
  registerKit: (instanceId: string, entry: RegisteredSiteKit) => void;
  unregisterKit: (instanceId: string) => void;
};

const SiteKitSourceContext = createContext<SiteKitSourceContextValue | null>(
  null,
);

function prepareSiteKitMesh(child: Object3D): void {
  if (!(child instanceof Mesh)) {
    return;
  }
  if (Array.isArray(child.material)) {
    child.material = child.material.map((material) =>
      material instanceof Material ? material.clone() : material,
    );
  } else if (child.material instanceof Material) {
    child.material = child.material.clone();
  }
  child.castShadow = true;
  child.receiveShadow = true;
  const materials = Array.isArray(child.material)
    ? child.material
    : [child.material];
  for (const material of materials) {
    if (!(material instanceof MeshStandardMaterial)) {
      continue;
    }
    material.shadowSide = FrontSide;
    if ("fog" in material) {
      Reflect.set(material, "fog", false);
    }
  }
}

function SiteKitSourceProviderInner({ children }: { children: ReactNode }) {
  const { scene: kitScene } = useGLTF(SITE_KIT_GLB_URL);
  const registryRef = useRef(new Map<string, RegisteredSiteKit>());

  const templates = useMemo(
    () => ({
      full: extractSiteKit(kitScene, { tier: "full" }),
      "site-only": extractSiteKit(kitScene, { tier: "site-only" }),
    }),
    [kitScene],
  );

  const cloneKit = useCallback(
    (tier: SiteKitTier) => {
      const clone = templates[tier].clone(true);
      clone.traverse(prepareSiteKitMesh);
      applySiteKitReveal(clone, 0);
      return clone;
    },
    [templates],
  );

  const registerKit = useCallback(
    (instanceId: string, entry: RegisteredSiteKit) => {
      registryRef.current.set(instanceId, entry);
      applySiteKitReveal(entry.kit, entry.constructClockRef.current.progress01);
    },
    [],
  );

  const unregisterKit = useCallback((instanceId: string) => {
    registryRef.current.delete(instanceId);
  }, []);

  useFrame(() => {
    for (const { kit, constructClockRef } of registryRef.current.values()) {
      applySiteKitReveal(kit, constructClockRef.current.progress01);
    }
  });

  const value = useMemo(
    () => ({ cloneKit, registerKit, unregisterKit }),
    [cloneKit, registerKit, unregisterKit],
  );

  return (
    <SiteKitSourceContext.Provider value={value}>
      {children}
    </SiteKitSourceContext.Provider>
  );
}

export function SiteKitSourceProvider({ children }: { children: ReactNode }) {
  if (!SITE_KIT_GLB_URL) {
    return children;
  }
  return <SiteKitSourceProviderInner>{children}</SiteKitSourceProviderInner>;
}

export function useSiteKitSource(): SiteKitSourceContextValue {
  const context = useContext(SiteKitSourceContext);
  if (!context) {
    throw new Error("useSiteKitSource must render inside SiteKitSourceProvider");
  }
  return context;
}
