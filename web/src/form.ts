// The page's form for a board type, built from the settings the type declares (backlog item registry),
// in the shared design system's controls (D111): a Field for each number, Choice buttons for each choice,
// the four side toggles round a drawing of the board (Sides, D46), and the fine settings folded under
// "Advanced" (Disclosure, D48). Nothing here names a board type or a setting. A form starts from the values
// given, the choices kept in the browser (D250 g), and each number field steps by arrows beside it (D250 c).
// Each setting's help is folded behind an "i" button beside its label (C317). The page may put a field of its own
// first under Advanced, as it puts the test prints there (D357). A setting that applies only with another choice is
// greyed out, its controls disabled, while it does not (D372): the reader leaves it unchecked then, so nothing marks it.
// An option the other values rule out is greyed out the same way, why said under its choice (D589). A setting the page
// sets itself is kept off the form (D590). A number whose starting value hangs on the others follows it until set (D603).
import { optionsOff, readTypedNumber, settingsNotApplying } from 'skadis-air';
import type { AnyBoardType, ChoiceSetting, NumberSetting, Problem, Setting, SidesSetting } from 'skadis-air';

type Side = 'left' | 'right' | 'bottom' | 'top';
const SIDES: readonly Side[] = ['top', 'left', 'right', 'bottom'];

export interface Form {
  /** What the controls hold now, as text and side states, for readValues. */
  read(): Record<string, unknown>;
  /** Shows each problem beside its control; clears the rest. */
  show(errors: readonly Problem[], warnings: readonly Problem[]): void;
  /** Says under the screw size what each screw passes (D264); nothing when there is no screw. */
  screws(text: string | undefined): void;
  /** What the tape holds, under the tape's settings (D609 a). */
  tape(text: string | undefined): void;
}

function element<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attributes: Record<string, string> = {},
  text?: string,
): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  for (const [name, value] of Object.entries(attributes)) e.setAttribute(name, value);
  if (text !== undefined) e.textContent = text;
  return e;
}

/**
 * A pick-one group shown as buttons (the design system's Choice): radio inputs underneath, so the
 * value is the checked input's, and the arrow keys move between the options. All the inputs of one
 * `name` in the form are one choice, even across groups.
 */
export function choiceGroup(
  name: string,
  label: string,
  options: readonly { value: string; label: string }[],
  chosen: string,
): HTMLElement {
  const group = element('div', { class: 'ws-choice', role: 'radiogroup', 'aria-label': label });
  for (const option of options) {
    const input = element('input', { class: 'ws-choice__input', type: 'radio', name, value: option.value });
    input.checked = option.value === chosen;
    const button = element('label', { class: 'ws-choice__opt' });
    button.append(input, element('span', { class: 'ws-choice__face' }, option.label));
    group.append(button);
  }
  return group;
}

/** A Choice as the form shows a setting's: its label in words above its buttons, in a field of the form. */
export function labelledChoice(label: string, group: HTMLElement): HTMLElement {
  const field = element('div', { class: 'field' });
  field.append(element('div', { class: 'ws-label' }, label), group);
  return field;
}

/** The value of the option checked in a group of Choice buttons, or '' when none is. */
export const chosenIn = (group: ParentNode): string =>
  group.querySelector<HTMLInputElement>('input[type="radio"]:checked')?.value ?? '';

// The lines kept under every control for its problems: an error, which stops the build, and a warning,
// which does not and is a Notice (C120).
// Each field's notes and error carry ids its control names (`aria-describedby`), and an error is a live region, so
// a screen reader reads them with the field and hears a new error (the design system's Field, v0.4.0).
const idOf = (key: string, part: string) => `field-${key}-${part}`;
const errorLine = (key: string) =>
  element('span', { class: 'ws-error', id: idOf(key, 'error'), 'aria-live': 'polite', 'data-testid': `error-${key}` });
const warningBox = (key: string) =>
  element('div', { class: 'ws-notice ws-notice--warning', 'data-testid': `warning-${key}`, 'aria-live': 'polite' });
const note = (text: string, id?: string) => element('p', { class: 'ws-note', ...(id ? { id } : {}) }, text);

