"use client";

import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { Color, DoubleSide, type Mesh } from "three";
import { measureRoofPoolLayout } from "@/lib/construction/roof-pool";

const FILL_LERP = 3.2;
const WATER_THICKNESS = 0.16;
const WATER_LIFT = 0.035;
const POOL_SEGMENTS = 48;

const WATER_VERTEX = /* glsl */ `
  varying vec2 vUv;
  varying float vWave;
  uniform float uTime;
  uniform float uFill;

  void main() {
    vUv = uv;
    float wave =
      sin(position.x * 16.0 + uTime * 1.2) * 0.55 +
      cos(position.y * 14.0 + uTime * 0.85) * 0.45;
    vWave = wave;
    vec3 displaced = position;
    displaced.z += wave * 0.045 * uFill;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
  }
`;

const WATER_FRAGMENT = /* glsl */ `
  varying vec2 vUv;
  varying float vWave;
  uniform float uTime;
  uniform float uFill;
  uniform vec3 uDeep;
  uniform vec3 uMid;
  uniform vec3 uFoam;

  void main() {
    vec2 scroll = vUv + vec2(uTime * 0.038, -uTime * 0.024);
    float sparkle = sin(scroll.x * 22.0 + uTime * 0.6) * sin(scroll.y * 18.0 - uTime * 0.45);
    vec3 color = mix(uDeep, uMid, 0.52 + vWave * 0.28);
    color = mix(color, uFoam, smoothstep(0.62, 0.94, sparkle) * 0.32);
    float alpha = (0.72 + vWave * 0.1) * (0.25 + 0.75 * uFill);
    gl_FragColor = vec4(color, alpha);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

export function RoofPool({
  url,
  isFilled,
}: {
  url: string;
  isFilled: boolean;
}) {
  const { scene } = useGLTF(url);
  const meshRef = useRef<Mesh>(null);
  const fillRef = useRef(isFilled ? 1 : 0);
  const layout = useMemo(() => measureRoofPoolLayout(scene), [scene]);
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uFill: { value: 0 },
      uDeep: { value: new Color("#043a5c") },
      uMid: { value: new Color("#1494c4") },
      uFoam: { value: new Color("#8ee7f5") },
    }),
    [],
  );

  useFrame((_, delta) => {
    const target = isFilled ? 1 : 0;
    const nextFill = fillRef.current + (target - fillRef.current) * Math.min(1, delta * FILL_LERP);
    fillRef.current = nextFill;
    uniforms.uTime.value += delta;
    uniforms.uFill.value = nextFill;

    const mesh = meshRef.current;
    if (!mesh || !layout) {
      return;
    }
    mesh.visible = nextFill > 0.02;
    mesh.scale.set(layout.width, layout.depth, 1);
    mesh.position.y = layout.roofY + WATER_LIFT + nextFill * WATER_THICKNESS;
  });

  if (!layout) {
    return null;
  }

  return (
    <mesh
      ref={meshRef}
      name="roof-pool-water"
      visible={isFilled}
      position={[layout.centerX, layout.roofY + WATER_LIFT, layout.centerZ]}
      rotation={[-Math.PI / 2, 0, 0]}
      scale={[layout.width, layout.depth, 1]}
      receiveShadow
    >
      <planeGeometry args={[1, 1, POOL_SEGMENTS, POOL_SEGMENTS]} />
      <shaderMaterial
        transparent
        depthWrite
        side={DoubleSide}
        vertexShader={WATER_VERTEX}
        fragmentShader={WATER_FRAGMENT}
        uniforms={uniforms}
      />
    </mesh>
  );
}
