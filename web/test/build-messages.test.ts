// What the page says of a wall's files (D178, D182, D183): "Download all" names what its one file holds, each kind
// of panel once, its copies left to the slicer (Q11, found by QA on 23 Oct 2026: "All 24 panels in one file" for a
// file that held each of 9 kinds once).
import { describe, expect, it } from 'vitest';
import { allPanelsText, type PanelLine } from '../src/build-messages.js';

const kind = (count: number): PanelLine => ({ fileName: '', count, widthMm: 160, heightMm: 160, closed: [] });

describe('allPanelsText', () => {
  it('names the kinds where some are printed more than once', () => {
    expect(allPanelsText([kind(4), kind(2), kind(2), kind(1)])).toBe('All 4 kinds of panel in one file');
    expect(allPanelsText([kind(6)])).toBe('The 1 kind of panel in one file');
  });

  it('names the panels where each is a kind of its own, which is what the file then holds', () => {
    expect(allPanelsText([kind(1), kind(1), kind(1), kind(1)])).toBe('All 4 panels in one file');
    expect(allPanelsText([kind(1)])).toBe('The 1 panel in one file');
  });
});
