"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef, type RefObject } from "react";
import {
  BackSide,
  Box3,
  Color,
  Fog,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Vector3,
  AmbientLight,
  type DirectionalLight,
  type HemisphereLight,
  type Object3D,
  type PointLight,
  type ShaderMaterial,
} from "three";
import type { AgentStatus } from "@/types/openclaw";
import type { BuildingStage } from "@/lib/construction/types";
import { LivingWeather } from "@/components/living-weather";
import {
  DAYLIGHT_LIGHTING,
  mixScalar,
  mixVec3,
  pushPointFar,
  sunDiscPoint,
  SCENE_VARIANT_LOOK,
  type SceneVariant,
} from "@/lib/scene-lighting";
import {
  SKY_DOME_RADIUS,
  SUN_DISC_DISTANCE,
  SUN_LIGHT_DISTANCE,
} from "@/lib/stage-world";

/** Named practicals only. Default MeshStandardMaterial.emissiveIntensity is 1
 *  with a black emissive — treating intensity alone as “lit” paints every hull gold. */
const PRACTICAL_NAME = /lamp|neon|sign|screen|beacon|emiss/i;
const SWAY_NAME = /tree|bush|plant|flag|antenna|crane|foliage|leaf|veg/i;
const PRACTICAL_FILL = new Color("#f3c27a");

export function hasAuthoredEmissive(material: MeshStandardMaterial): boolean {
  return material.emissive.getHex() !== 0;
}

type EmissiveTarget = {
  material: MeshStandardMaterial;
  baseIntensity: number;
  baseEmissive: Color;
  phase: number;
};

type SwayTarget = {
  object: Object3D;
  baseRotationY: number;
  baseRotationZ: number;
  phase: number;
};

function collectLifeTargets(root: Object3D): {
  emissive: EmissiveTarget[];
  sway: SwayTarget[];
} {
  const emissive: EmissiveTarget[] = [];
  const sway: SwayTarget[] = [];
  let phase = 0;

  root.traverse((child) => {
    if (SWAY_NAME.test(child.name)) {
      sway.push({
        object: child,
        baseRotationY: child.rotation.y,
        baseRotationZ: child.rotation.z,
        phase,
      });
      phase += 1;
    }
    if (!(child instanceof Mesh)) {
      return;
    }
    const materials = Array.isArray(child.material)
      ? child.material
      : [child.material];
    const isPractical = PRACTICAL_NAME.test(child.name);
    for (const material of materials) {
      if (!(material instanceof MeshStandardMaterial)) {
        continue;
      }
      if (!isPractical && !hasAuthoredEmissive(material)) {
        continue;
      }
      emissive.push({
        material,
        baseIntensity: Math.max(
          hasAuthoredEmissive(material) ? material.emissiveIntensity : 0,
          isPractical ? 0.28 : 0,
        ),
        baseEmissive: material.emissive.clone(),
        phase,
      });
      phase += 1;
    }
  });

  return { emissive, sway };
}

function restoreLifeTargets(
  emissive: EmissiveTarget[],
  sway: SwayTarget[],
): void {
  for (const target of emissive) {
    target.material.emissive.copy(target.baseEmissive);
    target.material.emissiveIntensity = target.baseIntensity;
  }
  for (const target of sway) {
    target.object.rotation.y = target.baseRotationY;
    target.object.rotation.z = target.baseRotationZ;
  }
}

export function LivingObjectEffects({
  enabled,
  root,
}: {
  enabled: boolean;
  root: Object3D;
}) {
  const targets = useMemo(() => collectLifeTargets(root), [root]);
  const restoredRef = useRef(true);

  useFrame((state) => {
    if (!enabled) {
      if (!restoredRef.current) {
        restoreLifeTargets(targets.emissive, targets.sway);
        restoredRef.current = true;
      }
      return;
    }
    restoredRef.current = false;
    const time = state.clock.elapsedTime;
    for (const target of targets.emissive) {
      const pulse = 0.55 + 0.45 * Math.sin(time * 1.35 + target.phase * 0.7);
      if (target.baseEmissive.getHex() === 0) {
        target.material.emissive.copy(PRACTICAL_FILL);
      }
      target.material.emissiveIntensity = Math.min(
        0.55,
        target.baseIntensity * (0.55 + pulse * 0.35),
      );
    }
    for (const target of targets.sway) {
      target.object.rotation.y =
        target.baseRotationY + Math.sin(time * 0.55 + target.phase) * 0.035;
      target.object.rotation.z =
        target.baseRotationZ + Math.sin(time * 0.8 + target.phase * 1.3) * 0.02;
    }
  });

  return null;
}

