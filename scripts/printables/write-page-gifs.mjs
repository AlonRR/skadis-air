// SPDX-FileCopyrightText: 2026 Alon A. Rabinowitz
// SPDX-License-Identifier: MPL-2.0
//
// GIFs of the page in use, for the Printables page's text (the owner, 22 Oct 2026: "in the printables text use gifs
// of the page being used and of the types and options"): a pointer moves to each control and uses it, and every frame
// is the page as it then is, each shown for as long as it really took. Each recording ends as it began, so the GIF
// loops with no jump. The frames go to <folder>/frames/<id>/, the GIF beside them; ffmpeg makes it, as wide as its
// recording's `width`: 800 for the gallery's page tour, 560 for the text's (A356, the owner, 23 Oct 2026: "we might
// want to shrink the description gifs size"; C394).
// `page-phone` is the page on a phone (the owner, 23 Oct 2026: "add a gif of the mobile version to printables"): a
// fingertip instead of the arrow, and the page scrolled so each control shows below the pinned 3D view; 480 wide.
// Each recording is of a section of the page, more or less (the owner: "each gif should represent a section of the
// page more or less, instead of a gif being of one type").
//
//   npm run build -w skadis-air-web && npm run preview -w skadis-air-web -- --host 127.0.0.1 --port 4199
//   node scripts/printables/write-page-gifs.mjs http://127.0.0.1:4199/ <folder> [id...]
//
// PW_CHROMIUM_PATH picks the Chromium, as for the browser test; ffmpeg must be on the PATH.
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const [base, folder, ...only] = process.argv.slice(2);
if (!base || !folder) {
  console.error('usage: node scripts/printables/write-page-gifs.mjs <page address> <folder> [id...]');
  process.exit(2);
}
const out = resolve(folder);
const { chromium } = createRequire(join(repo, 'web', 'package.json'))('@playwright/test');
// One after another, as the shots must be: each in steps, in order.
const inTurn = (items, step) => items.reduce((done, item) => done.then(() => step(item)), Promise.resolve());

/** A pointer drawn over the page, which glides to each control before it is used and rings when it clicks. */
const POINTER = `
  #gif-pointer { position: fixed; left: 0; top: 0; z-index: 2147483647; pointer-events: none;
    transition: transform 450ms ease-in-out; transform: translate(640px, 420px); }
  #gif-pointer .ring { position: absolute; left: -14px; top: -14px; width: 28px; height: 28px; border-radius: 50%;
    border: 3px solid #f76707; opacity: 0; }
  #gif-pointer.click .ring { animation: gif-ring 380ms ease-out; }
  @keyframes gif-ring { from { opacity: 1; transform: scale(0.4); } to { opacity: 0; transform: scale(1.6); } }
  #gif-pointer .tip { position: absolute; left: -15px; top: -15px; width: 30px; height: 30px; border-radius: 50%;
    background: rgba(22, 34, 44, 0.35); border: 2px solid #fff; }`;
const ARROW =
  '<svg width="26" height="34" viewBox="0 0 26 34"><path d="M2 2 L2 28 L9 21 L14 32 L19 30 L14 19 L24 19 Z" ' +
  'fill="#16222c" stroke="#fff" stroke-width="2" stroke-linejoin="round"/></svg>';
/** On a phone, a fingertip. */
const TIP = '<div class="tip"></div>';
const DESKTOP = { viewport: { width: 1280, height: 800 } };

/** One recording: drives the page through its steps, keeping each frame and when it was taken. `centre` is where
 * the pointer rests; `phone` scrolls the page itself so a control shows below the 3D view and the plan bar, which a
 * phone pins at the top as the page scrolls, where the browser's own scrolling would leave it under them. */
