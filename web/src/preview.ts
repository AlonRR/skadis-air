// The 3D preview on the page (backlog item preview-3d), drawn with three.js, after parametric-window-
// sealer's web/src/preview.ts (C32).
//
// It redraws only when something changes (the board, a drag, a resize), never in a loop, so an idle
// page costs nothing. Drag turns it, the wheel or a pinch zooms, and "Reset view" brings back the first
// view (D57). It fills the stage, and the board always fits it (D123): framed to --stage-fit whenever the
// board or its size changes, pulled back on a resize only as far as the whole board needs, never zoomed
// out below --stage-min-fill, and never panned (C125). A browser without WebGL gets a message instead;
// the rest of the page does not need it.
import { AmbientLight, Box3, Color, DirectionalLight, PerspectiveCamera, Scene, Vector3, WebGLRenderer } from 'three';
import type { Group } from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { Placed } from './build-messages.js';
import { distanceToFit, zoomOutLimit, type View } from './framing.js';
import { boardScene, disposeScene, paintBoards } from './preview-scene.js';

// The colours are the design system's tokens (D111): the stage follows the theme (D113), while the board
// and its edges are a material, the same in both. The typed values stand in only for a stylesheet that
// has not loaded, so the preview still draws.
const token = (name: string, fallback: string): string => {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value === '' ? fallback : value;
};
const ratio = (name: string, fallback: number): number => {
  const value = Number.parseFloat(token(name, ''));
  return Number.isFinite(value) && value > 0 ? value : fallback;
};

// The first view: face on, from the front a little to the left and below (D57).
const FIRST_DIRECTION = new Vector3(-0.15, -0.2, 1.2).normalize();
// After a resize the whole board fits again with this much of the stage to spare at its tightest side,
// so its edge never sits on the stage's (C125).
const REFIT_SHARE = 0.95;

export interface Preview {
  /** Draws the board, or empties the preview when there is none; `framing` decides when to frame again. */
  show(board: readonly Placed[] | null, framing: string): void;
}

function webglAvailable(): boolean {
  try {
    const probe = document.createElement('canvas');
    return Boolean(probe.getContext('webgl2') ?? probe.getContext('webgl'));
  } catch {
    return false;
  }
}

export function mountPreview(container: HTMLElement, reset: HTMLButtonElement | null): Preview {
  const message = container.querySelector<HTMLElement>('[data-testid="preview-message"]');
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
  controls.enablePan = false; // the board's centre stays the centre of the stage (D123, C125)
  let board: Group | null = null;
  let box = new Box3(); // the board's bounding box, which the framing fits to the stage
  const size = { width: 640, height: 384 };
  const view = (): View => ({
    position: camera.position,
    target: controls.target,
    up: camera.up,
    fovDegrees: camera.fov,
    aspect: camera.aspect,
  });
  // How far out the wheel or a pinch may take the view: until the board spans --stage-min-fill of the
  // stage's shorter side, seen from where the camera looks now.
  const limitZoom = () => {
    if (board)
      controls.maxDistance = zoomOutLimit(box, view(), ratio('--stage-min-fill', 0.25), size.width, size.height);
  };
  // Along the camera's present direction, to `distance` from what it looks at.
  const standAt = (distance: number) => {
    const direction = new Vector3().subVectors(camera.position, controls.target).normalize();
    camera.position.copy(controls.target).addScaledVector(direction, distance);
  };

  // After each frame, how many geometries the graphics card holds: it must stay at two (the board
  // and its outline) however often the board is redrawn, or editing would leak memory (browser-tested).
  const draw = () => {
    renderer.render(scene, camera);
    container.dataset['geometries'] = String(renderer.info.memory.geometries);
  };
  controls.addEventListener('change', () => {
    limitZoom();
    draw();
  });
  // The theme is an attribute on the page, whoever sets it: the system setting or, later, a toggle (C117).
  new MutationObserver(() => {
    paintStage();
    draw();
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  // The canvas fills the stage. A new size keeps the user's angle and pulls back only if the whole board
  // no longer fits.
  const resize = () => {
    size.width = container.clientWidth || 640;
    size.height = container.clientHeight || 384;
    renderer.setSize(size.width, size.height, false);
    camera.aspect = size.width / size.height;
    camera.updateProjectionMatrix();
    if (board) {
      const needed = distanceToFit(box, view(), REFIT_SHARE);
      if (camera.position.distanceTo(controls.target) < needed) standAt(needed);
      controls.maxDistance = Infinity; // the limit for the old size must not hold the camera in; set below
      controls.update();
      limitZoom();
    }
    draw();
  };
  new ResizeObserver(resize).observe(container);
  resize();

  // The first view, at the distance where the board spans --stage-fit of the stage's limiting side.
  const frame = () => {
    if (!board) return;
    controls.target.copy(box.getCenter(new Vector3()));
    camera.position.copy(controls.target).add(FIRST_DIRECTION);
    standAt(distanceToFit(box, view(), ratio('--stage-fit', 0.85)));
    controls.maxDistance = Infinity; // the limit follows the new view, set below
    controls.update();
    limitZoom();
    draw();
  };
  reset?.addEventListener('click', frame);

  let framedFor = '';
  container.dataset['state'] = 'loading';
  say('Preparing the preview…');

  return {
    show(mesh, framing) {
      if (board) {
        disposeScene(board);
        scene.remove(board);
        board = null;
      }
      if (!mesh) {
        container.dataset['state'] = 'waiting';
        container.dataset['triangles'] = '0';
        say('Correct the settings marked in the form to see the preview.');
        framedFor = '';
        draw();
        return;
      }
      try {
        board = boardScene(mesh);
      } catch (error) {
        container.dataset['state'] = 'error';
        say(`The preview could not be drawn: ${String(error)}`);
        draw();
        return;
      }
      scene.add(board);
      box = new Box3().setFromObject(board);
      container.dataset['triangles'] = String(board.userData['triangles']);
      // Keep the user's view while they edit; frame again only when the board's size changes.
      if (framing !== framedFor) {
        frame();
        framedFor = framing;
      }
      container.dataset['state'] = 'ready';
      say(''); // the status bar under the stage says how to turn and zoom it
      limitZoom();
      draw();
    },
  };
}
