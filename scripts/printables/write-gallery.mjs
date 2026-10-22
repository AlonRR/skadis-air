// SPDX-FileCopyrightText: 2026 Alon A. Rabinowitz
// SPDX-License-Identifier: MPL-2.0
//
// The Printables page's pictures of the boards and their features, and its animations (Q309, 22 Oct 2026): the
// scenes in gallery.mjs, each part the library's own, drawn by gallery.html under a title in the page's own font and
// photographed into <folder>, 1600 x 1200; an animation's frames go to <folder>/frames/<id>/ and ffmpeg makes them
// a GIF, 800 x 600, beside the pictures. Reads the library's build, so run `npm run build -w skadis-air` first.
//
//   node scripts/printables/write-gallery.mjs <folder> [id...]
//
// PW_CHROMIUM_PATH picks the Chromium, as for the browser test; ffmpeg must be on the PATH for the animations.
import { execFileSync } from 'node:child_process';
import { createReadStream, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeKit } from '../figures/kit.mjs';
import { build } from './gallery.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const repo = join(here, '..', '..');
const [folder, ...only] = process.argv.slice(2);
if (!folder) {
  console.error('usage: node scripts/printables/write-gallery.mjs <folder> [id...]');
  process.exit(2);
}
const out = resolve(folder);
mkdirSync(out, { recursive: true });
const scenes = build(await makeKit(repo)).filter((s) => only.length === 0 || only.includes(s.id));
writeFileSync(join(out, 'scenes.json'), JSON.stringify(scenes));

const { chromium } = createRequire(join(repo, 'web', 'package.json'))('@playwright/test');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.woff2': 'font/woff2' };
const server = createServer((req, res) => {
  const path = decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname);
  const file = path.startsWith('/three/')
    ? join(repo, 'node_modules', path.slice(1))
    : path.startsWith('/fonts/')
      ? join(repo, 'web', 'public', 'design-system', path.slice(1))
      : path === '/scenes.json'
        ? join(out, 'scenes.json')
        : join(here, path.slice(1));
  if (!existsSync(file)) {
    res.writeHead(404).end();
    return;
  }
  res.writeHead(200, { 'content-type': types[extname(file)] ?? 'application/octet-stream' });
  createReadStream(file).pipe(res);
});
await new Promise((done) => server.listen(0, '127.0.0.1', done));
const address = server.address();
const port = typeof address === 'object' && address !== null ? address.port : 0;
const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM_PATH || undefined });
const page = await browser.newPage({ viewport: { width: 1600, height: 1200 } });
page.on('pageerror', (e) => console.error('page error:', e.message));
// One after another on one page, as the shots must be: each in steps, in order.
const inTurn = (items, step) => items.reduce((done, item) => done.then(() => step(item)), Promise.resolve());
const pad = (k) => String(k).padStart(3, '0');
await inTurn(scenes, async ({ id, frames }) => {
  await page.goto(`http://127.0.0.1:${port}/gallery.html?id=${id}`);
  await page.waitForFunction(() => window.done === true, null, { timeout: 60000 });
  const fig = page.locator('#fig');
  if (!frames) {
    await fig.screenshot({ path: join(out, `${id}.png`) });
    console.log(join(out, `${id}.png`));
    return;
  }
  const dir = join(out, 'frames', id);
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  await inTurn([...frames.keys()], async (k) => {
    await page.evaluate((n) => window.draw(n), k);
    await fig.screenshot({ path: join(dir, `${pad(k)}.png`) });
  });
  // one palette for the whole animation, so its colours do not flicker from frame to frame
  const gif = join(out, `${id}.gif`);
  const filter =
    'scale=800:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=128:stats_mode=full[p];' +
    '[b][p]paletteuse=dither=sierra2_4a';
  execFileSync('ffmpeg', [
    '-y',
    '-loglevel',
    'error',
    '-framerate',
    '15',
    '-i',
    join(dir, '%03d.png'),
    '-vf',
    filter,
    '-loop',
    '0',
    gif,
  ]);
  console.log(`${gif}: ${frames.length} frames`);
});
await browser.close();
server.close();
