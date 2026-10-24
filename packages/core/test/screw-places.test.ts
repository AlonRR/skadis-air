// The screw settings (D479; Q359, D370): one screw size, on the main form, for every hole, and under Advanced a size of
// its own for each kind of place a screw goes, the screw size's unless set. Every kind of place in SCREW_PLACES, and
// every listed part type that lists one, is held to the same contract (the extension-registry practice); then what
// each does to the parts, measured on the solid.
import type { CrossSection, Manifold } from 'manifold-3d';
import { afterAll, describe, expect, it } from 'vitest';
import { BOARD_TYPES, boardFileName, buildBoard, SOLID, type AnyBoardType } from '../src/board-types/index.js';
import { loadEngine } from '../src/engine.js';
import { bottomSlotPlaces, keyholePlaces, mountingOf, mountingParams } from '../src/mounting.js';
import { stadium } from '../src/rings.js';
import { SAME_OR_OWN, SCREW_PLACES, SCREW_SIZE_SETTING, type ScrewPlace } from '../src/screw-places.js';
import { defaultValues, readValues, settingsNotApplying } from '../src/settings.js';

const engine = await loadEngine();
const made: (Manifold | CrossSection)[] = [];
const keep = <T extends Manifold | CrossSection>(m: T): T => {
  made.push(m);
  return m;
};
afterAll(() => {
  for (const m of made) m.delete();
});

const SLOW = 120_000;

/** The listed types that list a setting of this key. */
const listing = (key: string) => BOARD_TYPES.filter((t) => t.settings.some((s) => s.key === key));
/** Where a type has a size, one small enough to build fast: 80 mm, the least keyholes take (C241). */
const small = (type: AnyBoardType) =>
  type.settings.some((s) => s.key === 'widthMm') ? { widthMm: 80, heightMm: 80 } : {};

/** A type's part from its starting values and the given ones, read as the page reads its form. */
function part(type: AnyBoardType, given: Record<string, unknown>) {
  const read = readValues(type.settings, { ...defaultValues(type.settings), ...given });
  if (!read.ok) throw new Error(read.errors.map((e) => e.message).join('; '));
  const built = buildBoard(engine, type, read.values);
  if (!built.ok) throw new Error(built.problem);
  return {
    solid: keep(built.solid),
    name: boardFileName(type, read.values, 'stl'),
    screws: type.screws?.(read.values),
  };
}

describe('the screw size (D479)', () => {
  it('is one setting on the main form of every part a screw goes through, 4 mm unless set', () => {
    const types = listing('screwMm');
    expect(types.map((t) => t.id)).toEqual(['solid', 'lightened', 'skeleton', 'standoff', 'slot-clip']);
    for (const type of types) expect(type.settings).toContain(SCREW_SIZE_SETTING);
    expect(SCREW_SIZE_SETTING.default).toBe(4);
    expect('advanced' in SCREW_SIZE_SETTING).toBe(false);
  });

  it('says it is the screw for every hole, countersunk, its head twice the screw across', () => {
    expect(SCREW_SIZE_SETTING.help).toMatch(/^The screw for every hole, unless Advanced gives a kind of hole its own/);
    expect(SCREW_SIZE_SETTING.help).toContain('a countersunk screw, its head twice the screw across, 8 mm for a 4 mm');
  });
});

/** The two settings of a kind of place, in a type's list. */
const keysOf = (place: ScrewPlace) => [`${place.key}Size`, `${place.key}Mm`];

