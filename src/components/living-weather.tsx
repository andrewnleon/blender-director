"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { InstancedMesh, Object3D } from "three";
import type { SceneWeather } from "@/lib/scene-lighting";

const dummy = new Object3D();
const RAIN_COUNT = 1100;
const SNOW_COUNT = 720;

type ParticleState = {
  x: number;
  y: number;
  z: number;
  speed: number;
  drift: number;
  spin: number;
};

function createParticles(count: number, halfExtent: number, ceiling: number): ParticleState[] {
  const particles: ParticleState[] = [];
  for (let index = 0; index < count; index += 1) {
    particles.push({
      x: (Math.random() * 2 - 1) * halfExtent,
      y: Math.random() * ceiling,
      z: (Math.random() * 2 - 1) * halfExtent,
      speed: 0.6 + Math.random() * 0.9,
      drift: (Math.random() * 2 - 1) * 0.35,
      spin: Math.random() * Math.PI * 2,
    });
  }
  return particles;
}

export function LivingWeather({
  weather,
  enabled,
  extent,
}: {
  weather: SceneWeather;
  enabled: boolean;
  extent: number;
}) {
  if (!enabled || weather === "none") {
    return null;
  }
  return weather === "rain" ? (
    <RainField extent={extent} />
  ) : (
    <SnowField extent={extent} />
  );
}

function RainField({ extent }: { extent: number }) {
  const meshRef = useRef<InstancedMesh>(null);
  const halfExtent = extent * 0.62;
  const ceiling = 28;
  const particles = useMemo(
    () => createParticles(RAIN_COUNT, halfExtent, ceiling),
    [ceiling, halfExtent],
  );

  useFrame((_, delta) => {
    const mesh = meshRef.current;
    if (!mesh) {
      return;
    }
    const step = Math.min(delta, 0.05);
    for (let index = 0; index < particles.length; index += 1) {
      const particle = particles[index];
      particle.y -= particle.speed * 28 * step;
      particle.x += particle.drift * 0.8 * step;
      if (particle.y < 0) {
        particle.y = ceiling;
        particle.x = (Math.random() * 2 - 1) * halfExtent;
        particle.z = (Math.random() * 2 - 1) * halfExtent;
      }
      dummy.position.set(particle.x, particle.y, particle.z);
      dummy.scale.setScalar(1);
      dummy.rotation.set(-0.35, 0, 0.08);
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, RAIN_COUNT]}
      frustumCulled={false}
    >
      <boxGeometry args={[0.018, 0.42, 0.018]} />
      <meshBasicMaterial color="#c5d0da" transparent opacity={0.55} toneMapped={false} />
    </instancedMesh>
  );
}

function SnowField({ extent }: { extent: number }) {
  const meshRef = useRef<InstancedMesh>(null);
  const halfExtent = extent * 0.62;
  const ceiling = 22;
  const particles = useMemo(
    () => createParticles(SNOW_COUNT, halfExtent, ceiling),
    [ceiling, halfExtent],
  );
  useFrame((state, delta) => {
    const mesh = meshRef.current;
    if (!mesh) {
      return;
    }
    const step = Math.min(delta, 0.05);
    const time = state.clock.elapsedTime;
    for (let index = 0; index < particles.length; index += 1) {
      const particle = particles[index];
      particle.y -= particle.speed * 2.4 * step;
      particle.x += Math.sin(time * 0.7 + particle.spin) * particle.drift * step * 1.6;
      particle.z += Math.cos(time * 0.55 + particle.spin) * particle.drift * step * 1.2;
      if (particle.y < 0) {
        particle.y = ceiling;
        particle.x = (Math.random() * 2 - 1) * halfExtent;
        particle.z = (Math.random() * 2 - 1) * halfExtent;
      }
      dummy.position.set(particle.x, particle.y, particle.z);
      dummy.scale.setScalar(0.7 + (index % 5) * 0.12);
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, SNOW_COUNT]}
      frustumCulled={false}
    >
      <sphereGeometry args={[0.055, 6, 6]} />
      <meshBasicMaterial color="#f7fbff" transparent opacity={0.86} toneMapped={false} />
    </instancedMesh>
  );
}
