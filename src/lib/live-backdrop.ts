/** Live-mode rings. Mountains sit in front; city sits on the far horizon. */

export function mountainRingRadii(extent: number): {
  inner: number;
  outer: number;
} {
  const padHalf = extent / 2;
  return {
    inner: padHalf + 70,
    outer: padHalf + 190,
  };
}

export function cityRingRadii(extent: number): {
  inner: number;
  outer: number;
} {
  const mountains = mountainRingRadii(extent);
  return {
    inner: mountains.outer + 150,
    outer: mountains.outer + 390,
  };
}

export function liveWorldSize(extent: number): number {
  return mountainRingRadii(extent).outer * 2 + 80;
}