describe('every kind of screw place', () => {
  it('is the keyholes, the lock screws and the slot clip, so far', () => {
    expect(SCREW_PLACES.map((p) => p.key)).toEqual(['keyholeScrew', 'lockScrew', 'clipScrew']);
  });

  it('is no setting of a type but through its entry in the list', () => {
    // a choice of the screw size or its own belongs to a listed kind of place
    const listed = new Set(SCREW_PLACES.map((p) => `${p.key}Size`));
    const found = BOARD_TYPES.flatMap((t) => t.settings)
      .filter((s) => s.kind === 'choice' && s.options === SAME_OR_OWN)
      .map((s) => s.key);
    expect(found.length).toBeGreaterThan(0);
    expect(found.filter((key) => !listed.has(key))).toEqual([]);
  });

  for (const place of SCREW_PLACES) {
    describe(`the ${place.label.toLowerCase()} (${place.key})`, () => {
      const [sizeKey, ownKey] = keysOf(place) as [string, string];
      const types = listing(sizeKey);

      it('is listed by a part type, its two settings together under Advanced, with the screw size', () => {
        expect(types.length).toBeGreaterThan(0);
        expect(listing(ownKey)).toEqual(types);
        for (const type of types) {
          const keys = type.settings.map((s) => s.key);
          expect(keys.indexOf(ownKey)).toBe(keys.indexOf(sizeKey) + 1);
          for (const key of [sizeKey, ownKey]) expect(type.settings.find((s) => s.key === key)?.advanced).toBe(true);
          expect(type.settings).toContain(SCREW_SIZE_SETTING);
        }
      });

      it("offers the screw size or its own, the screw size unless set, its own starting at the screw size's start", () => {
        for (const type of types) {
          const [size, own] = [sizeKey, ownKey].map((k) => type.settings.find((s) => s.key === k));
          expect(size?.kind === 'choice' && size.options).toBe(SAME_OR_OWN);
          expect(SAME_OR_OWN.map((o) => o.label)).toEqual(['Same as the screw size', 'Own']);
          expect(size?.default).toBe('same');
          expect(own?.kind === 'number' && [own.default, own.step, own.min, own.max]).toEqual([
            SCREW_SIZE_SETTING.default,
            SCREW_SIZE_SETTING.step,
            place.min,
            place.max,
          ]);
          // each one's help says when it applies (D372)
          expect(size?.help?.startsWith(`${place.when}: `)).toBe(true);
          expect(own?.help?.startsWith(`${place.when}, and "Own" chosen above: `)).toBe(true);
        }
      });

      it('greys out its own size until "Own", and both where the part has no such place (D372)', () => {
        for (const type of types) {
          const off = (given: Record<string, unknown>) =>
            settingsNotApplying(type.settings, given).filter((k) => k === sizeKey || k === ownKey);
          expect(off(place.inPlay)).toEqual([ownKey]);
          expect(off({ ...place.inPlay, [sizeKey]: 'own' })).toEqual([]);
          if (!place.appliesWhen(defaultValues(type.settings)))
            expect(off({ [sizeKey]: 'own' })).toEqual(keysOf(place));
        }
      });

      it(
        'takes the screw size unless its own is set: the part is the one given that size as its own',
        () => {
          for (const type of types) {
            const at = { ...small(type), ...place.inPlay };
            // 3 and 3.5 mm, which every place takes (a slot clip's countersink for 4.5 mm is too wide through the slots)
            const same = part(type, { ...at, screwMm: 3.5 });
            const own = part(type, { ...at, screwMm: 3, [sizeKey]: 'own', [ownKey]: 3.5 });
            const where = `${type.id} ${place.key}`;
            expect(own.solid.volume(), where).toBeCloseTo(same.solid.volume(), 6);
            expect([own.solid.genus(), own.name, own.screws], where).toEqual([
              same.solid.genus(),
              same.name,
              same.screws,
            ]);
            // the control: at the other screw size the place is another
            const other = part(type, { ...at, screwMm: 3 });
            expect(Math.abs(other.solid.volume() - same.solid.volume()), where).toBeGreaterThan(0.1);
          }
        },
        SLOW,
      );
    });
  }
});

