// A wall split into panels (backlog item tiling; D15, D37, D175 to D178): panels as even as they can be, none
// larger than the bed takes or the user allows; closed round the wall's outer edge and open at the seams, so the
// slots run on across them; each panel a board with the board's own settings and mounting. A kind of panel holds
// the places of its columns and of its rows, so a wall of any size plans at once (backlog item wall-grid; C200).
import type { Manifold } from 'manifold-3d';
import { afterAll, describe, expect, it, vi } from 'vitest';
import { defaultValues } from '../src/settings.js';
import { buildBoard, buildWall, printedPart, SOLID } from '../src/board-types/index.js';
import { loadEngine } from '../src/engine.js';
import { DEFAULT_BED } from '../src/printer.js';
import { PRINTERS } from '../src/printers.js';
import { boardExtent, type Sides } from '../src/slots.js';
import { evenSplit, largestPanel, panelCount, panelPlaces, wallPlan } from '../src/tiling.js';

vi.setConfig({ testTimeout: 30_000 });
const engine = await loadEngine();
const made: Manifold[] = [];
afterAll(() => {
  for (const m of made) m.delete();
});

const CLOSED = { left: 'closed', right: 'closed', bottom: 'closed', top: 'closed' } as const;
const wall = (given: Record<string, unknown>) => ({ ...defaultValues(SOLID.settings), panels: 'split', ...given });

describe('evenSplit (D176 B)', () => {
  it('splits a run of tiles into as few parts as the most allows, as even as they can be', () => {
    expect(evenSplit(11, 5)).toEqual([4, 4, 3]); // a 440 mm wall in 200 mm panels: 160 + 160 + 120
    expect(evenSplit(7, 5)).toEqual([4, 3]);
    expect(evenSplit(10, 5)).toEqual([5, 5]);
    expect(evenSplit(5, 5)).toEqual([5]);
    expect(evenSplit(1, 5)).toEqual([1]);
  });

  it('never leaves parts more than a tile apart, nor one larger than the most', () => {
    for (let n = 1; n <= 40; n++) {
      for (let most = 1; most <= 10; most++) {
        const parts = evenSplit(n, most);
        expect(parts.reduce((a, b) => a + b, 0)).toBe(n);
        expect(Math.max(...parts)).toBeLessThanOrEqual(most);
        expect(Math.max(...parts) - Math.min(...parts)).toBeLessThanOrEqual(1);
        expect(parts.length).toBe(Math.ceil(n / most));
      }
    }
  });
});

describe('largestPanel', () => {
  it('is the most whole tiles the bed takes each way, at most 10 (C51)', () => {
    expect(largestPanel({ xMm: 200, yMm: 200 })).toEqual({ columns: 5, rows: 5 });
    expect(largestPanel({ xMm: 250, yMm: 210 })).toEqual({ columns: 6, rows: 5 });
    expect(largestPanel({ xMm: 180, yMm: 180 })).toEqual({ columns: 4, rows: 4 });
    expect(largestPanel({ xMm: 600, yMm: 600 })).toEqual({ columns: 10, rows: 10 });
  });
});

