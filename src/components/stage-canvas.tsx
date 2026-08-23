"use client";

import {
  Center,
  OrbitControls,
  useAnimations,
  useGLTF,
} from "@react-three/drei";
import { Canvas, type ThreeEvent, useFrame, useThree } from "@react-three/fiber";
import {
  Suspense,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";
import {
  ACESFilmicToneMapping,
  FrontSide,
  LoopOnce,
  LoopRepeat,
  MOUSE,
  Mesh,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  Material,
  PropertyBinding,
  Spherical,
  SRGBColorSpace,
  Vector3,
  type AnimationAction,
  type AnimationClip,
  type AmbientLight,
  type DirectionalLight,
  type Group,
  type HemisphereLight,
  type Object3D,
} from "three";
import { RoofPool } from "@/components/roof-pool";
import { SiteKitSourceProvider } from "@/components/site-kit-provider";
import { SkyscraperSiteKit } from "@/components/skyscraper-site-kit";
import { LivingMountains } from "@/components/living-mountains";
import { LivingTrees } from "@/components/living-trees";
import { liveWorldSize, mountainRingRadii } from "@/lib/live-backdrop";
import {
  getLiveGroundLook,
  LivingGroundApron,
  LivingLand,
} from "@/components/living-ground";
import {
  LIFE_CLIP_NAME,
  LivingEnvironmentDriver,
  LivingObjectEffects,
  AgentStationTraffic,
  OccupancyGlow,
} from "@/components/living-scene";
import { YardGrid } from "@/components/yard-grid";
import { DEFAULT_ANIMATION_SETTINGS, type AnimationSettings } from "@/lib/animation-settings";
import {
  DEFAULT_NORTH_AZIMUTH,
  DEFAULT_NORTH_POLAR,
  getSceneFogDistances,
  MAX_ORBIT_POLAR,
  MIN_ORBIT_POLAR,
  northFacingCameraPosition,
  PLACING_ROTATE_SPEED_RATIO,
  YARD_SCENE_COLOR,
  type CameraSettings,
  type StageCameraPose,
} from "@/lib/camera-settings";
import { useCatalogGlbPreload } from "@/hooks/use-catalog-glb-preload";
import { useProgressiveCatalogPreload } from "@/hooks/use-progressive-catalog-preload";
import { StagePlacementPlaceholder } from "@/components/stage-placement-placeholder";
import {
  catalogNorthYaw,
  getCatalogItem,
  type CatalogFootprint,
  type CatalogItem,
  type PlacedObject,
} from "@/lib/catalog";
import {
  DEFAULT_SCENE_VARIANT,
  type SceneVariant,
} from "@/lib/scene-lighting";
import {
  SHARED_STAGE_EXTENT,
  STAGE_CAMERA_FAR,
  SUN_LIGHT_DISTANCE,
  stageCompassDegrees,
  worldGroundSize,
} from "@/lib/stage-world";
import {
  constructDriveModeForCatalog,
  EMPTY_CONSTRUCTION_STATE,
  isConstructionComplete,
  libraryConstructPlayback,
} from "@/lib/construction/driver";
import type { ConstructClock, ConstructionState } from "@/lib/construction/types";
import type { AgentStatus } from "@/types/openclaw";
import {
  applyHollowCompleteVisibility,
  isHollowCompleteState,
} from "@/lib/construction/complete-visibility";
import { shouldMountRoofPool } from "@/lib/construction/roof-pool";
import {
  collectObjectNames,
  constructActionTimeScale,
  constructLeaderDuration,
  pickConstructLeaderClip,
  resolveConstructFloorCount,
} from "@/lib/construction/construct-duration";
import {
  measureAuthoredBounds,
  shouldMountSiteKit,
  writeConstructClock,
  type AuthoredBounds,
} from "@/lib/construction/site-kit";
import { canPlaceAt } from "@/lib/placement-collision";
import { getBuildingDefinition } from "@/lib/construction/asset-registry";

type StageCanvasProps = {
  objects: PlacedObject[];
  selectedId: string | null;
  placeCatalogId: string | null;
  cameraSettings: CameraSettings;
  animationSettings?: AnimationSettings;
  onPlace: (position: [number, number, number]) => void;
  onSelect: (id: string | null) => void;
  /** True = valid snap cell, false = overlap, null = not hovering. */
  onPlacementHoverChange?: (canPlace: boolean | null) => void;
  /** Read-only library preview — no click-to-place. */
  readOnly?: boolean;
  /** Library grid — still auto-plays construct once, then hollows. */
  staticPreview?: boolean;
  cameraTarget?: [number, number, number];
  groundExtent?: number;
  /** Live OpenClaw construction state keyed by catalog id. */
  constructionByCatalogId?: Record<string, ConstructionState>;
  /** Library construct replay — play construct clips once while true. */
  isConstructReplaying?: boolean;
  /** Fired when a construct clip reaches the end (LoopOnce). */
  onConstructReplayFinished?: () => void;
  /** Ambient life: lights, fog, windows, sway. */
  isDynamicScene?: boolean;
  sceneVariant?: SceneVariant;
  onCameraPoseChange?: (pose: StageCameraPose) => void;
  /** Preload first when stream or hero buildings should warm before placement. */
  priorityPreloadCatalogIds?: readonly string[];
};

const GRID_STEP = 1;
/** Yellow section lines and building dropzones — one 10×10 m lot per asset. */
const BUILDING_ZONE_SIZE = 10;
const BIND_COLLAPSE = 0.0001;
const GROW_IN_THRESHOLD = 0.15;
const COMPLETE_HULL_NAME = /_complete$/i;
const CAMERA_TARGET: [number, number, number] = [0, 0.75, 0];

function disableMaterialFog(material: Material): void {
  if ("fog" in material) {
    Reflect.set(material, "fog", false);
  }
}

function materialHasTransmission(material: Material): boolean {
  return (
    material instanceof MeshPhysicalMaterial && material.transmission > 0.01
  );
}

function meshHasGlass(child: Mesh): boolean {
  if (/window|glass/i.test(child.name)) {
    return true;
  }
  const materials = Array.isArray(child.material)
    ? child.material
    : [child.material];
  for (const material of materials) {
    if (!(material instanceof Material)) {
      continue;
    }
    if (/window|glass/i.test(material.name)) {
      return true;
    }
    if (materialHasTransmission(material)) {
      return true;
    }
  }
  return false;
}

function hardenAssetMaterial(material: Material): void {
  disableMaterialFog(material);
  if (!(material instanceof MeshStandardMaterial)) {
    return;
  }
  // Keep authored side / alpha. Forcing FrontSide culls inverted wall
  // planes (hollow towers, stacked floor plates, black backfaces).
  // DoubleSide + self-shadow is the build-time flicker on floor plates.
  material.shadowSide = FrontSide;
  const materialName = material.name;
  if (/window|glass/i.test(materialName) || materialHasTransmission(material)) {
    material.metalness = Math.min(material.metalness, 0.15);
    material.roughness = Math.max(material.roughness, 0.28);
    if (materialHasTransmission(material)) {
      material.depthWrite = false;
    }
  }
}

function ownMeshMaterials(child: Mesh): void {
  if (Array.isArray(child.material)) {
    child.material = child.material.map((material) =>
      material instanceof Material ? material.clone() : material,
    );
    return;
  }
  if (child.material instanceof Material) {
    child.material = child.material.clone();
  }
}

function prepareAssetMesh(child: Object3D): void {
  if (!(child instanceof Mesh)) {
    return;
  }
  ownMeshMaterials(child);
  const isGlass = meshHasGlass(child);
  child.castShadow = !isGlass;
  child.receiveShadow = !isGlass;
  const materials = Array.isArray(child.material)
    ? child.material
    : [child.material];
  for (const material of materials) {
    if (material instanceof Material) {
      hardenAssetMaterial(material);
    }
  }
}

type OrbitControlsLike = {
  target: Vector3;
  object: { position: Vector3 };
  update: () => void;
};

function isOrbitControlsLike(controls: unknown): controls is OrbitControlsLike {
  if (typeof controls !== "object" || controls === null) {
    return false;
  }
  const candidate = controls as {
    target?: unknown;
    object?: unknown;
    update?: unknown;
  };
  return (
    candidate.target instanceof Vector3 &&
    typeof candidate.object === "object" &&
    candidate.object !== null &&
    "position" in candidate.object &&
    candidate.object.position instanceof Vector3 &&
    typeof candidate.update === "function"
  );
}

function CameraPoseReporter({
  cameraTarget,
  onCameraPoseChange,
}: {
  cameraTarget: [number, number, number];
  onCameraPoseChange: (pose: StageCameraPose) => void;
}) {
  const camera = useThree((state) => state.camera);
  const controls = useThree((state) => state.controls);
  const lastKey = useRef("");

  useFrame(() => {
    const target = isOrbitControlsLike(controls)
      ? controls.target
      : {
          x: cameraTarget[0],
          y: cameraTarget[1],
          z: cameraTarget[2],
        };
    const offsetX = camera.position.x - target.x;
    const offsetY = camera.position.y - target.y;
    const offsetZ = camera.position.z - target.z;
    const distance = Math.hypot(offsetX, offsetY, offsetZ);
    const polar =
      distance > 1e-6
        ? Math.acos(Math.min(1, Math.max(-1, offsetY / distance)))
        : 0;
    const headingDegrees = stageCompassDegrees(offsetX, offsetZ);
    const poseKey = [
      camera.position.x.toFixed(2),
      camera.position.y.toFixed(2),
      camera.position.z.toFixed(2),
      target.x.toFixed(2),
      target.y.toFixed(2),
      target.z.toFixed(2),
      headingDegrees.toFixed(0),
    ].join("|");
    if (poseKey === lastKey.current) {
      return;
    }
    lastKey.current = poseKey;
    onCameraPoseChange({
      position: [camera.position.x, camera.position.y, camera.position.z],
      target: [target.x, target.y, target.z],
      distance,
      polar,
      headingDegrees,
    });
  });

  return null;
}

function OrbitViewDistance({
  cameraTarget,
  viewDistance,
}: {
  cameraTarget: readonly [number, number, number];
  viewDistance: number;
}) {
  const controls = useThree((state) => state.controls);
  const lastApplied = useRef(Number.NaN);
  const didApplyMountPose = useRef(false);

  useLayoutEffect(() => {
    if (!isOrbitControlsLike(controls)) {
      return;
    }
    if (!didApplyMountPose.current) {
      const offset = new Vector3().setFromSpherical(
        new Spherical(viewDistance, DEFAULT_NORTH_POLAR, DEFAULT_NORTH_AZIMUTH),
      );
      controls.target.set(cameraTarget[0], cameraTarget[1], cameraTarget[2]);
      controls.object.position.copy(controls.target).add(offset);
      controls.update();
      didApplyMountPose.current = true;
      lastApplied.current = viewDistance;
      return;
    }
    if (Math.abs(lastApplied.current - viewDistance) < 0.01) {
      return;
    }
    const offset = new Vector3().copy(controls.object.position).sub(controls.target);
    if (offset.lengthSq() < 1e-6) {
      offset.set(1, 1, 1);
    }
    offset.normalize().multiplyScalar(viewDistance);
    controls.object.position.copy(controls.target).add(offset);
    controls.update();
    lastApplied.current = viewDistance;
  }, [cameraTarget, controls, viewDistance]);

  return null;
}
const ORBIT_MOUSE_NAVIGATE = {
  LEFT: MOUSE.ROTATE,
  MIDDLE: MOUSE.DOLLY,
  RIGHT: MOUSE.PAN,
} as const;
const ORBIT_MOUSE_PLACE = {
  MIDDLE: MOUSE.DOLLY,
  RIGHT: MOUSE.ROTATE,
} as const;
const PLACEMENT_HALF = GRID_STEP / 2;
const PLACEMENT_BORDER = new Float32Array([
  -PLACEMENT_HALF,
  0,
  -PLACEMENT_HALF,
  PLACEMENT_HALF,
  0,
  -PLACEMENT_HALF,
  PLACEMENT_HALF,
  0,
  PLACEMENT_HALF,
  -PLACEMENT_HALF,
  0,
  PLACEMENT_HALF,
]);

/** drei Grid lines sit on integer boundaries; cells center on n + 0.5. */
function snap(value: number, step = GRID_STEP) {
  return (Math.floor(value / step) + 0.5) * step;
}

/** Snap footprints to their 10×10 m yard section (centers at 5, 15, 25…). */
function getPlacementSnapStep(footprint: CatalogFootprint): number {
  return Math.max(footprint.width, footprint.depth, BUILDING_ZONE_SIZE);
}

function snapPlacement(
  x: number,
  z: number,
  footprint: CatalogFootprint,
): [number, number, number] {
  const step = getPlacementSnapStep(footprint);
  return [snap(x, step), 0, snap(z, step)];
}

const DEFAULT_PLACEMENT_FOOTPRINT: CatalogFootprint = {
  width: GRID_STEP,
  depth: GRID_STEP,
};

/** Fine grid cell centers fully inside a snapped footprint (aligned to integer lines). */
function getFootprintCellCenters(
  anchor: [number, number, number],
  footprint: CatalogFootprint,
  step = GRID_STEP,
): [number, number, number][] {
  const [anchorX, anchorY, anchorZ] = anchor;
  const countX = Math.round(footprint.width / step);
  const countZ = Math.round(footprint.depth / step);
  const startX = anchorX - footprint.width / 2 + step / 2;
  const startZ = anchorZ - footprint.depth / 2 + step / 2;
  const cells: [number, number, number][] = [];

  for (let indexX = 0; indexX < countX; indexX += 1) {
    for (let indexZ = 0; indexZ < countZ; indexZ += 1) {
      cells.push([
        startX + indexX * step,
        anchorY,
        startZ + indexZ * step,
      ]);
    }
  }

  return cells;
}

function SceneEnvironment({
  groundExtent,
  isDynamicScene,
  sceneVariant,
  fogNear,
  fogFar,
}: {
  groundExtent: number;
  isDynamicScene: boolean;
  sceneVariant: SceneVariant;
  fogNear: number;
  fogFar: number;
}) {
  // Local lights only. drei <Environment preset> suspends the whole Canvas
  // on a raw.githack.com HDR that 403s and leaves a white viewport.
  const shadowReach = isDynamicScene
    ? mountainRingRadii(groundExtent).outer + 24
    : Math.max(48, groundExtent * 0.7);
  const shadowHalf = shadowReach;
  const shadowFar = Math.max(
    220,
    SUN_LIGHT_DISTANCE + (isDynamicScene ? shadowReach * 1.4 : groundExtent * 1.1),
  );
  const shadowMapSize = groundExtent > 80 ? 4096 : 2048;
  const sunRef = useRef<DirectionalLight>(null);
  const fillRef = useRef<DirectionalLight>(null);
  const hemiRef = useRef<HemisphereLight>(null);
  const ambientRef = useRef<AmbientLight>(null);

  return (
    <>
      <hemisphereLight ref={hemiRef} args={["#d8e4f0", "#3a3530", 0.32]} />
      <ambientLight ref={ambientRef} intensity={0.1} color="#eef1f4" />
      <directionalLight
        ref={sunRef}
        castShadow
        position={[28, 42, 18]}
        intensity={1.65}
        color="#fff1dc"
        shadow-mapSize={[shadowMapSize, shadowMapSize]}
        shadow-bias={-0.00018}
        shadow-normalBias={0.04}
        shadow-camera-near={4}
        shadow-camera-far={shadowFar}
        shadow-camera-left={-shadowHalf}
        shadow-camera-right={shadowHalf}
        shadow-camera-top={shadowHalf}
        shadow-camera-bottom={-shadowHalf}
      />
      <directionalLight
        ref={fillRef}
        position={[-14, 18, -10]}
        intensity={0.28}
        color="#dce6f2"
      />
      <LivingEnvironmentDriver
        enabled={isDynamicScene}
        variant={sceneVariant}
        sunRef={sunRef}
        fillRef={fillRef}
        hemiRef={hemiRef}
        ambientRef={ambientRef}
        baseFogNear={fogNear}
        baseFogFar={fogFar}
        groundExtent={groundExtent}
      />
    </>
  );
}

function PlacementCell({
  position,
  accent,
  valid,
}: {
  position: [number, number, number];
  accent: string;
  valid: boolean;
}) {
  const fillColor = valid ? accent : "#ef4444";
  const fillOpacity = valid ? 0.48 : 0.32;
  const borderOpacity = valid ? 0.95 : 0.85;

  return (
    <group position={position} renderOrder={12}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
        <planeGeometry args={[GRID_STEP, GRID_STEP]} />
        <meshBasicMaterial
          color={fillColor}
          transparent
          opacity={fillOpacity}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      {!valid ? (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.051, 0]}>
          <planeGeometry args={[GRID_STEP * 0.55, GRID_STEP * 0.08]} />
          <meshBasicMaterial
            color="#fca5a5"
            transparent
            opacity={0.9}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      ) : null}
      <lineLoop position={[0, 0.052, 0]}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[PLACEMENT_BORDER, 3]}
          />
        </bufferGeometry>
        <lineBasicMaterial
          color={fillColor}
          transparent
          opacity={borderOpacity}
          depthWrite={false}
          toneMapped={false}
        />
      </lineLoop>
    </group>
  );
}

