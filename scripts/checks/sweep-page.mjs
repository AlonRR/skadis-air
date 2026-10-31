// SPDX-FileCopyrightText: 2026 Alon A. Rabinowitz
// SPDX-License-Identifier: MPL-2.0
//
// The settings sweep on the built page (D633 a, D634 b; 31 Oct 2026): every board type and connector, each choice's
// options one at a time from its starting values, on a wide screen and a phone. For each state it records the fields
// shown and their labels, a field shown with fewer than two options to choose from, the page wider than the screen,
// the status line, and anything the page wrote to its console as an error; and it shoots each type at its start, light
// and dark, and the solid board at each mounting, for a reviewer. Into .check/sweep/page/.
//
//   npm run build -w skadis-air-web
//   npm run preview -w skadis-air-web -- --host 127.0.0.1 --port 4199 --strictPort
//   node scripts/checks/sweep-page.mjs http://127.0.0.1:4199/
//
// PW_CHROMIUM_PATH picks the Chromium, as for the browser test.

/* oxlint-disable eslint/no-await-in-loop -- one page goes through its states in turn, each built on the last */
import { mkdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BOARD_TYPES, groupOf } from '../../packages/core/dist/index.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const { chromium } = createRequire(join(root, 'web', 'package.json'))('@playwright/test');
const [base] = process.argv.slice(2);
if (!base) {
  console.error('usage: node scripts/checks/sweep-page.mjs <page address>');
  process.exit(2);
}
const out = join(root, '.check', 'sweep', 'page');
const shots = join(out, 'shots');
mkdirSync(shots, { recursive: true });

