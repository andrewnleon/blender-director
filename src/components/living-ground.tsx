"use client";

import { useTexture } from "@react-three/drei";
import type { ThreeEvent } from "@react-three/fiber";
import { useLayoutEffect, useMemo } from "react";
import { Color, type WebGLProgramParametersWithUniforms } from "three";
import { LIVE_TEXTURE, prepareLiveTexture } from "@/lib/live-textures";
import {
  RESTING_GROUND,
  SCENE_VARIANT_LOOK,
  type SceneGroundLook,
  type SceneVariant,
} from "@/lib/scene-lighting";
import { worldGroundSize } from "@/lib/stage-world";

export function getLiveGroundLook(
  isDynamicScene: boolean,
  variant: SceneVariant,
): SceneGroundLook {
  return isDynamicScene ? SCENE_VARIANT_LOOK[variant].ground : RESTING_GROUND;
}

export function LivingGroundApron({
  extent,
  look,
}: {
  extent: number;
  look: SceneGroundLook;
}) {
  const apronRadius = worldGroundSize(extent) * 0.72;
  const uniforms = useMemo(
    () => ({
      uColor: { value: new Color(look.apronColor) },
      uPatch: { value: new Color(look.color) },
    }),
    [look.apronColor, look.color],
  );

  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, -0.08, 0]}
      receiveShadow
    >
      <circleGeometry args={[apronRadius, 72]} />
      <shaderMaterial
        uniforms={uniforms}
        vertexShader={APRON_VERTEX}
        fragmentShader={APRON_FRAGMENT}
      />
    </mesh>
  );
}

export function LivingLand({
  size,
  look,
  variant,
  onPointerMove,
  onPointerOut,
  onClick,
}: {
  size: number;
  look: SceneGroundLook;
  variant: SceneVariant;
  onPointerMove?: (event: ThreeEvent<PointerEvent>) => void;
  onPointerOut?: () => void;
  onClick?: (event: ThreeEvent<MouseEvent>) => void;
}) {
  const [grassColor, grassNormal, grassRough, dirtColor] = useTexture([
    LIVE_TEXTURE.grassColor,
    LIVE_TEXTURE.grassNormal,
    LIVE_TEXTURE.grassRoughness,
    LIVE_TEXTURE.dirtColor,
  ]);
  const groundRepeat = Math.max(9, Math.round(size / 48));
  const snowMix = variant === "snow" ? 0.55 : 0;

  useLayoutEffect(() => {
    prepareLiveTexture(grassColor, groundRepeat, true);
    prepareLiveTexture(grassNormal, groundRepeat, false);
    prepareLiveTexture(grassRough, groundRepeat, false);
    prepareLiveTexture(dirtColor, groundRepeat * 0.72, true);
  }, [dirtColor, grassColor, grassNormal, grassRough, groundRepeat]);

  const onBeforeCompile = useMemo(() => {
    return (shader: WebGLProgramParametersWithUniforms) => {
      shader.uniforms.uDirtMap = { value: dirtColor };
      shader.uniforms.uSnowMix = { value: snowMix };
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <common>",
        `#include <common>
uniform sampler2D uDirtMap;
uniform float uSnowMix;`,
      );
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <map_fragment>",
        `#ifdef USE_MAP
  vec2 uvA = vMapUv;
  vec2 uvB = vMapUv * 1.73 + vec2(0.31, 0.17);
  vec4 grassA = texture2D(map, uvA);
  vec4 grassB = texture2D(map, uvB);
  float cellHash = fract(sin(dot(floor(vMapUv * 5.3), vec2(12.9898, 78.233))) * 43758.5453);
  vec4 grassSample = mix(grassA, grassB, cellHash);
  vec4 dirtSample = texture2D(uDirtMap, uvA * 0.62);
  float wear = fract(sin(dot(vMapUv * 3.1, vec2(39.346, 11.135))) * 23421.631);
  float dirtMask = smoothstep(0.82, 0.96, wear) * 0.22;
  diffuseColor *= grassSample;
  diffuseColor.rgb = mix(diffuseColor.rgb, dirtSample.rgb, dirtMask);
  diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.86, 0.90, 0.93), uSnowMix);
#endif`,
      );
    };
  }, [dirtColor, snowMix]);

  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, -0.04, 0]}
      receiveShadow
      onPointerMove={onPointerMove}
      onPointerOut={onPointerOut}
      onClick={onClick}
    >
      <planeGeometry args={[size, size]} />
      <meshStandardMaterial
        map={grassColor}
        normalMap={grassNormal}
        roughnessMap={grassRough}
        color="#f4f6f0"
        roughness={look.roughness}
        metalness={look.metalness}
        onBeforeCompile={onBeforeCompile}
      />
    </mesh>
  );
}

const APRON_VERTEX = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const APRON_FRAGMENT = /* glsl */ `
uniform vec3 uColor;
uniform vec3 uPatch;
varying vec2 vUv;
void main() {
  vec2 centered = vUv * 2.0 - 1.0;
  float radial = length(centered);
  float n = fract(sin(dot(vUv * 18.0, vec2(12.9898, 78.233))) * 43758.5453);
  vec3 color = mix(uPatch, uColor, smoothstep(0.22, 0.78, radial));
  color = mix(color, uColor * 0.88, n * 0.12);
  gl_FragColor = vec4(color, 1.0);
}
`;

useTexture.preload([
  LIVE_TEXTURE.grassColor,
  LIVE_TEXTURE.grassNormal,
  LIVE_TEXTURE.grassRoughness,
  LIVE_TEXTURE.dirtColor,
]);