/**
 * A setting's help, folded behind an "i" button beside its label (C317), so the form is not a wall of notes: the
 * design system's Help (v0.8.1, D94; before it the page's own rules), a quiet Button saying in
 * `aria-expanded` whether the help shows and naming it in `aria-controls`, the help `hidden` while folded and,
 * shown, under its label and above its control, in the form's flow, so what is under it moves down (D318). Its
 * icon is the font's "info", named in `aria-label` as the Stepper's arrows are. The help stays the control's
 * description while hidden, as a description may name hidden text, so a screen reader still reads it with the
 * control. Nothing else folds: a warning, an error, a count and what the screws pass are always shown.
 */
function helpFor(s: Setting): { info: HTMLButtonElement; help: HTMLElement } | undefined {
  if (s.help === undefined) return undefined;
  const help = note(s.help, idOf(s.key, 'note'));
  help.classList.add('help');
  help.hidden = true;
  const info = element('button', {
    type: 'button',
    class: 'ws-btn ws-btn--quiet ws-help-toggle',
    'aria-expanded': 'false',
    'aria-controls': help.id,
    'aria-label': `About ${s.label.toLowerCase()}`,
  });
  info.append(element('span', { class: 'ws-ic', 'aria-hidden': 'true' }, '\uea74'));
  info.addEventListener('click', () => {
    const open = info.getAttribute('aria-expanded') !== 'true';
    info.setAttribute('aria-expanded', String(open));
    help.hidden = !open;
  });
  return { info, help };
}

/** A label, and beside it the "i" button of the setting's help when it has one, in one row (C317). */
function labelRow(label: HTMLElement, info: HTMLElement | undefined): HTMLElement {
  if (info === undefined) return label;
  const row = element('div', { class: 'ws-label-row' });
  row.append(label, info);
  return row;
}

/** How many decimals a number is written with. */
const decimals = (text: string) => (text.split('.')[1] ?? '').length;

/** A setting's field, how to read it, and how to turn its controls on or off as it applies or not (D372). */
interface Field<V> {
  field: HTMLElement;
  read: () => V;
  enable: (on: boolean) => void;
  /** Greys out the options the other values rule out, saying why under them, and moves off one so chosen (D589). */
  rule?: (out: Readonly<Record<string, string>>) => void;
  /** Moves a number to where the other values start it (D603 b), while it holds where they last started it. */
  follow?: (values: Readonly<Record<string, unknown>>) => void;
}

/** Marks a field as applying or not, so the page greys its label and notes as the design system greys a control. */
const markApplies = (field: HTMLElement, on: boolean) => {
  field.dataset['applies'] = String(on);
};