const screens = [
  { name: 'wide', viewport: { width: 1280, height: 800 } },
  { name: 'phone', viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
];

const statusIs = (page, states, timeout) =>
  page.waitForFunction(
    (s) => s.includes(document.querySelector('[data-testid="board-status"]')?.getAttribute('data-state') ?? ''),
    states,
    { timeout },
  );

/** Waits until what the form shows is built, refused or found wrong. */
async function settled(page) {
  await statusIs(page, ['building'], 2_000).catch(() => {});
  await statusIs(page, ['ready', 'problem', 'invalid'], 90_000);
}

async function choose(page, name, value) {
  const select = page.locator(`select[name="${name}"]`);
  if ((await select.count()) > 0) await select.selectOption(value);
  else {
    const input = page.locator(`input[name="${name}"][value="${value}"]`);
    const fold = input.locator('xpath=ancestor::details[1]');
    if ((await fold.count()) > 0 && (await fold.getAttribute('open')) === null)
      await fold.locator('xpath=./summary').click();
    if (!(await input.isEnabled())) return false;
    await input.check();
  }
  await settled(page);
  return true;
}

/** What the page shows now: every field's label, whether it is shown, and its options with which can be chosen. */
const reading = (page) =>
  page.evaluate(() => {
    const form = document.querySelector('[data-testid="board-form"]');
    const fields = [...form.querySelectorAll('.field, fieldset')].filter((f) => f.querySelector('input, select'));
    return {
      status: document.querySelector('[data-testid="board-status"]')?.textContent?.trim(),
      state: document.querySelector('[data-testid="board-status"]')?.getAttribute('data-state'),
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      fields: fields.map((f) => {
        const radios = [...f.querySelectorAll('input[type="radio"]')];
        const select = f.querySelector('select');
        const name = radios[0]?.name ?? select?.name ?? f.querySelector('input')?.name;
        return {
          name,
          label: (f.querySelector('.ws-label, legend')?.textContent ?? '').trim(),
          hidden: f.closest('[hidden]') !== null,
          folded: f.closest('details') !== null,
          shown: f.closest('[hidden]') === null,
          options: radios.length
            ? radios.map((r) => ({ value: r.value, enabled: !r.disabled }))
            : select
              ? [...select.options].map((o) => ({ value: o.value, enabled: !o.disabled }))
              : undefined,
          ruled: f.querySelector('[data-testid^="ruled-"]')?.textContent?.trim() || undefined,
        };
      }),
    };
  });

async function pick(page, type) {
  const group = groupOf(type) === 'connector' ? 'connector' : 'board';
  if (type.testPrint) {
    await page
      .getByTestId('advanced')
      .locator('summary')
      .click()
      .catch(() => {});
  }
  await choose(page, 'typeGroup', group).catch(() => {});
  await choose(page, 'boardType', type.id).catch(() => {});
}

const browser = await chromium.launch({
  executablePath: process.env.PW_CHROMIUM_PATH || undefined,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const states = [];
const findings = [];
for (const screen of screens) {
  for (const type of BOARD_TYPES) {
    const context = await browser.newContext({
      viewport: screen.viewport,
      isMobile: screen.isMobile,
      hasTouch: screen.hasTouch,
      deviceScaleFactor: screen.deviceScaleFactor,
    });
    const page = await context.newPage();
    const errors = [];
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    page.on('pageerror', (e) => errors.push(String(e)));
    const fresh = async () => {
      await page.goto(base);
      await page.evaluate(() => localStorage.clear());
      await page.goto(base);
      await settled(page);
      await pick(page, type);
    };
    await fresh();
    const shoot = async (name) =>
      page.screenshot({ path: join(shots, `${screen.name}-${name}.png`), fullPage: screen.name === 'phone' });
    const record = async (what) => {
      const r = await reading(page);
      states.push({ screen: screen.name, type: type.id, what, ...r, errors: errors.splice(0) });
      for (const f of r.fields) {
        if (f.hidden || !f.options) continue;
        const live = f.options.filter((o) => o.enabled).length;
        if (live < 2 && f.name !== 'typeGroup' && f.name !== 'boardType')
          findings.push({
            rule: 'one-or-no-choice-shown',
            screen: screen.name,
            type: type.id,
            what,
            field: f.name,
            label: f.label,
            live,
            ruled: f.ruled,
          });
      }
      if (r.overflow > 0)
        findings.push({ rule: 'wider-than-screen', screen: screen.name, type: type.id, what, by: r.overflow });
      for (const e of states.at(-1).errors)
        findings.push({ rule: 'console-error', screen: screen.name, type: type.id, what, error: e });
      return r;
    };
    const start = await record('start');
    await shoot(`${type.id}-start`);
    if (screen.name === 'wide') {
      await page.emulateMedia({ colorScheme: 'dark' });
      await shoot(`${type.id}-start-dark`);
      await page.emulateMedia({ colorScheme: 'light' });
    }
    // each option of each choice shown, from the start
    for (const f of start.fields) {
      if (f.hidden || !f.options || f.name === 'typeGroup' || f.name === 'boardType') continue;
      for (const o of f.options) {
        if (!o.enabled) continue;
        if (
          o.value ===
          (await page
            .locator(`input[name="${f.name}"]:checked, select[name="${f.name}"]`)
            .first()
            .inputValue()
            .catch(() => ''))
        )
          continue;
        await fresh();
        if (!(await choose(page, f.name, o.value).catch(() => false))) continue;
        await record(`${f.name}=${o.value}`);
        if (type.id === 'solid' && f.name === 'screwHead') await shoot(`solid-mounting-${o.value}`);
        if (screen.name === 'phone' && type.id === 'slot-clip') await shoot(`slot-clip-${f.name}-${o.value}`);
      }
    }
    console.log(
      `${screen.name} ${type.id}: ${states.filter((s) => s.type === type.id && s.screen === screen.name).length} states`,
    );
    await context.close();
  }
}
await browser.close();
writeFileSync(join(out, 'states.json'), JSON.stringify(states, null, 1) + '\n');
writeFileSync(join(out, 'findings.json'), JSON.stringify(findings, null, 1) + '\n');
const counts = {};
for (const f of findings) counts[f.rule] = (counts[f.rule] ?? 0) + 1;
console.log(`page: ${states.length} states, ${findings.length} findings`, counts);
