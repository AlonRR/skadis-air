// The preview's framing (D123), checked against three.js's own projection: the distance framing.ts
// works out must put the part exactly at the share asked for, as a real camera sees it. Each check is
// also made a little closer in, where it must fail, so a formula that merely errs on the far side
// cannot pass.
import { Box3, PerspectiveCamera, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { distanceToFit, spanAt, zoomOutLimit, type View } from '../src/framing.js';

const FOV = 35;
const DIRECTION = new Vector3(-0.15, -0.2, 1.2).normalize(); // the preview's first view (D57)

function cornersOf(box: Box3): Vector3[] {
  const { min, max } = box;
  return [0, 1, 2, 3, 4, 5, 6, 7].map(
    (i) => new Vector3(i & 1 ? max.x : min.x, i & 2 ? max.y : min.y, i & 4 ? max.z : min.z),
  );
}

/** A real camera at `distance` along DIRECTION from the box's centre, looking at it. */
function cameraAt(box: Box3, distance: number, aspect: number): PerspectiveCamera {
  const centre = box.getCenter(new Vector3());
  const camera = new PerspectiveCamera(FOV, aspect, 0.1, 1e7);
  camera.position.copy(centre).addScaledVector(DIRECTION, distance);
  camera.lookAt(centre);
  camera.updateMatrixWorld();
  return camera;
}

/** The farthest any corner lands from the centre of the view, in the view's half-widths and half-heights. */
const reach = (box: Box3, camera: PerspectiveCamera) =>
  Math.max(
    ...cornersOf(box)
      .map((c) => c.clone().project(camera))
      .map((p) => Math.max(Math.abs(p.x), Math.abs(p.y))),
  );

/** The part's larger extent in pixels over the view's shorter side, as the real camera draws it. */
function span(box: Box3, camera: PerspectiveCamera, width: number, height: number): number {
  const ps = cornersOf(box).map((c) => c.clone().project(camera));
  const xs = ps.map((p) => (p.x * width) / 2);
  const ys = ps.map((p) => (p.y * height) / 2);
  const extent = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
  return extent / Math.min(width, height);
}

const view = (box: Box3, aspect: number): View => {
  const target = box.getCenter(new Vector3());
  return { target, position: target.clone().add(DIRECTION), up: new Vector3(0, 1, 0), fovDegrees: FOV, aspect };
};

const boxes = {
  'a 160 x 160 x 5 mm board': new Box3(new Vector3(0, 0, 0), new Vector3(160, 160, 5)),
  'a 400 x 80 x 25 mm board with standoffs': new Box3(new Vector3(0, 0, -20), new Vector3(400, 80, 5)),
  'a 10 x 10 x 40 mm standoff': new Box3(new Vector3(0, 0, -40), new Vector3(10, 10, 0)),
};

describe('distanceToFit: the part spans exactly the share asked for (D123)', () => {
  for (const [name, box] of Object.entries(boxes)) {
    for (const aspect of [0.47, 1, 1.9]) {
      it(`${name}, a stage ${aspect} wide to its height`, () => {
        const d = distanceToFit(box, view(box, aspect), 0.85);
        expect(reach(box, cameraAt(box, d, aspect))).toBeCloseTo(0.85, 6);
        expect(reach(box, cameraAt(box, d * 0.97, aspect))).toBeGreaterThan(0.85); // closer in, it overflows
      });
    }
  }
});

describe('zoomOutLimit: zooming out stops where the part spans min-fill of the shorter side (D123)', () => {
  for (const [name, box] of Object.entries(boxes)) {
    for (const [width, height] of [
      [900, 600],
      [375, 268],
    ] as const) {
      it(`${name}, a ${width} x ${height} px stage`, () => {
        const v = view(box, width / height);
        const limit = zoomOutLimit(box, v, 0.25, width, height);
        expect(span(box, cameraAt(box, limit, width / height), width, height)).toBeCloseTo(0.25, 4);
        expect(spanAt(box, v, limit, width, height)).toBeCloseTo(0.25, 4);
        expect(span(box, cameraAt(box, limit * 0.9, width / height), width, height)).toBeGreaterThan(0.26);
      });
    }
  }
});
