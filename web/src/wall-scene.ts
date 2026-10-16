// A wall in the preview, drawn in full only where the view needs it (backlog item wall-detail; D197, C203,
// C204): wall-detail.ts chooses, from where the camera is, which panels to draw in full and what stands in for
// the rest; this draws that. A panel drawn in full is its kind's mesh and outline, made once and drawn at each
// place chosen. The rest of the face is one mesh of flat rectangles at the panels' front faces, the slot
// pattern of one 40 mm tile painted on and repeated, its pictures shrunk step by step for the distance
// (mipmaps), so a far wall shows its slots as a fine grey rather than shimmering; the strips along closed outer
// edges take the plain plate from the same picture, so the whole stand-in is one draw.
import {
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  EdgesGeometry,
  Group,
  LinearMipmapLinearFilter,
  LineSegments,
  Matrix4,
  Mesh,
  RepeatWrapping,
  SRGBColorSpace,
  Vector3,
  Box3,
  Frustum,
  type PerspectiveCamera,
} from 'three';
import type { PanelLine, Placed } from './build-messages.js';
import { BOARD, OUTLINE, OUTLINE_ANGLE_DEGREES, STAND_IN } from './preview-scene.js';
import { chooseDetail, key, pixelsAtOneMm, type Rect, type WallGrid } from './wall-detail.js';

/** The tile the stand-ins repeat, mm, and how many pixels its picture has a side. */
const TILE_MM = 40;
const PICTURE_PX = 256;
/** Where on the picture the plate is plain, for the strips along closed edges: 20 mm along, 2 mm up. */
const PLAIN_UV: [number, number] = [0.5, 0.05];
/** How the detail is chosen (C203). */
const SHOW_SLOT_PX = 2.5;
const KEEP_SLOT_PX = 2;
export const TRIANGLE_BUDGET = 5_000_000;

let picture: CanvasTexture | null = null;

/**
 * One 40 mm tile's slot pattern, as the tiles are cut (D15): a whole slot in the middle and a quarter of one at
 * each corner, each 5.2 x 15.2 mm, cut out, so what is behind shows through as through a real slot, in a grey ring
 * for its 1 mm chamfer, on a white plate the material's colour tints. Made once.
 */
function slotPicture(anisotropy: number): CanvasTexture {
  if (picture) return picture;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = PICTURE_PX;
  const g = canvas.getContext('2d');
  if (g === null) throw new Error('no 2D canvas to paint the slots on');
  const px = PICTURE_PX / TILE_MM;
  g.fillStyle = '#ffffff';
  g.fillRect(0, 0, PICTURE_PX, PICTURE_PX);
  const slot = (x: number, y: number, w: number, h: number, colour: string) => {
    const r = (w / 2) * px;
    const straight = ((h - w) / 2) * px;
    g.fillStyle = colour;
    g.beginPath();
    g.arc(x * px, y * px - straight, r, Math.PI, 0);
    g.arc(x * px, y * px + straight, r, 0, Math.PI);
    g.closePath();
    g.fill();
  };
  for (const [x, y] of [
    [20, 20],
    [0, 0],
    [40, 0],
    [0, 40],
    [40, 40],
  ] as const) {
    slot(x, y, 7.2, 17.2, '#8f959b'); // the chamfer, 1 mm all round
    g.globalCompositeOperation = 'destination-out'; // the slot itself, through
    slot(x, y, 5.2, 15.2, '#000000');
    g.globalCompositeOperation = 'source-over';
  }
  picture = new CanvasTexture(canvas);
  picture.wrapS = picture.wrapT = RepeatWrapping;
  picture.minFilter = LinearMipmapLinearFilter;
  picture.anisotropy = anisotropy;
  picture.colorSpace = SRGBColorSpace;
  STAND_IN.map = picture;
  STAND_IN.needsUpdate = true;
  return picture;
}

/** The rectangles as one mesh at the front faces: the stand-ins with the pattern, the strips with plain plate. */
function standInGeometry(standIns: readonly Rect[], plain: readonly Rect[], front: number): BufferGeometry {
  const rects = [...standIns, ...plain];
  const positions = new Float32Array(rects.length * 12);
  const uvs = new Float32Array(rects.length * 8);
  const normals = new Float32Array(rects.length * 12);
  const index = new Uint32Array(rects.length * 6);
  rects.forEach(([x0, y0, x1, y1], k) => {
    positions.set([x0, y0, front, x1, y0, front, x1, y1, front, x0, y1, front], k * 12);
    const uv =
      k < standIns.length
        ? [x0, y0, x1, y0, x1, y1, x0, y1].map((v) => v / TILE_MM)
        : [...PLAIN_UV, ...PLAIN_UV, ...PLAIN_UV, ...PLAIN_UV];
    uvs.set(uv, k * 8);
    normals.set([0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1], k * 12);
    const v = k * 4;
    index.set([v, v + 1, v + 2, v, v + 2, v + 3], k * 6);
  });
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new BufferAttribute(uvs, 2));
  geometry.setAttribute('normal', new BufferAttribute(normals, 3));
  geometry.setIndex(new BufferAttribute(index, 1));
  return geometry;
}