function recorder(page, dir, { centre, phone }) {
  const frames = [];
  const snap = async () => {
    const file = join(dir, `${String(frames.length).padStart(3, '0')}.png`);
    await page.screenshot({ path: file });
    frames.push({ file, at: Date.now() });
  };
  // frames until `ms` have passed, one at least
  const hold = async (ms) => {
    const until = Date.now() + ms;
    const more = async () => {
      await snap();
      if (Date.now() < until) await more();
    };
    await more();
  };
  // frames until the board is made, or the form says why not, at most `left` of them
  const untilMade = async (left) => {
    await snap();
    const state = await page.getByTestId('board-status').getAttribute('data-state');
    const preview = await page.getByTestId('preview').getAttribute('data-state');
    if ((state === 'building' || preview === 'building') && left > 0) await untilMade(left - 1);
  };
  // until the board is made, and `ms` more
  const settle = async (ms = 900) => {
    await untilMade(300);
    await hold(ms);
  };
  // on a phone: the page scrolled until the control is below what is pinned at the top, frames while it scrolls
  const clearOfPinned = async (target) => {
    const moved = await target.evaluate((el) => {
      const sticky = [...document.querySelectorAll('.ws-stage__view, .ws-plan')].filter(
        (e) => getComputedStyle(e).position === 'sticky',
      );
      if (sticky.some((e) => e.contains(el))) return false; // pinned itself, so always in sight
      const pinned = sticky.reduce((bottom, e) => Math.max(bottom, e.getBoundingClientRect().bottom), 0);
      const box = el.getBoundingClientRect();
      if (box.top >= pinned + 8 && box.bottom <= innerHeight - 8) return false;
      window.scrollBy({ top: box.top - pinned - 48, behavior: 'smooth' });
      return true;
    });
    if (moved) await hold(700);
  };
  const pointAt = async (target) => {
    await (phone ? clearOfPinned(target) : target.scrollIntoViewIfNeeded());
    const box = await target.boundingBox();
    if (box === null) throw new Error('a control to point at is not on the page');
    const [x, y] = [box.x + box.width / 2, box.y + box.height / 2];
    await page.evaluate(
      ([px, py]) => {
        document.getElementById('gif-pointer').style.transform = `translate(${px}px, ${py}px)`;
      },
      [x, y],
    );
    await hold(520);
  };
  const ring = () =>
    page.evaluate(() => {
      const p = document.getElementById('gif-pointer');
      p.classList.remove('click');
      void p.offsetWidth;
      p.classList.add('click');
    });
  return {
    frames,
    hold,
    settle,
    /** The radio button or button a label names, pointed at and used. */
    async click(target) {
      await pointAt(target);
      await ring();
      await target.click({ force: true });
      await settle();
    },
    /** The 3D view dragged across by (dx, dy) pixels in `steps` moves, turning the part, the pointer with it. */
    async drag(dx, dy, steps = 24) {
      const stage = page.getByTestId('preview');
      await pointAt(stage);
      const box = await stage.boundingBox();
      if (box === null) throw new Error('the 3D view is not on the page');
      const [x, y] = [box.x + box.width / 2, box.y + box.height / 2];
      await page.mouse.move(x, y);
      await page.mouse.down();
      await inTurn([...Array(steps).keys()], async (i) => {
        const [px, py] = [x + (dx * (i + 1)) / steps, y + (dy * (i + 1)) / steps];
        await page.mouse.move(px, py);
        await page.evaluate(
          ([qx, qy]) => {
            const pointer = document.getElementById('gif-pointer');
            pointer.style.transition = 'none';
            pointer.style.transform = `translate(${qx}px, ${qy}px)`;
          },
          [px, py],
        );
        await snap();
      });
      await page.mouse.up();
      await page.evaluate(() => {
        document.getElementById('gif-pointer').style.transition = '';
      });
      await hold(500);
    },
    /** A field cleared and typed into a key at a time. */
    async type(field, text) {
      await pointAt(field);
      await ring();
      await field.click();
      await page.keyboard.press('Control+A');
      await inTurn([...text], async (key) => {
        await page.keyboard.type(key);
        await snap();
      });
      await page.keyboard.press('Tab');
      await settle();
    },
    /** Back to where it began, so the GIF loops: the pointer, and every scrolled panel scrolled back up. */
    async home() {
      await page.evaluate(([x, y]) => {
        document.getElementById('gif-pointer').style.transform = `translate(${x}px, ${y}px)`;
        for (const e of [document.scrollingElement, ...document.querySelectorAll('*')]) {
          if (e && e.scrollTop > 0) e.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }, centre);
      // the real mouse, which clicked, to the corner it started in, so no control is left hovered, and no focus ring
      await page.mouse.move(0, 0);
      await page.evaluate(() => document.activeElement?.blur());
      await hold(1600);
    },
  };
}

const radio = (page, name, value) => page.locator(`label:has(input[name="${name}"][value="${value}"])`).first();
const button = (page, name) => page.getByRole('button', { name, exact: true });

const recordings = [
  {
    id: 'page-in-use',
    width: 560,
    // a wall's panels close its outer sides, and one board keeps them: so it starts closed all round, as it ends
    async before(page) {
      await inTurn(['Top', 'Left', 'Right', 'Bottom'], (side) => button(page, side).click());
    },
    // choose a board, give it a size, make it a wall in panels, and back
    async steps(r, page) {
      // in panels before the wall's size, and back to one board after it, as one board is at most 400 mm a side
      await r.click(radio(page, 'boardType', 'lightened'));
      await r.type(page.locator('input[name="widthMm"]'), '240');
      await r.type(page.locator('input[name="heightMm"]'), '200');
      await r.click(radio(page, 'typeGroup', 'wall'));
      await r.type(page.locator('input[name="widthMm"]'), '1200');
      await r.type(page.locator('input[name="heightMm"]'), '800');
      await r.hold(1500);
      await r.type(page.locator('input[name="widthMm"]'), '160');
      await r.type(page.locator('input[name="heightMm"]'), '160');
      await r.click(radio(page, 'typeGroup', 'board'));
      await r.click(radio(page, 'boardType', 'solid'));
    },
  },
  {
    id: 'page-tour',
    width: 800,
    // the owner, 22 Oct 2026: "have the second image be a gif of the webpage switching between different options and
    // rotating", and "the second webpage view should also show the wall option, so that users know its an option right
    // away": it starts on a wall in panels, its first frame the GIF's still, turns it by hand, makes one board of it,
    // goes through the board types and their mountings, and grows back into the wall
    async before(page) {
      await radio(page, 'boardType', 'lightened').click();
      await radio(page, 'typeGroup', 'wall').click();
      await page.locator('input[name="widthMm"]').fill('1200');
      await page.locator('input[name="heightMm"]').fill('800');
      await page.keyboard.press('Tab');
    },
    async steps(r, page) {
      await r.hold(800);
      await r.drag(260, -40);
      await r.type(page.locator('input[name="widthMm"]'), '160');
      await r.type(page.locator('input[name="heightMm"]'), '160');
      await r.click(radio(page, 'typeGroup', 'board'));
      await r.click(radio(page, 'standoffs', 'corners'));
      await r.click(radio(page, 'screwHead', 'keyhole'));
      await r.drag(360, -40);
      await r.click(radio(page, 'boardType', 'skeleton'));
      await r.click(radio(page, 'screwHead', 'lock'));
      await r.drag(-600, 40);
      await r.click(radio(page, 'screwHead', 'countersunk'));
      await r.click(radio(page, 'standoffs', 'none'));
      await r.click(radio(page, 'boardType', 'lightened'));
      await r.click(radio(page, 'typeGroup', 'wall'));
      await r.type(page.locator('input[name="widthMm"]'), '1200');
      await r.type(page.locator('input[name="heightMm"]'), '800');
      await r.click(page.getByTestId('preview-reset'));
    },
  },
  {
    id: 'page-types',
    width: 560,
    // each board type, the fit coupon under Advanced, Test prints (D357), then the connectors, and back
    async steps(r, page) {
      await r.click(radio(page, 'boardType', 'lightened'));
      await r.click(radio(page, 'boardType', 'skeleton'));
      await r.click(page.getByTestId('advanced').locator('summary'));
      await r.click(radio(page, 'boardType', 'fit-coupon'));
      await r.click(radio(page, 'typeGroup', 'connector'));
      await r.click(radio(page, 'boardType', 'standoff'));
      await r.click(radio(page, 'boardType', 'slot-clip'));
      await r.click(radio(page, 'typeGroup', 'board'));
      await r.click(radio(page, 'boardType', 'solid'));
    },
  },
  {
    id: 'page-edges',
    width: 560,
    // closed sides, and open sides between the slots, and back
    async steps(r, page) {
      await r.click(button(page, 'Top'));
      await r.click(button(page, 'Right'));
      await r.click(radio(page, 'seams', 'between'));
      await r.hold(600);
      await r.click(radio(page, 'seams', 'through'));
      await r.click(button(page, 'Right'));
      await r.click(button(page, 'Top'));
    },
  },
  {
    id: 'page-mounting',
    width: 560,
    // standoffs at the corners, keyholes seen from the back, lock screws, tape (D619 a), and back: countersunk takes the
    // standoffs off the slots to None again itself, as it began (D619)
    async steps(r, page) {
      await r.click(radio(page, 'standoffs', 'corners'));
      await r.click(radio(page, 'screwHead', 'keyhole'));
      await r.click(radio(page, 'view', 'back'));
      await r.click(radio(page, 'screwHead', 'lock'));
      await r.click(radio(page, 'screwHead', 'tape'));
      // a board of another depth is framed again from the front: back, to see its pads
      await r.click(radio(page, 'view', 'back'));
      await r.click(radio(page, 'view', 'front'));
      await r.click(radio(page, 'screwHead', 'countersunk'));
    },
  },
  {
    id: 'page-phone',
    phone: true,
    width: 480,
    // the board turned by a finger, the board types, a setting's help folded open and shut, a wall in panels, and back,
    // the 3D view staying at the top as the form scrolls under it; a wall's panels close its outer sides and one board
    // keeps them, so it starts closed all round, as it ends
    async before(page) {
      await inTurn(['Top', 'Left', 'Right', 'Bottom'], (side) => button(page, side).click());
    },
    async steps(r, page) {
      const info = page.locator('button[aria-controls="field-thicknessMm-note"]');
      await r.drag(180, -20, 20);
      await r.click(radio(page, 'boardType', 'lightened'));
      await r.click(radio(page, 'boardType', 'skeleton'));
      await r.click(info);
      await r.hold(1400);
      await r.click(info);
      await r.click(radio(page, 'boardType', 'lightened'));
      await r.click(radio(page, 'typeGroup', 'wall'));
      await r.type(page.locator('input[name="widthMm"]'), '800');
      await r.type(page.locator('input[name="heightMm"]'), '600');
      await r.hold(1500);
      await r.type(page.locator('input[name="widthMm"]'), '160');
      await r.type(page.locator('input[name="heightMm"]'), '160');
      await r.click(radio(page, 'typeGroup', 'board'));
      await r.click(radio(page, 'boardType', 'solid'));
      await r.click(page.getByTestId('preview-reset'));
    },
  },
].filter((g) => only.length === 0 || only.includes(g.id));
/** A phone's screen, as the page's browser test takes one: 412 x 860, twice as many pixels, touch. */
const PHONE = { viewport: { width: 412, height: 860 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true };

const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM_PATH || undefined });
await inTurn(recordings, async (g) => {
  // a context of its own, as the page keeps its choices in the browser and one recording's would start the next
  const screen = g.phone ? PHONE : DESKTOP;
  const context = await browser.newContext(screen);
  const centre = [Math.round(screen.viewport.width / 2), Math.round(screen.viewport.height / 2)];
  const page = await context.newPage();
  page.on('pageerror', (e) => console.error('page error:', e.message));
  await page.goto(base);
  await page.waitForFunction(
    () => document.querySelector('[data-testid="board-status"]')?.getAttribute('data-state') === 'ready',
    null,
    { timeout: 90_000 },
  );
  if (g.before) {
    await g.before(page);
    await page.waitForTimeout(800); // the form builds again after a burst of changes
    await page.waitForFunction(
      () =>
        document.querySelector('[data-testid="board-status"]')?.getAttribute('data-state') === 'ready' &&
        document.querySelector('[data-testid="preview"]')?.getAttribute('data-state') === 'ready',
      null,
      { timeout: 90_000 },
    );
    await page.mouse.move(0, 0);
    await page.evaluate(() => document.activeElement?.blur());
    await page.waitForTimeout(500);
    await page.evaluate(() => {
      for (const e of [document.scrollingElement, ...document.querySelectorAll('*')]) if (e) e.scrollTop = 0;
    });
  }
  await page.addStyleTag({ content: POINTER });
  await page.evaluate(
    ([svg, [x, y]]) => {
      const p = document.createElement('div');
      p.id = 'gif-pointer';
      p.innerHTML = `<div class="ring"></div>${svg}`;
      p.style.transform = `translate(${x}px, ${y}px)`;
      document.body.append(p);
    },
    [g.phone ? TIP : ARROW, centre],
  );
  const dir = join(out, 'frames', g.id);
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  const r = recorder(page, dir, { centre, phone: g.phone === true });
  await r.hold(1400);
  await g.steps(r, page);
  await r.home();
  // each frame shown for as long as it took, the last for as long as the first was held
  const list = r.frames.flatMap((f, i) => {
    const next = r.frames[i + 1];
    const seconds = next ? (next.at - f.at) / 1000 : 0.1;
    return [`file '${f.file.replaceAll('\\', '/')}'`, `duration ${seconds.toFixed(3)}`];
  });
  const listFile = join(dir, 'frames.txt');
  writeFileSync(listFile, `ffconcat version 1.0\n${list.join('\n')}\n`);
  const gif = join(out, `${g.id}.gif`);
  // an ordered dither, which gives a pixel the same colour wherever it is redrawn: with only each frame's changed
  // rectangle drawn again, an error-diffusing one left the last frame a few pixels off the first (C392)
  const filter =
    `scale=${g.width}:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=128:stats_mode=full[p];` +
    '[b][p]paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle';
  execFileSync('ffmpeg', [
    '-y',
    '-loglevel',
    'error',
    '-safe',
    '0',
    '-f',
    'concat',
    '-i',
    listFile,
    '-vf',
    filter,
    '-loop',
    '0',
    gif,
  ]);
  const seconds = (r.frames.at(-1).at - r.frames[0].at) / 1000;
  console.log(`${gif}: ${r.frames.length} frames, ${seconds.toFixed(1)} s`);
  await context.close();
});
await browser.close();
