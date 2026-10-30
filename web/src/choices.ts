// The choices made on the page, kept in this browser (D250 g): which group of types is shown, the type last chosen
// in each, and each type's values as its form reads them. Switching types, or reloading, loses none of them. One
// JSON object under one key, as the printer and the theme are kept; storage that is missing or refused leaves the
// page as it would be with nothing kept.
import {
  readTypedNumber,
  SCREW_SIZE_SETTING,
  TAPE_LENGTH_SETTING,
  TAPE_WIDTH_SETTING,
  type AnyBoardType,
  type Setting,
} from 'skadis-air';

const KEY = 'skadis-air-choices';

export interface Choices {
  group?: string; // what to make: 'board', 'wall' or 'connector' (D590)
  types: Record<string, string>; // the type last chosen in each group
  values: Record<string, Record<string, unknown>>; // each type's values, by its id
}

export function loadChoices(): Choices {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(KEY) ?? '{}');
    if (typeof parsed !== 'object' || parsed === null) return { types: {}, values: {} };
    const { group, types, values } = parsed as Partial<Choices>;
    return {
      ...(typeof group === 'string' ? { group } : {}),
      types: typeof types === 'object' && types !== null ? types : {},
      values: typeof values === 'object' && values !== null ? values : {},
    };
  } catch {
    return { types: {}, values: {} };
  }
}

export function saveChoices(choices: Choices): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(choices));
  } catch {
    // nothing kept: the page works on as it is
  }
}

const SIDES = ['left', 'right', 'bottom', 'top'] as const;

/** A value as the form would hold it for this setting, or undefined when it is not one; `strict`, a number only
 * within the setting's limits. */
export function valueFor(s: Setting, given: unknown, strict = false): unknown {
  if (s.kind === 'number') {
    if (typeof given !== 'string') return undefined;
    if (!strict) return given;
    const typed = readTypedNumber(given);
    return typed.ok && typed.value >= s.min && typed.value <= (s.max ?? Infinity) ? given : undefined;
  }
  if (s.kind === 'choice') {
    return typeof given === 'string' && s.options.some((o) => o.value === given) ? given : undefined;
  }
  if (typeof given !== 'object' || given === null) return undefined;
  const sides: Record<string, string> = {};
  for (const side of SIDES) {
    const v: unknown = Object.getOwnPropertyDescriptor(given, side)?.value;
    if (v !== 'open' && v !== 'closed') return undefined;
    sides[side] = v;
  }
  return sides;
}

/**
 * The values a type's form starts with: its own, as last left, then over them those of the type shown before, of
 * the same group, for the settings both have, where they are values this type takes (a board's size goes on to the
 * next board; a slot clip's "2 boards, one above the other" does not become a standoff's; a board's height, 160 mm,
 * is not a standoff's, which is another thing of the same name).
 */
export function startingValues(
  type: AnyBoardType,
  own: Readonly<Record<string, unknown>> = {},
  before: Readonly<Record<string, unknown>> = {},
): Record<string, unknown> {
  const start: Record<string, unknown> = {};
  for (const s of type.settings) {
    const value = valueFor(s, before[s.key], true) ?? valueFor(s, own[s.key]);
    if (value !== undefined) start[s.key] = value;
  }
  return start;
}

/**
 * What the form shown carries to a type of the OTHER group (Q511): the screw size and the tape's width and length
 * (D593, Q594, C601),
 * each one choice for the boards and the connectors both. Every other value, and each kind of place's own size under
 * Advanced, stays within its group, as startingValues has it.
 */
export function carriedAcrossGroups(shown: Readonly<Record<string, unknown>>): Record<string, unknown> {
  return Object.fromEntries(
    [SCREW_SIZE_SETTING.key, TAPE_WIDTH_SETTING.key, TAPE_LENGTH_SETTING.key]
      .filter((key) => key in shown)
      .map((key) => [key, shown[key]]),
  );
}