/** The wall's grid from its kinds of panel: where their columns and rows are, and which kind each pair is. */
function gridOf(parts: readonly Placed[], lines: readonly PanelLine[], front: number): WallGrid {
  const widths = new Map<number, number>();
  const heights = new Map<number, number>();
  const kindsAtX = new Map<number, number[]>();
  const kindsAtY = new Map<number, number[]>();
  parts.forEach((part, k) => {
    for (const x of part.xs) {
      widths.set(x, lines[k]?.widthMm ?? 0);
      kindsAtX.set(x, [...(kindsAtX.get(x) ?? []), k]);
    }
    for (const y of part.ys) {
      heights.set(y, lines[k]?.heightMm ?? 0);
      kindsAtY.set(y, [...(kindsAtY.get(y) ?? []), k]);
    }
  });
  const xs = [...widths.keys()].sort((a, b) => a - b);
  const ys = [...heights.keys()].sort((a, b) => a - b);
  const closed = (side: string) => lines.some((line) => line.closed.includes(side));
  return {
    xs,
    widths: xs.map((x) => widths.get(x) ?? 0),
    ys,
    heights: ys.map((y) => heights.get(y) ?? 0),
    kindAt: (column, row) => {
      const across = kindsAtX.get(xs[column] ?? 0) ?? [];
      const up = new Set(kindsAtY.get(ys[row] ?? 0) ?? []);
      return across.find((k) => up.has(k)) ?? 0;
    },
    frontMm: front,
    closed: { left: closed('left'), right: closed('right'), bottom: closed('bottom'), top: closed('top') },
  };
}

export interface WallView {
  group: Group;
  box: Box3; // the whole wall, for the framing
  /** Draws what the view needs, seen by this camera on a stage this many pixels tall. */
  update(camera: PerspectiveCamera, heightPx: number): void;
  triangles(): number;
  detailed(): number;
  panels(): number;
  dispose(): void;
}

export function wallView(parts: readonly Placed[], lines: readonly PanelLine[], anisotropy: number): WallView {
  const kinds = parts.map(({ positions, triangles }) => {
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new BufferAttribute(positions, 3));
    geometry.setIndex(new BufferAttribute(triangles, 1));
    geometry.computeVertexNormals();
    geometry.computeBoundingBox();
    return { geometry, edges: new EdgesGeometry(geometry, OUTLINE_ANGLE_DEGREES), triangles: triangles.length / 3 };
  });
  const [low, high] = kinds.reduce(
    ([lo, hi], { geometry }) => [
      Math.min(lo, geometry.boundingBox?.min.z ?? 0),
      Math.max(hi, geometry.boundingBox?.max.z ?? 0),
    ],
    [Infinity, -Infinity],
  );
  const grid = gridOf(parts, lines, high);
  const [width, height] = [
    (grid.xs.at(-1) ?? 0) + (grid.widths.at(-1) ?? 0),
    (grid.ys.at(-1) ?? 0) + (grid.heights.at(-1) ?? 0),
  ];
  const group = new Group();
  const shown = new Map<string, Group>();
  slotPicture(anisotropy);
  const standIns = new Mesh(new BufferGeometry(), STAND_IN);
  group.add(standIns);
  let drawn = 0;
  const frustum = new Frustum();
  const viewMatrix = new Matrix4();
  const corner = [new Vector3(), new Vector3()] as const;
  const panelBox = new Box3();

  return {
    group,
    box: new Box3(new Vector3(0, 0, low), new Vector3(width, height, high)),
    update(camera, heightPx) {
      camera.updateMatrixWorld();
      frustum.setFromProjectionMatrix(viewMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
      const detail = chooseDetail(
        grid,
        {
          x: camera.position.x,
          y: camera.position.y,
          z: camera.position.z,
          pixelsAtOneMm: pixelsAtOneMm(heightPx, camera.fov),
        },
        {
          showSlotPx: SHOW_SLOT_PX,
          keepSlotPx: KEEP_SLOT_PX,
          budget: TRIANGLE_BUDGET,
          trianglesOf: (k) => kinds[k]?.triangles ?? 0,
          inView: ([x0, y0, x1, y1]) =>
            frustum.intersectsBox(panelBox.set(corner[0].set(x0, y0, low), corner[1].set(x1, y1, high))),
          shown: new Set(shown.keys()),
        },
      );
      // the panels drawn in full: those still wanted kept, the rest let go, the new ones made from their kind
      const wanted = new Set(detail.full.map(([c, r]) => key(c, r)));
      for (const [k, panel] of shown) {
        if (!wanted.has(k)) {
          group.remove(panel);
          shown.delete(k);
        }
      }
      drawn = 0;
      for (const [column, row] of detail.full) {
        const kind = kinds[grid.kindAt(column, row)];
        if (!kind) continue;
        drawn += kind.triangles;
        const k = key(column, row);
        if (shown.has(k)) continue;
        const panel = new Group();
        panel.add(new Mesh(kind.geometry, BOARD), new LineSegments(kind.edges, OUTLINE));
        panel.position.set(grid.xs[column] ?? 0, grid.ys[row] ?? 0, 0);
        group.add(panel);
        shown.set(k, panel);
      }
      standIns.geometry.dispose();
      standIns.geometry = standInGeometry(detail.standIns, detail.plain, high);
      drawn += 2 * (detail.standIns.length + detail.plain.length);
    },
    triangles: () => drawn,
    detailed: () => shown.size,
    panels: () => parts.reduce((n, p) => n + p.xs.length * p.ys.length, 0),
    dispose() {
      for (const { geometry, edges } of kinds) {
        geometry.dispose();
        edges.dispose();
      }
      standIns.geometry.dispose();
      group.clear();
      shown.clear();
    },
  };
}
