// What the settings sweep found against decisions already made, and the owner's answers to it (A640, D635, D637, D638,
// 9 Nov 2026), each with a control where a rule could pass by checking nothing.
import { describe, expect, it } from 'vitest';
import { BOARD_TYPES } from '../src/board-types/index.js';
import { loadEngine } from '../src/engine.js';
import {
  type ChoiceSetting,
  defaultValues,
  defineSettings,
  optionLeft,
  optionsOff,
  readValues,
  SettingsProblem,
  settingsNotApplying,
  type Setting,
} from '../src/settings.js';
import { ALL_OPEN, type Sides } from '../src/slots.js';
import { meshOf } from '../src/stl.js';
import { degenerateFacets, edgesNotOnTwoFacets } from './facets.js';

const engine = await loadEngine();
const CLOSED: Sides = { left: 'closed', right: 'closed', bottom: 'closed', top: 'closed' };
const typeOf = (id: string) => {
  const type = BOARD_TYPES.find((t) => t.id === id);
  if (type === undefined) throw new Error(`no type ${id}`);
  return type;
};
const BOARDS = ['solid', 'lightened', 'skeleton'];
const settingOf = (id: string, key: string): Setting => {
  const s = typeOf(id).settings.find((x) => x.key === key);
  if (s === undefined) throw new Error(`${id} has no ${key}`);
  return s;
};
const read = (id: string, given: Record<string, unknown>) => {
  const type = typeOf(id);
  const r = readValues(type.settings, { ...defaultValues(type.settings), ...given });
  if (!r.ok) throw new Error(`refused: ${JSON.stringify(r.errors)}`);
  return r.values as never as Record<string, never>;
};
const reasonsOf = (id: string, given: Record<string, unknown>, key: string) => {
  const type = typeOf(id);
  return Object.values(optionsOff(type.settings, { ...defaultValues(type.settings), ...given })[key] ?? {});
};
/** The keys a refused build names, or null if it was not refused so. */
function refusedKeys(id: string, given: Record<string, unknown>): readonly string[] | null {
  const type = typeOf(id);
  try {
    type.build(engine, read(id, given)).delete();
    return null;
  } catch (error) {
    return error instanceof SettingsProblem ? error.keys : null;
  }
}

describe('the shifted pattern is named so (D642, 9 Nov 2026)', () => {
  for (const id of BOARDS)
    it(`${id}: the option and the file name`, () => {
      const s = settingOf(id, 'seams') as ChoiceSetting;
      expect(s.options.find((o) => o.value === 'offset')?.label).toBe('Through the slots, shifted');
      const start = defaultValues(typeOf(id).settings);
      expect(typeOf(id).label({ ...start, seams: 'offset' })).toMatch(/-shifted/);
    });
});

describe('a ruled-out choice moves where the owner said (D635 a)', () => {
  for (const screwHead of ['countersunk', 'round'])
    it(`Behind slots moves to At the corners with a ${screwHead} screw`, () => {
      expect(read('solid', { screwHead, standoffs: 'slots' })['standoffs']).toBe('corners');
    });

  it('moves to the first option left where a setting names none, the control', () => {
    const s = defineSettings([
      {
        kind: 'choice',
        key: 'a',
        label: 'A',
        options: [
          { value: 'x', label: 'X' },
          { value: 'y', label: 'Y', offWhen: () => 'no' },
          { value: 'z', label: 'Z' },
        ],
        default: 'x',
      },
    ]);
    expect(optionLeft(s[0], { y: 'no' })).toBe('x');
    expect(optionLeft({ ...s[0], movesTo: 'z' }, { y: 'no' })).toBe('z');
    expect(optionLeft({ ...s[0], movesTo: 'z' }, { y: 'no', z: 'no' })).toBe('x');
  });
});

