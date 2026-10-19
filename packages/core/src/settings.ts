// The settings a board type declares (backlog item registry). Each type lists its settings once;
// the page's controls, the values read from them, their checks and warnings are all derived from that
// list, so a new setting is one entry and nothing else (the extension-registry practice).
import { ALL_OPEN, type Side, type Sides } from './slots.js';

export interface NumberSetting {
  kind: 'number';
  key: string;
  label: string;
  unit: 'mm';
  default: number;
  min: number;
  max?: number; // none: as large as given (a wall's size, D196)
  step: number; // the control's step
  onStep?: boolean; // the value must be min plus a whole number of steps (a board's size, D15)
  count?: { one: string; other: string }; // what a step is called, beside the value: '= 1 tile', '= 6 tiles' (D45, A263)
  warnOutside?: readonly [number, number]; // a range outside which the value is allowed but warned about
  help?: string;
  advanced?: boolean; // shown under "Advanced", folded away (D48)
}

export interface SidesSetting {
  kind: 'sides';
  key: string;
  label: string;
  default: Sides;
  help?: string;
  advanced?: boolean;
}

export interface ChoiceSetting {
  kind: 'choice';
  key: string;
  label: string;
  options: readonly { value: string; label: string }[]; // in the order the page lists them
  default: string; // one of the options' values
  help?: string;
  advanced?: boolean;
}

export type Setting = NumberSetting | SidesSetting | ChoiceSetting;

/** Keeps the settings' literal keys, so a board type's values are typed from its declaration. */
export function defineSettings<const S extends readonly Setting[]>(settings: S): S {
  return settings;
}

type ValueOf<S extends Setting> = S extends NumberSetting
  ? number
  : S extends ChoiceSetting
    ? S['options'][number]['value']
    : Sides;
export type Values<S extends readonly Setting[]> = { [K in S[number] as K['key']]: ValueOf<K> };

export interface Problem {
  key: string;
  message: string;
}

export type ReadResult<S extends readonly Setting[]> =
  { ok: true; values: Values<S>; warnings: Problem[] } | { ok: false; errors: Problem[]; warnings: Problem[] };

export function defaultValues<const S extends readonly Setting[]>(settings: S): Values<S> {
  const values: Record<string, number | string | Sides> = {};
  for (const s of settings) values[s.key] = s.kind === 'sides' ? { ...s.default } : s.default;
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- built key by key from the declaration
  return values as Values<S>;
}

const SIDES: readonly Side[] = ['left', 'right', 'bottom', 'top'];
const nice = (n: number) => String(Math.round(n * 1000) / 1000);

/** A number as typed, or why it is none. */
export type TypedNumber = { ok: true; value: number } | { ok: false; why: 'unclear' | 'not a number' };

// A thousands separator's shape: one to three digits, the first not 0, a comma, three digits ("40,000").
const GROUPED = /^[+-]?[1-9]\d{0,2},\d{3}$/;

/**
 * A number as typed in a field, read the one way everywhere (D222): a comma is a decimal point, as some keyboards
 * write one (the design system's fields); but a comma before three digits, as in "40,000", could as well be a
 * thousands separator, which had read a 40 m wall as a 40 mm board, so it is unclear, and refused.
 */
export function readTypedNumber(text: string): TypedNumber {
  const t = text.trim();
  if (GROUPED.test(t)) return { ok: false, why: 'unclear' };
  const n = t === '' ? Number.NaN : Number(t.replace(',', '.'));
  return Number.isFinite(n) ? { ok: true, value: n } : { ok: false, why: 'not a number' };
}

function readNumber(s: NumberSetting, given: unknown, errors: Problem[], warnings: Problem[]): number {
  if (given === undefined || given === '') return s.default;
  // A form hands over text; a caller may hand over a number. Anything else is not a number.
  const typed: TypedNumber =
    typeof given === 'number'
      ? { ok: true, value: given }
      : typeof given === 'string'
        ? readTypedNumber(given)
        : { ok: false, why: 'not a number' };
  if (!typed.ok || !Number.isFinite(typed.value)) {
    const message =
      !typed.ok && typed.why === 'unclear'
        ? `${s.label} is unclear with a comma before three digits: leave the comma out, or write a point for a decimal`
        : `${s.label} must be a number`;
    errors.push({ key: s.key, message });
    return s.default;
  }
  const n = typed.value;
  if (n < s.min || (s.max !== undefined && n > s.max)) {
    const range = s.max === undefined ? `at least ${nice(s.min)}` : `from ${nice(s.min)} to ${nice(s.max)}`;
    errors.push({ key: s.key, message: `${s.label} must be ${range} ${s.unit}` });
  } else if (s.onStep && Math.abs((n - s.min) / s.step - Math.round((n - s.min) / s.step)) > 1e-9) {
    errors.push({ key: s.key, message: `${s.label} goes in ${nice(s.step)} ${s.unit} steps` });
  } else if (s.warnOutside && (n < s.warnOutside[0] || n > s.warnOutside[1])) {
    warnings.push({
      key: s.key,
      message: `${s.label} outside ${nice(s.warnOutside[0])} to ${nice(s.warnOutside[1])} ${s.unit}`,
    });
  }
  return n;
}

function readSides(s: SidesSetting, given: unknown, errors: Problem[]): Sides {
  const sides: Sides = { ...ALL_OPEN, ...s.default };
  if (given === undefined) return sides;
  if (typeof given !== 'object' || given === null) {
    errors.push({ key: s.key, message: `${s.label} must say which sides are open and which closed` });
    return sides;
  }
  for (const side of SIDES) {
    const v: unknown = Object.getOwnPropertyDescriptor(given, side)?.value;
    if (v === undefined) continue;
    if (v === 'open' || v === 'closed') sides[side] = v;
    else errors.push({ key: s.key, message: `The ${side} side must be open or closed` });
  }
  return sides;
}

function readChoice(s: ChoiceSetting, given: unknown, errors: Problem[]): string {
  if (given === undefined || given === '') return s.default;
  const option = s.options.find((o) => o.value === given);
  if (option !== undefined) return option.value;
  errors.push({ key: s.key, message: `${s.label} must be one of: ${s.options.map((o) => o.label).join(', ')}` });
  return s.default;
}

/** Reads every setting from what was given, as text or numbers; anything missing takes its starting value. */
export function readValues<const S extends readonly Setting[]>(
  settings: S,
  given: Readonly<Record<string, unknown>>,
): ReadResult<S> {
  const errors: Problem[] = [];
  const warnings: Problem[] = [];
  const values: Record<string, number | string | Sides> = {};
  for (const s of settings) {
    if (s.kind === 'number') values[s.key] = readNumber(s, given[s.key], errors, warnings);
    else if (s.kind === 'choice') values[s.key] = readChoice(s, given[s.key], errors);
    else values[s.key] = readSides(s, given[s.key], errors);
  }
  if (errors.length > 0) return { ok: false, errors, warnings };
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- built key by key from the declaration
  return { ok: true, values: values as Values<S>, warnings };
}