function Ground({
  placing,
  placeCatalogId,
  objects,
  accent,
  footprint,
  onPlace,
  onPlacementHoverChange,
  extent,
  isDynamicScene,
  sceneVariant,
}: {
  placing: boolean;
  placeCatalogId: string | null;
  objects: readonly PlacedObject[];
  accent: string;
  footprint: CatalogFootprint;
  onPlace: (position: [number, number, number]) => void;
  onPlacementHoverChange?: (canPlace: boolean | null) => void;
  extent: number;
  isDynamicScene: boolean;
  sceneVariant: SceneVariant;
}) {
  const groundLook = getLiveGroundLook(isDynamicScene, sceneVariant);
  const terrainSize = isDynamicScene
    ? liveWorldSize(extent)
    : worldGroundSize(extent);
  const [hoverCell, setHoverCell] = useState<[number, number, number] | null>(
    null,
  );
  const hoverFootprintCells = useMemo(
    () =>
      hoverCell ? getFootprintCellCenters(hoverCell, footprint) : [],
    [footprint, hoverCell],
  );
  const hoverCanPlace = useMemo(() => {
    if (!hoverCell || !placeCatalogId) {
      return null;
    }
    return canPlaceAt(placeCatalogId, hoverCell, objects);
  }, [hoverCell, objects, placeCatalogId]);

  useEffect(() => {
    onPlacementHoverChange?.(placing ? hoverCanPlace : null);
  }, [hoverCanPlace, onPlacementHoverChange, placing]);

  useEffect(() => {
    if (!placing) {
      setHoverCell(null);
    }
  }, [placing]);

  function handlePointerMove(event: ThreeEvent<PointerEvent>) {
    if (!placing) return;
    event.stopPropagation();
    const { x, z } = event.point;
    setHoverCell(snapPlacement(x, z, footprint));
  }

  function handlePointerOut() {
    setHoverCell(null);
  }

  function handleClick(event: ThreeEvent<MouseEvent>) {
    if (event.button !== 0) return;
    if (!placing || !placeCatalogId) return;
    event.stopPropagation();
    const { x, z } = event.point;
    const position = snapPlacement(x, z, footprint);
    if (!canPlaceAt(placeCatalogId, position, objects)) return;
    onPlace(position);
  }

  return (
    <group>
      {isDynamicScene ? (
        <>
          <Suspense fallback={null}>
            <LivingLand
              size={terrainSize}
              look={groundLook}
              variant={sceneVariant}
              onPointerMove={handlePointerMove}
              onPointerOut={handlePointerOut}
              onClick={handleClick}
            />
            <LivingMountains
              extent={extent}
              look={groundLook}
              variant={sceneVariant}
            />
            <LivingTrees extent={extent} variant={sceneVariant} />
          </Suspense>
        </>
      ) : (
        <>
          <LivingGroundApron
            key={groundLook.apronColor}
            extent={extent}
            look={groundLook}
          />
          <mesh
            rotation={[-Math.PI / 2, 0, 0]}
            position={[0, -0.045, 0]}
            receiveShadow
          >
            <planeGeometry args={[terrainSize, terrainSize]} />
            <meshStandardMaterial
              color={groundLook.apronColor}
              roughness={Math.min(1, groundLook.roughness + 0.04)}
              metalness={groundLook.metalness}
            />
          </mesh>
        </>
      )}
      {isDynamicScene ? null : (
        <mesh
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, -0.02, 0]}
          receiveShadow
          onPointerMove={handlePointerMove}
          onPointerOut={handlePointerOut}
          onClick={handleClick}
        >
          <planeGeometry args={[extent, extent]} />
          <meshStandardMaterial
            color={groundLook.color}
            roughness={groundLook.roughness}
            metalness={groundLook.metalness}
          />
        </mesh>
      )}
      {placing && hoverCell && hoverCanPlace !== null
        ? hoverFootprintCells.map((position) => (
            <PlacementCell
              key={`${position[0]},${position[2]}`}
              position={position}
              accent={accent}
              valid={hoverCanPlace}
            />
          ))
        : null}
      {isDynamicScene ? null : (
        <YardGrid
          position={[0, 0.02, 0]}
          args={[extent, extent]}
          cellSize={GRID_STEP}
          cellThickness={0.6}
          cellColor={groundLook.cellColor}
          sectionSize={BUILDING_ZONE_SIZE}
          sectionThickness={1.15}
          sectionColor={groundLook.sectionColor}
          fadeStrength={0}
        />
      )}
      {placing && hoverCell ? (
        <YardGrid
          position={[hoverCell[0], 0.022, hoverCell[2]]}
          args={[footprint.width, footprint.depth]}
          cellSize={GRID_STEP}
          cellThickness={0.75}
          cellColor="#7a8a72"
          sectionSize={footprint.width}
          sectionThickness={1.35}
          sectionColor="#a8b888"
          fadeStrength={0}
        />
      ) : null}
    </group>
  );
}

