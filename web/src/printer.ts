// The printer bed on the page (backlog item printer-default): the safe default, 200 x 200 mm (D61), or a
// custom size, as the design system's Choice buttons (D111). printer-presets will add the makers' printers.
import { DEFAULT_BED, type Bed } from 'skadis-air';

const MIN_MM = 50;
const MAX_MM = 1000;

export interface PrinterChoice {
  /** The bed chosen, or a message when the custom size cannot be used. */
  bed(): { ok: true; bed: Bed } | { ok: false; problem: string };
}

export function mountPrinter(box: HTMLElement, changed: () => void): PrinterChoice {
  const list = box.querySelector<HTMLElement>('[data-testid="printer-bed"]');
  const custom = box.querySelector<HTMLElement>('[data-testid="custom-bed"]');
  const x = box.querySelector<HTMLInputElement>('input[name="bedXMm"]');
  const y = box.querySelector<HTMLInputElement>('input[name="bedYMm"]');
  const error = box.querySelector<HTMLElement>('[data-testid="bed-error"]');
  const isCustom = () => list?.querySelector<HTMLInputElement>('input:checked')?.value === 'custom';
  const showCustom = () => {
    if (custom) custom.hidden = !isCustom();
  };
  showCustom();
  list?.addEventListener('change', () => {
    showCustom();
    changed();
  });
  for (const input of [x, y]) input?.addEventListener('input', changed);

  return {
    bed() {
      if (error) error.textContent = '';
      if (!isCustom()) return { ok: true, bed: { ...DEFAULT_BED } };
      const [bx, by] = [Number(x?.value), Number(y?.value)];
      if (![bx, by].every((v) => Number.isFinite(v) && v >= MIN_MM && v <= MAX_MM)) {
        const problem = `A custom bed is ${MIN_MM} to ${MAX_MM} mm each way.`;
        if (error) error.textContent = problem;
        return { ok: false, problem };
      }
      return { ok: true, bed: { xMm: bx, yMm: by } };
    },
  };
}
