// The builds, in a web worker (backlog item build-worker; D166), so the page answers while a large board is made:
// a 400 x 400 mm skeleton board took about 5 s on the page itself (15 Oct 2026). The worker starts the geometry
// engine, makes its check part, builds each part the page asks for, and writes the STL of the last one. A build
// cannot be stopped once started, so builds asked for while one runs wait, and only the newest of them is made.
import wasmUrl from 'manifold-3d/manifold.wasm?url';
import type { Manifold } from 'manifold-3d';
import {
  boardType,
  buildBoard,
  buildCheckPart,
  loadEngine,
  meshOf,
  printedPart,
  readValues,
  toStl,
  type AnyBoardType,
} from 'skadis-air';
import type { Reply, Request } from './build-messages.js';

const engine = () => loadEngine(wasmUrl);
let last: { id: number; type: AnyBoardType; solid: Manifold } | undefined; // what the page shows; freed when replaced
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
    const built = buildBoard(await engine(), type, read.values);
    last?.solid.delete();
    last = undefined;
    if (!built.ok) {
      reply({ kind: 'built', id, ok: false, problem: built.problem });
      return;
    }
    last = { id, type, solid: built.solid };
    const { positions, triangles } = meshOf(built.solid);
    const { min, max } = built.solid.boundingBox();
    reply({ kind: 'built', id, ok: true, positions, triangles, min, max }, [positions.buffer, triangles.buffer]);
  } catch (error) {
    reply({ kind: 'built', id, ok: false, problem: error instanceof RangeError ? error.message : String(error) });
  }
}

/** The STL of the part the page shows, as it prints (D66, C101). */
function stl(request: Extract<Request, { kind: 'stl' }>): void {
  const { id } = request;
  if (last?.id !== id) {
    reply({ kind: 'stl', id, ok: false, error: 'That board is no longer the one shown' });
    return;
  }
  const printed = printedPart(last.type, last.solid);
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