function RelayBeacon({ accent }: { accent: string }) {
  return (
    <Center top>
      <group>
        <mesh castShadow receiveShadow position={[0, 0.12, 0]}>
          <cylinderGeometry args={[0.38, 0.48, 0.24, 8]} />
          <meshStandardMaterial color="#2b3034" roughness={0.55} metalness={0.35} />
        </mesh>
        <mesh castShadow position={[0, 0.72, 0]}>
          <octahedronGeometry args={[0.32, 0]} />
          <meshStandardMaterial
            color={accent}
            emissive={accent}
            emissiveIntensity={0.4}
            roughness={0.25}
            metalness={0.2}
          />
        </mesh>
      </group>
    </Center>
  );
}

function GlbModel({
  url,
  isDynamicScene,
  onAuthoredBoundsReady,
}: {
  url: string;
  isDynamicScene: boolean;
  onAuthoredBoundsReady?: (bounds: AuthoredBounds) => void;
}) {
  const { scene } = useGLTF(url);
  const root = useMemo(() => {
    const clone = scene.clone(true);
    clone.traverse(prepareAssetMesh);
    return clone;
  }, [scene]);
  useLayoutEffect(() => {
    onAuthoredBoundsReady?.(measureAuthoredBounds(root));
  }, [onAuthoredBoundsReady, root]);
  return (
    <Center top>
      <primitive object={root} />
      <LivingObjectEffects enabled={isDynamicScene} root={root} />
    </Center>
  );
}

