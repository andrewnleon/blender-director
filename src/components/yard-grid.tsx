"use client";

import { shaderMaterial } from "@react-three/drei";
import { extend, useFrame, type ThreeElement } from "@react-three/fiber";
import { useRef, type ComponentProps } from "react";
import {
  BackSide,
  Color,
  Plane,
  PlaneGeometry,
  Vector3,
  type ColorRepresentation,
  type Mesh,
  type ShaderMaterial,
  type Side,
} from "three";

type YardGridMaterialUniforms = {
  cellSize: number;
  sectionSize: number;
  fadeDistance: number;
  fadeStrength: number;
  fadeFrom: number;
  cellThickness: number;
  sectionThickness: number;
  cellColor: Color;
  sectionColor: Color;
  infiniteGrid: boolean;
  followCamera: boolean;
  worldCamProjPosition: Vector3;
  worldPlanePosition: Vector3;
};

const YARD_GRID_UNIFORMS: YardGridMaterialUniforms = {
  cellSize: 1,
  sectionSize: 10,
  fadeDistance: 100,
  fadeStrength: 0,
  fadeFrom: 1,
  cellThickness: 0.5,
  sectionThickness: 1,
  cellColor: new Color("#5c6558"),
  sectionColor: new Color("#8a9a6a"),
  infiniteGrid: false,
  followCamera: false,
  worldCamProjPosition: new Vector3(),
  worldPlanePosition: new Vector3(),
};

const YardGridMaterial = shaderMaterial(
  YARD_GRID_UNIFORMS,
  /* glsl */ `
    varying vec3 localPosition;
    varying vec4 worldPosition;

    uniform vec3 worldCamProjPosition;
    uniform vec3 worldPlanePosition;
    uniform float fadeDistance;
    uniform bool infiniteGrid;
    uniform bool followCamera;

    void main() {
      localPosition = position.xzy;
      if (infiniteGrid) localPosition *= 1.0 + fadeDistance;

      worldPosition = modelMatrix * vec4(localPosition, 1.0);
      if (followCamera) {
        worldPosition.xyz += (worldCamProjPosition - worldPlanePosition);
        localPosition = (inverse(modelMatrix) * worldPosition).xyz;
      }

      gl_Position = projectionMatrix * viewMatrix * worldPosition;
    }
  `,
  /* glsl */ `
    varying vec3 localPosition;
    varying vec4 worldPosition;

    uniform vec3 worldCamProjPosition;
    uniform float cellSize;
    uniform float sectionSize;
    uniform vec3 cellColor;
    uniform vec3 sectionColor;
    uniform float fadeDistance;
    uniform float fadeStrength;
    uniform float fadeFrom;
    uniform float cellThickness;
    uniform float sectionThickness;

    float getGrid(float size, float thickness) {
      vec2 r = localPosition.xz / size;
      vec2 derivative = fwidth(r);
      vec2 grid = abs(fract(r - 0.5) - 0.5) / derivative;
      float line = min(grid.x, grid.y) + 1.0 - thickness;
      float coverage = 1.0 - min(line, 1.0);
      // Drop this grid level before cells go sub-pixel (kills moiré on zoom-out).
      float pixelSize = max(derivative.x, derivative.y);
      float lod = 1.0 - smoothstep(0.35, 0.95, pixelSize);
      return coverage * lod;
    }

    void main() {
      float g1 = getGrid(cellSize, cellThickness);
      float g2 = getGrid(sectionSize, sectionThickness);

      vec3 from = worldCamProjPosition * vec3(fadeFrom);
      float dist = distance(from, worldPosition.xyz);
      float d = 1.0 - min(dist / fadeDistance, 1.0);
      // fadeStrength=0 must not use pow(d, 0) — GLSL pow(0,0) is NaN and flickers.
      float fade = fadeStrength > 0.0001 ? pow(max(d, 0.0), fadeStrength) : 1.0;
      vec3 color = mix(cellColor, sectionColor, min(1.0, sectionThickness * g2));

      gl_FragColor = vec4(color, (g1 + g2) * fade);
      gl_FragColor.a = mix(0.75 * gl_FragColor.a, gl_FragColor.a, g2);
      if (gl_FragColor.a <= 0.0) discard;

      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }
  `,
);

declare module "@react-three/fiber" {
  interface ThreeElements {
    yardGridMaterial: ThreeElement<typeof YardGridMaterial>;
  }
}

const GROUND_PLANE = new Plane();
const UP_VECTOR = new Vector3(0, 1, 0);
const ORIGIN = new Vector3();

type YardGridMaterialInstance = ShaderMaterial & {
  uniforms: {
    worldCamProjPosition: { value: Vector3 };
    worldPlanePosition: { value: Vector3 };
  };
};

function isYardGridMaterial(
  material: Mesh["material"],
): material is YardGridMaterialInstance {
  if (typeof material !== "object" || material === null || Array.isArray(material)) {
    return false;
  }
  return "uniforms" in material;
}

export type YardGridProps = Omit<ComponentProps<"mesh">, "args"> & {
  args?: ConstructorParameters<typeof PlaneGeometry>;
  cellSize?: number;
  cellThickness?: number;
  cellColor?: ColorRepresentation;
  sectionSize?: number;
  sectionThickness?: number;
  sectionColor?: ColorRepresentation;
  fadeDistance?: number;
  fadeStrength?: number;
  fadeFrom?: number;
  followCamera?: boolean;
  infiniteGrid?: boolean;
  side?: Side;
};

export function YardGrid({
  args,
  cellColor = "#5c6558",
  sectionColor = "#8a9a6a",
  cellSize = 1,
  sectionSize = 10,
  followCamera = false,
  infiniteGrid = false,
  fadeDistance = 100,
  fadeStrength = 0,
  fadeFrom = 1,
  cellThickness = 0.5,
  sectionThickness = 1,
  side = BackSide,
  ...props
}: YardGridProps) {
  extend({ YardGridMaterial });
  const meshRef = useRef<Mesh>(null);

  useFrame((state) => {
    const mesh = meshRef.current;
    if (!mesh || !isYardGridMaterial(mesh.material)) {
      return;
    }
    GROUND_PLANE.setFromNormalAndCoplanarPoint(UP_VECTOR, ORIGIN).applyMatrix4(
      mesh.matrixWorld,
    );
    GROUND_PLANE.projectPoint(
      state.camera.position,
      mesh.material.uniforms.worldCamProjPosition.value,
    );
    mesh.material.uniforms.worldPlanePosition.value
      .set(0, 0, 0)
      .applyMatrix4(mesh.matrixWorld);
  });

  return (
    <mesh ref={meshRef} frustumCulled={false} {...props}>
      <yardGridMaterial
        transparent
        depthWrite={false}
        extensions-derivatives
        side={side}
        cellSize={cellSize}
        sectionSize={sectionSize}
        cellColor={cellColor}
        sectionColor={sectionColor}
        cellThickness={cellThickness}
        sectionThickness={sectionThickness}
        fadeDistance={fadeDistance}
        fadeStrength={fadeStrength}
        fadeFrom={fadeFrom}
        infiniteGrid={infiniteGrid}
        followCamera={followCamera}
      />
      <planeGeometry args={args} />
    </mesh>
  );
}
