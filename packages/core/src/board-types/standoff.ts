// The standoff connector as a type on the page (D91 to D94, D97, D281): listed under "Connectors", for 1 board, 2
// side by side or one above the other, or 4, as the slot clip; its height and the screw size, shared with the board,
// on the main form (D479): its holes take the boards' corner screws, the screw size itself, so it has no size of its
// own. It prints as built, wall face down, the posts of a shared one on top (C101).
import { SCREW_MM, SCREW_SIZE_SETTING } from '../screw-places.js';
import { TAPE_LENGTH_SETTING, TAPE_STANDOFF_MM, TAPE_WIDTH_SETTING } from '../tape.js';
import { defineSettings } from '../settings.js';
import {
  makeStandoff,
  NUT_FIT_MM,
  onTape,
  pilotHoleFor,
  standoffParams,
  standoffScrews,
  STANDOFF_DEFAULTS,
  type StandoffParams,
} from '../standoff.js';
import { defineBoardType } from './define.js';

/** How the file name says which boards it serves. */
const BOARDS_IN_NAME = { '1': '1-board', '2': '2-boards', '2-stacked': '2-boards-stacked', '4': '4-boards' } as const;

/** The standoff's settings as the library takes them, for its build and its screws alike. */
function paramsOf(
  v: Pick<StandoffParams, 'boards' | 'heightMm' | 'screwMm'> & {
    standoffFixing: string;
    tapeWidthMm: number;
    tapeLengthMm: number;
    nutFitMm: number;
    pilotHoleMm: number;
  },
) {
  const nut =
    v.standoffFixing === 'nut'
      ? ({ fixing: 'nut', tapeMm: v.tapeWidthMm, tapeLengthMm: v.tapeLengthMm, nutFitMm: v.nutFitMm } as const)
      : v.standoffFixing === 'nut-screwed'
        ? ({ fixing: 'nut-screwed', nutFitMm: v.nutFitMm } as const)
        : v.standoffFixing === 'self-tap'
          ? ({
              fixing: 'self-tap',
              tapeMm: v.tapeWidthMm,
              tapeLengthMm: v.tapeLengthMm,
              pilotHoleMm: v.pilotHoleMm,
            } as const)
          : v.standoffFixing === 'self-tap-screwed'
            ? ({ fixing: 'self-tap-screwed', pilotHoleMm: v.pilotHoleMm } as const)
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
        { value: 'self-tap', label: 'Wood or PT screw, taped to the wall' }, // D611
        { value: 'self-tap-screwed', label: 'Wood or PT screw, screwed to the wall' },
      ],
      default: 'screw',
      help:
        "Screw through: each board's corner screw goes on through the standoff into the wall. Nut: each post holds a " +
        'nut of the screw size, pulled up into a seat from the wall side before the standoff goes up, and a countersunk ' +
        'machine screw through the board holds it (D607); the standoff stands on a rectangular pad for a piece of ' +
        'double-sided tape (D592), or on a foot screwed to the wall by two screws of the screw size, driven before the ' +
        'boards go on (D600). Wood or PT screw: the same, each post a pilot hole that a countersunk wood screw, or a PT ' +
        'screw made for plastic, cuts its own thread in (D611). Taped or screwed to the wall, it holds boards with ' +
        'corner screw holes and no standoffs of their own: a board on tape standoffs has no holes for it.',
    },
    {
      kind: 'number',
      key: 'heightMm',
      label: 'Height',
      unit: 'mm',
      default: STANDOFF_DEFAULTS.heightMm,
      startsAt: (v) => (onTape(v['standoffFixing']) ? TAPE_STANDOFF_MM : STANDOFF_DEFAULTS.heightMm), // C604
      min: 3,
      max: 40,
      step: 0.5,
      help: "How far it holds the boards off the wall: 15 mm unless set, and 18 mm taped, the height the boards' own tape standoffs start at; IKEA's spacers hold them about 20 mm off. For 2 or 4 boards, at least 12 mm.",
    },
    { ...TAPE_WIDTH_SETTING, appliesWhen: (v) => onTape(v['standoffFixing']) }, // D593, Q594
    { ...TAPE_LENGTH_SETTING, appliesWhen: (v) => onTape(v['standoffFixing']) }, // C601
    {
      kind: 'number',
      key: 'nutFitMm',
      label: 'Nut fit',
      unit: 'mm',
      default: NUT_FIT_MM,
      min: 0,
      max: 0.6,
      step: 0.05,
      advanced: true,
      appliesWhen: (v) => v['standoffFixing'] === 'nut' || v['standoffFixing'] === 'nut-screwed', // D607 a
      help:
        'With a nut: how much wider than the nut its seat is across the flats, 0.2 mm unless set. A nut that will ' +
        'not pull in wants more; one that falls out of its seat once the screw is out wants less.',
    },
    {
      kind: 'number',
      key: 'pilotHoleMm',
      label: 'Pilot hole',
      unit: 'mm',
      default: pilotHoleFor(STANDOFF_DEFAULTS.screwMm),
      startsAt: (v) => pilotHoleFor(Number(v['screwMm'])), // 0.85 times the screw, as D267's
      min: 1.5,
      max: 4.95,
      step: 0.05,
      advanced: true,
      appliesWhen: (v) => v['standoffFixing'] === 'self-tap' || v['standoffFixing'] === 'self-tap-screwed', // D611
      help:
        'With a wood or PT screw: the hole in each post that the screw cuts its thread in, 0.85 times the screw ' +
        'unless set. A screw that is hard to drive or splits the post wants more; one that strips wants less.',
    },
    SCREW_SIZE_SETTING,
  ]),
  build: (engine, v) => makeStandoff(engine, paramsOf(v)),
  label: (v) =>
    `${BOARDS_IN_NAME[v.boards]}-${v.heightMm}mm` +
    (v.standoffFixing === 'nut' ? `-nut-tape-${v.tapeWidthMm}x${v.tapeLengthMm}mm` : '') +
    (v.standoffFixing === 'nut-screwed' ? '-nut-screwed' : '') +
    (v.standoffFixing.startsWith('nut') && v.nutFitMm !== NUT_FIT_MM ? `-nut-fit-${v.nutFitMm}mm` : '') +
    (v.standoffFixing === 'self-tap' ? `-self-tap-tape-${v.tapeWidthMm}x${v.tapeLengthMm}mm` : '') +
    (v.standoffFixing === 'self-tap-screwed' ? '-self-tap-screwed' : '') +
    (v.standoffFixing.startsWith('self-tap') && Math.abs(v.pilotHoleMm - pilotHoleFor(v.screwMm)) > 1e-9
      ? `-pilot-${v.pilotHoleMm}mm`
      : '') +
    (v.screwMm === SCREW_MM ? '' : `-screw-${v.screwMm}mm`),
  screws: (v) => standoffScrews(paramsOf(v)),
});