type DeferredGrow = {
  object: Object3D;
  growStart: number;
};

function sampleScaleAt(values: ArrayLike<number>, index: number) {
  const offset = index * 3;
  return [values[offset], values[offset + 1], values[offset + 2]] as const;
}

function getDeferredGrowIns(clip: AnimationClip, root: Object3D): DeferredGrow[] {
  const deferred: DeferredGrow[] = [];
  const seen = new Set<Object3D>();

  for (const track of clip.tracks) {
    const parsed = PropertyBinding.parseTrackName(track.name);
    if (parsed.propertyName !== "scale") {
      continue;
    }
    const node = root.getObjectByName(parsed.nodeName);
    if (!node || seen.has(node)) {
      continue;
    }

    const { times, values } = track;
    if (times.length === 0) {
      continue;
    }

    const [startX, startY, startZ] = sampleScaleAt(values, 0);
    const minStart = Math.min(startX, startY, startZ);
    const maxStart = Math.max(startX, startY, startZ);
    const lastIndex = times.length - 1;
    const [endX, endY, endZ] = sampleScaleAt(values, lastIndex);
    const maxEnd = Math.max(endX, endY, endZ);

    // Y-only grow uses (1,1,0.04) → detect via min axis or scale increase over clip.
    const isGrowIn =
      minStart < GROW_IN_THRESHOLD || maxEnd - maxStart > 0.08;
    if (!isGrowIn) {
      continue;
    }

    // Hide while still collapsed. First tiny key is t≈0 — using that
    // made every floor/window speckle the sky as soon as the clip started.
    // Intact *_complete hulls must wait for the last key so they do not
    // fade in over live slices (LINEAR overlap = z-fight flicker).
    let growStart = times[lastIndex];
    if (!COMPLETE_HULL_NAME.test(node.name)) {
      for (let index = 0; index < times.length; index += 1) {
        const [x, y, z] = sampleScaleAt(values, index);
        if (Math.min(x, y, z) >= GROW_IN_THRESHOLD) {
          growStart = times[index];
          break;
        }
      }
    }

    seen.add(node);
    deferred.push({ object: node, growStart });
  }

  return deferred;
}

