// How far the preview's camera stands from the part so the part fits the stage (D123), worked out from
// the eight corners of the part's bounding box as the camera sees them: across, up and toward the
// camera, measured from the point it looks at. The camera keeps its direction; only its distance is
// chosen here. web/test/framing.test.ts holds these to three.js's own projection.
import { Box3, Vector3 } from 'three';

/** Where the camera is and what it looks at, and the shape of what it sees. */
export interface View {
  position: Vector3;
  target: Vector3;
  up: Vector3;
  /** The vertical field of view. */
  fovDegrees: number;
  /** The stage's width over its height. */
  aspect: number;
}

/** The box's corners in the camera's axes, from the target: [across, up, toward the camera]. */
function cornersSeen(box: Box3, view: View): [number, number, number][] {
  const back = new Vector3().subVectors(view.position, view.target).normalize();
  const across = new Vector3().crossVectors(view.up, back).normalize();
  const up = new Vector3().crossVectors(back, across);
  const { min, max } = box;
  const seen: [number, number, number][] = [];
  for (const x of [min.x, max.x])
    for (const y of [min.y, max.y])
      for (const z of [min.z, max.z]) {
        const v = new Vector3(x, y, z).sub(view.target);
        seen.push([v.dot(across), v.dot(up), v.dot(back)]);
      }
  return seen;
}

const halfTan = (view: View) => Math.tan((view.fovDegrees * Math.PI) / 360);

/**
 * The distance from the target, along the camera's direction, at which every corner lies within
 * `share` of the stage's half-width and half-height, and one corner exactly on that line.
 */
export function distanceToFit(box: Box3, view: View, share: number): number {
  const tanV = halfTan(view);
  const tanH = tanV * view.aspect;
  let distance = 0;
  for (const [x, y, z] of cornersSeen(box, view)) {
    distance = Math.max(distance, z + Math.abs(x) / (share * tanH), z + Math.abs(y) / (share * tanV));
  }
  return distance;
}

/** The part's larger extent on a stage of the given pixels, over the stage's shorter side, from `distance`. */
export function spanAt(box: Box3, view: View, distance: number, widthPx: number, heightPx: number): number {
  const tanV = halfTan(view);
  const tanH = tanV * view.aspect;
  const xs: number[] = [];
  const ys: number[] = [];
  for (const [x, y, z] of cornersSeen(box, view)) {
    xs.push(((x / ((distance - z) * tanH)) * widthPx) / 2);
    ys.push(((y / ((distance - z) * tanV)) * heightPx) / 2);
  }
  const extent = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
  return extent / Math.min(widthPx, heightPx);
}

/** The farthest the camera may stand while the part still spans `minFill` of the stage's shorter side. */
export function zoomOutLimit(box: Box3, view: View, minFill: number, widthPx: number, heightPx: number): number {
  const nearest = Math.max(...cornersSeen(box, view).map(([, , z]) => z)) + 1e-6; // in front of every corner
  const spans = (d: number) => spanAt(box, view, d, widthPx, heightPx) >= minFill;
  let near = nearest;
  let far = Math.max(2 * nearest, 1);
  while (spans(far) && far < 1e9) [near, far] = [far, far * 2];
  // The span only shrinks with distance: halve the gap between a distance where it is big enough and one
  // where it is not, until the two agree to well under a millimetre.
  for (let i = 0; i < 60; i += 1) {
    const mid = (near + far) / 2;
    if (spans(mid)) near = mid;
    else far = mid;
  }
  return near;
}
