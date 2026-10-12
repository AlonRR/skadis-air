// The page's entry point. For now it starts the geometry engine and builds the check part, so the
// browser test can see that the WebAssembly file is found, fetched and started from the built page.
// The pattern is parametric-window-sealer's web/src/main.ts (C32).
import wasmUrl from 'manifold-3d/manifold.wasm?url';
import { buildCheckPart, loadEngine } from 'skadis-ultralight-generator';

const status = document.querySelector<HTMLElement>('[data-testid="engine-status"]');

async function start(): Promise<void> {
  if (status === null) return;
  try {
    const part = buildCheckPart(await loadEngine(wasmUrl));
    status.dataset['volumeMm3'] = String(Math.round(part.volumeMm3));
    status.dataset['state'] = 'ready';
    status.textContent = 'Geometry engine ready.';
  } catch (error) {
    status.dataset['state'] = 'error';
    status.textContent = `The geometry engine could not start: ${String(error)}`;
  }
}

void start();
