// The slot clip as a type on the page (D187 to D189, D194, D195, C191, C199): listed under "Connectors" after
// the standoff, for 2 boards side by side, 2 one above the other, or 4; its fixing and its depth on the main
// form, its grip, the peg clearance and the screw size, shared with the boards, under Advanced. It prints as
// built, wall face down, the pegs on top.
import { MOUNTING_DEFAULTS, SCREW_SIZE_SETTING } from '../mounting.js';
import { defineSettings } from '../settings.js';
import { makeSlotClip, SLOT_CLIP_DEFAULTS, slotClipParams } from '../slot-clip.js';
import { defineBoardType } from './define.js';

/** How the file name says which boards it joins. */
const BOARDS_IN_NAME = { '2': '2-boards', '2-stacked': '2-boards-stacked', '4': '4-boards' } as const;

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
      help: "A peg goes in each board's nearest whole slot, 20 mm from the seam; the slots along the seam stay free.",
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
      help: "The gap behind the boards, as the standoffs' height: 20 mm unless set. At least 12 mm, so hooks have room.",
    },
    {
      kind: 'choice',
      key: 'grip',
      label: 'Grip',
      options: [
        { value: 'ribs', label: 'Ribs' },
        { value: 'lip', label: 'Lip' },
      ],
      default: SLOT_CLIP_DEFAULTS.grip,
      help:
        'Ribs on the pegs press into the slots. A lip on split pegs snaps into the slots of a 5 mm board and holds ' +
        'harder, but takes the slot above each peg from two-peg hooks.',
      advanced: true,
    },
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
    SCREW_SIZE_SETTING,
  ]),
  build: (engine, v) =>
    makeSlotClip(
      engine,
      slotClipParams({
        boards: v.boards,
        depthMm: v.depthMm,
        pegClearanceMm: v.pegClearanceMm,
        grip: v.grip,
        fixing: v.fixing,
        screwMm: v.screwMm,
      }),
    ),
  label: (v) =>
    `${BOARDS_IN_NAME[v.boards]}-${v.depthMm}mm` +
    (v.grip === 'lip' ? '-lip' : '') +
    (v.fixing === 'none' ? '' : `-${v.fixing}`) +
    (v.fixing !== 'none' && v.screwMm !== MOUNTING_DEFAULTS.screwMm ? `-screw-${v.screwMm}mm` : '') +
    (v.pegClearanceMm === SLOT_CLIP_DEFAULTS.pegClearanceMm ? '' : `-clearance-${v.pegClearanceMm}mm`),
});