describe('each size of its own changes its place alone (D479)', () => {
  const board = { widthMm: 80, heightMm: 80, screwHead: 'keyhole', standoffs: 'back', lockScrews: 'bottom' };
  /** Where two parts differ: the box round what either has that the other has not. */
  const differ = (a: Manifold, b: Manifold) => {
    const both = keep(keep(a.subtract(b)).add(keep(b.subtract(a))));
    return { volume: both.volume(), box: both.boundingBox() };
  };

  /** What two parts differ by inside the lock screws' cuts: round each bottom slot's middle, as far as a 5 mm lock
   * screw's groove reaches and a little more, through the board and its standoffs. */
  const atLockScrews = (a: Manifold, b: Manifold) => {
    const cuts = keep(
      engine.Manifold.union(
        bottomSlotPlaces({ columns: 2, rows: 2 }).map(([x, y]) =>
          keep(engine.Manifold.cylinder(60, 5.5, 5.5, 64).translate([x, y, -40])),
        ),
      ),
    );
    return keep(keep(keep(a.subtract(b)).add(keep(b.subtract(a)))).intersect(cuts)).volume();
  };

  it(
    "the keyholes' changes the keyholes and the standoffs sized from them, the lock screws' their cuts alone",
    () => {
      const plain = part(SOLID, board);
      const keyholes = part(SOLID, { ...board, keyholeScrewSize: 'own', keyholeScrewMm: 5 });
      const locks = part(SOLID, { ...board, lockScrewSize: 'own', lockScrewMm: 3 });
      // the keyholes are at y 60, the lock screws at y 20: the board's halves meet at y 40. The keyholes' size changes
      // the top standoffs, and the outline and ramp every standoff behind a slot shares with them (D244, D369), but
      // nothing of the lock screws' holes, recesses and grooves
      const top = differ(plain.solid, keyholes.solid);
      expect(top.volume).toBeGreaterThan(1);
      expect(top.box.max[1]).toBeGreaterThan(40);
      expect(atLockScrews(plain.solid, keyholes.solid)).toBeLessThan(1e-6);
      // the lock screws' size changes the bottom standoffs alone, round the lock screws
      const bottom = differ(plain.solid, locks.solid);
      expect(bottom.volume).toBeGreaterThan(1);
      expect(bottom.box.max[1]).toBeLessThan(40);
      expect(atLockScrews(plain.solid, locks.solid)).toBeCloseTo(bottom.volume, 6);
      expect([plain.name, keyholes.name, locks.name]).toEqual([
        'skadis-solid-80x80-keyholes-lock-screws-standoffs-15mm.stl',
        'skadis-solid-80x80-keyholes-lock-screws-screw-5mm-standoffs-15mm.stl',
        'skadis-solid-80x80-keyholes-lock-screws-3mm-standoffs-15mm.stl',
      ]);
      // both their own: the screw size changes nothing on this board
      const own = { ...board, keyholeScrewSize: 'own', keyholeScrewMm: 4, lockScrewSize: 'own', lockScrewMm: 4 };
      const at3 = part(SOLID, { ...own, screwMm: 3 });
      expect(at3.solid.volume()).toBeCloseTo(plain.solid.volume(), 6);
      expect(at3.name).toBe(plain.name);
      // the control: the screw size, both the same as it, changes both
      const both = differ(plain.solid, part(SOLID, { ...board, screwMm: 3 }).solid);
      expect(both.box.min[1]).toBeLessThan(40);
      expect(both.box.max[1]).toBeGreaterThan(40);
      expect(atLockScrews(plain.solid, part(SOLID, { ...board, screwMm: 3 }).solid)).toBeGreaterThan(1);
    },
    SLOW,
  );

  it('the corner screws are the screw size itself', () => {
    const corners = part(SOLID, { widthMm: 80, heightMm: 80, screwMm: 3 });
    expect(corners.name).toBe('skadis-solid-80x80-screw-3mm.stl');
    expect(mountingParams({ screwMm: 3 })).toMatchObject({ screwMm: 3, keyholeScrewMm: 3, lockScrewMm: 3 });
  });
});

describe('the library takes each size of its own, the screw size unless given (D479)', () => {
  it('in a mounting', () => {
    expect(mountingParams({})).toMatchObject({ screwMm: 4, keyholeScrewMm: 4, lockScrewMm: 4 });
    expect(mountingParams({ screwMm: 3.5 })).toMatchObject({ keyholeScrewMm: 3.5, lockScrewMm: 3.5 });
    expect(mountingParams({ screwMm: 3.5, keyholeScrewMm: 5, lockScrewMm: 2.5 })).toMatchObject({
      screwMm: 3.5,
      keyholeScrewMm: 5,
      lockScrewMm: 2.5,
    });
  });

  it("and from a form's values", () => {
    const v = defaultValues(SOLID.settings);
    expect(mountingOf({ ...v, screwMm: 3 })).toMatchObject({ screwMm: 3, keyholeScrewMm: 3, lockScrewMm: 3 });
    // its own size left in a field while "Same" is chosen is not taken
    expect(mountingOf({ ...v, screwMm: 3, lockScrewMm: 5, keyholeScrewMm: 5 })).toMatchObject({
      keyholeScrewMm: 3,
      lockScrewMm: 3,
    });
    expect(
      mountingOf({
        ...v,
        screwMm: 3,
        lockScrewSize: 'own',
        lockScrewMm: 5,
        keyholeScrewSize: 'own',
        keyholeScrewMm: 4.5,
      }),
    ).toMatchObject({ screwMm: 3, keyholeScrewMm: 4.5, lockScrewMm: 5 });
  });
});

