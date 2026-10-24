// SPDX-FileCopyrightText: 2026 Alon A. Rabinowitz
// SPDX-License-Identifier: MPL-2.0
//
// The contact sheets of board-history.mjs's pictures (24 Oct 2026): one row per state, its label, release, commit, one
// line and numbers over its three views, 1200 px wide to read on a phone. Run `node scripts/figures/shoot.mjs
// board-history` first; this reads .check/figures/board-history/ (the pictures, numbers.json and, when it has been
// made, grams.json: grams of a 200 x 200 mm board sliced in PETG Basic, by label) and writes lightened.png and
// skeleton.png beside them.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { HISTORY } from './board-history.mjs';

const repo = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const dir = join(repo, '.check', 'figures', 'board-history');
const numbers = JSON.parse(readFileSync(join(dir, 'numbers.json'), 'utf8'));
const gramsFile = join(dir, 'grams.json');
const grams = existsSync(gramsFile) ? JSON.parse(readFileSync(gramsFile, 'utf8')) : {};

// the part of each 1200 x 860 picture a cell shows: [x, y, width, height], all in the picture's pixels, 400 x 233 out
const CROPS = {
  front: [120, 215, 960, 560],
  close: [0, 110, 1200, 700],
  cut: [300, 285, 600, 350],
};
const VIEWS = [
  ['front', 'front, three-quarter'],
  ['close', 'where members meet'],
  ['cut', 'cut across a member'],
];

const cm3 = (mm3) => (mm3 / 1000).toFixed(1);
function row(s) {
  const n = numbers[s.label];
  const g = grams[s.label];
  const share = Math.round((100 * n.boardMm3) / n.solidMm3);
  const numLine =
    `200 x 200 mm: ${cm3(n.boardMm3)} cm3, ${share} % of the solid board's ${cm3(n.solidMm3)} cm3` +
    (g === undefined ? '' : `; sliced in PETG Basic: ${g} g`);
  const cells = VIEWS.map(([v]) => {
    const [x, y, w, h] = CROPS[v];
    const k = 400 / w;
    return `<div class="cell" style="height:${Math.round(h * k)}px;background-image:url(${s.label.toLowerCase()}-${v}.png);background-size:${1200 * k}px auto;background-position:${-x * k}px ${-y * k}px"></div>`;
  }).join('');
  return `<section><h2>${s.label} <span>${s.type === 'lightened' ? 'Lightened' : 'Skeleton'}</span></h2>
<p class="meta">${s.date} · ${s.release} · ${s.commit}</p><p>${s.line}</p><p class="num">${numLine}</p><div class="cells">${cells}</div></section>`;
}

const page = (title, states) => `<!doctype html><meta charset="utf-8"><style>
body{margin:0;width:1200px;background:#fff;color:#212529;font:22px/1.35 'Segoe UI',Arial,sans-serif}
header{padding:18px 24px 6px}h1{margin:0;font-size:34px}header p{margin:4px 0 0;color:#495057;font-size:20px}
.cols{display:flex;padding:0 0 0 0;margin:6px 0 0}.cols div{width:400px;text-align:center;font-weight:600;color:#495057;font-size:19px}
section{padding:10px 0 12px;border-top:3px solid #ced4da;margin-top:8px}
h2{margin:0 24px;font-size:32px}h2 span{font-weight:400;color:#495057;font-size:24px}
section p{margin:2px 24px}.meta{color:#495057}.num{font-weight:600}
.cells{display:flex;margin-top:8px}.cell{width:400px;background-repeat:no-repeat;background-color:#fff;box-sizing:border-box;border-right:3px solid #ced4da}
</style><header><h1>${title}</h1><p>160 x 160 mm board at its starting values; the same camera for every state. The cut face is orange.</p></header>
<div class="cols">${VIEWS.map(([, name]) => `<div>${name}</div>`).join('')}</div>${states.map(row).join('')}`;

const { chromium } = createRequire(join(repo, 'web', 'package.json'))('@playwright/test');
const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM_PATH || undefined });
const tab = await browser.newPage({ viewport: { width: 1200, height: 800 } });
const sheet = async ([type, title]) => {
  const file = join(dir, `${type}-sheet.html`);
  writeFileSync(
    file,
    page(
      title,
      HISTORY.filter((s) => s.type === type),
    ),
  );
  await tab.goto(pathToFileURL(file).href);
  await tab.waitForLoadState('load');
  await tab.screenshot({ path: join(dir, `${type}.png`), fullPage: true });
  console.log(join(dir, `${type}.png`));
};
// one tab, so the sheets one after another
await [
  ['lightened', 'Lightened board: L1 to L3'],
  ['skeleton', 'Skeleton board: S1 to S5'],
].reduce((done, entry) => done.then(() => sheet(entry)), Promise.resolve());
await browser.close();