describe('wallPlan (D175 to D177)', () => {
  it('is null for one board', () => {
    expect(wallPlan({ ...defaultValues(SOLID.settings) }, { xMm: 200, yMm: 200 })).toBeNull();
  });

  it("splits a 440 x 280 mm wall on a 200 mm bed as the figure's B, closed outside and open at the seams", () => {
    const plan = wallPlan(wall({ widthMm: 440, heightMm: 280, sides: CLOSED }), { xMm: 200, yMm: 200 });
    if (plan === null) throw new Error('a plan');
    expect(plan.columns).toEqual([4, 4, 3]);
    expect(plan.rows).toEqual([4, 3]);
    expect(plan.panels).toHaveLength(6); // six sizes and side patterns, one of each
    const bottomLeft = plan.panels.find((p) => panelPlaces(p).some(([x, y]) => x === 0 && y === 0));
    expect(bottomLeft?.values).toMatchObject({
      widthMm: 160,
      heightMm: 160,
      panels: 'one',
      sides: { left: 'closed', bottom: 'closed', right: 'open', top: 'open' },
    });
    const count = plan.panels.reduce((n, p) => n + panelCount(p), 0);
    expect(count).toBe(6);
  });

  it('counts the panels of each kind: a 3 x 3 wall has one middle kind of its own', () => {
    const plan = wallPlan(wall({ widthMm: 600, heightMm: 600, sides: CLOSED }), { xMm: 200, yMm: 200 });
    if (plan === null) throw new Error('a plan');
    expect(plan.columns).toEqual([5, 5, 5]);
    expect(plan.panels).toHaveLength(9); // four corners, four sides, the middle: each its own sides
    const middle = plan.panels.find((p) => Object.values(p.values.sides as object).every((s) => s === 'open'));
    expect(middle && panelPlaces(middle)).toEqual([[200, 200]]);
    const nine = wallPlan(wall({ widthMm: 1000, heightMm: 1000, sides: CLOSED }), { xMm: 200, yMm: 200 });
    const inner = nine?.panels.find((p) => Object.values(p.values.sides as object).every((s) => s === 'open'));
    expect(inner && panelCount(inner)).toBe(9); // 5 x 5 panels, 3 x 3 of them inside
  });

  it('gives each kind the places of its columns and of its rows, every copy one of each (C200)', () => {
    const plan = wallPlan(wall({ widthMm: 1000, heightMm: 1000, sides: CLOSED }), { xMm: 200, yMm: 200 });
    const inner = plan?.panels.find((p) => Object.values(p.values.sides as object).every((s) => s === 'open'));
    if (inner === undefined) throw new Error('an inner kind');
    expect([inner.xs, inner.ys]).toEqual([
      [200, 400, 600],
      [200, 400, 600],
    ]);
    expect(panelPlaces(inner)).toHaveLength(9);
    expect(panelPlaces(inner)).toContainEqual([400, 600]);
  });

  it('plans a wall 100 m wide at once, its kinds holding columns and rows, not every panel (D196)', () => {
    const t0 = performance.now();
    const plan = wallPlan(wall({ widthMm: 100_000, heightMm: 3000, sides: CLOSED }), { xMm: 250, yMm: 210 });
    const ms = performance.now() - t0;
    if (plan === null) throw new Error('a plan');
    const panels = plan.columns.length * plan.rows.length;
    expect(panels).toBeGreaterThan(5000);
    expect(plan.panels.reduce((n, p) => n + panelCount(p), 0)).toBe(panels);
    // at most four kinds of column (the two ends, two widths between) and four of row
    const held = plan.panels.reduce((n, p) => n + p.xs.length + p.ys.length, 0);
    expect(held).toBeLessThanOrEqual(4 * (plan.columns.length + plan.rows.length));
    expect(held).toBeLessThan(panels / 2);
    expect(ms).toBeLessThan(1000); // an order of magnitude, not a race: a busy machine is slower (C220)
  });

  it('refuses a wall past a kilometre each way, which the settings refuse too (D223)', () => {
    expect(() => wallPlan(wall({ widthMm: 1_000_040, heightMm: 2400 }), { xMm: 250, yMm: 210 })).toThrow(/1 km/);
    expect(wallPlan(wall({ widthMm: 1_000_000, heightMm: 2400 }), { xMm: 250, yMm: 210 })).not.toBeNull();
  });

  it('turns the panels on a bed that is not square when that makes fewer of them', () => {
    // 6 x 5 tiles on a 250 x 210 bed: a 440 x 280 wall in 2 x 2 panels; turned, 5 x 6 would take 3 x 2
    const plan = wallPlan(wall({ widthMm: 440, heightMm: 280 }), { xMm: 250, yMm: 210 });
    expect([plan?.columns, plan?.rows]).toEqual([
      [6, 5],
      [4, 3],
    ]);
  });

  it('keeps panels within the largest panel set, smaller than the bed allows (D176)', () => {
    const plan = wallPlan(wall({ widthMm: 400, heightMm: 120, panelWidthMm: 120 }), { xMm: 200, yMm: 200 });
    expect(plan?.columns).toEqual([3, 3, 2, 2]); // 10 tiles in panels of at most 3
    expect(plan?.rows).toEqual([3]);
  });

  it('puts the wall back together: its panels, placed, are the one board of its size under the front (D15)', () => {
    const values = wall({ widthMm: 280, heightMm: 200, sides: CLOSED, screwHead: 'none' });
    const plan = wallPlan(values, { xMm: 200, yMm: 200 });
    if (plan === null) throw new Error('a plan');
    /** The area of a cut through each panel at this depth, added up over the wall. */
    const cut = (z: number, sides?: Sides) =>
      plan.panels.reduce((sum, panel) => {
        const given = sides === undefined ? panel.values : { ...panel.values, sides, cornerRadiusMm: 0 };
        const built = buildBoard(engine, SOLID, given as never);
        if (!built.ok) throw new Error(built.problem);
        made.push(built.solid);
        const section = built.solid.slice(z);
        const area = section.area();
        section.delete();
        return sum + area * panelCount(panel);
      }, 0);
    const whole = buildBoard(engine, SOLID, { ...values, panels: 'one' } as never);
    if (!whole.ok) throw new Error(whole.problem);
    made.push(whole.solid);
    // the seams are open, half a slot each side: the slots across them are whole, none missing or doubled; on the
    // front the seams are V grooves (D277), so the cuts are taken behind them
    for (const z of [0.25, 2.5]) {
      const section = whole.solid.slice(z);
      expect(Math.abs(cut(z) - section.area())).toBeLessThan(0.01); // of 51 000 mm2: rounding
      section.delete();
    }
    // control: the same panels with their seams closed leave out the slots along them
    const section = whole.solid.slice(2.5);
    expect(cut(2.5, CLOSED) - section.area()).toBeGreaterThan(20);
    section.delete();
  });
});

