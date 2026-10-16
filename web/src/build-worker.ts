// The builds, in a web worker (backlog item build-worker; D166), so the page answers while a large board is made:
// a 400 x 400 mm skeleton board took about 5 s on the page itself (15 Oct 2026). The worker starts the geometry
// engine, makes its check part, builds each part the page asks for, and writes the STL of the last one. A build
// cannot be stopped once started, so builds asked for while one runs wait, and only the newest of them is made.
import wasmUrl from 'manifold-3d/manifold.wasm?url';
import type { Manifold } from 'manifold-3d';
import {
  boardFileName,
  boardType,
  buildBoard,
  buildCheckPart,
  buildWall,
  loadEngine,
  meshOf,
  printedPart,
  readValues,
  toStl,
  type AnyBoardType,
} from 'skadis-air';
import type { PanelLine, Placed, Reply, Request } from './build-messages.js';

const engine = () => loadEngine(wasmUrl);
// What the page shows: one board, or a wall's panel kinds, each as it is printed; freed when replaced.
let last: { id: number; type: AnyBoardType; solid?: Manifold; panels: Manifold[] } | undefined;
let waiting: Extract<Request, { kind: 'build' }> | undefined; // the newest build asked for, not yet begun
let scheduled = false;

const reply = (message: Reply, transfer: Transferable[] = []) => postMessage(message, { transfer });

async function check(): Promise<void> {
  try {
    reply({ kind: 'check', ok: true, volumeMm3: buildCheckPart(await engine()).volumeMm3 });
  } catch (error) {
    reply({ kind: 'check', ok: false, error: String(error) });
  }
}

async function build(request: Extract<Request, { kind: 'build' }>): Promise<void> {
  const { id } = request;
  try {
    const type = boardType(request.typeId);
    const read = readValues(type.settings, request.values);
    if (!read.ok) throw new RangeError(read.errors.map((e) => e.message).join('; '));
    const ready = await engine();
    forget();
    const wall = buildWall(ready, type, read.values, request.bed);
    let lines: PanelLine[] | undefined;
    let parts: { solid: Manifold; places: [number, number][] }[];
    if (wall !== null) {
      last = { id, type, panels: wall.panels.map((p) => p.solid) };
      parts = wall.panels;
      lines = wall.panels.map((p) => {
        const sides: unknown = p.values['sides'];
        const closed = ['left', 'right', 'bottom', 'top'].filter(
          (side) =>
            typeof sides === 'object' &&
            sides !== null &&
            Object.getOwnPropertyDescriptor(sides, side)?.value === 'closed',
        );
        const values = readValues(type.settings, p.values);
        return {
          fileName: values.ok ? boardFileName(type, values.values, 'stl') : '',
          count: p.places.length,
          widthMm: Number(p.values['widthMm']),
          heightMm: Number(p.values['heightMm']),
          closed,
        };
      });
    } else {
      const built = buildBoard(ready, type, read.values);
      if (!built.ok) {
        reply({ kind: 'built', id, ok: false, problem: built.problem });
        return;
      }
      last = { id, type, solid: built.solid, panels: [] };
      parts = [{ solid: built.solid, places: [[0, 0]] }];
    }
    // Each mesh once, with the places of its copies: a wall's copies are drawn from it, not sent again.
    const placed: Placed[] = parts.map(({ solid, places }) => ({ ...meshOf(solid), places }));
    const min: [number, number, number] = [Infinity, Infinity, Infinity];
    const max: [number, number, number] = [-Infinity, -Infinity, -Infinity];
    for (const { solid, places } of parts) {
      const box = solid.boundingBox();
      for (const [x, y] of places) {
        const offset = [x, y, 0];
        for (let k = 0; k < 3; k++) {
          min[k] = Math.min(min[k] ?? Infinity, (box.min[k] ?? 0) + (offset[k] ?? 0));
          max[k] = Math.max(max[k] ?? -Infinity, (box.max[k] ?? 0) + (offset[k] ?? 0));
        }
      }
    }
    const transfer = placed.flatMap((m) => [m.positions.buffer, m.triangles.buffer]);
    reply({ kind: 'built', id, ok: true, parts: placed, min, max, ...(lines ? { panels: lines } : {}) }, transfer);
  } catch (error) {
    reply({ kind: 'built', id, ok: false, problem: error instanceof RangeError ? error.message : String(error) });
  }
}

/** Frees the part shown before, and a wall's panels. */
function forget(): void {
  last?.solid?.delete();
  for (const p of last?.panels ?? []) p.delete();
  last = undefined;
}

/** The STL of the part the page shows, or of one kind of its wall's panels, as it prints (D66, C101). */
function stl(request: Extract<Request, { kind: 'stl' }>): void {
  const { id } = request;
  const part = request.panel === undefined ? last?.solid : last?.panels[request.panel];
  if (last?.id !== id || part === undefined) {
    reply({ kind: 'stl', id, ok: false, error: 'That board is no longer the one shown' });
    return;
  }
  const printed = printedPart(last.type, part);
  try {
    const bytes = toStl(meshOf(printed), request.name.replace(/\.stl$/, ''));
    reply({ kind: 'stl', id, ok: true, bytes }, [bytes.buffer]);
  } finally {
    printed.delete();
  }
}

addEventListener('message', (event: MessageEvent<Request>) => {
  const request = event.data;
  if (request.kind === 'check') void check();
  else if (request.kind === 'stl') stl(request);
  else {
    // The messages that came while a build ran are all read before this timer fires: build the newest only.
    waiting = request;
    if (!scheduled) {
      scheduled = true;
      setTimeout(() => {
        scheduled = false;
        const next = waiting;
        waiting = undefined;
        if (next !== undefined) void build(next);
      }, 0);
    }
  }
});
