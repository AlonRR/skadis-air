// SPDX-FileCopyrightText: 2026 Alon A. Rabinowitz
// SPDX-License-Identifier: MPL-2.0
//
// The settings sweep (D633 a, D634 b; 31 Oct 2026): every board type's and connector's settings, run through the
// library to find what a reader of the page would trip on: a field that offers one choice, two choices that make the
// same part, a choice that is always refused, a refusal that names no field or a hidden one, two parts under one file
// name, and a part that is open, has facets of no area or is in more pieces than it should be. It writes what it finds
// into .check/sweep/; the report is for a reviewer, and the rules that hold are kept as tests
// (packages/core/test/settings-sweep.test.ts). Reads the library's build, so run `npm run build -w skadis-air` first.
//
//   node scripts/checks/sweep-settings.mjs form              # every choice with every other, no geometry: seconds
//   node scripts/checks/sweep-settings.mjs alias [type-id]   # each live option against the others, built small
//   node scripts/checks/sweep-settings.mjs build [type-id]   # every pair of values built and checked
//   node scripts/checks/sweep-settings.mjs report            # .check/sweep/report.md from what the passes wrote
//
// The alias and build passes keep one file per part built, under .check/sweep/parts/, and skip a part already there, so
// a run stopped part way finishes only what is left.
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  BOARD_TYPES,
  DEFAULT_BED,
  buildBoard,
  buildWall,
  defaultValues,
  groupOf,
  loadEngine,
  meshOf,
  optionsOff,
  printedPart,
  readValues,
  settingsNotApplying,
} from '../../packages/core/dist/index.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const out = join(root, '.check', 'sweep');
const partsDir = join(out, 'parts');

const OPEN = { left: 'open', right: 'open', bottom: 'open', top: 'open' };
const CLOSED = { left: 'closed', right: 'closed', bottom: 'closed', top: 'closed' };
const MIXED = { left: 'closed', right: 'open', bottom: 'closed', top: 'open' };

const stable = (v) =>
  JSON.stringify(v, (_, x) =>
    x && typeof x === 'object' && !Array.isArray(x)
      ? Object.fromEntries(
          Object.keys(x)
            .sort()
            .map((k) => [k, x[k]]),
        )
      : x,
  );
const hash = (v) => createHash('sha256').update(stable(v)).digest('hex').slice(0, 16);
const writeJson = (file, data) => {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(data, null, 1) + '\n');
};

