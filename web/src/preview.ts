// The 3D preview on the page (backlog item preview-3d), drawn with three.js, after parametric-window-
// sealer's web/src/preview.ts (C32).
//
// It redraws only when something changes (the board, a drag, a resize), never in a loop, so an idle
// page costs nothing. Drag turns it, the wheel or a pinch zooms, and "Reset view" brings back the first
// view (D57). It fills the stage, and the board always fits it (D123): framed to --stage-fit whenever the
// board or its size changes, pulled back on a resize only as far as the whole board needs, never zoomed
// out below --stage-min-fill, and never panned (C125). A browser without WebGL gets a message instead;
// the rest of the page does not need it. A wall draws in full only the panels the view needs, chosen again
// whenever the camera moves, and stands the rest in as flat plates with the slots painted on (D197, C204).
// Without a pointer (the design system's D30, D36; D202, C208): Zoom in and Zoom out, which stop where a pinch
// stops; Front, Back and Top, each facing that side, framed again, cleared by a turn away; and on the focused
// drawing the arrow keys turn it and + and - zoom it, by the buttons' steps.
import {
  AmbientLight,
  Box3,
  Color,
  DirectionalLight,
  PerspectiveCamera,
  Scene,
  Spherical,
  Vector3,
  WebGLRenderer,
} from 'three';
import type { Group } from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { Placed, WallReply } from './build-messages.js';
import { distanceToFit, zoomOutLimit, type View } from './framing.js';
import { boardScene, disposeScene, paintBoards } from './preview-scene.js';
import { wallView, type WallView } from './wall-scene.js';

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
// The steps of the buttons and the keys (C208): a turn of 15 degrees, a zoom of a quarter.
const TURN_STEP = Math.PI / 12;
const ZOOM_STEP = 1.25;
// The named views, each the direction the camera looks from: the front, the back, and above, a hair to the
// front so the camera's up is still defined.
const VIEWS: Record<string, Vector3> = {
  front: new Vector3(0, 0, 1),
  back: new Vector3(0, 0, -1),
  top: new Vector3(0, 1, 1e-4).normalize(),
};

