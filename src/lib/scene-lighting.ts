import { YARD_SCENE_COLOR } from "@/lib/camera-settings";

/** Daylight vs live-scene weather presets. */

export type SceneLightVec = readonly [number, number, number];

export const SCENE_VARIANTS = ["sunset", "sunny", "snow", "rain"] as const;
export type SceneVariant = (typeof SCENE_VARIANTS)[number];

export const DEFAULT_SCENE_VARIANT: SceneVariant = "sunset";

export const SCENE_VARIANT_LABELS: Record<SceneVariant, string> = {
  sunset: "Sunset",
  sunny: "Sunny",
  snow: "Snow",
  rain: "Rain",
};

export type SceneWeather = "none" | "rain" | "snow";

export type SceneLightingPreset = {
  sunPosition: SceneLightVec;
  sunIntensity: number;
  sunColor: string;
  fillPosition: SceneLightVec;
  fillIntensity: number;
  fillColor: string;
  hemiSky: string;
  hemiGround: string;
  hemiIntensity: number;
  ambientIntensity: number;
  ambientColor: string;
  fogColor: string;
  fogNearPad: number;
  fogFarPad: number;
  exposure: number;
};

export type SceneSkyLook = {
  zenith: string;
  mid: string;
  horizon: string;
  ground: string;
  glow: string;
  glowStrength: number;
};

export type SceneGroundLook = {
  color: string;
  apronColor: string;
  roughness: number;
  metalness: number;
  cellColor: string;
  sectionColor: string;
};

export type SceneVariantLook = {
  lighting: SceneLightingPreset;
  sky: SceneSkyLook;
  ground: SceneGroundLook;
  weather: SceneWeather;
  showSunDisc: boolean;
  sunDiscColor: string;
};

/** Matches the static yard look when Live scene is off. */
export const DAYLIGHT_LIGHTING: SceneLightingPreset = {
  sunPosition: [28, 42, 18],
  sunIntensity: 1.65,
  sunColor: "#fff1dc",
  fillPosition: [-22, 16, -12],
  fillIntensity: 0.28,
  fillColor: "#c8d6e8",
  hemiSky: "#d8e4f0",
  hemiGround: "#3a3530",
  hemiIntensity: 0.32,
  ambientIntensity: 0.1,
  ambientColor: "#eef1f4",
  fogColor: YARD_SCENE_COLOR,
  fogNearPad: 0,
  fogFarPad: 0,
  exposure: 1.0,
};

export const RESTING_GROUND: SceneGroundLook = {
  color: "#3f433c",
  apronColor: "#2c302b",
  roughness: 0.95,
  metalness: 0.05,
  cellColor: "#5c6558",
  sectionColor: "#8a9a6a",
};

const SUNSET_LIGHTING: SceneLightingPreset = {
  sunPosition: [34, 16, -26],
  sunIntensity: 0.82,
  sunColor: "#ffd4b8",
  fillPosition: [-20, 12, 16],
  fillIntensity: 0.42,
  fillColor: "#6a7a98",
  hemiSky: "#b8a898",
  hemiGround: "#2a241c",
  hemiIntensity: 0.16,
  ambientIntensity: 0.04,
  ambientColor: "#c8c2ba",
  fogColor: "#3a2c26",
  fogNearPad: -160,
  fogFarPad: -240,
  exposure: 0.62,
};

const SUNNY_LIGHTING: SceneLightingPreset = {
  sunPosition: [-38, 62, 18],
  sunIntensity: 1.85,
  sunColor: "#fff6f0",
  fillPosition: [24, 20, -14],
  fillIntensity: 0.44,
  fillColor: "#b4d2ee",
  hemiSky: "#8ec8f6",
  hemiGround: "#6a706c",
  hemiIntensity: 0.4,
  ambientIntensity: 0.14,
  ambientColor: "#f4f7fb",
  fogColor: "#c5d2de",
  fogNearPad: -175,
  fogFarPad: -260,
  exposure: 1.0,
};

const SNOW_LIGHTING: SceneLightingPreset = {
  sunPosition: [20, 36, 16],
  sunIntensity: 1.25,
  sunColor: "#e8f2ff",
  fillPosition: [-18, 14, 10],
  fillIntensity: 0.34,
  fillColor: "#c5d6ea",
  hemiSky: "#d0deec",
  hemiGround: "#c8d4de",
  hemiIntensity: 0.36,
  ambientIntensity: 0.12,
  ambientColor: "#f4f8fc",
  fogColor: "#c8d4de",
  fogNearPad: -165,
  fogFarPad: -250,
  exposure: 0.96,
};