describe('a wall between the slots (D282, D288)', () => {
  it('cuts panels that fit the bed with the 10 mm a side moved between the slots adds', () => {
    const values = wall({ widthMm: 400, heightMm: 400, sides: CLOSED, seams: 'between' });
    const plan = wallPlan(values, { xMm: 200, yMm: 200 });
    if (plan === null) throw new Error('a plan');
    for (const panel of plan.panels) {
      const e = boardExtent(
        Number(panel.values['widthMm']) / 40,
        Number(panel.values['heightMm']) / 40,
        panel.values['sides'] as Sides,
        'between',
      );
      expect(e.x1 - e.x0).toBeLessThanOrEqual(200);
      expect(e.y1 - e.y0).toBeLessThanOrEqual(200);
      expect(panel.values['seams']).toBe('between');
    }
    // control: through the slots, the same bed takes 200 mm panels, five tiles
    expect(wallPlan({ ...values, seams: 'through' }, { xMm: 200, yMm: 200 })?.columns).toEqual([5, 5]);
    expect(plan.columns).toEqual([4, 3, 3]);
  });

  it('puts the wall back together: its panels, placed, are the one board of its size under the front', () => {
    const values = wall({ widthMm: 280, heightMm: 200, sides: CLOSED, screwHead: 'none', seams: 'between' });
    const plan = wallPlan(values, { xMm: 200, yMm: 200 });
    if (plan === null) throw new Error('a plan');
    const cut = (z: number) =>
      plan.panels.reduce((sum, panel) => {
        const built = buildBoard(engine, SOLID, panel.values as never);
        if (!built.ok) throw new Error(built.problem);
        made.push(built.solid);
        const section = built.solid.slice(z);
        const area = section.area();
        section.delete();
        return sum + area * panelCount(panel);
      }, 0);
    const whole = buildBoard(engine, SOLID, { ...values, panels: 'one' } as never);
    if (!whole.ok) throw new Error(whole.problem);
    made.push(whole.solid);
    for (const z of [0.25, 2.5]) {
      const section = whole.solid.slice(z);
      expect(Math.abs(cut(z) - section.area())).toBeLessThan(0.01);
      section.delete();
    }
  });
});

