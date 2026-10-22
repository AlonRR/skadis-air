// SPDX-FileCopyrightText: 2026 Alon A. Rabinowitz
// SPDX-License-Identifier: MPL-2.0
//
// GIFs of the page in use, for the Printables page's text (the owner, 22 Oct 2026: "in the printables text use gifs
// of the page being used and of the types and options"): a pointer moves to each control and uses it, and every frame
// is the page as it then is, each shown for as long as it really took. Each recording ends as it began, so the GIF
// loops with no jump. The frames go to <folder>/frames/<id>/, the GIF, 800 x 500, beside them; ffmpeg makes it.
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
  @keyframes gif-ring { from { opacity: 1; transform: scale(0.4); } to { opacity: 0; transform: scale(1.6); } }`;
const ARROW =
  '<svg width="26" height="34" viewBox="0 0 26 34"><path d="M2 2 L2 28 L9 21 L14 32 L19 30 L14 19 L24 19 Z" ' +
  'fill="#16222c" stroke="#fff" stroke-width="2" stroke-linejoin="round"/></svg>';

/** One recording: drives the page through its steps, keeping each frame and when it was taken. */
function recorder(page, dir) {
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
  const pointAt = async (target) => {
    await target.scrollIntoViewIfNeeded();
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
      await page.evaluate(() => {
        document.getElementById('gif-pointer').style.transform = 'translate(640px, 420px)';
        for (const e of [document.scrollingElement, ...document.querySelectorAll('*')]) {
          if (e && e.scrollTop > 0) e.scrollTo({ top: 0, behavior: 'smooth' });
        }
      });
      // the real mouse, which clicked, to the corner it started in, so no control is left hovered
      await page.mouse.move(0, 0);
      await hold(1600);
    },
  };
}

const radio = (page, name, value) => page.locator(`label:has(input[name="${name}"][value="${value}"])`).first();
const button = (page, name) => page.getByRole('button', { name, exact: true });

const recordings = [
  {
    id: 'page-in-use',
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
      await r.click(radio(page, 'panels', 'split'));
      await r.type(page.locator('input[name="widthMm"]'), '1200');
      await r.type(page.locator('input[name="heightMm"]'), '800');
      await r.hold(1500);
      await r.type(page.locator('input[name="widthMm"]'), '160');
      await r.type(page.locator('input[name="heightMm"]'), '160');
      await r.click(radio(page, 'panels', 'one'));
      await r.click(radio(page, 'boardType', 'solid'));
    },
  },
  {
    id: 'page-types',
    // each board type, then the connectors, and back
    async steps(r, page) {
      await r.click(radio(page, 'boardType', 'lightened'));
      await r.click(radio(page, 'boardType', 'skeleton'));
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
    // standoffs, keyholes seen from the back, lock screws, and back
    async steps(r, page) {
      await r.click(radio(page, 'standoffs', 'back'));
      await r.click(radio(page, 'screwHead', 'keyhole'));
      await r.click(radio(page, 'view', 'back'));
      await r.click(radio(page, 'screwHead', 'lock'));
      await r.click(radio(page, 'view', 'front'));
      await r.click(radio(page, 'screwHead', 'countersunk'));
      await r.click(radio(page, 'standoffs', 'none'));
    },
  },
].filter((g) => only.length === 0 || only.includes(g.id));

const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM_PATH || undefined });
await inTurn(recordings, async (g) => {
  // a context of its own, as the page keeps its choices in the browser and one recording's would start the next
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
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
    await page.waitForTimeout(500);
    await page.evaluate(() => {
      for (const e of [document.scrollingElement, ...document.querySelectorAll('*')]) if (e) e.scrollTop = 0;
    });
  }
  await page.addStyleTag({ content: POINTER });
  await page.evaluate((svg) => {
    const p = document.createElement('div');
    p.id = 'gif-pointer';
    p.innerHTML = `<div class="ring"></div>${svg}`;
    document.body.append(p);
  }, ARROW);
  const dir = join(out, 'frames', g.id);
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  const r = recorder(page, dir);
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
  const filter =
    'scale=800:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=128:stats_mode=full[p];' +
    '[b][p]paletteuse=dither=sierra2_4a:diff_mode=rectangle';
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
