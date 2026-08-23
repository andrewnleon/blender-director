"use client";

import { useEffect, useId, useMemo, type RefObject } from "react";
import type { CatalogFootprint } from "@/lib/catalog-types";
import {
  computeSiteKitScale,
  disposeSiteKitMaterials,
  getSiteKitTierForCatalog,
  PACK_SITE_KIT_PLAN_INSET,
  resolveSiteKitTargets,
  type AuthoredBounds,
} from "@/lib/construction/site-kit";
import type { ConstructClock } from "@/lib/construction/types";
import { useSiteKitSource } from "@/components/site-kit-provider";

export function SkyscraperSiteKit({
  catalogId,
  authoredBounds,
  footprint,
  constructClockRef,
}: {
  catalogId: string;
  authoredBounds: AuthoredBounds | null;
  footprint?: CatalogFootprint;
  constructClockRef: RefObject<ConstructClock>;
}) {
  const instanceId = useId();
  const { cloneKit, registerKit, unregisterKit } = useSiteKitSource();
  const tier = getSiteKitTierForCatalog(catalogId);
  const isSiteOnlyKit = tier === "site-only";

  const kit = useMemo(() => cloneKit(tier), [cloneKit, tier]);

  const scale = useMemo(() => {
    if (!authoredBounds) {
      return null;
    }
    const targets = resolveSiteKitTargets(footprint, authoredBounds, {
      footprintOnlyPlan: isSiteOnlyKit,
      planInset: isSiteOnlyKit ? PACK_SITE_KIT_PLAN_INSET : 1,
    });
    return computeSiteKitScale({ ...targets, tier });
  }, [authoredBounds, footprint, isSiteOnlyKit, tier]);

  useEffect(() => {
    registerKit(instanceId, { kit, constructClockRef });
    return () => {
      unregisterKit(instanceId);
      disposeSiteKitMaterials(kit);
    };
  }, [constructClockRef, instanceId, kit, registerKit, unregisterKit]);

  if (!scale) {
    return null;
  }

  return <primitive object={kit} scale={[scale.x, scale.y, scale.z]} />;
}
