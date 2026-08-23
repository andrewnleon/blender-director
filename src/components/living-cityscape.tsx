"use client";

import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import {
  CanvasTexture,
  Color,
  InstancedMesh,
  LinearFilter,
  LinearMipmapLinearFilter,
  Object3D,
  RepeatWrapping,
  SRGBColorSpace,
} from "three";
import { cityRingRadii } from "@/lib/live-backdrop";
import type { SceneGroundLook, SceneVariant } from "@/lib/scene-lighting";

/** Hero skyscraper is 18 m on a 10 m lot. Backdrop uses the same lot scale. */
const LOT_METERS = 10;
const HERO_TOWER_HEIGHT = 18;
const CITY_NEAR_RATIO = 0.55;
const HORIZON_HEIGHT_SCALE = 4.4;
const CITY_BUILDING_COUNT = 220;
const CITY_NEAR_COUNT = Math.round(CITY_BUILDING_COUNT * CITY_NEAR_RATIO);
const CITY_SPIRE_COUNT = 8;
const WINDOW_TINT: Record<SceneVariant, string> = {
  sunset: "#ffb068",
  sunny: "#dceaf6",
  snow: "#e8f0f8",
  rain: "#9eb0c0",
};

function hashNoise(seed: number): number {
  const raw = Math.sin(seed) * 43758.5453;
  return raw - Math.floor(raw);
}

function createFacadeTexture(windowHex: string, isSunny: boolean): CanvasTexture {
  const sourceSize = 64;
  const canvas = document.createElement("canvas");
  canvas.width = sourceSize;
  canvas.height = sourceSize * 2;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Facade texture canvas unavailable");
  }
  context.fillStyle = isSunny ? "#3a444c" : "#1c2024";
  context.fillRect(0, 0, canvas.width, canvas.height);
  const windowColor = new Color(windowHex);
  for (let y = 3; y < canvas.height - 3; y += 6) {
    for (let x = 3; x < canvas.width - 3; x += 5) {
      const lit = hashNoise(x * 1.7 + y * 4.3) > (isSunny ? 0.34 : 0.42);
      const shade = lit ? 0.28 + hashNoise(x + y * 9) * 0.35 : 0.06;
      context.fillStyle = `rgb(${Math.round(windowColor.r * 255 * shade)},${Math.round(windowColor.g * 255 * shade)},${Math.round(windowColor.b * 255 * shade)})`;
      context.fillRect(x, y, 3, 4);
    }
  }
  const texture = new CanvasTexture(canvas);
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.repeat.set(2, 5);
  texture.magFilter = LinearFilter;
  texture.minFilter = LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.colorSpace = SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function northnessFromAngle(angle: number): number {
  return Math.max(0, -Math.cos(angle));
}

function placeCityBuilding(
  dummy: Object3D,
  index: number,
  innerRadius: number,
  outerRadius: number,
  isSunny: boolean,
) {
  const midRadius = innerRadius + (outerRadius - innerRadius) * CITY_NEAR_RATIO;
  const isFarBand = index >= CITY_NEAR_COUNT;
  const bandInner = isFarBand ? midRadius : innerRadius;
  const bandOuter = isFarBand ? outerRadius : midRadius;
  const angle =
    (index / CITY_BUILDING_COUNT) * Math.PI * 2 + hashNoise(index + 2) * 0.1;
  const radius = bandInner + hashNoise(index + 11) * (bandOuter - bandInner);
  const width = LOT_METERS * (0.72 + hashNoise(index + 3) * 0.45);
  const depth = LOT_METERS * (0.72 + hashNoise(index + 5) * 0.45);
  const northBoost = isSunny ? 1 + northnessFromAngle(angle) * 0.55 : 1;
  const height =
    (HERO_TOWER_HEIGHT * (0.55 + hashNoise(index + 7) * 0.85) +
      (index % 11 === 0 ? HERO_TOWER_HEIGHT * 0.35 : 0)) *
    northBoost *
    HORIZON_HEIGHT_SCALE;
  dummy.position.set(
    Math.sin(angle) * radius,
    height / 2,
    Math.cos(angle) * radius,
  );
  dummy.scale.set(width, height, depth);
  dummy.rotation.set(0, Math.floor(hashNoise(index + 13) * 4) * (Math.PI / 2), 0);
  dummy.updateMatrix();
}