describe("the standoffs' reasons say what to change, and name Behind slots one way (D637 a)", () => {
  for (const screwHead of ['keyhole', 'lock', 'tape'])
    it(`${screwHead}: names the Mounting that frees None and At the corners`, () => {
      const [reason] = reasonsOf('solid', { screwHead }, 'standoffs');
      expect(reason).toMatch(/under Mounting/);
      expect(reason).toMatch(/None or At the corners/);
    });

  it('a corner screw: names the Mountings Behind slots needs', () => {
    const [reason] = reasonsOf('solid', { screwHead: 'countersunk' }, 'standoffs');
    expect(reason).toMatch(/^Behind slots needs Keyholes, Lock screws, Tape or None under Mounting/);
  });

  it('says "the corner slots" alone for those slots, in every board\'s words', () => {
    for (const id of BOARDS) {
      const type = typeOf(id);
      const help = type.settings.map((s) => s.help ?? '').join(' ');
      expect(help).not.toMatch(/corner tiles' slots|behind its corner slots/);
      for (const screwHead of ['keyhole', 'lock', 'tape'])
        expect(reasonsOf(id, { screwHead }, 'standoffs').join(' ')).toMatch(/behind the corner slots/);
    }
  });
});

describe('the two "Lock screws" (D638 a)', () => {
  it('the Advanced field says it is the one with keyholes', () => {
    expect(settingOf('solid', 'lockScrews').label).toBe('Lock screws with keyholes');
  });

  it('the Mounting option keeps its name', () => {
    const s = settingOf('solid', 'screwHead') as ChoiceSetting;
    expect(s.options.find((o) => o.value === 'lock')?.label).toBe('Lock screws');
  });
});

describe('settings that do nothing are hidden (D620 a, A640)', () => {
  const clip = typeOf('slot-clip');
  const hidden = (given: Record<string, unknown>) =>
    settingsNotApplying(clip.settings, { ...defaultValues(clip.settings), ...given });

  it("the clip's screw size is hidden with no fixing", () => {
    expect(hidden({ fixing: 'none' })).toContain('screwMm');
    expect(hidden({ fixing: 'screw' })).not.toContain('screwMm');
    expect(hidden({ fixing: 'keyhole' })).not.toContain('screwMm');
  });

  it("the clip's screw head is hidden but for a screw", () => {
    expect(hidden({ fixing: 'none' })).toContain('screwHead');
    expect(hidden({ fixing: 'keyhole' })).toContain('screwHead');
    expect(hidden({ fixing: 'screw' })).not.toContain('screwHead');
  });

  for (const id of BOARDS)
    it(`${id}: Open sides is hidden on a board closed all round, and shown on a wall, whose seams are open`, () => {
      const type = typeOf(id);
      const start = defaultValues(type.settings);
      expect(settingsNotApplying(type.settings, { ...start, sides: CLOSED })).toContain('seams');
      expect(settingsNotApplying(type.settings, { ...start, sides: ALL_OPEN })).not.toContain('seams');
      expect(settingsNotApplying(type.settings, { ...start, sides: CLOSED, panels: 'split' })).not.toContain('seams');
    });
});

describe('every refusal of a size or depth names the field to change (A640)', () => {
  it('a board one tile across, for what stands behind its slots', () => {
    expect(refusedKeys('solid', { widthMm: 40, heightMm: 200, screwHead: 'keyhole' })).toEqual(['widthMm']);
    expect(refusedKeys('solid', { widthMm: 200, heightMm: 40, screwHead: 'tape' })).toEqual(['heightMm']);
    expect(refusedKeys('solid', { widthMm: 40, heightMm: 40, screwHead: 'lock' })).toEqual(['widthMm', 'heightMm']);
  });

  it('a board too narrow for two standoffs with the grid shifted', () => {
    expect(refusedKeys('solid', { widthMm: 80, heightMm: 200, seams: 'offset', screwHead: 'keyhole' })).toEqual([
      'widthMm',
    ]);
  });

  it('a slot clip too shallow for its round head or keyhole', () => {
    expect(refusedKeys('slot-clip', { fixing: 'screw', screwHead: 'round', screwMm: 4, depthMm: 12 })).toEqual([
      'depthMm',
    ]);
    expect(refusedKeys('slot-clip', { fixing: 'keyhole', screwMm: 5, depthMm: 12 })).toEqual(['depthMm']);
  });

  it('says "Tape needs", one thing, and "Keyholes need"', () => {
    const message = (screwHead: string) => {
      const type = typeOf('solid');
      try {
        type.build(engine, read('solid', { widthMm: 40, heightMm: 40, screwHead })).delete();
      } catch (error) {
        return String(error);
      }
      return '';
    };
    expect(message('tape')).toMatch(/Tape needs a board/);
    expect(message('keyhole')).toMatch(/Keyholes need a board/);
  });
});

describe('the words a reader sees (A640)', () => {
  it('no label or help carries a decision number', () => {
    for (const type of BOARD_TYPES)
      for (const s of type.settings) {
        expect(`${s.label} ${s.help ?? ''}`, `${type.id} ${s.key}`).not.toMatch(/\b[ADQTC]\d{2,3}\b/);
        if (s.kind === 'choice')
          expect(s.options.map((o) => o.label).join(' '), `${type.id} ${s.key}`).not.toMatch(/\b[ADQTC]\d{2,3}\b/);
      }
  });

  it('the tape note is metric', () => {
    const type = typeOf('solid');
    const note = type.tape?.(read('solid', { screwHead: 'tape' })) ?? '';
    expect(note).toMatch(/cm²/);
    expect(note).toMatch(/17\.6 g/);
    expect(note).not.toMatch(/inch|pound/);
  });

  it("the standoff's Screw size help names nothing it has not", () => {
    expect(settingOf('standoff', 'screwMm').help).not.toMatch(/Advanced/);
  });

  it('keeps the shared Screw size help on the boards, which have those fields', () => {
    expect(settingOf('solid', 'screwMm').help).toMatch(/Advanced/);
  });

  for (const id of BOARDS)
    it(`${id}: a tape length no longer than a board takes`, () => {
      const s = settingOf(id, 'tapeLengthMm');
      expect(s.kind === 'number' && s.max).toBe(40);
    });

  it('the standoff keeps its longer tape', () => {
    const s = settingOf('standoff', 'tapeLengthMm');
    expect(s.kind === 'number' && s.max).toBe(60);
  });
});

describe("the seam test's file name (A640)", () => {
  const seam = typeOf('seam-test');
  const name = (given: Record<string, unknown>) => seam.label({ ...defaultValues(seam.settings), ...given } as never);

  it('is as it was at its starting chamfer', () => {
    expect(name({ thicknessMm: 5, slotClearanceMm: 0.2 })).toBe('5mm-0.2');
  });

  it('says a chamfer other than the starting one', () => {
    expect(name({ slotChamferMm: 0.5 })).toMatch(/chamfer-0\.5$/);
  });

  it('writes a negative clearance without two dashes', () => {
    expect(name({ slotClearanceMm: -0.5 })).toBe('5mm-minus0.5');
  });
});

describe('the mesh faults the sweep found (A640)', () => {
  const faults = (id: string, given: Record<string, unknown>) => {
    const part = typeOf(id).build(engine, read(id, given));
    const mesh = meshOf(part);
    part.delete();
    return { degenerate: degenerateFacets(mesh), open: edgesNotOnTwoFacets(mesh) };
  };
  const clean = { degenerate: 0, open: 0 };

  for (const standoffFixing of ['nut', 'nut-screwed'])
    for (const screwMm of [3, 4, 5])
      it(`a ${standoffFixing} standoff for M${screwMm}: every nut fit`, { timeout: 240_000 }, () => {
        for (const nutFitMm of [0.1, 0.15, 0.2, 0.25, 0.3, 0.35, 0.4, 0.45, 0.5, 0.55, 0.6])
          expect(
            faults('standoff', { standoffFixing, screwMm, nutFitMm, heightMm: 40, boards: '2' }),
            `fit ${nutFitMm}`,
          ).toEqual(clean);
      });

  it(
    'a lightened board closed all round, its members at their thinnest and its corners 20 mm',
    { timeout: 120_000 },
    () => {
      expect(
        faults('lightened', {
          widthMm: 240,
          heightMm: 120,
          thicknessMm: 10,
          sides: CLOSED,
          screwHead: 'countersunk',
          screwMm: 5,
          cornerRadiusMm: 20,
          rimMm: 1.2,
          webMm: 1.2,
        }),
      ).toEqual(clean);
    },
  );
});