function collapseUntilGrow(
  deferred: readonly DeferredGrow[],
  time: number,
  hideBeforeGrow = true,
) {
  for (const { object, growStart } of deferred) {
    if (time < growStart - 1e-4) {
      if (hideBeforeGrow) {
        object.visible = false;
        object.scale.setScalar(BIND_COLLAPSE);
      } else {
        object.visible = true;
      }
      continue;
    }
    const minScale = Math.min(object.scale.x, object.scale.y, object.scale.z);
    // After grow: hide again when the clip collapses the piece (slices,
    // crane) so scale-0 casters do not swim the shadow map.
    object.visible = minScale >= GROW_IN_THRESHOLD;
  }
}

function resolveConstructClips(
  clips: AnimationClip[],
  clipName: string,
): AnimationClip[] {
  const named = clips.find((item) => item.name === clipName);
  if (named) {
    return [named];
  }
  if (clipName === "construct" && clips.length > 0) {
    return clips;
  }
  return clips.slice(0, 1);
}

function getDeferredGrowInsFromClips(
  clips: AnimationClip[],
  root: Object3D,
): DeferredGrow[] {
  const merged = new Map<Object3D, DeferredGrow>();
  for (const activeClip of clips) {
    for (const entry of getDeferredGrowIns(activeClip, root)) {
      merged.set(entry.object, entry);
    }
  }
  return [...merged.values()];
}

function pickLeaderAction(
  actions: readonly AnimationAction[],
): AnimationAction | undefined {
  if (actions.length === 0) {
    return undefined;
  }
  const clips = actions.map((action) => action.getClip());
  const leaderClip = pickConstructLeaderClip(clips);
  if (!leaderClip) {
    return actions[0];
  }
  return (
    actions.find((action) => action.getClip() === leaderClip) ?? actions[0]
  );
}

function syncConstructClock(
  clock: ConstructClock | undefined,
  actions: readonly AnimationAction[],
  isPlaying: boolean,
  scrubProgress?: number,
) {
  if (actions.length === 0) {
    writeConstructClock(clock, scrubProgress ?? 1, false);
    return;
  }
  if (scrubProgress !== undefined && !isPlaying) {
    writeConstructClock(clock, scrubProgress, false);
    return;
  }
  const leader = pickLeaderAction(actions);
  const duration = Math.max(leader?.getClip().duration ?? 0, 1e-6);
  writeConstructClock(clock, (leader?.time ?? 0) / duration, isPlaying);
}

function clampActionsToLeaderTime(
  actions: readonly AnimationAction[],
  leaderTime: number,
) {
  for (const action of actions) {
    action.time = Math.min(leaderTime, action.getClip().duration);
  }
}