// A small seeded random source, so a sweep is the same each run (mulberry32).
function random(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The values a setting is tried at: every option, the sides open, closed and mixed, a number at its least, starting
 * and greatest value; a board's size at 40, 120 and 240 mm when it is built, past which a board only grows. */
function levels(type, s, building) {
  if (s.kind === 'choice') return s.options.map((o) => o.value);
  if (s.kind === 'sides') return [OPEN, CLOSED, MIXED];
  const board = groupOf(type) === 'board';
  if (building && board && (s.key === 'widthMm' || s.key === 'heightMm')) return [40, 120, 240];
  if (building && board && (s.key === 'panelWidthMm' || s.key === 'panelHeightMm')) return [40, 120, 400];
  const top = s.max ?? s.default * 10;
  return [...new Set([s.min, s.default, top])];
}

const pairKey = (i, a, j, b) => (i < j ? `${i}:${a}|${j}:${b}` : `${j}:${b}|${i}:${a}`);

/** Rows that between them hold every value of every setting beside every value of every other (a greedy pairwise
 * cover, as AETG builds one). */
function pairwise(factors, seed) {
  const rand = random(seed);
  const uncovered = new Set();
  factors.forEach((f, i) =>
    factors.forEach((g, j) => {
      if (j <= i) return;
      for (let a = 0; a < f.length; a++) for (let b = 0; b < g.length; b++) uncovered.add(pairKey(i, a, j, b));
    }),
  );
  const rows = [];
  while (uncovered.size > 0) {
    let best = null;
    let bestScore = -1;
    const first = [...uncovered][Math.floor(rand() * Math.min(uncovered.size, 50))];
    for (let c = 0; c < 40; c++) {
      const row = Array.from({ length: factors.length }, () => -1);
      const [p, q] = first.split('|').map((x) => x.split(':').map(Number));
      row[p[0]] = p[1];
      row[q[0]] = q[1];
      const order = factors.map((_, i) => i).filter((i) => row[i] < 0);
      for (let k = order.length - 1; k > 0; k--) {
        const r = Math.floor(rand() * (k + 1));
        [order[k], order[r]] = [order[r], order[k]];
      }
      for (const i of order) {
        let pick = 0;
        let most = -1;
        for (let a = 0; a < factors[i].length; a++) {
          let n = 0;
          row.forEach((b, j) => {
            if (j !== i && b >= 0 && uncovered.has(pairKey(i, a, j, b))) n++;
          });
          if (n > most || (n === most && rand() < 0.5)) [pick, most] = [a, n];
        }
        row[i] = pick;
      }
      let score = 0;
      for (let i = 0; i < row.length; i++)
        for (let j = i + 1; j < row.length; j++) if (uncovered.has(pairKey(i, row[i], j, row[j]))) score++;
      if (score > bestScore) [best, bestScore] = [row, score];
    }
    for (let i = 0; i < best.length; i++)
      for (let j = i + 1; j < best.length; j++) uncovered.delete(pairKey(i, best[i], j, best[j]));
    rows.push(best);
  }
  return rows;
}

/** Every combination of the type's choices and sides, its numbers at their starting values. */
function everyChoice(type) {
  const choices = type.settings.filter((s) => s.kind !== 'number');
  let rows = [{}];
  for (const s of choices) rows = rows.flatMap((r) => levels(type, s, false).map((v) => ({ ...r, [s.key]: v })));
  return rows;
}

const live = (s, off) => s.options.filter((o) => !(off[s.key] && o.value in off[s.key]));

/** The values that apply, those that do not left out: what the part is made from. */
function applying(type, values) {
  const hidden = settingsNotApplying(type.settings, values);
  return Object.fromEntries(Object.entries(values).filter(([k]) => !hidden.includes(k)));
}

/** The values as the page reads them (C627): a choice moved off an option the others rule out first, and what
 * applies decided from the values that leaves. */
function pageOrder(type, given) {
  const moved = { ...given };
  const off = optionsOff(type.settings, given);
  for (const s of type.settings) {
    if (s.kind !== 'choice' || !off[s.key] || !(moved[s.key] in off[s.key])) continue;
    const left = live(s, off)[0];
    if (left) moved[s.key] = left.value;
  }
  return readValues(type.settings, moved);
}

// ---- the form pass ----------------------------------------------------------------------------------------------

function formPass() {
  const findings = [];
  const add = (f) => findings.push(f);
  const text = { types: [], reasons: {}, screws: {}, tape: {} };
  let combos = 0;
  for (const type of BOARD_TYPES) {
    text.types.push({
      id: type.id,
      name: type.name,
      group: groupOf(type),
      testPrint: type.testPrint ?? false,
      description: type.description,
      settings: type.settings.map((s) => ({
        key: s.key,
        kind: s.kind,
        label: s.label,
        help: s.help,
        advanced: s.advanced ?? false,
        conditional: s.appliesWhen !== undefined,
        ...(s.kind === 'choice' ? { options: s.options.map((o) => ({ value: o.value, label: o.label })) } : {}),
        ...(s.kind === 'number' ? { unit: s.unit, min: s.min, max: s.max, step: s.step, default: s.default } : {}),
      })),
    });

    // the starting values read, and none of them ruled out
    const defaults = defaultValues(type.settings);
    const read = readValues(type.settings, defaults);
    if (!read.ok) add({ rule: 'defaults-read', type: type.id, errors: read.errors });
    const offAtStart = optionsOff(type.settings, defaults);
    for (const s of type.settings)
      if (s.kind === 'choice' && offAtStart[s.key]?.[s.default] !== undefined)
        add({
          rule: 'default-ruled-out',
          type: type.id,
          key: s.key,
          value: s.default,
          why: offAtStart[s.key][s.default],
        });

    const labels = new Map(); // file name -> the values read that give it
    const numbers = type.settings.filter((s) => s.kind === 'number');
    for (const choice of everyChoice(type)) {
      // each number in turn at each of its edges, the rest at their starting values, besides the choices alone
      const variants = [choice];
      for (const n of numbers)
        for (const v of levels(type, n, false)) if (v !== n.default) variants.push({ ...choice, [n.key]: v });
      // every number away from its start at once, to meet the rules that hang on several (C627)
      variants.push({ ...choice, ...Object.fromEntries(numbers.map((n) => [n.key, levels(type, n, false).at(-1)])) });
      for (const given of variants) {
        combos++;
        const off = optionsOff(type.settings, given);
        const hidden = settingsNotApplying(type.settings, given);
        const r = readValues(type.settings, given);
        for (const s of type.settings) {
          if (s.kind !== 'choice') continue;
          for (const [value, why] of Object.entries(off[s.key] ?? {}))
            (text.reasons[`${type.id}.${s.key}.${value}`] ??= new Set()).add(why);
          if (hidden.includes(s.key)) continue;
          const n = live(s, off).length;
          if (n === 0) add({ rule: 'no-live-option', type: type.id, key: s.key, given });
          else if (n === 1 && given === choice)
            add({ rule: 'one-live-option', type: type.id, key: s.key, live: live(s, off)[0].value, given: choice });
        }
        // the page's order and the library's read the same values
        const p = pageOrder(type, given);
        if (r.ok !== p.ok || (r.ok && stable(applying(type, r.values)) !== stable(applying(type, p.values))))
          add({
            rule: 'page-library-order',
            type: type.id,
            given,
            library: r.ok ? r.values : r.errors,
            page: p.ok ? p.values : p.errors,
          });
        if (!r.ok) {
          // a refusal that names a field the page hides cannot be put right there
          for (const e of r.errors)
            if (hidden.includes(e.key)) add({ rule: 'refusal-on-hidden', type: type.id, given, error: e });
          continue;
        }
        // the sentences the page shows beside the screw and the tape; a value the build refuses refuses them too
        for (const group of ['screws', 'tape']) {
          if (!type[group]) continue;
          try {
            (text[group][type.id] ??= new Set()).add(type[group](r.values));
          } catch (error) {
            if (!(error instanceof RangeError)) throw error;
          }
        }
        // a setting the page hides changes nothing read
        for (const key of hidden) {
          const s = type.settings.find((x) => x.key === key);
          const other = levels(type, s, false).find((v) => stable(v) !== stable(r.values[key]));
          if (other === undefined) continue;
          const r2 = readValues(type.settings, { ...given, [key]: other });
          if (!r2.ok || stable(r2.values) !== stable(r.values))
            add({ rule: 'hidden-changes-part', type: type.id, key, given });
        }
        const name = type.label(r.values);
        const seen = labels.get(name) ?? new Map();
        seen.set(stable(r.values), r.values);
        labels.set(name, seen);
      }
    }
    // one file name for values read differently: the same part, or two parts under one name (the alias pass builds them)
    // grouped by the settings that differ under one name, which the name leaves out
    const unnamed = new Map();
    for (const [name, seen] of labels) {
      if (seen.size < 2) continue;
      const all = [...seen.values()].map((v) => applying(type, v));
      const keys = Object.keys(all[0]).filter((k) => all.some((v) => stable(v[k]) !== stable(all[0][k])));
      const k = keys.sort().join(',');
      const u = unnamed.get(k) ?? { names: 0, example: name };
      u.names++;
      unnamed.set(k, u);
    }
    for (const [keys, u] of unnamed)
      add({ rule: 'left-out-of-name', type: type.id, key: keys, name: `${u.names} names, e.g. ${u.example}` });
  }
  for (const group of ['reasons', 'screws', 'tape'])
    text[group] = Object.fromEntries(Object.entries(text[group]).map(([k, v]) => [k, [...v].filter(Boolean)]));
  writeJson(join(out, 'form.json'), { combos, findings });
  writeJson(join(out, 'text.json'), text);
  const counts = {};
  for (const f of findings) counts[f.rule] = (counts[f.rule] ?? 0) + 1;
  console.log(`form: ${combos} combinations read, ${findings.length} findings`, counts);
}

// ---- building ---------------------------------------------------------------------------------------------------

function degenerate(mesh) {
  let n = 0;
  for (let t = 0; t < mesh.triangles.length / 3; t++) {
    const c = [0, 1, 2].map((k) => {
      const v = mesh.triangles[t * 3 + k] * 3;
      return [0, 1, 2].map((d) => Math.fround(mesh.positions[v + d])).join(',');
    });
    if (new Set(c).size < 3) n++;
  }
  return n;
}

function edgesNotOnTwo(mesh) {
  const corner = (v) => [0, 1, 2].map((d) => Math.fround(mesh.positions[v * 3 + d])).join(',');
  const edges = new Map();
  for (let t = 0; t < mesh.triangles.length / 3; t++) {
    const c = [0, 1, 2].map((k) => corner(mesh.triangles[t * 3 + k]));
    c.forEach((a, k) => {
      const b = c[(k + 1) % 3];
      const e = a < b ? `${a}|${b}` : `${b}|${a}`;
      edges.set(e, (edges.get(e) ?? 0) + 1);
    });
  }
  return [...edges.values()].filter((n) => n !== 2).length;
}

const r3 = (x) => Math.round(x * 1000) / 1000;

/** One solid's measures, as it prints: its size, volume and area to the micrometre, its pieces, and its mesh's faults. */
function measure(solid, type) {
  const posed = printedPart(type, solid);
  const box = posed.boundingBox();
  const pieces = posed.decompose();
  const mesh = meshOf(posed);
  const m = {
    size: [0, 1, 2].map((k) => r3(box.max[k] - box.min[k])),
    volume: Math.round(posed.volume() * 100) / 100,
    area: Math.round(posed.surfaceArea() * 100) / 100,
    pieces: pieces.length,
    triangles: posed.numTri(),
    degenerate: degenerate(mesh),
    openEdges: edgesNotOnTwo(mesh),
  };
  for (const p of pieces) p.delete();
  posed.delete();
  return m;
}

const fits = (size, bed) => (size[0] <= bed.xMm && size[1] <= bed.yMm) || (size[1] <= bed.xMm && size[0] <= bed.yMm);

/** Builds one part from the values given, or reads the file a run before wrote for it. */
function buildOne(engine, type, given, pass) {
  const id = hash({ type: type.id, given });
  const file = join(partsDir, `${type.id}-${id}.json`);
  if (existsSync(file)) return JSON.parse(readFileSync(file, 'utf8'));
  const read = readValues(type.settings, given);
  const hidden = settingsNotApplying(type.settings, given);
  let result;
  if (!read.ok) result = { refused: 'read', errors: read.errors };
  else {
    const started = performance.now();
    const built = buildBoard(engine, type, read.values);
    const ms = Math.round(performance.now() - started);
    if (!built.ok) result = { refused: 'build', problem: built.problem, keys: built.keys, ms };
    else {
      result = { ms, ...measure(built.solid, type), name: type.label(read.values) };
      built.solid.delete();
      // a wall's panels, each as it is printed, each on the bed
      if (read.values.panels === 'split') {
        const wall = buildWall(engine, type, read.values, DEFAULT_BED);
        result.panels = wall.panels.map((p) => {
          const m = measure(p.solid, type);
          p.solid.delete();
          return { ...m, fitsBed: fits(m.size, DEFAULT_BED) };
        });
      }
    }
  }
  const record = { type: type.id, pass, given, hidden, values: read.ok ? read.values : undefined, ...result };
  writeJson(file, record);
  return record;
}

const chosenTypes = (id) => (id ? BOARD_TYPES.filter((t) => t.id === id) : BOARD_TYPES);

async function buildPass(id) {
  const engine = await loadEngine();
  for (const type of chosenTypes(id)) {
    const factors = type.settings.map((s) => levels(type, s, true));
    const rows = pairwise(factors, 633);
    let i = 0;
    for (const row of rows) {
      const given = Object.fromEntries(type.settings.map((s, k) => [s.key, factors[k][row[k]]]));
      buildOne(engine, type, given, 'build');
      if (++i % 10 === 0) console.log(`${type.id}: ${i} of ${rows.length}`);
    }
    console.log(`${type.id}: ${rows.length} rows built`);
  }
}

/** Each choice's live options built in turn, every other choice and the sides in a pairwise set of contexts, a board
 * 80 mm square: two options that make the same part, where the page lets both be chosen, are one too many. */
async function aliasPass(id) {
  const engine = await loadEngine();
  for (const type of chosenTypes(id)) {
    const choices = type.settings.filter((s) => s.kind !== 'number');
    if (!choices.some((s) => s.kind === 'choice')) continue;
    const factors = choices.map((s) => levels(type, s, true));
    const base = groupOf(type) === 'board' ? { widthMm: 80, heightMm: 80 } : {};
    const contexts = pairwise(factors, 634).map((row) => ({
      ...base,
      ...Object.fromEntries(choices.map((s, k) => [s.key, factors[k][row[k]]])),
    }));
    // which part each option made, by the field varied and the context, for the report to compare
    const index = [];
    let i = 0;
    for (const [c, context] of contexts.entries()) {
      for (const s of type.settings) {
        if (s.kind !== 'choice' || NOT_ALIASES.has(s.key)) continue;
        for (const o of s.options) {
          const given = { ...context, [s.key]: o.value };
          // only where the page shows the field and lets this option be chosen
          if (settingsNotApplying(type.settings, given).includes(s.key)) continue;
          if (optionsOff(type.settings, given)[s.key]?.[o.value] !== undefined) continue;
          const part = buildOne(engine, type, given, 'alias');
          index.push({
            context: c,
            key: s.key,
            option: o.value,
            name: part.name,
            sig: part.volume === undefined ? null : sig(part),
          });
        }
      }
      console.log(`${type.id}: context ${++i} of ${contexts.length}`);
    }
    writeJson(join(out, `alias-${type.id}.json`), index);
  }
}

// Choices two of whose options make one part by design: a screw's size "Same as the screw size" or "Own" at the same
// size; and "panels", a board or a wall, alike where a wall is one board on the bed.
const NOT_ALIASES = new Set(['keyholeScrewSize', 'lockScrewSize', 'clipScrewSize', 'panels']);

// ---- the report -------------------------------------------------------------------------------------------------

const sig = (p) => stable([p.size, p.volume, p.area, p.pieces]);

function report() {
  const form = JSON.parse(readFileSync(join(out, 'form.json'), 'utf8'));
  const parts = existsSync(partsDir)
    ? readdirSync(partsDir).map((f) => JSON.parse(readFileSync(join(partsDir, f), 'utf8')))
    : [];
  const lines = ['# Settings sweep', '', `Form pass: ${form.combos} combinations read.`, ''];
  const byRule = {};
  for (const f of form.findings) (byRule[f.rule] ??= []).push(f);

  // the form's findings, grouped so a rule that fires for many combinations reads as one line per field
  lines.push('## The form', '');
  for (const [rule, list] of Object.entries(byRule)) {
    lines.push(`### ${rule} (${list.length})`, '');
    const groups = new Map();
    for (const f of list) {
      const k = `${f.type} ${f.key ?? ''} ${f.live ?? f.name ?? ''}`.trim();
      groups.set(k, [...(groups.get(k) ?? []), f]);
    }
    for (const [k, fs] of groups)
      lines.push(`- \`${k}\`: ${fs.length}; e.g. \`${stable(fs[0].given ?? fs[0].values)}\``);
    lines.push('');
  }

  // the parts built
  const built = parts.filter((p) => p.volume !== undefined);
  const refused = parts.filter((p) => p.refused);
  lines.push('## The parts built', '', `${parts.length} parts: ${built.length} built, ${refused.length} refused.`, '');
  const faults = [];
  for (const p of built) {
    const want = BOARD_TYPES.find((t) => t.id === p.type).parts ?? 1;
    const pieces = p.panels ? p.panels.length : want;
    if (p.openEdges > 0) faults.push(['open-edges', p, `${p.openEdges} edges not on two facets`]);
    if (p.degenerate > 0) faults.push(['degenerate-facets', p, `${p.degenerate} facets of no area`]);
    if (!p.panels && p.pieces !== pieces) faults.push(['pieces', p, `${p.pieces} pieces, ${pieces} expected`]);
    for (const [k, panel] of (p.panels ?? []).entries()) {
      if (!panel.fitsBed) faults.push(['panel-off-bed', p, `panel ${k} ${panel.size.join(' x ')} mm`]);
      if (panel.openEdges > 0 || panel.degenerate > 0) faults.push(['panel-mesh', p, `panel ${k}`]);
      if (panel.pieces !== want) faults.push(['panel-pieces', p, `panel ${k}: ${panel.pieces} pieces`]);
    }
    const group = groupOf(BOARD_TYPES.find((t) => t.id === p.type));
    if (group === 'connector' && !fits(p.size, DEFAULT_BED)) faults.push(['off-bed', p, p.size.join(' x ')]);
  }
  for (const p of refused) {
    if (p.refused === 'build' && p.keys.length === 0) faults.push(['refusal-names-nothing', p, p.problem]);
    if (p.refused === 'build' && p.keys.some((k) => p.hidden.includes(k)))
      faults.push(['refusal-on-hidden', p, `${p.problem} [${p.keys}]`]);
  }
  // a live option refused wherever it was built
  const tried = new Map();
  for (const p of parts) {
    const type = BOARD_TYPES.find((t) => t.id === p.type);
    for (const s of type.settings) {
      if (s.kind !== 'choice' || p.hidden.includes(s.key)) continue;
      const k = `${p.type}.${s.key}=${p.given[s.key]}`;
      const t = tried.get(k) ?? { ok: 0, no: 0 };
      if (p.volume !== undefined) t.ok++;
      else t.no++;
      tried.set(k, t);
    }
  }
  for (const [k, t] of tried)
    if (t.ok === 0) faults.push(['always-refused', { type: k, given: {} }, `refused ${t.no} of ${t.no}`]);
  // two live options of one field that make the same part, each else alike
  const aliases = new Map();
  for (const type of BOARD_TYPES) {
    const file = join(out, `alias-${type.id}.json`);
    if (!existsSync(file)) continue;
    const bySig = new Map();
    for (const e of JSON.parse(readFileSync(file, 'utf8'))) {
      if (e.sig === null) continue;
      const k = `${e.key}|${e.context}|${e.sig}`;
      bySig.set(k, [...(bySig.get(k) ?? []), e]);
    }
    for (const es of bySig.values()) {
      if (es.length < 2) continue;
      const a = `${type.id}.${es[0].key}: ${es.map((e) => e.option).join(' = ')}`;
      const seen = aliases.get(a) ?? { type: type.id, count: 0, names: es.map((e) => e.name), context: es[0].context };
      seen.count++;
      aliases.set(a, seen);
    }
  }
  for (const [a, seen] of aliases)
    faults.push([
      'same-part-two-options',
      { type: seen.type, given: { context: seen.context } },
      `${a}, in ${seen.count} contexts (${seen.names.join(', ')})`,
    ]);
  // one file name, two parts; one part, two file names
  const byName = new Map();
  for (const p of built) byName.set(`${p.type}|${p.name}`, [...(byName.get(`${p.type}|${p.name}`) ?? []), p]);
  for (const [k, ps] of byName) {
    const sigs = new Set(ps.map(sig));
    if (sigs.size > 1) faults.push(['one-name-two-parts', ps[0], `${k}: ${sigs.size} different parts`]);
  }
  const slow = [...built].sort((a, b) => b.ms - a.ms).slice(0, 10);

  const faultGroups = {};
  for (const [rule, p, what] of faults) (faultGroups[rule] ??= []).push({ p, what });
  for (const [rule, list] of Object.entries(faultGroups)) {
    lines.push(`### ${rule} (${list.length})`, '');
    for (const { p, what } of list.slice(0, 25)) lines.push(`- \`${p.type}\` ${what}; given \`${stable(p.given)}\``);
    if (list.length > 25) lines.push(`- … and ${list.length - 25} more`);
    lines.push('');
  }
  lines.push('### The slowest builds', '');
  for (const p of slow) lines.push(`- ${p.ms} ms \`${p.type}\` ${p.name}`);
  lines.push('');
  writeFileSync(join(out, 'report.md'), lines.join('\n'));
  writeJson(
    join(out, 'faults.json'),
    faults.map(([rule, p, what]) => ({ rule, type: p.type, what, given: p.given })),
  );
  console.log(`report: ${form.findings.length} form findings, ${parts.length} parts, ${faults.length} part findings`);
}

const [pass, id] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
if (pass === 'form') formPass();
else if (pass === 'build') await buildPass(id);
else if (pass === 'alias') await aliasPass(id);
else if (pass === 'report') report();
else {
  console.error('usage: sweep-settings.mjs form | alias [type] | build [type] | report');
  process.exit(2);
}
