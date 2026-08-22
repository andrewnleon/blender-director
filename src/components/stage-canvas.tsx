"use client";

import { Center, Clone, Grid, OrbitControls, useAnimations, useGLTF } from "@react-three/drei";
import { Canvas, type ThreeEvent, useFrame, useThree } from "@react-three/fiber";
import {
  Suspense,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ACESFilmicToneMapping,
  LoopOnce,
  MOUSE,
  Mesh,
  PropertyBinding,
  SRGBColorSpace,
  Vector3,
  type AnimationAction,
  type AnimationClip,
  type Group,
  type Object3D,
} from "three";
import {
  getSceneFogDistances,
  PLACING_ROTATE_SPEED_RATIO,
  type CameraSettings,
} from "@/lib/camera-settings";
import {
  getCatalogItem,
  type CatalogFootprint,
  type CatalogItem,
  type PlacedObject,
} from "@/lib/catalog";
import { canPlaceAt } from "@/lib/placement-collision";

type StageCanvasProps = {
  objects: PlacedObject[];
  selectedId: string | null;
  placeCatalogId: string | null;
  cameraSettings: CameraSettings;
  onPlace: (position: [number, number, number]) => void;
  onSelect: (id: string | null) => void;
  /** True = valid snap cell, false = overlap, null = not hovering. */
  onPlacementHoverChange?: (canPlace: boolean | null) => void;
  /** Read-only library preview — no click-to-place. */
  readOnly?: boolean;
  /** Skip construct clips; show resting GLB pose. */
  staticPreview?: boolean;
  cameraTarget?: [number, number, number];
  groundExtent?: number;
};

const GRID_STEP = 1;
const BIND_COLLAPSE = 0.0001;
const GROW_IN_THRESHOLD = 0.15;
const CAMERA_TARGET: [number, number, number] = [0, 0.75, 0];

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

function OrbitViewDistance({ viewDistance }: { viewDistance: number }) {
  const controls = useThree((state) => state.controls);
  const lastApplied = useRef(viewDistance);

  useEffect(() => {
    if (!isOrbitControlsLike(controls)) {
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
  }, [controls, viewDistance]);

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

function snapPlacement(x: number, z: number): [number, number, number] {
  return [snap(x), 0, snap(z)];
}

const DEFAULT_PLACEMENT_FOOTPRINT: CatalogFootprint = {
  width: GRID_STEP,
  depth: GRID_STEP,
};

/** Grid cell centers that overlap a footprint anchored at the snapped placement point. */
function getFootprintCellCenters(
  anchor: [number, number, number],
  footprint: CatalogFootprint,
  step = GRID_STEP,
): [number, number, number][] {
  const [anchorX, anchorY, anchorZ] = anchor;
  const halfWidth = footprint.width / 2;
  const halfDepth = footprint.depth / 2;
  const minX = anchorX - halfWidth;
  const maxX = anchorX + halfWidth;
  const minZ = anchorZ - halfDepth;
  const maxZ = anchorZ + halfDepth;
  const firstCenterX = snap(minX, step);
  const lastCenterX = snap(maxX - step * 1e-4, step);
  const firstCenterZ = snap(minZ, step);
  const lastCenterZ = snap(maxZ - step * 1e-4, step);
  const cells: [number, number, number][] = [];

  for (let x = firstCenterX; x <= lastCenterX + step * 1e-4; x += step) {
    for (let z = firstCenterZ; z <= lastCenterZ + step * 1e-4; z += step) {
      cells.push([x, anchorY, z]);
    }
  }

  return cells;
}

function SceneEnvironment() {
  return (
    <>
      <hemisphereLight args={["#d8e4f0", "#3a3530", 0.62]} />
      <ambientLight intensity={0.22} />
      <directionalLight
        castShadow
        position={[22, 34, 14]}
        intensity={1.55}
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.00012}
        shadow-normalBias={0.02}
        shadow-camera-far={96}
        shadow-camera-left={-36}
        shadow-camera-right={36}
        shadow-camera-top={36}
        shadow-camera-bottom={-36}
      />
      <directionalLight position={[-14, 18, -10]} intensity={0.42} />
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
}: {
  placing: boolean;
  placeCatalogId: string | null;
  objects: readonly PlacedObject[];
  accent: string;
  footprint: CatalogFootprint;
  onPlace: (position: [number, number, number]) => void;
  onPlacementHoverChange?: (canPlace: boolean | null) => void;
  extent: number;
}) {
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
    setHoverCell(snapPlacement(x, z));
  }

  function handlePointerOut() {
    setHoverCell(null);
  }

  function handleClick(event: ThreeEvent<MouseEvent>) {
    if (!placing || !placeCatalogId) return;
    event.stopPropagation();
    const { x, z } = event.point;
    const position = snapPlacement(x, z);
    if (!canPlaceAt(placeCatalogId, position, objects)) return;
    onPlace(position);
  }

  return (
    <group>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.02, 0]}
        receiveShadow
        onPointerMove={handlePointerMove}
        onPointerOut={handlePointerOut}
        onClick={handleClick}
      >
        <planeGeometry args={[extent, extent]} />
        <meshStandardMaterial color="#3f433c" roughness={0.95} metalness={0.05} />
      </mesh>
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
      <Grid
        position={[0, 0.02, 0]}
        args={[extent, extent]}
        cellSize={GRID_STEP}
        cellThickness={0.6}
        cellColor="#5c6558"
        sectionSize={5}
        sectionThickness={1.15}
        sectionColor="#8a9a6a"
        fadeStrength={0}
      />
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

