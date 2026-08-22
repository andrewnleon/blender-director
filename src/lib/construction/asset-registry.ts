import type { CatalogFootprint, CatalogItem } from "@/lib/catalog-types";
import type {
  ConstructionBindMode,
  ConstructionTier,
} from "@/lib/construction/types";

export type BuildingKind =
  | "control-center"
  | "research-lab"
  | "factory"
  | "city-building"
  | "train-station"
  | "rocket-pad"
  | "lumber-mill"
  | "mine"
  | "warehouse"
  | "skyscraper";

export type BuildingAssetDefinition = {
  catalogId: string;
  label: string;
  role: string;
  tier: ConstructionTier;
  buildingKind: BuildingKind;
  stationId: string;
  agentIds: readonly string[];
  bindMode: ConstructionBindMode;
  agentId: string;
  accent: string;
  /** Mesh + crane object prefix — each asset ships {prefix}Crane rig. */
  prefix: string;
  projectFile?: string;
  footprint: CatalogFootprint;
  /** Shipped GLB URL — omit until export exists. */
  url?: string;
  clip?: string;
  maxCount?: number;
  inLibrary?: boolean;
  /** Show in yard palette when true and url is set. */
  inPalette?: boolean;
};

export const AGENT_STATION: Record<string, string> = {
  orcha: "control-center",
  "research-planning": "research-lab",
  development: "factory",
  "qa-review": "city-building",
  operations: "rocket-pad",
};

export const STATION_LABEL: Record<string, string> = {
  "control-center": "Operations Center",
  "research-lab": "Research Center",
  factory: "Development Center",
  "city-building": "QA Tower",
  "rocket-pad": "Deploy Pad",
};

export function stationIdForAgent(agentId: string): string {
  return AGENT_STATION[agentId] ?? "control-center";
}

export const BUILDING_DEFINITIONS: readonly BuildingAssetDefinition[] = [
  {
    catalogId: "skyscraper",
    label: "Skyscraper",
    role: "City",
    tier: "scheduled",
    buildingKind: "skyscraper",
    stationId: "control-center",
    agentIds: ["orcha"],
    bindMode: "all-tasks",
    agentId: "orcha",
    accent: "#6a9ec4",
    prefix: "ST_",
    projectFile: "skyscraper/skyscraper.blend",
    footprint: { width: 10, depth: 10 },
    url: "/models/skyscraper.glb?v=42",
    clip: "construct",
    maxCount: 1,
    inLibrary: true,
    inPalette: true,
  },
  {
    catalogId: "operations-center",
    label: "Operations Center",
    role: "Orchestrator",
    tier: "staged",
    buildingKind: "control-center",
    stationId: "control-center",
    agentIds: ["orcha"],
    bindMode: "agent-tasks",
    agentId: "orcha",
    accent: "#7c5cbf",
    prefix: "OC_",
    projectFile: "operations-center/operations-center.blend",
    footprint: { width: 10, depth: 10 },
    url: "/models/operations-center.glb?v=5",
    clip: "construct",
    maxCount: 1,
    inLibrary: true,
    inPalette: true,
  },
  {
    catalogId: "research-center",
    label: "Research Center",
    role: "Planning",
    tier: "staged",
    buildingKind: "research-lab",
    stationId: "research-lab",
    agentIds: ["research-planning"],
    bindMode: "agent-tasks",
    agentId: "research-planning",
    accent: "#22c55e",
    prefix: "RC_",
    projectFile: "research-center/research-center.blend",
    footprint: { width: 10, depth: 10 },
    clip: "construct",
    maxCount: 1,
    inPalette: false,
  },
  {
    catalogId: "development-center",
    label: "Development Center",
    role: "Build",
    tier: "staged",
    buildingKind: "factory",
    stationId: "factory",
    agentIds: ["development"],
    bindMode: "agent-tasks",
    agentId: "development",
    accent: "#d97706",
    prefix: "DC_",
    projectFile: "development-center/development-center.blend",
    footprint: { width: 10, depth: 10 },
    clip: "construct",
    maxCount: 1,
    inPalette: false,
  },
];

export function getBuildingDefinition(catalogId: string): BuildingAssetDefinition | undefined {
  return BUILDING_DEFINITIONS.find((entry) => entry.catalogId === catalogId);
}

export function buildingDefinitionToCatalogItem(
  definition: BuildingAssetDefinition,
): CatalogItem | null {
  if (!definition.url) {
    return null;
  }
  return {
    id: definition.catalogId,
    label: definition.label,
    role: definition.role,
    kind: "glb",
    url: definition.url,
    accent: definition.accent,
    clip: definition.clip,
    maxCount: definition.maxCount,
    footprint: definition.footprint,
    inLibrary: definition.inLibrary,
    projectFile: definition.projectFile,
  };
}

export const PALETTE_CATALOG: CatalogItem[] = BUILDING_DEFINITIONS.filter(
  (definition) => definition.inPalette && definition.url,
).map((definition) => buildingDefinitionToCatalogItem(definition)!);