function AnimatedGlb({
  url,
  clip,
  playbackSpeed,
  catalogFloorCount,
  constructionProgress,
  driveMode = "scrub",
  isConstructReplaying = false,
  isDynamicScene = false,
  constructClockRef,
  onHollowCompleteChange,
  onConstructReplayFinished,
  onAuthoredBoundsReady,
  agentTraffic,
}: {
  url: string;
  clip: string;
  playbackSpeed: number;
  catalogFloorCount?: number;
  /** Scrub target 0–1 when driveMode is scrub. */
  constructionProgress?: number;
  driveMode?: "auto" | "scrub";
  isConstructReplaying?: boolean;
  isDynamicScene?: boolean;
  constructClockRef?: RefObject<ConstructClock>;
  onHollowCompleteChange?: (isHollowComplete: boolean) => void;
  onConstructReplayFinished?: () => void;
  onAuthoredBoundsReady?: (bounds: AuthoredBounds) => void;
  agentTraffic?: {
    accent: string;
    agentStatus?: AgentStatus;
    stage: ConstructionState["stage"];
    isLive: boolean;
  };
}) {
  const isScrubMode = driveMode === "scrub";
  const constructionProgressRef = useRef(constructionProgress);
  constructionProgressRef.current = constructionProgress;
  const wasReplayingRef = useRef(isConstructReplaying);
  const didNotifyEmptyReplayRef = useRef(false);
  const onConstructReplayFinishedRef = useRef(onConstructReplayFinished);
  onConstructReplayFinishedRef.current = onConstructReplayFinished;
  const isEffectiveScrub = isScrubMode && !isConstructReplaying;
  const { scene, animations } = useGLTF(url);
  const [constructDone, setConstructDone] = useState(
    () => isEffectiveScrub && isConstructionComplete(constructionProgress ?? 0),
  );
  const wrapRef = useRef<Group>(null);
  const actionsRef = useRef<AnimationAction[]>([]);
  const deferredRef = useRef<DeferredGrow[]>([]);
  const leaderDurationRef = useRef(1);
  const root = useMemo(() => {
    const clone = scene.clone(true);
    clone.traverse(prepareAssetMesh);
    return clone;
  }, [scene]);
  const { mixer, clips } = useAnimations(animations, root);

  useEffect(() => {
    mixer.timeScale = playbackSpeed;
  }, [mixer, playbackSpeed]);
  const floorCount = useMemo(
    () =>
      resolveConstructFloorCount({
        names: collectObjectNames(root),
        meshHeightM: measureAuthoredBounds(root).height,
        catalogFloorCount,
      }),
    [catalogFloorCount, root],
  );
  const clipsToPlay = useMemo(
    () => resolveConstructClips(clips, clip),
    [clip, clips],
  );
  const deferredGrowIns = useMemo(
    () => getDeferredGrowInsFromClips(clipsToPlay, root),
    [clipsToPlay, root],
  );
  deferredRef.current = deferredGrowIns;

  useLayoutEffect(() => {
    onAuthoredBoundsReady?.(measureAuthoredBounds(root));
  }, [onAuthoredBoundsReady, root]);

  useEffect(() => {
    const actions = actionsRef.current;
    if (actions.length === 0) {
      return;
    }
    const actionTimeScale = constructActionTimeScale(
      leaderDurationRef.current,
      floorCount,
    );
    for (const action of actions) {
      action.timeScale = actionTimeScale;
    }
  }, [floorCount]);

  useLayoutEffect(() => {
    const wrap = wrapRef.current;
    const hideBeforeGrow = !isEffectiveScrub;
    const endedReplay = wasReplayingRef.current && !isConstructReplaying;
    wasReplayingRef.current = isConstructReplaying;
    if (!isConstructReplaying) {
      didNotifyEmptyReplayRef.current = false;
    }
    if (clipsToPlay.length === 0) {
      if (wrap) {
        wrap.visible = true;
      }
      writeConstructClock(constructClockRef?.current, 1, false);
      setConstructDone(true);
      applyHollowCompleteVisibility(root, true);
      if (isConstructReplaying && !didNotifyEmptyReplayRef.current) {
        didNotifyEmptyReplayRef.current = true;
        onConstructReplayFinishedRef.current?.();
      }
      return;
    }

    mixer.timeScale = playbackSpeed;
    const leaderDuration = Math.max(
      constructLeaderDuration(clipsToPlay),
      1e-6,
    );
    leaderDurationRef.current = leaderDuration;
    const actionTimeScale = constructActionTimeScale(leaderDuration, floorCount);
    const actions = clipsToPlay.map((activeClip) => {
      const action = mixer.clipAction(activeClip);
      action.reset();
      action.setLoop(LoopOnce, 1);
      action.clampWhenFinished = true;
      action.timeScale = actionTimeScale;
      action.time = 0;
      if (isEffectiveScrub) {
        action.paused = true;
      } else if (endedReplay) {
        action.time = Math.min(leaderDuration, action.getClip().duration);
        action.paused = true;
      } else {
        action.paused = false;
        action.play();
      }
      return action;
    });

    if (isEffectiveScrub) {
      const targetTime =
        (constructionProgressRef.current ?? 0) * leaderDuration;
      clampActionsToLeaderTime(actions, targetTime);
      mixer.update(0);
      collapseUntilGrow(deferredGrowIns, targetTime, hideBeforeGrow);
      syncConstructClock(
        constructClockRef?.current,
        actions,
        false,
        constructionProgressRef.current,
      );
      const isDone = isConstructionComplete(
        constructionProgressRef.current ?? 0,
      );
      setConstructDone(isDone);
      applyHollowCompleteVisibility(root, isDone);
    } else if (endedReplay) {
      mixer.update(0);
      collapseUntilGrow(deferredGrowIns, leaderDuration, hideBeforeGrow);
      syncConstructClock(constructClockRef?.current, actions, false, 1);
      setConstructDone(true);
      applyHollowCompleteVisibility(root, true);
    } else {
      setConstructDone(false);
      applyHollowCompleteVisibility(root, false);
      mixer.update(0);
      collapseUntilGrow(deferredGrowIns, 0, hideBeforeGrow);
      syncConstructClock(constructClockRef?.current, actions, true, 0);
    }

    actionsRef.current = actions;
    if (wrap) {
      wrap.visible = true;
    }

    if (isEffectiveScrub) {
      return () => {
        actionsRef.current = [];
        for (const action of actions) {
          action.stop();
        }
      };
    }

    const leader = pickLeaderAction(actions);

    const onFinished = (event: { action: AnimationAction }) => {
      if (!leader || event.action !== leader) {
        return;
      }
      clampActionsToLeaderTime(actions, leader.getClip().duration);
      for (const action of actions) {
        action.paused = true;
      }
      mixer.update(0);
      setConstructDone(true);
      if (isConstructReplaying) {
        onConstructReplayFinishedRef.current?.();
      }
    };
    mixer.addEventListener("finished", onFinished);
    return () => {
      actionsRef.current = [];
      mixer.removeEventListener("finished", onFinished);
      for (const action of actions) {
        action.stop();
      }
    };
  }, [
    mixer,
    clipsToPlay,
    deferredGrowIns,
    isEffectiveScrub,
    isConstructReplaying,
    constructClockRef,
    root,
  ]);

  useEffect(() => {
    const isHollow = isHollowCompleteState({
      constructDone,
      isConstructReplaying,
    });
    applyHollowCompleteVisibility(root, isHollow);
    onHollowCompleteChange?.(isHollow);
  }, [constructDone, isConstructReplaying, onHollowCompleteChange, root]);

  useEffect(() => {
    if (!isEffectiveScrub || constructionProgress === undefined) {
      return;
    }
    const actions = actionsRef.current;
    if (actions.length === 0) {
      return;
    }
    const leader = pickLeaderAction(actions);
    const leaderDuration = Math.max(leader?.getClip().duration ?? 0, 1e-6);
    const targetTime = constructionProgress * leaderDuration;
    clampActionsToLeaderTime(actions, targetTime);
    mixer.update(0);
    collapseUntilGrow(deferredRef.current, targetTime, false);
    syncConstructClock(
      constructClockRef?.current,
      actions,
      false,
      constructionProgress,
    );
    const isDone = isConstructionComplete(constructionProgress);
    setConstructDone(isDone);
    applyHollowCompleteVisibility(root, isDone);
  }, [constructionProgress, isEffectiveScrub, mixer, constructClockRef, root]);

  useEffect(() => {
    if (!isDynamicScene || !constructDone) {
      return;
    }
    const lifeClips = clips.filter(
      (lifeClip) => LIFE_CLIP_NAME.test(lifeClip.name) && lifeClip.name !== clip,
    );
    if (lifeClips.length === 0) {
      return;
    }
    const lifeActions = lifeClips.map((lifeClip) => {
      const action = mixer.clipAction(lifeClip);
      action.reset();
      action.setLoop(LoopRepeat, Infinity);
      action.paused = false;
      action.play();
      return action;
    });
    return () => {
      for (const action of lifeActions) {
        action.stop();
      }
    };
  }, [clip, clips, constructDone, isDynamicScene, mixer]);

  useFrame(() => {
    const actions = actionsRef.current;
    if (actions.length === 0) {
      return;
    }
    const leader = pickLeaderAction(actions);
    const leaderDuration = Math.max(leader?.getClip().duration ?? 0, 1e-6);
    const leaderTime = leader?.time ?? 0;
    if (leaderTime >= leaderDuration - 1e-4) {
      clampActionsToLeaderTime(actions, leaderDuration);
    }
    collapseUntilGrow(deferredRef.current, leaderTime, !isEffectiveScrub);
    syncConstructClock(
      constructClockRef?.current,
      actions,
      !isEffectiveScrub && !constructDone,
      isEffectiveScrub ? constructionProgressRef.current : undefined,
    );
    applyHollowCompleteVisibility(
      root,
      isHollowCompleteState({ constructDone, isConstructReplaying }),
    );
  });

  return (
    <group ref={wrapRef} visible={false}>
      <primitive object={root} />
      <LivingObjectEffects
        enabled={isDynamicScene && constructDone}
        root={root}
      />
      <OccupancyGlow enabled={isDynamicScene && constructDone} root={root} />
      {agentTraffic ? (
        <AgentStationTraffic
          enabled={agentTraffic.isLive}
          accent={agentTraffic.accent}
          agentStatus={agentTraffic.agentStatus}
          stage={agentTraffic.stage}
          root={root}
        />
      ) : null}
    </group>
  );
}

