/** Shared yard + library world. Placement coords stay put. */

export const SHARED_STAGE_EXTENT = 160;
export const WORLD_GROUND_MULTIPLIER = 3.4;
export const SKY_DOME_RADIUS = 820;
/** Visual sun only — never the DirectionalLight (shadows break if the key sits this far).
 *  Past the mountain ring (~270) so the disc sits in the sky, not on the ridge. */
export const SUN_DISC_DISTANCE = 520;
/** Key light distance. Must stay inside the shadow camera. */
export const SUN_LIGHT_DISTANCE = 78;
export const STAGE_CAMERA_FAR = 960;

export function worldGroundSize(stageExtent: number): number {
  return stageExtent * WORLD_GROUND_MULTIPLIER;
}

/** Stage north is world −Z. Compass degrees: 0 = looking north. */
export function stageCompassDegrees(offsetX: number, offsetZ: number): number {
  return (Math.atan2(offsetX, offsetZ) * 180) / Math.PI;
}

/** Local axis of a GLB’s front before yard yaw. glTF / Blender −Y export = +Z. */
export type AuthoredFrontAxis = "+x" | "-x" | "+z" | "-z";

export const DEFAULT_AUTHORED_FRONT: AuthoredFrontAxis = "+z";

/** Yaw (Y-up) that aims an authored front at world −Z. */
export function yawToFaceNorth(
  authoredFront: AuthoredFrontAxis = DEFAULT_AUTHORED_FRONT,
): number {
  switch (authoredFront) {
    case "-z":
      return 0;
    case "+z":
      return Math.PI;
    case "+x":
      return Math.PI / 2;
    case "-x":
      return -Math.PI / 2;
  }
}
