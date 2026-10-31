// The slot clip as a type on the page (D187 to D189, D194, D195, C191, C199): listed under "Connectors" after
// the standoff, for 2 boards side by side, 2 one above the other, or 4, at seams through the slots or between them
// (D290); its fixing, its depth and the screw size, shared with the boards, on the main form (D479); the peg
// clearance, the screw's head and the clip's own screw size, the screw size's unless set, under Advanced; its pegs
// ribbed, the lip taken out (D261). It prints as built, wall face down, the pegs on top.
import { CLIP_SCREW, SCREW_MM, SCREW_SIZE_SETTING, screwAt, screwPlaceSettings } from '../screw-places.js';
import { defineSettings } from '../settings.js';
import { makeSlotClip, SLOT_CLIP_DEFAULTS, slotClipParams, slotClipScrews, type SlotClipParams } from '../slot-clip.js';
import { defineBoardType } from './define.js';

/** How the file name says which boards it joins. */
const BOARDS_IN_NAME = { '2': '2-boards', '2-stacked': '2-boards-stacked', '4': '4-boards' } as const;

type ClipValues = Omit<SlotClipParams, 'screwMm'> & {
  screwMm: number;
  clipScrewSize: string;
  clipScrewMm: number;
};

/** The clip's settings as the library takes them, for its build and its screws alike: its screw the screw size unless
 * it has its own (D479). */
function paramsOf(v: ClipValues): SlotClipParams {
  return slotClipParams({
    boards: v.boards,
    seams: v.seams,
    depthMm: v.depthMm,
    pegClearanceMm: v.pegClearanceMm,
    fixing: v.fixing,
    screwHead: v.screwHead,
    screwMm: screwAt(v, CLIP_SCREW),
  });
}

export const SLOT_CLIP = defineBoardType({
  id: 'slot-clip',
  name: 'Slot clip',
  group: 'connector',
  prints: 'as-built',
  description:
    'Joins boards behind a seam by pegs in their slots, so it needs no screw holes. As deep as the gap behind ' +
    'the boards, so the wall holds it on; it goes on the first board before that board goes up.',
  settings: defineSettings([
    {
      kind: 'choice',
      key: 'boards',
      label: 'For',
      options: [
        { value: '2', label: '2 boards, side by side' },
        { value: '2-stacked', label: '2 boards, one above the other' },
        { value: '4', label: '4 boards, where four corners meet' },
      ],
      default: SLOT_CLIP_DEFAULTS.boards,
      help:
        "Through the slots: a peg goes in each board's nearest whole slot, 20 mm from the seam; the slots along the " +
        'seam stay free.',
      // between the slots one clip joins 2 boards either way, and 4 by clips along their seams (D290 a): nothing to
      // choose there, so it is hidden (the owner, 31 Oct 2026; D620 a)
      appliesWhen: (v) => v['seams'] !== 'between',
    },
    {
      kind: 'choice',
      key: 'seams',
      label: 'Seam',
      options: [
        { value: 'through', label: 'Through the slots' },
        { value: 'between', label: 'Between the slots' },
      ],
      default: SLOT_CLIP_DEFAULTS.seams,
      help:
        "As the boards' open sides run. Between the slots, a peg goes in the nearest slot each side, 10 mm from the " +
        'seam and a row apart, the bar on the diagonal: the same clip joins boards side by side or one above the ' +
        "other, and four boards by such clips along their seams. Its screw goes past the second board's post.",
    },
    {
      kind: 'choice',
      key: 'fixing',
      label: 'Fixing',
      options: [
        { value: 'none', label: 'None' },
        { value: 'screw', label: 'Screw' },
        { value: 'keyhole', label: 'Keyhole' },
      ],
      default: SLOT_CLIP_DEFAULTS.fixing,
      help:
        'A screw goes through the clip beside the seam once the first board is up with the clip in it, before the ' +
        'next board. A keyhole hangs the clip on a screw already in the wall, which must be where the slots put it.',
    },
    {
      kind: 'number',
      key: 'depthMm',
      label: 'Depth',
      unit: 'mm',
      default: SLOT_CLIP_DEFAULTS.depthMm,
      min: 12,
      max: 40,
      step: 0.5,
      help: "The gap behind the boards, as the standoffs' height: 15 mm unless set. At least 12 mm, so hooks have room.",
    },
    SCREW_SIZE_SETTING,
    {
      kind: 'number',
      key: 'pegClearanceMm',
      label: 'Peg clearance',
      unit: 'mm',
      default: SLOT_CLIP_DEFAULTS.pegClearanceMm,
      min: 0,
      max: 1,
      step: 0.05,
      advanced: true,
      help: 'How much smaller each peg is than the slot the board cuts (5.2 × 15.2 mm at its starting clearance).',
    },
    {
      kind: 'choice',
      key: 'screwHead',
      label: 'Screw head',
      options: [
        { value: 'countersunk', label: 'Countersunk' },
        { value: 'round', label: 'Round head' },
      ],
      default: SLOT_CLIP_DEFAULTS.screwHead,
      help:
        "For a screw: flush in its countersink, or a round (pan) head sunk in a counterbore below the bar's face, so " +
        'hooks along the seam keep their room. A round head on a 4 mm screw needs the clip at least 13.4 mm deep.',
      advanced: true,
    },
    ...screwPlaceSettings(CLIP_SCREW),
  ]),
  build: (engine, v) => makeSlotClip(engine, paramsOf(v)),
  label: (v) => {
    const screwMm = screwAt(v, CLIP_SCREW);
    return (
      `${BOARDS_IN_NAME[v.boards]}${v.seams === 'between' ? '-between-slots' : ''}-${v.depthMm}mm` +
      (v.fixing === 'none' ? '' : `-${v.fixing}`) +
      (v.fixing === 'screw' && v.screwHead === 'round' ? '-round-head' : '') +
      // the clip's screw, where not the start: `-screw-3.5mm` after a screw, `-keyhole-screw-3.5mm` after a keyhole
      (v.fixing === 'none' || screwMm === SCREW_MM
        ? ''
        : v.fixing === 'screw'
          ? `-${screwMm}mm`
          : `-screw-${screwMm}mm`) +
      (v.pegClearanceMm === SLOT_CLIP_DEFAULTS.pegClearanceMm ? '' : `-clearance-${v.pegClearanceMm}mm`)
    );
  },
  screws: (v) => slotClipScrews(paramsOf(v)),
});
