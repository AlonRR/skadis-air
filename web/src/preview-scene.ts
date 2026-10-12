// The preview's scene (backlog item preview-3d), with three.js, after parametric-window-sealer's
// web/src/preview-scene.ts (C32). It draws the same solid the user downloads, built by the same code,
// as it hangs (D55): its front, the face printed on top (C58), toward the viewer, x across and y up.
// The board is a fixed light grey (D56), with its sharp edges outlined.
import { BufferAttribute, BufferGeometry, EdgesGeometry, Group, LineBasicMaterial, LineSegments, Mesh } from 'three';
import { MeshPhongMaterial, type Object3D } from 'three';
import type { Manifold } from 'manifold-3d';
import { meshOf } from 'skadis-ultralight-generator';

// Shared by every board drawn; never disposed.
// Flat shading: a board is flat faces, and normals averaged across a face and its edges streaked the
// faces with diagonal shading (seen on the fit coupon, 12 Oct 2026).
const BOARD = new MeshPhongMaterial({ color: 0xc9cdd1, shininess: 20, flatShading: true });
const OUTLINE = new LineBasicMaterial({ color: 0x4a525a });
// Edges are outlined where faces meet at 30 degrees or more: the board's outline and the slots'
// rims, not the facets of their round ends.
const OUTLINE_ANGLE_DEGREES = 30;

/** The board as a mesh and its outline. The solid is only read: it stays the caller's to free. */
export function boardScene(solid: Manifold): Group {
  const { positions, triangles } = meshOf(solid);
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(positions, 3));
  geometry.setIndex(new BufferAttribute(triangles, 1));
  geometry.computeVertexNormals();
  const group = new Group();
  group.add(new Mesh(geometry, BOARD));
  group.add(new LineSegments(new EdgesGeometry(geometry, OUTLINE_ANGLE_DEGREES), OUTLINE));
  group.userData['triangles'] = triangles.length / 3;
  return group;
}

// Graphics memory is not freed by the garbage collector: each redraw frees the last board.
const hasGeometry = (o: Object3D): o is Mesh | LineSegments => o instanceof Mesh || o instanceof LineSegments;

export function disposeScene(group: Group): void {
  for (const child of group.children) if (hasGeometry(child)) child.geometry.dispose();
  group.clear();
}
