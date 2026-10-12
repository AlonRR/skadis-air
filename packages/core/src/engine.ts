// The geometry engine: Manifold (manifold-3d), decided by D2. Copied from parametric-window-sealer's
// packages/core/src/engine.ts (C32), where it was chosen by measurement.
//
// Manifold is WebAssembly. Starting it costs a download and a compile, so it is started
// once and shared. In Node (the unit tests) it finds manifold.wasm next to its own
// JavaScript; in the browser the bundler moves and renames the file, so the page passes
// the URL it was given (see web/src/main.ts).
import Module from 'manifold-3d';
import type { ManifoldToplevel } from 'manifold-3d';

export type Engine = ManifoldToplevel;

let started: Promise<Engine> | undefined;

export function loadEngine(wasmUrl?: string): Promise<Engine> {
  started ??= Module(wasmUrl === undefined ? undefined : { locateFile: () => wasmUrl }).then((engine) => {
    engine.setup();
    return engine;
  });
  return started;
}

// A part whose volume is known by hand, so a wrong boolean shows as a wrong number:
// a 20 mm cube with a 10 mm cube cut from one corner, 8000 - 1000 = 7000 mm3.
export const CHECK_PART_VOLUME_MM3 = 20 ** 3 - 10 ** 3;

export interface CheckPart {
  volumeMm3: number;
  genus: number;
  triangles: number;
}

export function buildCheckPart(engine: Engine): CheckPart {
  const { Manifold } = engine;
  const block = Manifold.cube([20, 20, 20]);
  const corner = Manifold.cube([10, 10, 10]);
  const part = block.subtract(corner);
  const result = {
    volumeMm3: part.volume(),
    genus: part.genus(),
    triangles: part.numTri(),
  };
  // WebAssembly memory is not garbage-collected: free each object explicitly.
  for (const m of [block, corner, part]) m.delete();
  return result;
}
