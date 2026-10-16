// The preview's scene (backlog item preview-3d), with three.js, after parametric-window-sealer's
// web/src/preview-scene.ts (C32). It draws the same solid the user downloads, built by the same code,
// as it hangs (D55): its front, the face printed on top (C58), toward the viewer, x across and y up.
// The board is light grey (D56), with its sharp edges outlined; preview.ts paints both from the design
// system's tokens (D111).
import { BufferAttribute, BufferGeometry, EdgesGeometry, Group, LineBasicMaterial, LineSegments, Mesh } from 'three';
import { MeshPhongMaterial, type Object3D } from 'three';
import type { Placed } from './build-messages.js';

// Shared by every board drawn; never disposed.
// Flat shading: a board is flat faces, and normals averaged across a face and its edges streaked the
// faces with diagonal shading (seen on the fit coupon, 12 Oct 2026).
const BOARD = new MeshPhongMaterial({ color: 0xc9cdd1, shininess: 20, flatShading: true });
const OUTLINE = new LineBasicMaterial({ color: 0x4a525a });
// Edges are outlined where faces meet at 30 degrees or more: the board's outline and the slots'
// rims, not the facets of their round ends.
const OUTLINE_ANGLE_DEGREES = 30;

/** Paints the boards, those drawn and those to come, in two CSS colours: the board and its edges. */
export function paintBoards(board: string, outline: string): void {
  BOARD.color.setStyle(board);
  OUTLINE.color.setStyle(outline);
}

/** The board, or a wall's panels, as meshes and their outlines, from the triangles the build sent: each mesh
 * and its outline made once, and drawn at each of its places, so a wall costs its kinds of panel, not its size. */
export function boardScene(parts: readonly Placed[]): Group {
  const group = new Group();
  let triangles = 0;
  for (const { positions, triangles: indices, xs, ys } of parts) {
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new BufferAttribute(positions, 3));
    geometry.setIndex(new BufferAttribute(indices, 1));
    geometry.computeVertexNormals();
    const edges = new EdgesGeometry(geometry, OUTLINE_ANGLE_DEGREES);
    for (const [x, y] of xs.flatMap((px) => ys.map((py) => [px, py] as const))) {
      const mesh = new Mesh(geometry, BOARD);
      const outline = new LineSegments(edges, OUTLINE);
      mesh.position.set(x, y, 0);
      outline.position.set(x, y, 0);
      group.add(mesh, outline);
      triangles += indices.length / 3;
    }
  }
  group.userData['triangles'] = triangles;
  return group;
}

// Graphics memory is not freed by the garbage collector: each redraw frees the last board.
const hasGeometry = (o: Object3D): o is Mesh | LineSegments => o instanceof Mesh || o instanceof LineSegments;

export function disposeScene(group: Group): void {
  const shared = new Set(group.children.filter(hasGeometry).map((child) => child.geometry));
  for (const geometry of shared) geometry.dispose(); // each once, however many copies drew it
  group.clear();
}