export interface Preview {
  /** Draws the board, or a wall's panels with its print list's lines and its slots, or empties the preview when
   * there is none; `framing` decides when to frame again. */
  show(board: readonly Placed[] | null, framing: string, wall?: WallReply): void;
  /** Names the drawing and the stage round it for assistive technology: what is in them, in words ("The wall in
   * 3D"). */
  name(label: string): void;
  /** Marks the view busy, a new part being made for it, until the next `show` draws it or empties the view: the
   * page's stylesheet then dims the part on show under a turning ring (C316). */
  busy(): void;
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
    return { show: () => {}, name: () => {}, busy: () => {} }; // no part on show to dim (C316)
  }

  // preserveDrawingBuffer keeps the last drawn image readable, for the browser test; drawing only on
  // change makes its cost negligible (inferred, as in the reference).
  const renderer = new WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  container.prepend(renderer.domElement);
  // The drawing as assistive technology meets it: focusable, an image named for its part, described by the plan
  // line (the design system's D30).
  const canvas = renderer.domElement;
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'The board in 3D');
  canvas.setAttribute('aria-describedby', 'plan-line');

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
  let wall: WallView | null = null;
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

  // The near and far planes follow the distance, so a wall a kilometre long and a slot seen close up both draw
  // without their depths running together (C204).
  const fitDepth = () => {
    const distance = camera.position.distanceTo(controls.target);
    const across = box.isEmpty() ? 0 : box.getSize(new Vector3()).length();
    camera.near = Math.max(0.5, distance / 1000);
    camera.far = distance + 2 * across + 1000;
    camera.updateProjectionMatrix();
  };
  // A wall: what to draw in full, chosen again from where the camera is now, and how much is drawn.
  const redetail = () => {
    if (!wall) return;
    wall.update(camera, size.height);
    container.dataset['triangles'] = String(wall.triangles());
    container.dataset['detailed'] = String(wall.detailed());
    container.dataset['standInBuilds'] = String(wall.standInBuilds());
  };

  // After each frame, how many geometries the graphics card holds: it must stay at two (the board
  // and its outline) however often the board is redrawn, or editing would leak memory (browser-tested).
  const draw = () => {
    renderer.render(scene, camera);
    container.dataset['distance'] = String(Math.round(camera.position.distanceTo(controls.target)));
    container.dataset['geometries'] = String(renderer.info.memory.geometries);
  };
  // The named view the camera faces, until a turn takes it away from that side.
  const views = container.querySelector<HTMLElement>('[data-testid="views"]');
  let facing = '';
  const face = (name: string) => {
    facing = name;
    container.dataset['view'] = name;
    for (const input of views?.querySelectorAll<HTMLInputElement>('input') ?? []) input.checked = input.value === name;
  };
  const awayFromFacing = () => {
    const side = VIEWS[facing];
    if (!side) return false;
    const looking = new Vector3().subVectors(camera.position, controls.target).normalize();
    return looking.angleTo(side) > 0.01;
  };
  controls.addEventListener('change', () => {
    limitZoom();
    fitDepth();
    redetail();
    if (facing !== '' && awayFromFacing()) face('');
    draw();
  });
  // The theme is an attribute on the page, whoever sets it: the system setting or, later, a toggle (C117).
  new MutationObserver(() => {
    paintStage();
    draw();
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  // The canvas fills the stage. A new size keeps the user's angle and pulls back only if the whole board
  // no longer fits.
  // The stage's size as it is laid out now.
  const measure = () => {
    size.width = container.clientWidth || 640;
    size.height = container.clientHeight || 384;
    renderer.setSize(size.width, size.height, false);
    camera.aspect = size.width / size.height;
    camera.updateProjectionMatrix();
  };
  const resize = () => {
    measure();
    if (board) {
      const needed = distanceToFit(box, view(), REFIT_SHARE);
      if (camera.position.distanceTo(controls.target) < needed) standAt(needed);
      controls.maxDistance = Infinity; // the limit for the old size must not hold the camera in; set below
      controls.update();
      limitZoom();
      fitDepth();
      redetail();
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
    fitDepth();
    redetail();
    draw();
  };
  reset?.addEventListener('click', () => {
    frame();
    face('');
  });

  // Zoom by a step, in or out, no nearer than the controls allow nor farther than a pinch may go.
  const zoom = (factor: number) => {
    if (!board) return;
    const now = camera.position.distanceTo(controls.target);
    standAt(Math.min(controls.maxDistance, Math.max(controls.minDistance, now * factor)));
    controls.update();
  };
  // Turn round what the camera looks at, across and up, keeping the distance.
  const turn = (across: number, up: number) => {
    if (!board) return;
    const offset = new Vector3().subVectors(camera.position, controls.target);
    const at = new Spherical().setFromVector3(offset);
    at.theta += across;
    at.phi = Math.min(Math.PI - 0.01, Math.max(0.01, at.phi - up));
    camera.position.copy(controls.target).add(new Vector3().setFromSpherical(at));
    controls.update();
  };
  container.querySelector('[data-testid="zoom-in"]')?.addEventListener('click', () => zoom(1 / ZOOM_STEP));
  container.querySelector('[data-testid="zoom-out"]')?.addEventListener('click', () => zoom(ZOOM_STEP));
  canvas.addEventListener('keydown', (event) => {
    // with Ctrl, Cmd or Alt the keys are the browser's own: Ctrl and - zooms the page, Alt and an arrow goes back
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    const keys: Record<string, () => void> = {
      ArrowLeft: () => turn(-TURN_STEP, 0),
      ArrowRight: () => turn(TURN_STEP, 0),
      ArrowUp: () => turn(0, TURN_STEP),
      ArrowDown: () => turn(0, -TURN_STEP),
      '+': () => zoom(1 / ZOOM_STEP),
      '=': () => zoom(1 / ZOOM_STEP),
      '-': () => zoom(ZOOM_STEP),
      _: () => zoom(ZOOM_STEP),
    };
    const act = keys[event.key];
    if (!act) return;
    event.preventDefault(); // the arrows would scroll the page
    act();
  });
  // The View... menu closes once a view is picked, with the design system's lines (its v0.6.0, Workbench; D259); a
  // zoom leaves it open, to press again.
  const menu = views?.closest<HTMLElement>('.ws-stage__menu');
  menu?.addEventListener('change', (event) => {
    const picked = event.target instanceof Element && event.target.closest('.ws-stage__views') !== null;
    if (picked && menu.matches(':popover-open')) menu.hidePopover();
  });
  // A named view faces that side, framed again to --stage-fit.
  views?.addEventListener('change', (event) => {
    const name = event.target instanceof HTMLInputElement ? event.target.value : '';
    const side = VIEWS[name];
    if (!board || !side) {
      face(''); // nothing to face: the choice does not stay made
      return;
    }
    face(name);
    controls.target.copy(box.getCenter(new Vector3()));
    camera.position.copy(controls.target).add(side);
    standAt(distanceToFit(box, view(), ratio('--stage-fit', 0.85)));
    controls.maxDistance = Infinity; // the limit follows the new view, set by the change
    controls.update();
  });

  let framedFor = '';
  container.dataset['state'] = 'loading';
  say('Preparing the preview…');
  // Busy on the view, not on the stage round it, which holds the status line: a screen reader may hold back what
  // changes inside a busy element, and the status line is the announcement (C316). The first part is being made.
  const busy = () => container.setAttribute('aria-busy', 'true');
  busy();

  const stage = container.closest('.ws-stage');
  return {
    name(label) {
      canvas.setAttribute('aria-label', label);
      stage?.setAttribute('aria-label', label);
    },
    busy,
    show(mesh, framing, wallReply) {
      container.removeAttribute('aria-busy'); // drawn, emptied or failed: the wait is over
      if (board) {
        if (wall) wall.dispose();
        else disposeScene(board);
        scene.remove(board);
        board = null;
        wall = null;
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
        if (wallReply && wallReply.panels.length > 0) {
          wall = wallView(mesh, wallReply, renderer.capabilities.getMaxAnisotropy());
          board = wall.group;
        } else {
          board = boardScene(mesh);
        }
      } catch (error) {
        container.dataset['state'] = 'error';
        say(`The preview could not be drawn: ${String(error)}`);
        draw();
        return;
      }
      scene.add(board);
      // a wall's extent from its grid, as only part of it is drawn in full at a time
      box = wall ? wall.box.clone() : new Box3().setFromObject(board);
      container.dataset['triangles'] = String(board.userData['triangles'] ?? 0);
      container.dataset['panels'] = String(wall ? wall.panels() : 1);
      container.dataset['detailed'] = String(wall ? 0 : 1);
      // Measured before framing: a wall's print list, shown just before it, has changed the stage's size before
      // the observer above reports it, and a wall framed for the stage as it was sat at half the size (C217).
      measure();
      container.dataset['state'] = 'ready';
      say(''); // the status bar under the stage says how to turn and zoom it
      // Keep the user's view while they edit; frame again only when the board's size changes. Either way the
      // detail is chosen and the stage drawn once, by frame() or here.
      if (framing !== framedFor) {
        frame();
        framedFor = framing;
      } else {
        limitZoom();
        fitDepth();
        redetail();
        draw();
      }
    },
  };
}