// Found by QA (Q3, 23 Oct 2026): on a Prusa MK4S, 250 x 210 mm, a wall 1000 x 640 mm was cut into 15 panels of
// 200 x 240 mm, which fit the bed only turned, as the plan chose them (D176); each STL came unturned, 200 x 240 x 5,
// and did not fit the bed as downloaded.
describe("a wall's panels as they go to the printer (Q3)", () => {
  const beds = [{ ...DEFAULT_BED, name: 'the default bed' }, ...PRINTERS.map((p) => ({ ...p, name: p.model }))];
  const walls = [
    [1000, 640],
    [1200, 800],
    [440, 280],
    [2000, 1200],
  ] as const;
  /** A stand-in for a panel: a plate of its outline's extent, as the plan cuts it, 5 mm thick, as it hangs. */
  const standIn = (panel: { values: Record<string, unknown> }, seams: 'through' | 'between') => {
    const e = boardExtent(
      Number(panel.values['widthMm']) / 40,
      Number(panel.values['heightMm']) / 40,
      panel.values['sides'] as Sides,
      seams,
    );
    const plate = engine.Manifold.cube([e.x1 - e.x0, e.y1 - e.y0, 5]);
    const placed = plate.translate([e.x0, e.y0, 0]);
    plate.delete();
    return placed;
  };
  const lies = (part: Manifold) => {
    const { min, max } = part.boundingBox();
    return { min: min.map((v) => Math.round(v * 1e6) / 1e6), x: max[0] - min[0], y: max[1] - min[1] };
  };
  const fits = (box: { x: number; y: number }, bed: { xMm: number; yMm: number }) =>
    box.x <= bed.xMm + 1e-6 && box.y <= bed.yMm + 1e-6;

  it("fits every preset's bed as it comes, turned a quarter where it fits only turned", () => {
    let [checked, turned] = [0, 0];
    const misfits: string[] = [];
    for (const bed of beds) {
      for (const [widthMm, heightMm] of walls) {
        for (const [seams, sides] of [
          ['through', CLOSED],
          ['between', CLOSED],
          ['through', undefined],
          ['between', undefined],
        ] as const) {
          const plan = wallPlan(wall({ widthMm, heightMm, seams, ...(sides ? { sides } : {}) }), bed);
          for (const panel of plan?.panels ?? []) {
            const hanging = standIn(panel, seams);
            const printed = printedPart(SOLID, hanging, bed);
            const [before, after] = [lies(hanging), lies(printed)];
            for (const m of [hanging, printed]) m.delete();
            checked += 1;
            if (Math.abs(after.x - before.x) > 1e-6) turned += 1;
            if (!fits(after, bed) || after.min.some((v) => v !== 0)) {
              misfits.push(
                `${bed.name}, ${widthMm} x ${heightMm} ${seams} ${sides ? 'closed' : 'open'}: ${after.x} x ${after.y}`,
              );
            }
          }
        }
      }
    }
    expect(misfits).toEqual([]);
    expect(checked).toBeGreaterThan(1000);
    // the control: some panels fit their bed only turned, and those are the ones turned
    expect(turned).toBeGreaterThan(0);
  });

  it("builds the MK4S's 1000 x 640 mm wall in panels whose files fit its bed as they come", () => {
    const bed = { xMm: 250, yMm: 210 }; // the Original Prusa MK4S's (printers.ts)
    const built = buildWall(engine, SOLID, wall({ widthMm: 1000, heightMm: 640, sides: CLOSED }) as never, bed);
    if (built === null) throw new Error('a wall');
    expect(built.panels.reduce((n, p) => n + panelCount(p), 0)).toBe(15);
    made.push(...built.panels.map((p) => p.solid));
    // the bottom row's three kinds are 200 mm across and 240 mm up, and fit the bed only turned; the rest, 200 x 200
    const sizes = built.panels.map((panel) => {
      const unturned = printedPart(SOLID, panel.solid);
      const printed = printedPart(SOLID, panel.solid, bed);
      const [before, after] = [lies(unturned), lies(printed)];
      for (const m of [unturned, printed]) m.delete();
      const mm = (box: { x: number; y: number }) =>
        `${Math.round(box.x * 1e3) / 1e3} x ${Math.round(box.y * 1e3) / 1e3}`;
      return { before: mm(before), after: mm(after), fits: fits(after, bed), placed: after.min };
    });
    expect(sizes.filter((s) => s.before === '200 x 240').map((s) => s.after)).toEqual([
      '240 x 200',
      '240 x 200',
      '240 x 200',
    ]);
    expect(sizes.filter((s) => s.before === '200 x 200').map((s) => s.after)).toEqual([
      '200 x 200',
      '200 x 200',
      '200 x 200',
      '200 x 200',
      '200 x 200',
      '200 x 200',
    ]);
    expect(sizes.every((s) => s.fits && s.placed.every((v) => v === 0))).toBe(true);
  });

  it('leaves a part that fits as it lies, or fits neither way, as it lies', () => {
    for (const [x, y, bed] of [
      [200, 200, { xMm: 250, yMm: 210 }],
      [240, 200, { xMm: 250, yMm: 210 }],
      [300, 300, { xMm: 250, yMm: 210 }],
    ] as const) {
      const plate = engine.Manifold.cube([x, y, 5]);
      const printed = printedPart(SOLID, plate, bed);
      const box = lies(printed);
      for (const m of [plate, printed]) m.delete();
      expect([Math.round(box.x), Math.round(box.y)]).toEqual([x, y]);
    }
  });
});

describe('a board too large to print as one', () => {
  it('is refused past 400 mm unless split into panels, saying so (C51)', () => {
    const built = buildBoard(engine, SOLID, { ...defaultValues(SOLID.settings), widthMm: 440 });
    expect(built.ok).toBe(false);
    if (!built.ok) expect(built.problem).toContain('"Wall" in What to make');
  });
});