export function OccupancyGlow({
  enabled,
  root,
}: {
  enabled: boolean;
  root: Object3D;
}) {
  const lightRef = useRef<PointLight>(null);
  const position = useMemo(() => {
    const box = new Box3().setFromObject(root);
    if (box.isEmpty()) {
      return [0, 4, 0] as [number, number, number];
    }
    const center = box.getCenter(new Vector3());
    const size = box.getSize(new Vector3());
    return [center.x, Math.max(2.2, center.y + size.y * 0.12), center.z] as [
      number,
      number,
      number,
    ];
  }, [root]);

  useFrame((state) => {
    const light = lightRef.current;
    if (!light) {
      return;
    }
    if (!enabled) {
      light.intensity = 0;
      return;
    }
    light.intensity = 0.04 + Math.sin(state.clock.elapsedTime * 1.05) * 0.012;
  });

  return (
    <pointLight
      ref={lightRef}
      position={position}
      color="#d8e0ea"
      intensity={0}
      distance={8}
      decay={2}
    />
  );
}

const TRAFFIC_ACTIVE_STATUSES = new Set<AgentStatus>(["working", "thinking"]);
const TRAFFIC_ALERT_STATUSES = new Set<AgentStatus>(["blocked", "error"]);

/** Live OpenClaw traffic — accent pulse on staged agent stations. */
export function AgentStationTraffic({
  enabled,
  accent,
  agentStatus,
  stage,
  root,
}: {
  enabled: boolean;
  accent: string;
  agentStatus?: AgentStatus;
  stage: BuildingStage;
  root: Object3D;
}) {
  const lightRef = useRef<PointLight>(null);
  const accentColor = useMemo(() => new Color(accent), [accent]);
  const position = useMemo(() => {
    const box = new Box3().setFromObject(root);
    if (box.isEmpty()) {
      return [0, 4, 0] as [number, number, number];
    }
    const center = box.getCenter(new Vector3());
    const size = box.getSize(new Vector3());
    return [center.x, Math.max(2.4, center.y + size.y * 0.55), center.z] as [
      number,
      number,
      number,
    ];
  }, [root]);
  const craneTargets = useMemo(() => {
    const sway: SwayTarget[] = [];
    let phase = 0;
    root.traverse((child) => {
      if (!/crane/i.test(child.name)) {
        return;
      }
      sway.push({
        object: child,
        baseRotationY: child.rotation.y,
        baseRotationZ: child.rotation.z,
        phase,
      });
      phase += 1;
    });
    return sway;
  }, [root]);
  const restoredRef = useRef(true);

  useFrame((state) => {
    const light = lightRef.current;
    const isLiveTraffic =
      enabled &&
      stage > 0 &&
      agentStatus !== undefined &&
      (TRAFFIC_ACTIVE_STATUSES.has(agentStatus) ||
        TRAFFIC_ALERT_STATUSES.has(agentStatus));
    if (!light) {
      return;
    }
    if (!isLiveTraffic) {
      light.intensity = 0;
      if (!restoredRef.current) {
        for (const target of craneTargets) {
          target.object.rotation.y = target.baseRotationY;
          target.object.rotation.z = target.baseRotationZ;
        }
        restoredRef.current = true;
      }
      return;
    }
    restoredRef.current = false;
    const time = state.clock.elapsedTime;
    const isAlert = TRAFFIC_ALERT_STATUSES.has(agentStatus);
    light.color.copy(accentColor);
    light.intensity = isAlert
      ? 0.1
      : 0.06 + Math.sin(time * 2.2) * 0.035;
    for (const target of craneTargets) {
      target.object.rotation.y =
        target.baseRotationY + Math.sin(time * 0.9 + target.phase) * 0.05;
      target.object.rotation.z =
        target.baseRotationZ + Math.sin(time * 1.1 + target.phase * 1.2) * 0.025;
    }
  });

  return (
    <pointLight
      ref={lightRef}
      position={position}
      color={accent}
      intensity={0}
      distance={14}
      decay={2}
    />
  );
}