function numberField(s: NumberSetting, changed: () => void, start?: unknown): Field<string> {
  const field = element('div', { class: 'field' });
  const label = element('label', { class: 'ws-label', for: idOf(s.key, 'input') });
  label.append(`${s.label} (${s.unit})`);
  // A value that cannot go below zero takes the decimal keypad, which has no minus sign; one that can, a number
  // field (the design system's Field, v0.4.0).
  const keyboard: Record<string, string> =
    s.min >= 0
      ? { inputmode: 'decimal' }
      : {
          type: 'number',
          min: String(s.min),
          ...(s.max === undefined ? {} : { max: String(s.max) }),
          step: String(s.step),
        };
  const input = element('input', {
    class: 'ws-input',
    ...keyboard,
    id: idOf(s.key, 'input'),
    name: s.key,
    value: typeof start === 'string' ? start : String(s.default),
    autocomplete: 'off',
  });
  const described = [];
  // The design system's Stepper (its v0.6.0; D259, after D250 c): the field and two of its Buttons, ↓ and ↑, in
  // one row. A press, or an arrow key in the field, moves the value by the setting's step, onto its steps where
  // it keeps to them, and stops at its limits, where that button says so and a press does nothing; a value typed
  // finer than the step keeps its decimals. The Stepper README's lines, reading the value as every field here
  // reads it (D222) and starting from the setting's own value when the field holds no number.
  input.dataset['step'] = String(s.step);
  input.dataset['min'] = String(s.min);
  if (s.max !== undefined) input.dataset['max'] = String(s.max);
  if (s.onStep === true) input.dataset['onStep'] = '';
  const [low, high] = [s.min, s.max ?? Infinity];
  const value = () => {
    const typed = readTypedNumber(input.value);
    return typed.ok ? typed.value : Number.NaN;
  };
  const arrow = (sign: 1 | -1) =>
    element(
      'button',
      {
        type: 'button',
        class: 'ws-btn ws-stepper__btn',
        'aria-label': `${sign > 0 ? 'Larger' : 'Smaller'} ${s.label.toLowerCase()}`,
      },
      sign > 0 ? '↑' : '↓',
    );
  const [down, up] = [arrow(-1), arrow(1)];
  const say = () => {
    const now = value();
    down.setAttribute('aria-disabled', String(now <= low));
    up.setAttribute('aria-disabled', String(now >= high));
  };
  const move = (sign: 1 | -1) => {
    const typed = value();
    const from = Number.isFinite(typed) ? typed : s.default;
    if (sign > 0 ? from >= high : from <= low) return; // at a limit: its button says so, and nothing moves
    // the steps counted from the least value, as a setting that keeps to them counts them
    const q = (from - low) / s.step;
    const next =
      s.onStep === true
        ? low + (sign > 0 ? Math.floor(q + 1e-9) + 1 : Math.ceil(q - 1e-9) - 1) * s.step
        : from + sign * s.step;
    const places = Math.max(decimals(String(s.step)), decimals(String(from)));
    input.value = String(Number(Math.min(high, Math.max(low, next)).toFixed(places)));
    input.dispatchEvent(new Event('input', { bubbles: true }));
  };
  down.addEventListener('click', () => move(-1));
  up.addEventListener('click', () => move(1));
  // the keys are the script's, a text field not stepping by itself; in a number field they stop the browser's own
  input.addEventListener('keydown', (event) => {
    if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
    event.preventDefault();
    move(event.key === 'ArrowUp' ? 1 : -1);
  });
  input.addEventListener('input', say);
  say();
  const row = element('div', { class: 'ws-stepper' });
  row.append(input, down, up);
  const folded = helpFor(s);
  field.append(labelRow(label, folded?.info));
  if (folded !== undefined) {
    field.append(folded.help);
    described.push(folded.help.id);
  }
  field.append(row);
  const counted = s.count;
  if (counted !== undefined) {
    const count = element('p', { class: 'ws-note', id: idOf(s.key, 'count'), 'data-testid': `count-${s.key}` });
    described.push(count.id);
    const update = () => {
      const typed = readTypedNumber(input.value);
      const n = typed.ok ? typed.value / s.step : Number.NaN;
      count.textContent = Number.isInteger(n) && n > 0 ? `= ${n} ${n === 1 ? counted.one : counted.other}` : '';
    };
    update();
    input.addEventListener('input', update);
    field.append(count);
  }
  field.append(errorLine(s.key), warningBox(s.key));
  input.setAttribute('aria-describedby', [...described, idOf(s.key, 'error')].join(' '));
  input.addEventListener('input', changed);
  // A number field the browser cannot read is handed over empty, which would read as the starting value; it is
  // handed on as what it is, not a number (D222).
  const enable = (on: boolean) => {
    markApplies(field, on);
    input.disabled = !on;
    down.disabled = !on;
    up.disabled = !on;
  };
  // a starting value that hangs on the others (D603 b): followed while the field holds the one last started at, so a
  // value set by hand stays; the first call only notes where it starts
  const startsAt = s.startsAt;
  let started: number | undefined;
  const follow =
    startsAt === undefined
      ? undefined
      : (values: Readonly<Record<string, unknown>>) => {
          const now = startsAt(values);
          const typed = readTypedNumber(input.value);
          if (started !== undefined && now !== started && typed.ok && typed.value === started) {
            input.value = String(now);
            say();
          }
          started = now;
        };
  return {
    field,
    read: () => (input.validity.badInput ? 'not a number' : input.value),
    enable,
    ...(follow === undefined ? {} : { follow }),
  };
}

