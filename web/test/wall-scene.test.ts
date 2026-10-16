// The stand-ins' mesh (backlog item wall-detail; C204): where on the slot picture each rectangle's corners are.
import { describe, expect, it } from 'vitest';
import { standInGeometry } from '../src/wall-scene.js';

const uvs = (rect: [number, number, number, number]) => [...standInGeometry([rect], [], 5).getAttribute('uv').array];

describe("a wall's stand-ins", () => {
  it('count each picture from the tile it starts in, so its numbers stay small far along a wall (the review)', () => {
    // 40 m along, a tile and a half wide: from the picture's corner, not 1000 repeats in
    expect(uvs([40_000, 80, 40_060, 120])).toEqual([0, 0, 1.5, 0, 1.5, 1, 0, 1]);
    // and the pattern still lines up: a rectangle starting mid-tile starts mid-picture
    expect(uvs([40_020, 90, 40_040, 120])).toEqual([0.5, 0.25, 1, 0.25, 1, 1, 0.5, 1]);
  });
});