function GlbModel({ url }: { url: string }) {
  const { scene } = useGLTF(url);
  return (
    <Center top>
      <Clone object={scene} castShadow receiveShadow />
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
    let growStart = times[lastIndex];
    for (let index = 0; index < times.length; index += 1) {
      const [x, y, z] = sampleScaleAt(values, index);
      if (Math.min(x, y, z) >= GROW_IN_THRESHOLD) {
        growStart = times[index];
        break;
      }
    }

    seen.add(node);
    deferred.push({ object: node, growStart });
  }

  return deferred;
}

function collapseUntilGrow(deferred: readonly DeferredGrow[], time: number) {
  for (const { object, growStart } of deferred) {
    if (time < growStart - 1e-4) {
      object.visible = false;
      object.scale.setScalar(BIND_COLLAPSE);
    } else {
      object.visible = true;
    }
  }
}

function AviationBeacon({ position }: { position: [number, number, number] }) {
  const [lit, setLit] = useState(true);

  useEffect(() => {
    let litNow = true;
    let timer = 0;
    const tick = () => {
      litNow = !litNow;
      setLit(litNow);
      timer = window.setTimeout(tick, litNow ? 160 : 980);
    };
    timer = window.setTimeout(tick, 160);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <group position={position}>
      <mesh>
        <sphereGeometry args={[0.12, 12, 12]} />
        <meshStandardMaterial
          color="#ff1a12"
          emissive="#ff1a12"
          emissiveIntensity={lit ? 8 : 0.15}
          roughness={0.2}
        />
      </mesh>
      <pointLight color="#ff1a12" intensity={lit ? 6 : 0.2} distance={10} />
    </group>
  );
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

function AnimatedGlb({ url, clip }: { url: string; clip: string }) {
  const { scene, animations } = useGLTF(url);
  const [constructDone, setConstructDone] = useState(false);
  const wrapRef = useRef<Group>(null);
  const actionsRef = useRef<AnimationAction[]>([]);
  const deferredRef = useRef<DeferredGrow[]>([]);
  const root = useMemo(() => {
    const clone = scene.clone(true);
    clone.traverse((child) => {
      if (child instanceof Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    return clone;
  }, [scene]);
  const { mixer, clips } = useAnimations(animations, root);
  const clipsToPlay = useMemo(
    () => resolveConstructClips(clips, clip),
    [clip, clips],
  );
  const deferredGrowIns = useMemo(
    () => getDeferredGrowInsFromClips(clipsToPlay, root),
    [clipsToPlay, root],
  );
  deferredRef.current = deferredGrowIns;
  const beaconPosition = useMemo(() => {
    const beacon =
      root.getObjectByName("ST_Beacon") ?? root.getObjectByName("CC_Beacon");
    if (!beacon) return [6.4, 8.89, 2.95] as [number, number, number];
    const world = new Vector3();
    beacon.getWorldPosition(world);
    return [world.x, world.y, world.z] as [number, number, number];
  }, [root]);

  useLayoutEffect(() => {
    const wrap = wrapRef.current;
    if (clipsToPlay.length === 0) {
      return;
    }

    const actions = clipsToPlay.map((activeClip) => {
      const action = mixer.clipAction(activeClip);
      action.reset();
      action.setLoop(LoopOnce, 1);
      action.clampWhenFinished = true;
      action.time = 0;
      action.play();
      return action;
    });

    mixer.update(0);
    collapseUntilGrow(deferredGrowIns, 0);
    actionsRef.current = actions;
    if (wrap) {
      wrap.visible = true;
    }

    const leader = actions.reduce((longest, action) =>
      action.getClip().duration > longest.getClip().duration ? action : longest,
    );

    const onFinished = (event: { action: AnimationAction }) => {
      if (event.action === leader) {
        setConstructDone(true);
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
  }, [mixer, clipsToPlay, deferredGrowIns]);

  useFrame(() => {
    const actions = actionsRef.current;
    if (actions.length === 0) {
      return;
    }
    const maxTime = Math.max(...actions.map((action) => action.time));
    collapseUntilGrow(deferredRef.current, maxTime);
  });

  return (
    <group ref={wrapRef} visible={false}>
      <primitive object={root} />
      {constructDone ? <AviationBeacon position={beaconPosition} /> : null}
    </group>
  );
}

function AssetPreview({
  item,
  staticPreview = false,
}: {
  item: CatalogItem;
  staticPreview?: boolean;
}) {
  if (item.kind === "glb" && item.url) {
    if (item.clip && !staticPreview) {
      return <AnimatedGlb url={item.url} clip={item.clip} />;
    }
    return <GlbModel url={item.url} />;
  }
  return <RelayBeacon accent={item.accent} />;
}

function PlacedAsset({
  object,
  selected,
  onSelect,
  staticPreview = false,
  selectable = true,
}: {
  object: PlacedObject;
  selected: boolean;
  onSelect: (id: string | null) => void;
  staticPreview?: boolean;
  selectable?: boolean;
}) {
  const item = getCatalogItem(object.catalogId);
  if (!item) return null;

  return (
    <group
      position={object.position}
      onClick={
        selectable
          ? (event) => {
              event.stopPropagation();
              onSelect(object.id);
            }
          : undefined
      }
    >
      <Suspense fallback={null}>
        <AssetPreview item={item} staticPreview={staticPreview} />
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

useGLTF.preload("/models/skyscraper.glb?v=19");

export function StageCanvas({
  objects,
  selectedId,
  placeCatalogId,
  cameraSettings,
  onPlace,
  onSelect,
  onPlacementHoverChange,
  readOnly = false,
  staticPreview = false,
  cameraTarget = CAMERA_TARGET,
  groundExtent = 80,
}: StageCanvasProps) {
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
  return (
    <Canvas
      className={`absolute inset-0 ${placing ? "cursor-crosshair" : ""}`}
      shadows
      camera={{ position: [24, 18, 24], fov: 40, near: 0.1, far: 200 }}
      gl={{
        antialias: true,
        toneMappingExposure: 1.05,
      }}
      onCreated={({ gl }) => {
        gl.outputColorSpace = SRGBColorSpace;
        gl.toneMapping = ACESFilmicToneMapping;
      }}
      onPointerMissed={() => onSelect(null)}
    >
      <color attach="background" args={["#1b1e1c"]} />
      <fog
        attach="fog"
        args={["#1b1e1c", fogDistances.near, fogDistances.far]}
      />
      <SceneEnvironment />
      <Ground
        placing={placing}
        placeCatalogId={placeCatalogId}
        objects={objects}
        accent={placingItem?.accent ?? "#c4a35a"}
        footprint={placingItem?.footprint ?? DEFAULT_PLACEMENT_FOOTPRINT}
        onPlace={onPlace}
        onPlacementHoverChange={onPlacementHoverChange}
        extent={groundExtent}
      />
      {objects.map((object) => (
        <PlacedAsset
          key={object.id}
          object={object}
          selected={object.id === selectedId}
          onSelect={onSelect}
          staticPreview={staticPreview}
          selectable={!readOnly}
        />
      ))}
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
        minPolarAngle={0.28}
        maxPolarAngle={Math.PI / 2.08}
        minDistance={cameraSettings.minDistance}
        maxDistance={cameraSettings.maxDistance}
        target={cameraTarget}
        mouseButtons={placing ? ORBIT_MOUSE_PLACE : ORBIT_MOUSE_NAVIGATE}
      />
      <OrbitViewDistance viewDistance={cameraSettings.viewDistance} />
    </Canvas>
  );
}