function sidesField(s: SidesSetting, changed: () => void, start?: unknown): Field<Record<Side, string>> {
  const state: Record<Side, 'open' | 'closed'> = { ...s.default };
  for (const side of SIDES) {
    const v: unknown =
      typeof start === 'object' && start !== null ? Object.getOwnPropertyDescriptor(start, side)?.value : undefined;
    if (v === 'open' || v === 'closed') state[side] = v;
  }
  const field = element('fieldset', { class: 'ws-fieldset field' });
  // The design system's Sides names each button for its side alone; the tick on a pressed one says it
  // is closed, and the legend says so in words (C121). The help's "i" button sits in the legend, beside its words,
  // which alone name the fieldset (C317).
  const folded = helpFor(s);
  const legend = element('legend', folded === undefined ? {} : { class: 'ws-label-row' });
  const words = element('span', { id: idOf(s.key, 'legend') }, `${s.label} (ticked = closed)`);
  legend.append(words, ...(folded === undefined ? [] : [folded.info]));
  if (folded !== undefined) field.setAttribute('aria-labelledby', words.id);
  field.append(legend);
  if (folded !== undefined) field.append(folded.help);
  const grid = element('div', { class: 'ws-sides', role: 'group', 'aria-label': `Closed ${s.label.toLowerCase()}` });
  // The drawing shows the board as set (D528 a, 30 Oct 2026): each side's state on it, for the page's style to draw a
  // closed side solid and blue and a corner round where both its sides are closed, as the board is built
  const board = element('div', { class: 'ws-sides__board', 'aria-hidden': 'true' });
  grid.append(board);
  for (const side of SIDES) {
    const name = `${side[0]?.toUpperCase() ?? ''}${side.slice(1)}`;
    const button = element(
      'button',
      { type: 'button', 'data-side': side, class: `ws-sides__btn ws-sides__${side}` },
      name,
    );
    const show = () => {
      button.setAttribute('aria-pressed', String(state[side] === 'closed'));
      board.setAttribute(`data-${side}`, state[side]);
    };
    show();
    button.addEventListener('click', () => {
      state[side] = state[side] === 'open' ? 'closed' : 'open';
      show();
      changed();
    });
    grid.append(button);
  }
  field.append(grid);
  field.append(errorLine(s.key));
  grid.setAttribute(
    'aria-describedby',
    [...(folded === undefined ? [] : [folded.help.id]), idOf(s.key, 'error')].join(' '),
  );
  const enable = (on: boolean) => {
    markApplies(field, on);
    for (const button of grid.querySelectorAll<HTMLButtonElement>('button')) button.disabled = !on;
  };
  return { field, read: () => ({ ...state }), enable };
}

function choiceField(s: ChoiceSetting, changed: () => void, start?: unknown): Field<string> {
  const field = element('div', { class: 'field' });
  const folded = helpFor(s);
  field.append(labelRow(element('div', { class: 'ws-label' }, s.label), folded?.info));
  if (folded !== undefined) field.append(folded.help);
  const chosen = typeof start === 'string' && s.options.some((o) => o.value === start) ? start : s.default;
  const group = choiceGroup(s.key, s.label, s.options, chosen);
  group.addEventListener('change', changed);
  field.append(group);
  field.append(errorLine(s.key));
  group.setAttribute(
    'aria-describedby',
    [...(folded === undefined ? [] : [folded.help.id]), idOf(s.key, 'error')].join(' '),
  );
  // why an option is ruled out, under the choice (D589 a): kept hidden while none is
  const why = element('p', { class: 'ws-note', 'data-testid': `ruled-${s.key}`, 'aria-live': 'polite' });
  why.hidden = true;
  field.append(why);
  let applying = true;
  let ruled: Readonly<Record<string, string>> = {};
  const inputs = () => [...group.querySelectorAll<HTMLInputElement>('input')];
  const set = () => {
    for (const input of inputs()) input.disabled = !applying || input.value in ruled;
  };
  const enable = (on: boolean) => {
    markApplies(field, on);
    applying = on;
    set();
  };
  const rule = (out: Readonly<Record<string, string>>) => {
    ruled = out;
    set();
    const checked = inputs().find((i) => i.checked);
    if (checked !== undefined && checked.value in out) {
      const left = inputs().find((i) => !(i.value in out));
      if (left !== undefined) left.checked = true;
    }
    const reasons = [...new Set(Object.values(out))];
    why.textContent = reasons.join(' ');
    why.hidden = reasons.length === 0;
  };
  return { field, read: () => chosenIn(group), enable, rule };
}

function fieldFor(s: Setting, changed: () => void, start?: unknown): Field<unknown> {
  if (s.kind === 'number') return numberField(s, changed, start);
  if (s.kind === 'choice') return choiceField(s, changed, start);
  return sidesField(s, changed, start);
}

/** Writes a problem into the place kept for it beside its control, and marks the control. */
function put(container: HTMLElement, kind: 'error' | 'warning', problem: Problem): void {
  const at = container.querySelector<HTMLElement>(`[data-testid="${kind}-${problem.key}"]`);
  if (kind === 'warning') at?.replaceChildren(element('strong', {}, problem.message));
  else if (at !== null) at.textContent = problem.message;
  if (kind === 'error')
    container.querySelector(`.ws-input[name="${problem.key}"]`)?.setAttribute('aria-invalid', 'true');
}