function AssetPreview({
  item,
  staticPreview = false,
  playbackSpeed,
  constructionState,
  isConstructReplaying = false,
  isDynamicScene = false,
  constructClockRef,
  onHollowCompleteChange,
  onConstructReplayFinished,
  onAuthoredBoundsReady,
}: {
  item: CatalogItem;
  staticPreview?: boolean;
  playbackSpeed: number;
  constructionState?: ConstructionState;
  isConstructReplaying?: boolean;
  isDynamicScene?: boolean;
  constructClockRef?: RefObject<ConstructClock>;
  onHollowCompleteChange?: (isHollowComplete: boolean) => void;
  onConstructReplayFinished?: () => void;
  onAuthoredBoundsReady?: (bounds: AuthoredBounds) => void;
}) {
  const isLibraryReplay = staticPreview && isConstructReplaying;

  if (item.kind === "glb" && item.url) {
    if (item.clip) {
      const resolvedState = constructionState ?? EMPTY_CONSTRUCTION_STATE;
      const buildingDefinition = getBuildingDefinition(item.id);
      const agentTraffic =
        buildingDefinition?.tier === "staged"
          ? {
              accent: buildingDefinition.accent,
              agentStatus: resolvedState.agentStatus,
              stage: resolvedState.stage,
              isLive: resolvedState.isLive,
            }
          : undefined;
      const libraryPlayback = staticPreview
        ? libraryConstructPlayback(isLibraryReplay)
        : null;
      return (
        <AnimatedGlb
          url={item.url}
          clip={item.clip}
          playbackSpeed={playbackSpeed}
          catalogFloorCount={item.floorCount}
          driveMode={
            libraryPlayback
              ? libraryPlayback.driveMode
              : constructDriveModeForCatalog(item.id, constructionState)
          }
          constructionProgress={
            libraryPlayback ? libraryPlayback.progress : resolvedState.progress
          }
          isConstructReplaying={isConstructReplaying}
          isDynamicScene={isDynamicScene}
          constructClockRef={constructClockRef}
          onHollowCompleteChange={onHollowCompleteChange}
          onConstructReplayFinished={onConstructReplayFinished}
          onAuthoredBoundsReady={onAuthoredBoundsReady}
          agentTraffic={agentTraffic}
        />
      );
    }
    return (
      <GlbModel
        url={item.url}
        isDynamicScene={isDynamicScene}
        onAuthoredBoundsReady={onAuthoredBoundsReady}
      />
    );
  }
  return <RelayBeacon accent={item.accent} />;
}

function PlacedAsset({
  object,
  selected,
  onSelect,
  staticPreview = false,
  selectable = true,
  playbackSpeed,
  constructionState,
  isConstructReplaying = false,
  isDynamicScene = false,
  onConstructReplayFinished,
}: {
  object: PlacedObject;
  selected: boolean;
  onSelect: (id: string | null) => void;
  staticPreview?: boolean;
  selectable?: boolean;
  playbackSpeed: number;
  constructionState?: ConstructionState;
  isConstructReplaying?: boolean;
  isDynamicScene?: boolean;
  onConstructReplayFinished?: () => void;
}) {
  const constructClockRef = useRef<ConstructClock>({
    progress01: 0,
    isPlaying: true,
  });
  const [isHollowComplete, setIsHollowComplete] = useState(false);
  const [authoredBounds, setAuthoredBounds] = useState<AuthoredBounds | null>(
    null,
  );
  const item = getCatalogItem(object.catalogId);
  if (!item) return null;
  const isPackConstructReplay =
    isConstructReplaying && getBuildingDefinition(object.catalogId) === undefined;
  const isConstructActive = !isHollowComplete;

  return (
    <group
      position={object.position}
      rotation={[0, catalogNorthYaw(item), 0]}
      onClick={
        selectable
          ? (event) => {
              if (event.button !== 0) return;
              event.stopPropagation();
              onSelect(object.id);
            }
          : undefined
      }
      onContextMenu={
        selectable
          ? (event) => {
              event.stopPropagation();
              event.nativeEvent.preventDefault();
              onSelect(null);
            }
          : undefined
      }
    >
      <Suspense fallback={null}>
        <AssetPreview
          item={item}
          staticPreview={staticPreview}
          playbackSpeed={playbackSpeed}
          constructionState={constructionState}
          isConstructReplaying={isPackConstructReplay}
          isDynamicScene={isDynamicScene}
          constructClockRef={constructClockRef}
          onHollowCompleteChange={setIsHollowComplete}
          onConstructReplayFinished={onConstructReplayFinished}
          onAuthoredBoundsReady={setAuthoredBounds}
        />
        {shouldMountSiteKit(item.id, isConstructActive) &&
        item.kind === "glb" &&
        item.url ? (
          <SkyscraperSiteKit
            catalogId={object.catalogId}
            authoredBounds={authoredBounds}
            footprint={item.footprint}
            constructClockRef={constructClockRef}
          />
        ) : null}
        {shouldMountRoofPool(item.id) && item.kind === "glb" && item.url ? (
          <RoofPool url={item.url} isFilled={!isConstructActive} />
        ) : null}
      </Suspense>
      {selectable && selected ? (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
          <ringGeometry args={[1.15, 1.35, 32]} />
          <meshBasicMaterial color={item.accent} />
        </mesh>
      ) : null}
    </group>
  );
}

