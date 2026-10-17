// The values a type's form starts with (D250 g): its own, as last left, and over them those of the type shown
// before for the settings both have, where they are values this type takes.
import { boardType } from 'skadis-air';
import { describe, expect, it } from 'vitest';
import { startingValues } from '../src/choices.js';

describe('startingValues', () => {
  it("carries a board's size on to the next board, over that board's own", () => {
    const start = startingValues(boardType('lightened'), { widthMm: '120' }, { widthMm: '240', heightMm: '200' });
    expect(start['widthMm']).toBe('240');
    expect(start['heightMm']).toBe('200');
  });

  it("keeps a type's own values where the type before has none", () => {
    expect(startingValues(boardType('slot-clip'), { fixing: 'none' }, { widthMm: '240' })['fixing']).toBe('none');
  });

  it('carries no value the type does not take: an option it lacks, or a number outside its limits', () => {
    const standoff = boardType('standoff');
    // a slot clip's "2 boards, one above the other" is no standoff's
    expect(startingValues(standoff, {}, { boards: '2-stacked' })['boards']).toBeUndefined();
    expect(startingValues(standoff, {}, { boards: '4' })['boards']).toBe('4');
    // a board's height of 160 mm is not a standoff's, at most 40
    expect(startingValues(standoff, {}, { heightMm: '160' })['heightMm']).toBeUndefined();
    expect(startingValues(standoff, {}, { heightMm: '25' })['heightMm']).toBe('25');
  });

  it('keeps sides only when every side is open or closed', () => {
    const solid = boardType('solid');
    const closed = { left: 'closed', right: 'closed', bottom: 'closed', top: 'closed' };
    expect(startingValues(solid, {}, { sides: closed })['sides']).toEqual(closed);
    expect(startingValues(solid, {}, { sides: { ...closed, top: 'half' } })['sides']).toBeUndefined();
  });
});