function placeCitySpire(
  dummy: Object3D,
  index: number,
  innerRadius: number,
  outerRadius: number,
) {
  const angle = Math.PI + (index - (CITY_SPIRE_COUNT - 1) / 2) * 0.16;
  const radius = innerRadius + LOT_METERS + hashNoise(index + 21) * 28;
  const height =
    HERO_TOWER_HEIGHT * (1.15 + hashNoise(index + 29) * 0.7) * HORIZON_HEIGHT_SCALE;
  dummy.position.set(
    Math.sin(angle) * radius,
    height / 2,
    Math.cos(angle) * radius,
  );
  dummy.scale.set(
    4.2 + hashNoise(index) * 2.2,
    height,
    4.2 + hashNoise(index + 4) * 2.2,
  );
  dummy.rotation.set(0, 0, 0);
  dummy.updateMatrix();
}

export function LivingCityscape({
  extent,
  look,
  variant,
}: {
  extent: number;
  look: SceneGroundLook;
  variant: SceneVariant;
}) {
  const meshRef = useRef<InstancedMesh>(null);
  const hazeRef = useRef<InstancedMesh>(null);
  const spireRef = useRef<InstancedMesh>(null);
  const { inner: innerRadius, outer: outerRadius } = cityRingRadii(extent);
  const isSunny = variant === "sunny";
  const facade = useMemo(
    () => createFacadeTexture(WINDOW_TINT[variant], isSunny),
    [isSunny, variant],
  );

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    const haze = hazeRef.current;
    const spires = spireRef.current;
    if (!mesh) {
      return;
    }
    const dummy = new Object3D();
    for (let index = 0; index < CITY_BUILDING_COUNT; index += 1) {
      placeCityBuilding(dummy, index, innerRadius, outerRadius, isSunny);
      mesh.setMatrixAt(index, dummy.matrix);
      dummy.scale.multiplyScalar(1.22);
      dummy.updateMatrix();
      haze?.setMatrixAt(index, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
    if (haze) {
      haze.instanceMatrix.needsUpdate = true;
      haze.computeBoundingSphere();
    }
    if (spires) {
      for (let index = 0; index < CITY_SPIRE_COUNT; index += 1) {
        placeCitySpire(dummy, index, innerRadius, outerRadius);
        spires.setMatrixAt(index, dummy.matrix);
      }
      spires.instanceMatrix.needsUpdate = true;
      spires.computeBoundingSphere();
    }
  }, [innerRadius, isSunny, outerRadius]);

  useEffect(() => {
    return () => {
      facade.dispose();
    };
  }, [facade]);

  return (
    <group>
      <instancedMesh
        ref={hazeRef}
        args={[undefined, undefined, CITY_BUILDING_COUNT]}
        raycast={() => undefined}
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial
          color={isSunny ? "#5a646c" : look.apronColor}
          transparent
          opacity={0.18}
          depthWrite={false}
          roughness={1}
          metalness={0}
        />
      </instancedMesh>
      <instancedMesh
        ref={meshRef}
        args={[undefined, undefined, CITY_BUILDING_COUNT]}
        raycast={() => undefined}
        receiveShadow
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial
          map={facade}
          color={isSunny ? "#8a96a0" : look.color}
          roughness={isSunny ? 0.32 : 0.78}
          metalness={isSunny ? 0.38 : 0.12}
          emissive={WINDOW_TINT[variant]}
          emissiveIntensity={isSunny ? 0.04 : 0.16}
          emissiveMap={facade}
        />
      </instancedMesh>
      {isSunny ? (
        <instancedMesh
          ref={spireRef}
          args={[undefined, undefined, CITY_SPIRE_COUNT]}
          raycast={() => undefined}
        >
          <cylinderGeometry args={[0.5, 0.62, 1, 8]} />
          <meshStandardMaterial
            color="#6a7680"
            roughness={0.28}
            metalness={0.48}
          />
        </instancedMesh>
      ) : null}
    </group>
  );
}
