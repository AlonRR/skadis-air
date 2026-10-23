// The printer bed on the page (backlog items printer-default and printer-presets): the safe default, 200 x 200 mm
// (D61), a custom size, or a printer from the list (docs/printer-beds.md): the two and each maker after them
// (D170) in the design system's Select (D260), and in a field of their own after it, titled for the choice, the
// maker's models as its Choice buttons (D111) or the custom size (D257). The choice, or the custom size, is remembered in this
// browser, as the theme is (D171).
import { DEFAULT_BED, MAKERS, modelLabel, readTypedNumber, type Bed } from 'skadis-air';
import { choiceGroup, chosenIn } from './form.js';

const MIN_MM = 50;
const MAX_MM = 1000;
const STORE = 'skadis-air-printer';

/** What is remembered: the option chosen under "Printer", and the model or the custom size with it. */
interface Remembered {
  bed: string; // 'default', 'custom' or a maker's id
  model?: string;
  xMm?: number;
  yMm?: number;
}

function recall(): Remembered | null {
  try {
    const raw = localStorage.getItem(STORE);
    if (raw === null) return null;
    const value: unknown = JSON.parse(raw);
    if (typeof value !== 'object' || value === null) return null;
    const bed: unknown = Object.getOwnPropertyDescriptor(value, 'bed')?.value;
    if (typeof bed !== 'string') return null;
    const field = (key: string): unknown => Object.getOwnPropertyDescriptor(value, key)?.value;
    const model = field('model');
    const [xMm, yMm] = [field('xMm'), field('yMm')];
    return {
      bed,
      ...(typeof model === 'string' ? { model } : {}),
      ...(typeof xMm === 'number' && typeof yMm === 'number' ? { xMm, yMm } : {}),
    };
  } catch {
    return null; // storage switched off, or something else in it: start on the default
  }
}

function remember(value: Remembered): void {
  try {
    localStorage.setItem(STORE, JSON.stringify(value));
  } catch {
    // the choice still holds while the page is open
  }
}

const mm = (bed: Bed) => `${bed.xMm} × ${bed.yMm} mm`;
const makerOf = (id: string) => MAKERS.find((m) => m.id === id);

export interface PrinterChoice {
  /** The bed chosen, or a message when the custom size cannot be used. */
  bed(): { ok: true; bed: Bed } | { ok: false; problem: string };
}

/** A bed's size as typed, a comma read as a decimal point, as the design system's fields take it (D202). */
const size = (input: HTMLInputElement | null): number => {
  const typed = input === null ? null : readTypedNumber(input.value);
  return typed?.ok ? typed.value : Number.NaN;
};
/** Whether a custom bed's size is one the page can use. */
const usable = (v: number) => Number.isFinite(v) && v >= MIN_MM && v <= MAX_MM;

/** `box` is the maker's field; `machine`, the next, holds its models or the custom size (D257). */
export function mountPrinter(box: HTMLElement, machine: HTMLElement, changed: () => void): PrinterChoice {
  const list = box.querySelector<HTMLSelectElement>('select[name="printerBed"]');
  const note = box.querySelector<HTMLElement>('[data-testid="bed-note"]');
  const title = machine.querySelector('legend');
  const models = machine.querySelector<HTMLElement>('[data-testid="printer-model"]');
  const custom = machine.querySelector<HTMLElement>('[data-testid="custom-bed"]');
  const x = machine.querySelector<HTMLInputElement>('input[name="bedXMm"]');
  const y = machine.querySelector<HTMLInputElement>('input[name="bedYMm"]');
  const error = machine.querySelector<HTMLElement>('[data-testid="bed-error"]');
  const defaultNote = note?.textContent ?? '';

  // An option for each maker, after "Safe default" and "Custom" (D170).
  list?.append(...MAKERS.map((m) => new Option(m.name, m.id)));

  const chosenBed = () => list?.value ?? 'default';
  const chosenPrinter = () => {
    const maker = makerOf(chosenBed());
    if (maker === undefined || models === null) return undefined;
    return maker.printers.find((p) => p.id === chosenIn(models)) ?? maker.printers[0];
  };

  /** The maker's models as a row of buttons, the given one chosen, or its first. */
  const showModels = (makerId: string, modelId?: string) => {
    if (models === null) return;
    const maker = makerOf(makerId);
    models.hidden = maker === undefined;
    if (maker === undefined) {
      models.replaceChildren();
      return;
    }
    const first = maker.printers.find((p) => p.id === modelId) ?? maker.printers[0];
    const options = maker.printers.map((p) => ({ value: p.id, label: modelLabel(p) }));
    models.replaceChildren(choiceGroup('printerModel', `${maker.name} printers`, options, first?.id ?? ''));
  };

  /** The second field and its title, the note, the custom fields, and what is remembered, from what is chosen. */
  const settle = () => {
    const bed = chosenBed();
    const maker = makerOf(bed);
    machine.hidden = maker === undefined && bed !== 'custom'; // nothing more to choose on the safe default
    if (title) title.textContent = maker ? `${maker.name} printers` : 'Custom bed';
    if (custom) custom.hidden = bed !== 'custom';
    const printer = chosenPrinter();
    if (note) {
      note.textContent = printer ? `The ${printer.model}'s bed: ${mm(printer)}.` : defaultNote;
      (printer ? models : list?.closest('.ws-select'))?.after(note); // under the maker's printers, or the list
    }
    if (bed === 'custom') remember({ bed, xMm: size(x), yMm: size(y) });
    else remember(printer ? { bed, model: printer.id } : { bed });
  };

  // What this browser chose before (D171): its option, and its model or its custom size.
  const before = recall();
  if (before && list && [...list.options].some((o) => o.value === before.bed)) {
    list.value = before.bed;
    if (before.bed === 'custom' && x && y && before.xMm !== undefined && before.yMm !== undefined) {
      x.value = String(before.xMm);
      y.value = String(before.yMm);
    }
    showModels(before.bed, before.model);
  }
  settle();

  list?.addEventListener('change', () => {
    showModels(chosenBed());
    settle();
    changed();
  });
  models?.addEventListener('change', () => {
    settle();
    changed();
  });
  for (const input of [x, y]) {
    input?.addEventListener('input', () => {
      settle();
      changed();
    });
  }

  return {
    bed() {
      if (error) error.textContent = '';
      for (const input of [x, y]) input?.removeAttribute('aria-invalid');
      const bed = chosenBed();
      const printer = chosenPrinter();
      if (printer) return { ok: true, bed: { xMm: printer.xMm, yMm: printer.yMm } };
      if (bed !== 'custom') return { ok: true, bed: { ...DEFAULT_BED } };
      const [bx, by] = [size(x), size(y)];
      if (!usable(bx) || !usable(by)) {
        const problem = `A custom bed is ${MIN_MM} to ${MAX_MM} mm each way.`;
        if (error) error.textContent = problem;
        // each size it cannot use marked, as the form marks a field it refuses (Q4)
        for (const [input, v] of [
          [x, bx],
          [y, by],
        ] as const) {
          if (!usable(v)) input?.setAttribute('aria-invalid', 'true');
        }
        return { ok: false, problem };
      }
      return { ok: true, bed: { xMm: bx, yMm: by } };
    },
  };
}
