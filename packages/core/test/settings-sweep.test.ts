// The rules the settings sweep found holding over every board type and connector (D633 a, 31 Oct 2026), kept so they
// go on holding: every choice of every type beside every other, the numbers at their starting values and all at their
// greatest at once. Each rule is a function over a type's settings, and each is shown failing first on settings
// declared here to break it, so a rule that checks nothing cannot pass. scripts/checks/sweep-settings.mjs is the
// sweep itself, the geometry too.
import { describe, expect, it } from 'vitest';
import { BOARD_TYPES } from '../src/board-types/index.js';
import { ALL_OPEN, type Sides } from '../src/slots.js';
import {
  defaultValues,
  defineSettings,
  optionsOff,
  readValues,
  settingsNotApplying,
  type Setting,
} from '../src/settings.js';

const CLOSED: Sides = { left: 'closed', right: 'closed', bottom: 'closed', top: 'closed' };
const MIXED: Sides = { left: 'closed', right: 'open', bottom: 'closed', top: 'open' };
const stable = (v: unknown) =>
  JSON.stringify(v, (_, x: unknown) =>
    x !== null && typeof x === 'object' && !Array.isArray(x)
      ? Object.fromEntries(Object.entries(x).sort(([a], [b]) => a.localeCompare(b)))
      : x,
  );

/** Every combination of the choices and the sides, with the numbers at their start, and all at their greatest. */
function combinations(settings: readonly Setting[]): Record<string, unknown>[] {
  let rows: Record<string, unknown>[] = [{}];
  for (const s of settings) {
    if (s.kind === 'number') continue;
    const values: unknown[] = s.kind === 'choice' ? s.options.map((o) => o.value) : [ALL_OPEN, CLOSED, MIXED];
    rows = rows.flatMap((r) => values.map((v) => ({ ...r, [s.key]: v })));
  }
  const greatest = Object.fromEntries(
    settings.flatMap((s) => (s.kind === 'number' ? [[s.key, s.max ?? s.default * 10]] : [])),
  );
  return rows.flatMap((r) => [r, { ...r, ...greatest }]);
}

type Broken = { rule: string; given: Record<string, unknown>; what: string };

/** The values that apply, those that do not left out: what a part is made from. */
function applying(settings: readonly Setting[], values: Record<string, unknown>) {
  const hidden = settingsNotApplying(settings, values);
  return Object.fromEntries(Object.entries(values).filter(([k]) => !hidden.includes(k)));
}

/** The values as the page reads them (C627): a choice moved off an option the others rule out, then what applies. */
function pageOrder(settings: readonly Setting[], given: Record<string, unknown>) {
  const off = optionsOff(settings, given);
  const moved = { ...given };
  for (const s of settings) {
    const out = off[s.key];
    const chosen = moved[s.key];
    if (s.kind !== 'choice' || out === undefined || typeof chosen !== 'string' || !(chosen in out)) continue;
    const left = s.options.find((o) => !(o.value in out));
    if (left !== undefined) moved[s.key] = left.value;
  }
  return readValues(settings, moved);
}

/** Every rule broken by these settings, over every combination of them. */
function broken(settings: readonly Setting[]): Broken[] {
  const found: Broken[] = [];
  const start = defaultValues(settings);
  if (!readValues(settings, start).ok) found.push({ rule: 'start-reads', given: start, what: 'refused' });
  const offAtStart = optionsOff(settings, start);
  for (const s of settings)
    if (s.kind === 'choice' && offAtStart[s.key]?.[s.default] !== undefined)
      found.push({ rule: 'start-not-ruled-out', given: start, what: s.key });

  for (const given of combinations(settings)) {
    const off = optionsOff(settings, given);
    const hidden = settingsNotApplying(settings, given);
    for (const s of settings)
      if (s.kind === 'choice' && !hidden.includes(s.key) && s.options.every((o) => off[s.key]?.[o.value] !== undefined))
        found.push({ rule: 'a-choice-left', given, what: s.key });
    const read = readValues(settings, given);
    const page = pageOrder(settings, given);
    if (
      read.ok !== page.ok ||
      (read.ok && page.ok && stable(applying(settings, read.values)) !== stable(applying(settings, page.values)))
    )
      found.push({ rule: 'page-reads-as-library', given, what: 'differs' });
  }
  return found;
}

// Settings that break each rule, as controls
const HEAD = {
  kind: 'choice',
  key: 'head',
  label: 'Head',
  options: [
    { value: 'flat', label: 'Flat' },
    { value: 'round', label: 'Round' },
  ],
  default: 'flat',
} as const satisfies Setting;
const roundOff = (v: Readonly<Record<string, unknown>>) =>
  v['head'] === 'round' ? 'not with a round head' : undefined;

describe('the rules the settings sweep holds every type to (D633 a)', () => {
  it('finds a start the reader refuses, and a start ruled out', () => {
    const refused = defineSettings([
      { kind: 'number', key: 'footMm', label: 'Foot', unit: 'mm', default: 2, min: 3, step: 1 },
    ]);
    expect(broken(refused).map((b) => b.rule)).toContain('start-reads');
    const ruledOut = defineSettings([
      { ...HEAD, default: 'round' },
      {
        kind: 'choice',
        key: 'feet',
        label: 'Feet',
        options: [
          { value: 'four', label: 'Four', offWhen: roundOff },
          { value: 'none', label: 'None' },
        ],
        default: 'four',
      },
    ]);
    expect(broken(ruledOut).map((b) => b.rule)).toContain('start-not-ruled-out');
  });

  it('finds a choice shown with every option ruled out', () => {
    const none = defineSettings([
      HEAD,
      {
        kind: 'choice',
        key: 'feet',
        label: 'Feet',
        options: [
          { value: 'none', label: 'None', offWhen: roundOff },
          { value: 'four', label: 'Four', offWhen: roundOff },
        ],
        default: 'none',
      },
    ]);
    expect(broken(none).map((b) => b.rule)).toContain('a-choice-left');
  });

  it('finds the library deciding what applies before it moves a ruled-out choice, where the page moves it first (C627)', () => {
    // "four" is ruled out with a round head and moves to "none", where the pad applies: read before the move, the pad
    // the reader was given is dropped as not applying, and the page, which moves first, keeps it
    const order = defineSettings([
      HEAD,
      {
        kind: 'choice',
        key: 'feet',
        label: 'Feet',
        options: [
          { value: 'none', label: 'None' },
          { value: 'four', label: 'Four', offWhen: roundOff },
        ],
        default: 'none',
      },
      {
        kind: 'number',
        key: 'padMm',
        label: 'Pad',
        unit: 'mm',
        default: 5,
        min: 3,
        max: 9,
        step: 1,
        appliesWhen: (v) => v['feet'] === 'none',
      },
    ]);
    expect(broken(order).map((b) => b.rule)).toContain('page-reads-as-library');
  });

  for (const type of BOARD_TYPES)
    it(`holds for ${type.id}`, () => {
      expect(broken(type.settings)).toEqual([]);
    });
});