/** What the page puts in a form beside the type's settings: a field first under Advanced, such as its choice of
 * test print (D357), and whether Advanced starts open, to show what is chosen there. */
export interface FormExtras {
  advancedFirst?: HTMLElement;
  advancedOpen?: boolean;
  /** Settings the page sets itself, kept off the form, as What to make sets one board or a wall (D590). */
  fixed?: Readonly<Record<string, unknown>>;
}

/** Replaces the container's contents with a form for the board type, starting from `start` where it gives a value
 * and from each setting's starting value elsewhere; `changed` runs on every edit. */
export function renderForm(
  container: HTMLElement,
  type: AnyBoardType,
  changed: () => void,
  start: Readonly<Record<string, unknown>> = {},
  extras: FormExtras = {},
): Form {
  container.replaceChildren();
  const main = element('div', { class: 'main-settings' });
  const advanced = element('details', { class: 'ws-details', 'data-testid': 'advanced' });
  advanced.append(element('summary', { class: 'ws-summary' }, 'Advanced'));
  if (extras.advancedFirst !== undefined) advanced.append(extras.advancedFirst);
  advanced.append(note('Starting values: change them when a test print says to.'));
  const kept = advanced.children.length; // the summary, the note and the page's field
  const readers = new Map<string, () => unknown>();
  const enablers = new Map<string, (on: boolean) => void>();
  const rulers = new Map<string, NonNullable<Field<unknown>['rule']>>();
  const followers = new Map<string, NonNullable<Field<unknown>['follow']>>();
  const read = () => Object.fromEntries([...readers].map(([key, r]) => [key, r()]));
  // greys out what does not apply to the values held now, and turns the rest on, before the page reads them (D372)
  const applies = () => {
    const off = new Set(settingsNotApplying(type.settings, read()));
    for (const [key, enable] of enablers) enable(!off.has(key));
    // and the options the values rule out, each choice moved off one so chosen (D589)
    const out = optionsOff(type.settings, read());
    for (const [key, rule] of rulers) rule(out[key] ?? {});
    // and each number whose starting value hangs on them moved with it, unless set by hand (D603 b)
    for (const follow of followers.values()) follow(read());
  };
  const edited = () => {
    applies();
    changed();
  };
  const fixed = extras.fixed ?? {};
  for (const s of type.settings) {
    if (s.key in fixed) {
      readers.set(s.key, () => fixed[s.key]);
      continue;
    }
    const made = fieldFor(s, edited, start[s.key]);
    (s.advanced ? advanced : main).append(made.field);
    readers.set(s.key, made.read);
    enablers.set(s.key, made.enable);
    if (made.rule !== undefined) rulers.set(s.key, made.rule);
    if (made.follow !== undefined) followers.set(s.key, made.follow);
  }
  applies();
  container.append(main);
  // shown when it holds a setting or the page's field: never a summary and a note alone
  if (advanced.children.length > kept || extras.advancedFirst !== undefined) container.append(advanced);
  advanced.open = extras.advancedOpen === true;
  // what each screw passes, in the screw size's own field, before its error (D264)
  const screwNote = element('p', { class: 'ws-note', 'data-testid': 'screw-note', 'aria-live': 'polite' });
  const screwField = container.querySelector('input[name="screwMm"]')?.closest('.field');
  screwField?.querySelector('.ws-error')?.before(screwNote);
  // what the tape holds, under the second of the tape's two fields (D609 a)
  const tapeNote = element('p', { class: 'ws-note', 'data-testid': 'tape-note', 'aria-live': 'polite' });
  const tapeField = container.querySelector('input[name="tapeLengthMm"]')?.closest('.field');
  tapeField?.querySelector('.ws-error')?.before(tapeNote);

  return {
    read,
    show: (errors, warnings) => {
      for (const p of container.querySelectorAll<HTMLElement>('.ws-error, .ws-notice')) p.replaceChildren();
      for (const i of container.querySelectorAll('[aria-invalid]')) i.removeAttribute('aria-invalid');
      for (const e of errors) put(container, 'error', e);
      for (const w of warnings) put(container, 'warning', w);
    },
    tape: (text) => {
      tapeNote.textContent = text ?? '';
    },
    screws: (text) => {
      screwNote.textContent = text ?? '';
    },
  };
}
