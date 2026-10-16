// The page's form for a board type, built from the settings the type declares (backlog item registry),
// in the shared design system's controls (D111): a Field for each number, Choice buttons for each choice,
// the four side toggles round a drawing of the board (Sides, D46), and the fine settings folded under
// "Advanced" (Disclosure, D48). Nothing here names a board type or a setting.
import { readTypedNumber } from 'skadis-air';
import type { AnyBoardType, ChoiceSetting, NumberSetting, Problem, Setting, SidesSetting } from 'skadis-air';

type Side = 'left' | 'right' | 'bottom' | 'top';
const SIDES: readonly Side[] = ['top', 'left', 'right', 'bottom'];

export interface Form {
  /** What the controls hold now, as text and side states, for readValues. */
  read(): Record<string, unknown>;
  /** Shows each problem beside its control; clears the rest. */
  show(errors: readonly Problem[], warnings: readonly Problem[]): void;
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

function numberField(s: NumberSetting, changed: () => void): { field: HTMLElement; read: () => string } {
  const field = element('div', { class: 'field' });
  const label = element('label', { class: 'ws-label' });
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
    name: s.key,
    value: String(s.default),
    autocomplete: 'off',
  });
  const described = [];
  label.append(input);
  field.append(label);
  if (s.count !== undefined) {
    const count = element('p', { class: 'ws-note', id: idOf(s.key, 'count'), 'data-testid': `count-${s.key}` });
    described.push(count.id);
    const update = () => {
      const typed = readTypedNumber(input.value);
      const n = typed.ok ? typed.value / s.step : Number.NaN;
      count.textContent = Number.isInteger(n) && n > 0 ? `= ${n} ${s.count}` : '';
    };
    update();
    input.addEventListener('input', update);
    field.append(count);
  }
  if (s.help !== undefined) {
    field.append(note(s.help, idOf(s.key, 'note')));
    described.push(idOf(s.key, 'note'));
  }
  field.append(errorLine(s.key), warningBox(s.key));
  input.setAttribute('aria-describedby', [...described, idOf(s.key, 'error')].join(' '));
  input.addEventListener('input', changed);
  // A number field the browser cannot read is handed over empty, which would read as the starting value; it is
  // handed on as what it is, not a number (D222).
  return { field, read: () => (input.validity.badInput ? 'not a number' : input.value) };
}

function sidesField(s: SidesSetting, changed: () => void): { field: HTMLElement; read: () => Record<Side, string> } {
  const state: Record<Side, 'open' | 'closed'> = { ...s.default };
  const field = element('fieldset', { class: 'ws-fieldset field' });
  // The design system's Sides names each button for its side alone; the tick on a pressed one says it
  // is closed, and the legend says so in words (C121).
  field.append(element('legend', {}, `${s.label} (ticked = closed)`));
  const grid = element('div', { class: 'ws-sides', role: 'group', 'aria-label': `Closed ${s.label.toLowerCase()}` });
  grid.append(element('div', { class: 'ws-sides__board', 'aria-hidden': 'true' }));
  for (const side of SIDES) {
    const name = `${side[0]?.toUpperCase() ?? ''}${side.slice(1)}`;
    const button = element(
      'button',
      { type: 'button', 'data-side': side, class: `ws-sides__btn ws-sides__${side}` },
      name,
    );
    const show = () => button.setAttribute('aria-pressed', String(state[side] === 'closed'));
    show();
    button.addEventListener('click', () => {
      state[side] = state[side] === 'open' ? 'closed' : 'open';
      show();
      changed();
    });
    grid.append(button);
  }
  field.append(grid);
  if (s.help !== undefined) field.append(note(s.help, idOf(s.key, 'note')));
  field.append(errorLine(s.key));
  grid.setAttribute(
    'aria-describedby',
    [...(s.help === undefined ? [] : [idOf(s.key, 'note')]), idOf(s.key, 'error')].join(' '),
  );
  return { field, read: () => ({ ...state }) };
}

function choiceField(s: ChoiceSetting, changed: () => void): { field: HTMLElement; read: () => string } {
  const field = element('div', { class: 'field' });
  field.append(element('div', { class: 'ws-label' }, s.label));
  const group = choiceGroup(s.key, s.label, s.options, s.default);
  group.addEventListener('change', changed);
  field.append(group);
  if (s.help !== undefined) field.append(note(s.help, idOf(s.key, 'note')));
  field.append(errorLine(s.key));
  group.setAttribute(
    'aria-describedby',
    [...(s.help === undefined ? [] : [idOf(s.key, 'note')]), idOf(s.key, 'error')].join(' '),
  );
  return { field, read: () => chosenIn(group) };
}

function fieldFor(s: Setting, changed: () => void): { field: HTMLElement; read: () => unknown } {
  if (s.kind === 'number') return numberField(s, changed);
  if (s.kind === 'choice') return choiceField(s, changed);
  return sidesField(s, changed);
}

/** Writes a problem into the place kept for it beside its control, and marks the control. */
function put(container: HTMLElement, kind: 'error' | 'warning', problem: Problem): void {
  const at = container.querySelector<HTMLElement>(`[data-testid="${kind}-${problem.key}"]`);
  if (kind === 'warning') at?.replaceChildren(element('strong', {}, problem.message));
  else if (at !== null) at.textContent = problem.message;
  if (kind === 'error')
    container.querySelector(`.ws-input[name="${problem.key}"]`)?.setAttribute('aria-invalid', 'true');
}

/** Replaces the container's contents with a form for the board type; `changed` runs on every edit. */
export function renderForm(container: HTMLElement, type: AnyBoardType, changed: () => void): Form {
  container.replaceChildren();
  const main = element('div', { class: 'main-settings' });
  const advanced = element('details', { class: 'ws-details', 'data-testid': 'advanced' });
  advanced.append(
    element('summary', { class: 'ws-summary' }, 'Advanced'),
    note('Starting values: change them when a test print says to.'),
  );
  const readers = new Map<string, () => unknown>();
  for (const s of type.settings) {
    const { field, read } = fieldFor(s, changed);
    (s.advanced ? advanced : main).append(field);
    readers.set(s.key, read);
  }
  container.append(main);
  if (advanced.children.length > 2) container.append(advanced); // more than its summary and note

  return {
    read: () => Object.fromEntries([...readers].map(([key, read]) => [key, read()])),
    show: (errors, warnings) => {
      for (const p of container.querySelectorAll<HTMLElement>('.ws-error, .ws-notice')) p.replaceChildren();
      for (const i of container.querySelectorAll('[aria-invalid]')) i.removeAttribute('aria-invalid');
      for (const e of errors) put(container, 'error', e);
      for (const w of warnings) put(container, 'warning', w);
    },
  };
}