export function StageCanvas({
  objects,
  selectedId,
  placeCatalogId,
  cameraSettings,
  animationSettings = DEFAULT_ANIMATION_SETTINGS,
  onPlace,
  onSelect,
  onPlacementHoverChange,
  readOnly = false,
  staticPreview = false,
  cameraTarget = CAMERA_TARGET,
  groundExtent = SHARED_STAGE_EXTENT,
  constructionByCatalogId = {},
  isConstructReplaying = false,
  isDynamicScene = false,
  sceneVariant = DEFAULT_SCENE_VARIANT,
  onCameraPoseChange,
  onConstructReplayFinished,
  priorityPreloadCatalogIds = [],
}: StageCanvasProps) {
  useCatalogGlbPreload(!readOnly ? placeCatalogId : null);
  const placedCatalogIds = useMemo(
    () => objects.map((object) => object.catalogId),
    [objects],
  );
  const mountableCatalogIds = useProgressiveCatalogPreload({
    priorityCatalogIds: priorityPreloadCatalogIds,
    catalogIds: placedCatalogIds,
  });
  const placingItem =
    !readOnly && placeCatalogId ? getCatalogItem(placeCatalogId) : null;
  const placing = placingItem !== null;
  const rotateSpeed = placing
    ? cameraSettings.rotateSpeed * PLACING_ROTATE_SPEED_RATIO
    : cameraSettings.rotateSpeed;
  const fogDistances = useMemo(
    () => getSceneFogDistances(cameraSettings),
    [cameraSettings],
  );
  const startCameraPosition = useMemo(
    () =>
      northFacingCameraPosition(cameraTarget, cameraSettings.viewDistance),
    [cameraSettings.viewDistance, cameraTarget],
  );
  return (
    <Canvas
      className={`absolute inset-0 ${placing ? "cursor-crosshair" : ""}`}
      shadows="percentage"
      camera={{
        position: startCameraPosition,
        fov: 40,
        near: 0.1,
        far: STAGE_CAMERA_FAR,
      }}
      gl={{
        antialias: true,
        alpha: false,
        toneMappingExposure: 0.72,
      }}
      onCreated={({ gl }) => {
        gl.outputColorSpace = SRGBColorSpace;
        gl.toneMapping = ACESFilmicToneMapping;
        gl.setClearColor(YARD_SCENE_COLOR, 1);
      }}
      onPointerMissed={() => onSelect(null)}
      onContextMenu={(event) => {
        event.preventDefault();
        if (readOnly || !selectedId) {
          return;
        }
        onSelect(null);
      }}
    >
      <color attach="background" args={[YARD_SCENE_COLOR]} />
      <fog
        attach="fog"
        args={[YARD_SCENE_COLOR, fogDistances.near, fogDistances.far]}
      />
      <Suspense fallback={null}>
        <SiteKitSourceProvider>
          <SceneEnvironment
            groundExtent={groundExtent}
            isDynamicScene={isDynamicScene}
            sceneVariant={sceneVariant}
            fogNear={fogDistances.near}
            fogFar={fogDistances.far}
          />
          <Ground
            placing={placing}
            placeCatalogId={placeCatalogId}
            objects={objects}
            accent={placingItem?.accent ?? "#c4a35a"}
            footprint={placingItem?.footprint ?? DEFAULT_PLACEMENT_FOOTPRINT}
            onPlace={onPlace}
            onPlacementHoverChange={onPlacementHoverChange}
            extent={groundExtent}
            isDynamicScene={isDynamicScene}
            sceneVariant={sceneVariant}
          />
          {objects.map((object) =>
            mountableCatalogIds.has(object.catalogId) ? (
              <PlacedAsset
                key={object.id}
                object={object}
                selected={object.id === selectedId}
                onSelect={onSelect}
                staticPreview={staticPreview}
                selectable={!readOnly}
                playbackSpeed={animationSettings.playbackSpeed}
                constructionState={constructionByCatalogId[object.catalogId]}
                isConstructReplaying={isConstructReplaying}
                isDynamicScene={isDynamicScene}
                onConstructReplayFinished={onConstructReplayFinished}
              />
            ) : (
              <StagePlacementPlaceholder
                key={object.id}
                catalogId={object.catalogId}
                position={object.position}
              />
            ),
          )}
        </SiteKitSourceProvider>
      </Suspense>
      <OrbitControls
        makeDefault
        enablePan={!placing}
        enableRotate
        enableDamping
        dampingFactor={cameraSettings.dampingFactor}
        rotateSpeed={rotateSpeed}
        panSpeed={cameraSettings.panSpeed}
        zoomSpeed={cameraSettings.zoomSpeed}
        screenSpacePanning={false}
        minPolarAngle={MIN_ORBIT_POLAR}
        maxPolarAngle={MAX_ORBIT_POLAR}
        minDistance={cameraSettings.minDistance}
        maxDistance={cameraSettings.maxDistance}
        target={cameraTarget}
        mouseButtons={placing ? ORBIT_MOUSE_PLACE : ORBIT_MOUSE_NAVIGATE}
      />
      <OrbitViewDistance
        cameraTarget={cameraTarget}
        viewDistance={cameraSettings.viewDistance}
      />
      {onCameraPoseChange ? (
        <CameraPoseReporter
          cameraTarget={cameraTarget}
          onCameraPoseChange={onCameraPoseChange}
        />
      ) : null}
    </Canvas>
  );
}
