// The slot clip as a type on the page (D187 to D189, C191): listed under "Connectors" after the standoff,
// for 2 boards side by side, 2 one above the other, or 4; its depth on the main form and the peg clearance
// under Advanced. It prints as built, wall face down, the pegs on top.
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
  ]),
  build: (engine, v) =>
    makeSlotClip(
      engine,
      slotClipParams({
        boards: v.boards,
        depthMm: v.depthMm,
        pegClearanceMm: v.pegClearanceMm,
      }),
    ),
  label: (v) =>
    `${BOARDS_IN_NAME[v.boards]}-${v.depthMm}mm` +
    (v.pegClearanceMm === SLOT_CLIP_DEFAULTS.pegClearanceMm ? '' : `-clearance-${v.pegClearanceMm}mm`),
});
