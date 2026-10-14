// The page's form for a board type, built from the settings the type declares (backlog item registry):
// a number box for each number, a list for each choice, the four side toggles round a drawing of the
// board (D46), and the fine settings folded under "Advanced" (D48). Nothing here names a board type or
// a setting.
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

function numberField(s: NumberSetting, changed: () => void): { field: HTMLElement; read: () => string } {
  const field = element('div', { class: 'field' });
  const label = element('label');
  label.append(`${s.label} (${s.unit})`);
  const input = element('input', {
    type: 'number',
    name: s.key,
    min: String(s.min),
    max: String(s.max),
    step: String(s.step),
    value: String(s.default),
  });
  label.append(input);
  field.append(label);
  if (s.count !== undefined) {
    const count = element('span', { class: 'count', 'data-testid': `count-${s.key}` });
    const update = () => {
      const n = Number(input.value) / s.step;
      count.textContent = Number.isInteger(n) && n > 0 ? `= ${n} ${s.count}` : '';
    };
    update();
    input.addEventListener('input', update);
    label.append(count);
  }
  if (s.help !== undefined) field.append(element('p', { class: 'help' }, s.help));
  field.append(element('p', { class: 'error', 'data-testid': `error-${s.key}` }));
  field.append(element('p', { class: 'warning', 'data-testid': `warning-${s.key}` }));
  input.addEventListener('input', changed);
  return { field, read: () => input.value };
}

function sidesField(s: SidesSetting, changed: () => void): { field: HTMLElement; read: () => Record<Side, string> } {
  const state: Record<Side, 'open' | 'closed'> = { ...s.default };
  const field = element('fieldset', { class: 'field sides' });
  field.append(element('legend', {}, s.label));
  const grid = element('div', { class: 'sides-grid' });
  grid.append(element('div', { class: 'board-drawing', 'aria-hidden': 'true' }));
  for (const side of SIDES) {
    const button = element('button', { type: 'button', 'data-side': side, class: `side side-${side}` });
    const show = () => {
      button.setAttribute('aria-pressed', String(state[side] === 'closed'));
      button.textContent = `${side[0]?.toUpperCase() ?? ''}${side.slice(1)}: ${state[side]}`;
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
  if (s.help !== undefined) field.append(element('p', { class: 'help' }, s.help));
  field.append(element('p', { class: 'error', 'data-testid': `error-${s.key}` }));
  return { field, read: () => ({ ...state }) };
}

function choiceField(s: ChoiceSetting, changed: () => void): { field: HTMLElement; read: () => string } {
  const field = element('div', { class: 'field' });
  const label = element('label');
  label.append(s.label);
  const select = element('select', { name: s.key });
  for (const option of s.options) {
    const o = element('option', { value: option.value }, option.label);
    o.selected = option.value === s.default;
    select.append(o);
  }
  label.append(select);
  field.append(label);
  if (s.help !== undefined) field.append(element('p', { class: 'help' }, s.help));
  field.append(element('p', { class: 'error', 'data-testid': `error-${s.key}` }));
  select.addEventListener('change', changed);
  return { field, read: () => select.value };
}

function fieldFor(s: Setting, changed: () => void): { field: HTMLElement; read: () => unknown } {
  if (s.kind === 'number') return numberField(s, changed);
  if (s.kind === 'choice') return choiceField(s, changed);
  return sidesField(s, changed);
}

/** Writes a problem into the line kept for it beside its control. */
function put(container: HTMLElement, kind: 'error' | 'warning', problem: Problem): void {
  const at = container.querySelector<HTMLElement>(`[data-testid="${kind}-${problem.key}"]`);
  if (at !== null) at.textContent = problem.message;
}

/** Replaces the container's contents with a form for the board type; `changed` runs on every edit. */
export function renderForm(container: HTMLElement, type: AnyBoardType, changed: () => void): Form {
  container.replaceChildren();
  const main = element('div', { class: 'main-settings' });
  const advanced = element('details', { 'data-testid': 'advanced' });
  advanced.append(element('summary', {}, 'Advanced'));
  const readers = new Map<string, () => unknown>();
  for (const s of type.settings) {
    const { field, read } = fieldFor(s, changed);
    (s.advanced ? advanced : main).append(field);
    readers.set(s.key, read);
  }
  container.append(main);
  if (advanced.children.length > 1) container.append(advanced);

  return {
    read: () => Object.fromEntries([...readers].map(([key, read]) => [key, read()])),
    show: (errors, warnings) => {
      for (const p of container.querySelectorAll<HTMLElement>('.error, .warning')) p.textContent = '';
      for (const e of errors) put(container, 'error', e);
      for (const w of warnings) put(container, 'warning', w);
    },
  };
}