const RAIN_LIGHTING: SceneLightingPreset = {
  sunPosition: [18, 32, -14],
  sunIntensity: 0.95,
  sunColor: "#c5ced6",
  fillPosition: [-16, 12, 10],
  fillIntensity: 0.28,
  fillColor: "#6a7380",
  hemiSky: "#6d7682",
  hemiGround: "#2a2e32",
  hemiIntensity: 0.24,
  ambientIntensity: 0.08,
  ambientColor: "#c8d0d6",
  fogColor: "#4a5058",
  fogNearPad: -155,
  fogFarPad: -230,
  exposure: 0.88,
};

export const SCENE_VARIANT_LOOK: Record<SceneVariant, SceneVariantLook> = {
  sunset: {
    lighting: SUNSET_LIGHTING,
    sky: {
      zenith: "#1a1028",
      mid: "#b85030",
      horizon: "#d48858",
      ground: "#2a2420",
      glow: "#e07030",
      glowStrength: 0.08,
    },
    ground: {
      color: "#5a6a34",
      apronColor: "#4a3424",
      roughness: 0.94,
      metalness: 0.02,
      cellColor: "#6a7a40",
      sectionColor: "#8a7048",
    },
    weather: "none",
    showSunDisc: true,
    sunDiscColor: "#ffb056",
  },
  sunny: {
    lighting: SUNNY_LIGHTING,
    sky: {
      zenith: "#3a86d0",
      mid: "#86c0ee",
      horizon: "#e8eef6",
      ground: "#6a8a48",
      glow: "#fff3cc",
      glowStrength: 0.14,
    },
    ground: {
      color: "#4a7a32",
      apronColor: "#6a4a2c",
      roughness: 0.92,
      metalness: 0.02,
      cellColor: "#5a8a3c",
      sectionColor: "#8a9a50",
    },
    weather: "none",
    showSunDisc: true,
    sunDiscColor: "#fff6d8",
  },
  snow: {
    lighting: SNOW_LIGHTING,
    sky: {
      zenith: "#9bb0c6",
      mid: "#c5d4e4",
      horizon: "#e8eef4",
      ground: "#c8d2dc",
      glow: "#ffffff",
      glowStrength: 0.08,
    },
    ground: {
      color: "#d8e4dc",
      apronColor: "#b0a090",
      roughness: 0.88,
      metalness: 0.02,
      cellColor: "#c5d2de",
      sectionColor: "#8aa0b4",
    },
    weather: "snow",
    showSunDisc: false,
    sunDiscColor: "#f4f8ff",
  },
  rain: {
    lighting: RAIN_LIGHTING,
    sky: {
      zenith: "#2a3038",
      mid: "#4a5460",
      horizon: "#6a7380",
      ground: "#1c2024",
      glow: "#8a94a0",
      glowStrength: 0.04,
    },
    ground: {
      color: "#2a4a28",
      apronColor: "#3a2a1c",
      roughness: 0.78,
      metalness: 0.04,
      cellColor: "#3a5a32",
      sectionColor: "#4a6a38",
    },
    weather: "rain",
    showSunDisc: false,
    sunDiscColor: "#d0d6dc",
  },
};

export function isSceneVariant(value: string): value is SceneVariant {
  return SCENE_VARIANTS.some((variant) => variant === value);
}

export function mixScalar(from: number, to: number, amount: number): number {
  return from + (to - from) * amount;
}

export function mixVec3(
  from: SceneLightVec,
  to: SceneLightVec,
  amount: number,
): [number, number, number] {
  return [
    mixScalar(from[0], to[0], amount),
    mixScalar(from[1], to[1], amount),
    mixScalar(from[2], to[2], amount),
  ];
}

export function pushPointFar(
  point: SceneLightVec,
  distance: number,
): [number, number, number] {
  const length = Math.hypot(point[0], point[1], point[2]);
  if (length < 0.001) {
    return [0, distance, 0];
  }
  const scale = distance / length;
  return [point[0] * scale, point[1] * scale, point[2] * scale];
}

/** Keep the light azimuth; lift the visual disc so it reads as sky, not a ridge blob. */
const SUN_DISC_ELEVATION_TAN = 1.6;

export function sunDiscPoint(
  point: SceneLightVec,
  distance: number,
): [number, number, number] {
  const horizontal = Math.hypot(point[0], point[2]);
  const liftedY = Math.max(point[1], horizontal * SUN_DISC_ELEVATION_TAN);
  return pushPointFar([point[0], liftedY, point[2]], distance);
}
