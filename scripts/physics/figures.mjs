// SPDX-FileCopyrightText: 2026 Alon A. Rabinowitz
// SPDX-License-Identifier: MPL-2.0
//
// Photographs the stress figures figures.py wrote into .check/physics/figures/: serves figure.html, three.js and the
// scenes on a port of its own, and saves each scene's picture as docs/figures/physics/<id>.png.
//
//   node scripts/physics/figures.mjs             every scene in .check/physics/figures/index.json
//   node scripts/physics/figures.mjs <id> ...    these scenes
//
// PW_CHROMIUM_PATH picks the Chromium, as for the browser test.
import { createReadStream, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { dirname, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repo = join(here, '..', '..');
const scenes = join(repo, '.check', 'physics', 'figures');
const out = join(repo, 'docs', 'figures', 'physics');
mkdirSync(out, { recursive: true });
const ids =
  process.argv.length > 2 ? process.argv.slice(2) : JSON.parse(readFileSync(join(scenes, 'index.json'), 'utf8'));

const { chromium } = createRequire(join(repo, 'web', 'package.json'))('@playwright/test');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json' };
const server = createServer((req, res) => {
  const path = decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname);
  const file = path.startsWith('/three/')
    ? join(repo, 'node_modules', path.slice(1))
    : path.startsWith('/scenes/')
      ? join(scenes, path.slice('/scenes/'.length))
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
const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
page.on('pageerror', (e) => console.error('page error:', e.message));
// One after another on one page, as the shots must be.
const inTurn = (items, step) => items.reduce((done, item) => done.then(() => step(item)), Promise.resolve());
await inTurn(ids, async (id) => {
  await page.goto(`http://127.0.0.1:${port}/figure.html?id=${id}`);
  await page.waitForFunction(() => window.done === true, null, { timeout: 120000 });
  await page.locator('#fig').screenshot({ path: join(out, `${id}.png`) });
  const hidden = await page.evaluate(() => window.hidden ?? []);
  console.log(
    join(out, `${id}.png`) + (hidden.length ? `: marked spots hidden from their view: ${hidden.join(', ')}` : ''),
  );
});
await browser.close();
server.close();
