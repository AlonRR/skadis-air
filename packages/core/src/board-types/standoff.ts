// The standoff connector as a type on the page (D91 to D94, D97, D281): listed under "Connectors", for 1 board, 2
// side by side or one above the other, or 4, as the slot clip; its height on the main form and the screw size, shared
// with the board, under Advanced. It prints as built, wall face down, the posts of a shared one on top (C101).
import { MOUNTING_DEFAULTS, SCREW_SIZE_SETTING } from '../mounting.js';
import { defineSettings } from '../settings.js';
import { makeStandoff, standoffParams, standoffScrews, STANDOFF_DEFAULTS, type StandoffParams } from '../standoff.js';
import { defineBoardType } from './define.js';

/** How the file name says which boards it serves. */
const BOARDS_IN_NAME = { '1': '1-board', '2': '2-boards', '2-stacked': '2-boards-stacked', '4': '4-boards' } as const;

/** The standoff's settings as the library takes them, for its build and its screws alike. */
function paramsOf(v: Pick<StandoffParams, 'boards' | 'heightMm' | 'screwMm'>) {
  return standoffParams({ boards: v.boards, heightMm: v.heightMm, screwMm: v.screwMm });
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
      kind: 'number',
      key: 'heightMm',
      label: 'Height',
      unit: 'mm',
      default: STANDOFF_DEFAULTS.heightMm,
      min: 3,
      max: 40,
      step: 0.5,
      help: "How far it holds the boards off the wall: 15 mm unless set; IKEA's spacers hold them about 20 mm off. For 2 or 4 boards, at least 12 mm.",
    },
    SCREW_SIZE_SETTING,
  ]),
  build: (engine, v) => makeStandoff(engine, paramsOf(v)),
  label: (v) =>
    `${BOARDS_IN_NAME[v.boards]}-${v.heightMm}mm` +
    (v.screwMm === MOUNTING_DEFAULTS.screwMm ? '' : `-screw-${v.screwMm}mm`),
  screws: (v) => standoffScrews(paramsOf(v)),
});
