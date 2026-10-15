// The printers the page offers (backlog item printer-presets; D4, D170 to D172): docs/printer-beds.md, row for
// row, each bed from its maker's own website, grouped by maker in D170's order.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { DEFAULT_BED, fitsBed } from '../src/printer.js';
import { MAKERS, modelLabel, PRINTERS } from '../src/printers.js';

const doc = readFileSync(fileURLToPath(new URL('../../../docs/printer-beds.md', import.meta.url)), 'utf8');
const rows = doc
  .split('\n')
  .filter((line) => line.startsWith('| ') && !line.startsWith('| Maker') && !line.startsWith('|---'))
  .map((line) =>
    line
      .slice(1, -1)
      .split('|')
      .map((cell) => cell.trim()),
  );

// Each maker's own site, by which a row's source is checked.
const SITES: Record<string, string> = {
  Prusa: 'prusa3d.com',
  'Bambu Lab': 'bambulab.com',
  Creality: 'creality.com',
  Anycubic: 'anycubic.com',
  Elegoo: 'elegoo.com',
  Sovol: 'sovol3d.com',
  Flashforge: 'flashforge.com',
};

describe('the printer list', () => {
  it('is docs/printer-beds.md, row for row', () => {
    expect(rows).toHaveLength(30);
    expect(PRINTERS.map((p) => [p.maker, p.model, String(p.xMm), String(p.yMm), p.group])).toEqual(
      rows.map(([maker, model, x, y, , group]) => [maker, model, x, y, group]),
    );
  });

  it("takes each bed from its maker's own website", () => {
    for (const [maker, , , , , , source] of rows) {
      const address = /<(https:\/\/[^>]+)>/.exec(source ?? '')?.[1] ?? '';
      expect(new URL(address).hostname.endsWith(SITES[maker ?? ''] ?? 'no maker')).toBe(true);
    }
  });

  it("lists the makers in D170's order, each with at most nine models, each named once", () => {
    expect(MAKERS.map((m) => m.name)).toEqual([
      'Prusa',
      'Bambu Lab',
      'Creality',
      'Anycubic',
      'Elegoo',
      'Sovol',
      'Flashforge',
    ]);
    for (const maker of MAKERS) {
      expect(maker.printers.length).toBeGreaterThan(0);
      expect(maker.printers.length).toBeLessThanOrEqual(9);
    }
    const ids = PRINTERS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.every((id) => /^[a-z0-9]+(-[a-z0-9]+)*$/.test(id))).toBe(true);
  });

  it("has the owner's Original Prusa i3 MK3S+, 250 x 210 mm (D172)", () => {
    const mk3s = PRINTERS.find((p) => p.model === 'Original Prusa i3 MK3S+');
    expect([mk3s?.xMm, mk3s?.yMm, mk3s?.maker]).toEqual([250, 210, 'Prusa']);
  });

  it("names a model on its button without its maker's name", () => {
    expect(modelLabel(PRINTERS[0] ?? PRINTERS[1]!)).toBe('MK4S');
    expect(PRINTERS.map(modelLabel)).toContain('i3 MK3S+');
    expect(PRINTERS.map(modelLabel)).toContain('CORE One+ (Gen 2)');
    expect(PRINTERS.map(modelLabel)).toContain('A1 mini');
    for (const p of PRINTERS) expect(modelLabel(p)).not.toContain(p.maker);
  });
});

describe('the default bed against the list (D61)', () => {
  it("fits every full-size printer with at least 10 mm to spare on the bed's smaller side", () => {
    const full = PRINTERS.filter((p) => p.group === 'full-size');
    expect(full.length).toBeGreaterThan(20);
    for (const p of full) {
      expect(fitsBed(DEFAULT_BED.xMm + 10, DEFAULT_BED.yMm + 10, p)).toBe(true); // the MK4S has exactly 10 mm
    }
  });

  it('does not fit the minis, which need their own entry (the control)', () => {
    const minis = PRINTERS.filter((p) => p.group === 'mini');
    expect(minis.map((p) => p.model).sort()).toEqual(['Bambu Lab A1 mini', 'Original Prusa MINI+']);
    for (const p of minis) expect(fitsBed(DEFAULT_BED.xMm, DEFAULT_BED.yMm, p)).toBe(false);
  });
});
