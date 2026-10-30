// The standoff connector as a type on the page (D91 to D94, D97, D281): listed under "Connectors", for 1 board, 2
// side by side or one above the other, or 4, as the slot clip; its height and the screw size, shared with the board,
// on the main form (D479): its holes take the boards' corner screws, the screw size itself, so it has no size of its
// own. It prints as built, wall face down, the posts of a shared one on top (C101).
import { SCREW_MM, SCREW_SIZE_SETTING } from '../screw-places.js';
import { TAPE_LENGTH_SETTING, TAPE_STANDOFF_MM, TAPE_WIDTH_SETTING } from '../tape.js';
import { defineSettings } from '../settings.js';
import { makeStandoff, standoffParams, standoffScrews, STANDOFF_DEFAULTS, type StandoffParams } from '../standoff.js';
import { defineBoardType } from './define.js';

/** How the file name says which boards it serves. */
const BOARDS_IN_NAME = { '1': '1-board', '2': '2-boards', '2-stacked': '2-boards-stacked', '4': '4-boards' } as const;

/** The standoff's settings as the library takes them, for its build and its screws alike. */
function paramsOf(
  v: Pick<StandoffParams, 'boards' | 'heightMm' | 'screwMm'> & {
    standoffFixing: string;
    tapeWidthMm: number;
    tapeLengthMm: number;
  },
) {
  const nut =
    v.standoffFixing === 'nut'
      ? ({ fixing: 'nut', tapeMm: v.tapeWidthMm, tapeLengthMm: v.tapeLengthMm } as const)
      : v.standoffFixing === 'nut-screwed'
        ? ({ fixing: 'nut-screwed' } as const)
        : {};
  return standoffParams({ boards: v.boards, heightMm: v.heightMm, screwMm: v.screwMm, ...nut });
}

export const STANDOFF = defineBoardType({
  id: 'standoff',
  name: 'Standoff',
  group: 'connector',
  prints: 'as-built',
  description: 'A spacer between boards and the wall, at their corner screw holes; the screws go through it.',
  settings: defineSettings([
    {
      kind: 'choice',
      key: 'boards',
      label: 'For',
      options: [
        { value: '1', label: '1 board, at a corner' },
        { value: '2', label: '2 boards, side by side' },
        { value: '2-stacked', label: '2 boards, one above the other' },
        { value: '4', label: '4 boards, where four corners meet' },
      ],
      default: STANDOFF_DEFAULTS.boards,
      help:
        "A post goes behind each board's corner screw hole. For 2 or 4 boards the posts are joined on the wall " +
        'side only, so hooks keep their room next to the boards.',
    },
    {
      kind: 'choice',
      key: 'standoffFixing', // its own key: the slot clip's "fixing" has other values, and a type carries a value on
      label: 'Fixing',
      options: [
        { value: 'screw', label: 'Screw through to the wall' },
        { value: 'nut', label: 'Nut, taped to the wall' },
        { value: 'nut-screwed', label: 'Nut, screwed to the wall' }, // D600
      ],
      default: 'screw',
      help:
        "Screw through: each board's corner screw goes on through the standoff into the wall. Nut: each post holds a " +
        'nut of the screw size, slid in from the side, and a countersunk machine screw through the board holds it; ' +
        'the standoff stands on a rectangular pad for a piece of double-sided tape, with no hole into the wall (D592), or on a foot ' +
        'screwed to the wall by two screws of the screw size, driven before the boards go on (D600).',
    },
    {
      kind: 'number',
      key: 'heightMm',
      label: 'Height',
      unit: 'mm',
      default: STANDOFF_DEFAULTS.heightMm,
      startsAt: (v) => (v['standoffFixing'] === 'nut' ? TAPE_STANDOFF_MM : STANDOFF_DEFAULTS.heightMm), // C604
      min: 3,
      max: 40,
      step: 0.5,
      help: "How far it holds the boards off the wall: 15 mm unless set, and 18 mm taped, as tape boards stand; IKEA's spacers hold them about 20 mm off. For 2 or 4 boards, at least 12 mm.",
    },
    { ...TAPE_WIDTH_SETTING, appliesWhen: (v) => v['standoffFixing'] === 'nut' }, // D593, Q594
    { ...TAPE_LENGTH_SETTING, appliesWhen: (v) => v['standoffFixing'] === 'nut' }, // C601
    SCREW_SIZE_SETTING,
  ]),
  build: (engine, v) => makeStandoff(engine, paramsOf(v)),
  label: (v) =>
    `${BOARDS_IN_NAME[v.boards]}-${v.heightMm}mm` +
    (v.standoffFixing === 'nut' ? `-nut-tape-${v.tapeWidthMm}x${v.tapeLengthMm}mm` : '') +
    (v.standoffFixing === 'nut-screwed' ? '-nut-screwed' : '') +
    (v.screwMm === SCREW_MM ? '' : `-screw-${v.screwMm}mm`),
  screws: (v) => standoffScrews(paramsOf(v)),
});