describe('lock screws at the screw size (D479, A248)', () => {
  const T = 5;
  /** What is open round the slot whose middle is at (x, y), halfway through the board, more than 0.02 mm past the slot
   * as drawn, in pieces of more than 0.1 mm2, so no sliver where the cut slot's outline and this one's meet counts: the
   * groove for a lock screw's head, or nothing. */
  const groove = (solid: Manifold, [x, y]: readonly [number, number]) => {
    const window = keep(engine.CrossSection.square([14, 22]).translate([x - 7, y - 11]));
    const open = keep(window.subtract(keep(solid.slice(T / 2))));
    const past = keep(open.subtract(keep(new engine.CrossSection([stadium(x, y, 5.2, 15.2, 0.02)]))));
    const pieces = past
      .decompose()
      .map(keep)
      .filter((p) => p.area() > 0.1);
    return keep(engine.CrossSection.compose(pieces));
  };

  it(
    "start at 4 mm, so each lock screw's slot has a groove for its 8 mm head, clear of the slot's bottom end, where a hook rests",
    () => {
      const board = { columns: 2, rows: 2 };
      const { solid } = part(SOLID, { widthMm: 80, heightMm: 80, screwHead: 'lock', standoffs: 'back' });
      for (const place of [...bottomSlotPlaces(board), ...keyholePlaces(board)]) {
        const cut = groove(solid, place);
        const box = cut.bounds();
        const [x, y] = place;
        // the head's 8 mm and 0.5 mm, round the slot's middle: 8.5 mm across, where it crosses the slot's sides
        // 3.36 mm either side of its middle, so the slot keeps its 5.2 mm for 4.24 mm up from its bottom end
        const reach = Math.sqrt(4.25 ** 2 - 2.6 ** 2);
        expect(cut.area()).toBeGreaterThan(10);
        expect([box.min[0] - x, box.max[0] - x]).toEqual([expect.closeTo(-4.25, 1), expect.closeTo(4.25, 1)]);
        expect([box.min[1] - y, box.max[1] - y]).toEqual([expect.closeTo(-reach, 1), expect.closeTo(reach, 1)]);
        const bottom = y - 15.2 / 2;
        expect(box.min[1] - bottom).toBeGreaterThan(4.2);
      }
      // the control: a lock screw of its own, 2.5 mm, its 5 mm head through the slot, cuts no groove
      const plain = part(SOLID, {
        widthMm: 80,
        heightMm: 80,
        screwHead: 'lock',
        standoffs: 'back',
        lockScrewSize: 'own',
        lockScrewMm: 2.5,
      });
      expect(groove(plain.solid, [20, 20]).area()).toBeLessThan(1e-6);
    },
    SLOW,
  );
});

describe('values saved by an older page (D479)', () => {
  // a v0.8.0 form's values as the page kept them in the browser: every number as typed, the lock screw size 2.5 mm,
  // its starting value then, and no choice of the screw size or its own
  const v080 = {
    widthMm: '160',
    heightMm: '160',
    thicknessMm: '5',
    sides: { left: 'open', right: 'open', bottom: 'open', top: 'open' },
    seams: 'through',
    panels: 'one',
    slotClearanceMm: '0.2',
    slotChamferMm: '1',
    cornerRadiusMm: '10',
    panelWidthMm: '400',
    panelHeightMm: '400',
    screwHead: 'lock',
    standoffs: 'back',
    screwMm: '4',
    lockScrews: 'none',
    lockScrewMm: '2.5',
    standoffHeightMm: '15',
  };

  it(
    'still read and build, the lock screws at the screw size, the 2.5 mm kept where "Own" would take it',
    () => {
      for (const given of [
        v080,
        { ...v080, screwHead: 'keyhole', lockScrews: 'bottom' },
        { ...v080, lockScrewMm: '3' },
      ]) {
        const read = readValues(SOLID.settings, given);
        expect(read.ok).toBe(true);
        if (!read.ok) continue;
        expect([read.values.lockScrewSize, mountingOf(read.values).lockScrewMm]).toEqual(['same', 4]);
        const built = buildBoard(engine, SOLID, read.values);
        expect(built.ok).toBe(true);
        if (built.ok) keep(built.solid);
      }
      const read = readValues(SOLID.settings, v080);
      expect(read.ok && boardFileName(SOLID, read.values, 'stl')).toBe(
        'skadis-solid-160x160-lock-screws-standoffs-15mm.stl',
      );
      // and "Own" chosen on it, the 2.5 mm the field kept
      const own = readValues(SOLID.settings, { ...v080, lockScrewSize: 'own' });
      expect(own.ok && mountingOf(own.values).lockScrewMm).toBe(2.5);
      expect(own.ok && boardFileName(SOLID, own.values, 'stl')).toBe(
        'skadis-solid-160x160-lock-screws-2.5mm-standoffs-15mm.stl',
      );
    },
    SLOW,
  );
});
