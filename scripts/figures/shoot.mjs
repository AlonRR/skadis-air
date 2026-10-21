// SPDX-FileCopyrightText: 2026 Alon A. Rabinowitz
// SPDX-License-Identifier: MPL-2.0
//
// Draws a design pass's figures (the connectors' on 19 Oct 2026, the boards' on 21 Oct): runs the pass's scenes
// against the library's build, serves render.html, three.js and the scenes on a port of its own, and photographs
// each scene into .check/figures/<pass>/, to be copied into docs/figures/<pass>/ when a review takes them. Reads the
// library's build, so run `npm run build -w skadis-air` first.
//
//   node scripts/figures/shoot.mjs <pass>          e.g. boards-pass
//
// PW_CHROMIUM_PATH picks the Chromium, as for the browser test.
import { createReadStream, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { dirname, extname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { makeKit } from './kit.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const repo = join(here, '..', '..');
const pass = process.argv[2];
if (!pass || !existsSync(join(here, `${pass}.mjs`))) {
  console.error('usage: node scripts/figures/shoot.mjs <pass>, a module beside this one');
  process.exit(2);
}
const out = join(repo, '.check', 'figures', pass);
mkdirSync(out, { recursive: true });
const { build } = await import(pathToFileURL(join(here, `${pass}.mjs`)).href);
const scenes = build(await makeKit(repo));
writeFileSync(join(out, 'scenes.json'), JSON.stringify(scenes));

const { chromium } = createRequire(join(repo, 'web', 'package.json'))('@playwright/test');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json' };
const server = createServer((req, res) => {
  const path = decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname);
  const file = path.startsWith('/three/')
    ? join(repo, 'node_modules', path.slice(1))
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
const page = await browser.newPage({ viewport: { width: 1200, height: 860 } });
page.on('pageerror', (e) => console.error('page error:', e.message));
// One after another on one page, as the shots must be: each in steps, in order.
const inTurn = (items, step) => items.reduce((done, item) => done.then(() => step(item)), Promise.resolve());
await inTurn(scenes, async ({ id }) => {
  await page.goto(`http://127.0.0.1:${port}/render.html?id=${id}`);
  await page.waitForFunction(() => window.done === true, null, { timeout: 30000 });
  await page.locator('#fig').screenshot({ path: join(out, `${id}.png`) });
  console.log(`${join(out, id)}.png`);
});
await browser.close();
server.close();
