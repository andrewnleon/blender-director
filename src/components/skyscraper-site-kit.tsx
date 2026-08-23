"use client";

import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, type RefObject } from "react";
import {
  FrontSide,
  Material,
  Mesh,
  MeshStandardMaterial,
  type Object3D,
} from "three";
import { getCatalogGlbUrl } from "@/lib/catalog";
import type { CatalogFootprint } from "@/lib/catalog-types";
import {
  applySiteKitReveal,
  computeSiteKitScale,
  disposeSiteKitMaterials,
  extractSiteKit,
  getSkyscraperGlbUrl,
  measureAuthoredBounds,
  resolveSiteKitTargets,
  SKYSCRAPER_CATALOG_ID,
} from "@/lib/construction/site-kit";
import type { ConstructClock } from "@/lib/construction/types";

function prepareKitMesh(child: Object3D): void {
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

export function SkyscraperSiteKit({
  buildingUrl,
  footprint,
  constructClockRef,
}: {
  buildingUrl: string;
  footprint?: CatalogFootprint;
  constructClockRef: RefObject<ConstructClock>;
}) {
  const kitUrl = getSkyscraperGlbUrl(getCatalogGlbUrl(SKYSCRAPER_CATALOG_ID));
  const { scene: kitScene } = useGLTF(kitUrl);
  const { scene: buildingScene } = useGLTF(buildingUrl);

  const kit = useMemo(() => {
    const extracted = extractSiteKit(kitScene);
    extracted.traverse(prepareKitMesh);
    applySiteKitReveal(extracted, 0);
    return extracted;
  }, [kitScene]);

  const scale = useMemo(() => {
    const bounds = measureAuthoredBounds(buildingScene);
    return computeSiteKitScale(resolveSiteKitTargets(footprint, bounds));
  }, [buildingScene, footprint]);

  useLayoutEffect(() => {
    applySiteKitReveal(kit, constructClockRef.current.progress01);
  }, [constructClockRef, kit]);

  useEffect(() => {
    return () => {
      disposeSiteKitMaterials(kit);
    };
  }, [kit]);

  useFrame(() => {
    applySiteKitReveal(kit, constructClockRef.current.progress01);
  });

  return <primitive object={kit} scale={[scale.x, scale.y, scale.z]} />;
}

useGLTF.preload(getSkyscraperGlbUrl(getCatalogGlbUrl(SKYSCRAPER_CATALOG_ID)));