const SCENE_BLEND_SPEED = 2.6;

const SCENE_SKY_VERTEX = /* glsl */ `
varying vec3 vDir;
void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vDir = normalize(world.xyz);
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

const SCENE_SKY_FRAGMENT = /* glsl */ `
varying vec3 vDir;
uniform vec3 uZenith;
uniform vec3 uMid;
uniform vec3 uHorizon;
uniform vec3 uGround;
uniform vec3 uGlow;
uniform float uGlowStrength;
uniform float uOpacity;
void main() {
  float height = vDir.y;
  vec3 color = mix(uHorizon, uMid, smoothstep(0.0, 0.22, height));
  color = mix(color, uZenith, smoothstep(0.12, 0.82, height));
  color = mix(uGround, color, smoothstep(-0.22, 0.04, height));
  float glow = exp(-pow((height - 0.02) * 7.5, 2.0)) * uGlowStrength;
  color += uGlow * glow;
  float cloudBand = smoothstep(0.08, 0.28, height) * (1.0 - smoothstep(0.38, 0.72, height));
  float cloudA = sin(vDir.x * 4.2 + vDir.z * 2.8) * sin(vDir.z * 3.3 - vDir.x * 1.6);
  float cloudB = sin(vDir.x * 9.1 - vDir.z * 5.4) * 0.45;
  float cloud = smoothstep(0.18, 0.78, cloudA + cloudB);
  color = mix(color, vec3(0.94, 0.96, 0.99), cloud * cloudBand * 0.42);
  gl_FragColor = vec4(color, uOpacity);
}
`;

function LivingSkyDome({
  amountRef,
  sunPositionRef,
  showSunDiscRef,
  sunDiscColorRef,
  materialRef,
}: {
  amountRef: RefObject<number>;
  sunPositionRef: RefObject<[number, number, number]>;
  showSunDiscRef: RefObject<boolean>;
  sunDiscColorRef: RefObject<string>;
  materialRef: RefObject<ShaderMaterial | null>;
}) {
  const sunDiscRef = useRef<Mesh>(null);
  const sunColor = useMemo(() => new Color("#ffb056"), []);

  useFrame(() => {
    const amount = amountRef.current;
    const material = materialRef.current;
    if (material) {
      material.uniforms.uOpacity.value = amount;
      material.visible = amount > 0.01;
    }
    const sunDisc = sunDiscRef.current;
    if (sunDisc) {
      const showDisc = amount > 0.02 && showSunDiscRef.current;
      sunDisc.visible = showDisc;
      sunDisc.scale.setScalar(1);
      const [x, y, z] = sunDiscPoint(sunPositionRef.current, SUN_DISC_DISTANCE);
      sunDisc.position.set(x, y, z);
      const sunMaterial = sunDisc.material;
      if (sunMaterial instanceof MeshBasicMaterial) {
        sunMaterial.opacity = amount * 0.55;
        sunMaterial.color.copy(sunColor.set(sunDiscColorRef.current));
      }
    }
  });

  return (
    <>
      <mesh scale={SKY_DOME_RADIUS} renderOrder={-2} frustumCulled={false}>
        <sphereGeometry args={[1, 48, 32]} />
        <shaderMaterial
          ref={materialRef}
          side={BackSide}
          depthWrite={false}
          fog={false}
          transparent
          vertexShader={SCENE_SKY_VERTEX}
          fragmentShader={SCENE_SKY_FRAGMENT}
          uniforms={{
            uZenith: { value: new Color("#2b1842") },
            uMid: { value: new Color("#ff6a38") },
            uHorizon: { value: new Color("#ffc07a") },
            uGround: { value: new Color("#1a100e") },
            uGlow: { value: new Color("#ff6b1f") },
            uGlowStrength: { value: 0.35 },
            uOpacity: { value: 0 },
          }}
        />
      </mesh>
      <mesh ref={sunDiscRef} renderOrder={-1} visible={false}>
        <sphereGeometry args={[1.85, 24, 24]} />
        <meshBasicMaterial
          color="#ffb056"
          fog={false}
          toneMapped={false}
          transparent
          opacity={0.92}
        />
      </mesh>
    </>
  );
}

export function LivingEnvironmentDriver({
  enabled,
  variant,
  sunRef,
  fillRef,
  hemiRef,
  ambientRef,
  baseFogNear,
  baseFogFar,
  groundExtent,
}: {
  enabled: boolean;
  variant: SceneVariant;
  sunRef: RefObject<DirectionalLight | null>;
  fillRef: RefObject<DirectionalLight | null>;
  hemiRef: RefObject<HemisphereLight | null>;
  ambientRef?: RefObject<AmbientLight | null>;
  baseFogNear: number;
  baseFogFar: number;
  groundExtent: number;
}) {
  const scene = useThree((state) => state.scene);
  const gl = useThree((state) => state.gl);
  const mixRef = useRef(0);
  const sunPositionRef = useRef<[number, number, number]>([28, 42, 18]);
  const showSunDiscRef = useRef(true);
  const sunDiscColorRef = useRef("#ffb056");
  const skyMaterialRef = useRef<ShaderMaterial | null>(null);
  const look = SCENE_VARIANT_LOOK[variant];
  const colors = useMemo(
    () => ({
      sunFrom: new Color(DAYLIGHT_LIGHTING.sunColor),
      sunTo: new Color(look.lighting.sunColor),
      fillFrom: new Color(DAYLIGHT_LIGHTING.fillColor),
      fillTo: new Color(look.lighting.fillColor),
      hemiSkyFrom: new Color(DAYLIGHT_LIGHTING.hemiSky),
      hemiSkyTo: new Color(look.lighting.hemiSky),
      hemiGroundFrom: new Color(DAYLIGHT_LIGHTING.hemiGround),
      hemiGroundTo: new Color(look.lighting.hemiGround),
      ambientFrom: new Color(DAYLIGHT_LIGHTING.ambientColor),
      ambientTo: new Color(look.lighting.ambientColor),
      fogFrom: new Color(DAYLIGHT_LIGHTING.fogColor),
      fogTo: new Color(look.lighting.fogColor),
      zenith: new Color(look.sky.zenith),
      mid: new Color(look.sky.mid),
      horizon: new Color(look.sky.horizon),
      skyGround: new Color(look.sky.ground),
      glow: new Color(look.sky.glow),
    }),
    [look],
  );

  useFrame((state, delta) => {
    const target = enabled ? 1 : 0;
    const nextMix =
      mixRef.current + (target - mixRef.current) * Math.min(1, delta * SCENE_BLEND_SPEED);
    mixRef.current = Math.abs(nextMix - target) < 0.003 ? target : nextMix;
    const amount = mixRef.current;
    const lighting = look.lighting;

    colors.sunTo.set(lighting.sunColor);
    colors.fillTo.set(lighting.fillColor);
    colors.hemiSkyTo.set(lighting.hemiSky);
    colors.hemiGroundTo.set(lighting.hemiGround);
    colors.ambientTo.set(lighting.ambientColor);
    colors.fogTo.set(lighting.fogColor);
    colors.zenith.set(look.sky.zenith);
    colors.mid.set(look.sky.mid);
    colors.horizon.set(look.sky.horizon);
    colors.skyGround.set(look.sky.ground);
    colors.glow.set(look.sky.glow);

    const sun = sunRef.current;
    const fill = fillRef.current;
    const hemi = hemiRef.current;
    const ambient =
      ambientRef?.current ??
      scene.children.find((child): child is AmbientLight => child instanceof AmbientLight) ??
      null;
    const fog = scene.fog;
    const sunPosition = mixVec3(DAYLIGHT_LIGHTING.sunPosition, lighting.sunPosition, amount);
    sunPositionRef.current = sunPosition;
    showSunDiscRef.current = look.showSunDisc;
    sunDiscColorRef.current = look.sunDiscColor;
    if (sun) {
      const keyPosition = pushPointFar(sunPosition, SUN_LIGHT_DISTANCE);
      sun.position.set(keyPosition[0], keyPosition[1], keyPosition[2]);
      sun.target.position.set(0, 0.6, 0);
      sun.target.updateMatrixWorld();
      sun.shadow.camera.near = 4;
      sun.shadow.camera.far = SUN_LIGHT_DISTANCE + groundExtent * 1.1;
      sun.shadow.camera.updateProjectionMatrix();
      sun.intensity = mixScalar(
        DAYLIGHT_LIGHTING.sunIntensity,
        lighting.sunIntensity,
        amount,
      );
      sun.color.lerpColors(colors.sunFrom, colors.sunTo, amount);
    }
    if (fill) {
      const [fillX, fillY, fillZ] = mixVec3(
        DAYLIGHT_LIGHTING.fillPosition,
        lighting.fillPosition,
        amount,
      );
      fill.position.set(fillX, fillY, fillZ);
      fill.intensity = mixScalar(
        DAYLIGHT_LIGHTING.fillIntensity,
        lighting.fillIntensity,
        amount,
      );
      fill.color.lerpColors(colors.fillFrom, colors.fillTo, amount);
    }
    if (hemi) {
      hemi.intensity = mixScalar(
        DAYLIGHT_LIGHTING.hemiIntensity,
        lighting.hemiIntensity,
        amount,
      );
      hemi.color.lerpColors(colors.hemiSkyFrom, colors.hemiSkyTo, amount);
      hemi.groundColor.lerpColors(colors.hemiGroundFrom, colors.hemiGroundTo, amount);
    }
    if (ambient) {
      ambient.intensity = mixScalar(
        DAYLIGHT_LIGHTING.ambientIntensity,
        lighting.ambientIntensity,
        amount,
      );
      ambient.color.lerpColors(colors.ambientFrom, colors.ambientTo, amount);
    }
    if (fog instanceof Fog) {
      fog.color.lerpColors(colors.fogFrom, colors.fogTo, amount);
      fog.near = baseFogNear + mixScalar(DAYLIGHT_LIGHTING.fogNearPad, lighting.fogNearPad, amount);
      fog.far = baseFogFar + mixScalar(DAYLIGHT_LIGHTING.fogFarPad, lighting.fogFarPad, amount);
    }
    if (scene.background instanceof Color) {
      scene.background.copy(fog instanceof Fog ? fog.color : colors.fogFrom);
    }
    gl.setClearColor(fog instanceof Fog ? fog.color : colors.fogFrom, 1);
    gl.toneMappingExposure = mixScalar(
      DAYLIGHT_LIGHTING.exposure,
      lighting.exposure,
      amount,
    );

    const skyMaterial = skyMaterialRef.current;
    if (skyMaterial) {
      skyMaterial.uniforms.uZenith.value.copy(colors.zenith);
      skyMaterial.uniforms.uMid.value.copy(colors.mid);
      skyMaterial.uniforms.uHorizon.value.copy(colors.horizon);
      skyMaterial.uniforms.uGround.value.copy(colors.skyGround);
      skyMaterial.uniforms.uGlow.value.copy(colors.glow);
      skyMaterial.uniforms.uGlowStrength.value = look.sky.glowStrength * amount;
    }
  });

  return (
    <>
      <LivingSkyDome
        amountRef={mixRef}
        sunPositionRef={sunPositionRef}
        showSunDiscRef={showSunDiscRef}
        sunDiscColorRef={sunDiscColorRef}
        materialRef={skyMaterialRef}
      />
      <LivingWeather weather={look.weather} enabled={enabled} extent={groundExtent} />
    </>
  );
}

export const LIFE_CLIP_NAME = /idle|alive|ambient|live|loop/i;
