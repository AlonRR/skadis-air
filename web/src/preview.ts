// The 3D preview on the page (backlog item preview-3d), drawn with three.js, after parametric-window-
// sealer's web/src/preview.ts (C32).
//
// It redraws only when something changes (the board, a drag, a resize), never in a loop, so an idle
// page costs nothing. Drag turns it, the wheel or a pinch zooms, and "Reset view" brings back the first
// view (D57). A browser without WebGL gets a message instead; the rest of the page does not need it.
import { AmbientLight, Box3, Color, DirectionalLight, PerspectiveCamera, Scene, Vector3, WebGLRenderer } from 'three';
import type { Group } from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { Manifold } from 'manifold-3d';
import { boardScene, disposeScene, paintBoards } from './preview-scene.js';

// The colours are the design system's tokens (D111): the stage follows the theme (D113), while the board
// and its edges are a material, the same in both. The typed values stand in only for a stylesheet that
// has not loaded, so the preview still draws.
const token = (name: string, fallback: string): string => {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value === '' ? fallback : value;
};

export interface Preview {
  /** Draws the board, or empties the preview when there is none; `framing` decides when to frame again. */
  show(board: Manifold | null, framing: string): void;
}

function webglAvailable(): boolean {
  try {
    const probe = document.createElement('canvas');
    return Boolean(probe.getContext('webgl2') ?? probe.getContext('webgl'));
  } catch {
    return false;
  }
}

export function mountPreview(container: HTMLElement): Preview {
  const message = container.querySelector<HTMLElement>('[data-testid="preview-message"]');
  const reset = container.querySelector<HTMLButtonElement>('[data-testid="preview-reset"]');
  const say = (text: string) => {
    if (message) message.textContent = text;
  };

  if (!webglAvailable()) {
    container.dataset['state'] = 'unavailable';
    say('The 3D preview needs WebGL, which this browser has switched off. Everything else works.');
    if (reset) reset.hidden = true;
    return { show: () => {} };
  }

  // preserveDrawingBuffer keeps the last drawn image readable, for the browser test; drawing only on
  // change makes its cost negligible (inferred, as in the reference).
  const renderer = new WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  container.prepend(renderer.domElement);

  const scene = new Scene();
  const background = new Color();
  const paintStage = () => {
    background.setStyle(token('--surface', '#f8fafb'));
    renderer.setClearColor(background);
    scene.background = background;
  };
  paintStage();
  paintBoards(token('--model-board', '#c9cdd1'), token('--model-board-outline', '#4a525a'));
  scene.add(new AmbientLight(0xffffff, 0.75));
  const sun = new DirectionalLight(0xffffff, 1.3);
  sun.position.set(-0.4, 0.6, 1);
  scene.add(sun);
  const camera = new PerspectiveCamera(35, 1, 1, 100_000);
  const controls = new OrbitControls(camera, renderer.domElement);
  let board: Group | null = null;

  // After each frame, how many geometries the graphics card holds: it must stay at two (the board
  // and its outline) however often the board is redrawn, or editing would leak memory (browser-tested).
  const draw = () => {
    renderer.render(scene, camera);
    container.dataset['geometries'] = String(renderer.info.memory.geometries);
  };
  controls.addEventListener('change', draw);
  // The theme is an attribute on the page, whoever sets it: the system setting or, later, a toggle (C117).
  new MutationObserver(() => {
    paintStage();
    draw();
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  const resize = () => {
    const width = container.clientWidth || 640;
    const height = Math.round(width * 0.6);
    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    draw();
  };
  new ResizeObserver(resize).observe(container);
  resize();

  // Face on, from the front a little to the left and below, far enough back to see it all.
  const frame = () => {
    if (!board) return;
    const box = new Box3().setFromObject(board);
    const centre = box.getCenter(new Vector3());
    const size = box.getSize(new Vector3());
    const fit = Math.max(size.x / camera.aspect, size.y) / (2 * Math.tan((camera.fov * Math.PI) / 360));
    camera.position.set(centre.x - 0.15 * fit, centre.y - 0.2 * fit, centre.z + 1.2 * fit);
    controls.target.copy(centre);
    controls.update();
    draw();
  };
  reset?.addEventListener('click', frame);

  let framedFor = '';
  container.dataset['state'] = 'loading';
  say('Preparing the preview…');

  return {
    show(solid, framing) {
      if (board) {
        disposeScene(board);
        scene.remove(board);
        board = null;
      }
      if (!solid) {
        container.dataset['state'] = 'waiting';
        container.dataset['triangles'] = '0';
        say('Correct the settings marked above to see the preview.');
        framedFor = '';
        draw();
        return;
      }
      try {
        board = boardScene(solid);
      } catch (error) {
        container.dataset['state'] = 'error';
        say(`The preview could not be drawn: ${String(error)}`);
        draw();
        return;
      }
      scene.add(board);
      container.dataset['triangles'] = String(board.userData['triangles']);
      // Keep the user's view while they edit; frame again only when the board's size changes.
      if (framing !== framedFor) {
        frame();
        framedFor = framing;
      }
      container.dataset['state'] = 'ready';
      say('Drag to turn the board; scroll or pinch to zoom.');
      draw();
    },
  };
}
