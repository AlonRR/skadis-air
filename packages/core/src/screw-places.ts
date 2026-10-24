// The screw a part takes, and the kinds of place it goes (D479; Q359, D370): one screw size, on the main form, for
// every hole, a countersunk screw 4 mm across with an 8 mm head unless set; under Advanced, each kind of place but the
// corner holes, which are the screw size's own, may have a size of its own, the screw size's unless set. A kind of
// place is one entry in SCREW_PLACES and the two settings screwPlaceSettings makes of it, which its part type lists: a
// choice of the screw size or its own, and its own size, which applies only with "Own" (D372); the type's build reads
// the size it takes with screwAt. The contract test (screw-places.test.ts) holds every entry and every type that lists
// one (the extension-registry practice).
import type { AppliesWhen, ChoiceSetting, NumberSetting } from './settings.js';

/** The screw a part takes unless set, mm: a 4 mm countersunk screw, its head 8 mm across (D76, Q359). */
export const SCREW_MM = 4;

/** The screw's size, one setting shared by every part a screw goes through, so they cannot drift apart; on the main
 * form, as the screw for every hole (D479). */
export const SCREW_SIZE_SETTING = {
  kind: 'number',
  key: 'screwMm',
  label: 'Screw size',
  unit: 'mm',
  default: SCREW_MM,
  min: 3,
  max: 5,
  step: 0.5,
  help:
    'The screw for every hole, unless Advanced gives a kind of hole its own size: a countersunk screw, its head ' +
    'twice the screw across, 8 mm for a 4 mm screw. Each hole is 0.5 mm wider than the screw, and a countersink 1 mm ' +
    'wider than the head.',
} as const satisfies NumberSetting;

/** A kind of place a screw goes, which may have a size of its own (D479). */
export interface ScrewPlace<K extends string = string> {
  /** Its settings' keys: `${key}Size`, the choice of the screw size or its own, and `${key}Mm`, its own size. */
  key: K;
  /** What it is called: the choice is labelled `${label} size`, its own size `${label}'s own size`. */
  label: string;
  /** When it applies, which both its settings' help begins with (D372): 'With keyholes'. */
  when: string;
  /** What its own size is, after the words that say when it applies. */
  help: string;
  /** Its own size's range, mm; in the screw size's steps. */
  min: number;
  max: number;
  /** Whether a part has such a place, from the values of the others: both its settings apply only then (D372). */
  appliesWhen: AppliesWhen;
  /** Values that give a part such a place, for the contract test. */
  inPlay: Readonly<Record<string, unknown>>;
}

/** The choice every kind of place offers: the screw size, or a size of its own (D479). */
export const SAME_OR_OWN = [
  { value: 'same', label: 'Same as the screw size' },
  { value: 'own', label: 'Own' },
] as const;

/** A kind of place's two settings, both under Advanced (D479): the choice of the screw size or its own, which applies
 * where the part has such a place, and its own size, which applies there with "Own" and starts at the screw size's
 * start. */
export function screwPlaceSettings<const K extends string>(place: ScrewPlace<K>) {
  return [
    {
      kind: 'choice',
      key: `${place.key}Size`,
      label: `${place.label} size`,
      options: SAME_OR_OWN,
      default: 'same',
      help: `${place.when}: the screw size, unless "Own" gives it a size of its own.`,
      advanced: true,
      appliesWhen: place.appliesWhen,
    },
    {
      kind: 'number',
      key: `${place.key}Mm`,
      label: `${place.label}'s own size`,
      unit: 'mm',
      default: SCREW_SIZE_SETTING.default,
      min: place.min,
      max: place.max,
      step: SCREW_SIZE_SETTING.step,
      help: `${place.when}, and "Own" chosen above: ${place.help}`,
      advanced: true,
      appliesWhen: (v: Readonly<Record<string, unknown>>) => place.appliesWhen(v) && v[`${place.key}Size`] === 'own',
    },
  ] as const satisfies readonly [ChoiceSetting, NumberSetting];
}

/** The values a kind of place's size is read from: the screw size and its two settings. */
export type ScrewPlaceValues<K extends string> = { screwMm: number } & Record<`${K}Size`, string> &
  Record<`${K}Mm`, number>;

/** The size of screw a kind of place takes (D479): its own where "Own" is chosen, else the screw size. */
export function screwAt<K extends string>(v: ScrewPlaceValues<K>, place: Pick<ScrewPlace<K>, 'key'>): number {
  const sizes: Record<`${K}Size`, string> = v;
  const owns: Record<`${K}Mm`, number> = v;
  return sizes[`${place.key}Size`] === 'own' ? owns[`${place.key}Mm`] : v.screwMm;
}

/** A board's keyholes (D156, D358): the screws they hang on, standing in the wall. */
export const KEYHOLE_SCREW = {
  key: 'keyholeScrew',
  label: 'Keyhole screw',
  when: 'With keyholes',
  help: "the screw's diameter. Its countersunk head is twice that across, and the keyhole's seat is drawn for it.",
  min: 3,
  max: 5,
  appliesWhen: (v) => v['screwHead'] === 'keyhole',
  inPlay: { screwHead: 'keyhole', standoffs: 'back' },
} as const satisfies ScrewPlace;

/** A board's lock screws (A248, D289), through the slots into the standoffs behind them. */
export const LOCK_SCREW = {
  key: 'lockScrew',
  label: 'Lock screw',
  when: 'With lock screws, at the bottom with keyholes or as the screw holes',
  help:
    'their diameter. Up to 2.5 mm, a pan head 5 mm across passes through the slot and sits in a flat recess. From ' +
    "3 mm, as the screw size's 4 mm, a countersunk screw: its head, twice the screw across, passes through a groove " +
    "cut in the slot's sides, above where a hook rests, and seats on a 45 degree countersink, as a keyhole's does.",
  min: 2,
  max: 5,
  appliesWhen: (v) => v['screwHead'] === 'lock' || (v['screwHead'] === 'keyhole' && v['lockScrews'] === 'bottom'),
  inPlay: { screwHead: 'lock', standoffs: 'back' },
} as const satisfies ScrewPlace;

/** The slot clip's screw (D195, D265): through its bar, or the one its keyhole hangs on. */
export const CLIP_SCREW = {
  key: 'clipScrew',
  label: 'Clip screw',
  when: 'With a screw or a keyhole',
  help: "the screw's diameter, for its countersink or counterbore, or for its keyhole's seat.",
  min: 3,
  max: 5,
  appliesWhen: (v) => v['fixing'] === 'screw' || v['fixing'] === 'keyhole',
  inPlay: { fixing: 'screw' },
} as const satisfies ScrewPlace;

/** Every kind of place a screw goes that may have a size of its own, in the order a form lists them. */
export const SCREW_PLACES: readonly ScrewPlace[] = [KEYHOLE_SCREW, LOCK_SCREW, CLIP_SCREW];
