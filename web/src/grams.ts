// A board's plastic in printed grams (D313): the figures docs/board-grams.json holds, made by
// scripts/checks/write-board-grams.mjs from a 200 x 200 mm board of each kind sliced for a Prusa MK3S. They are
// figures for that sample alone, never an estimate for the board on screen.
import grams from '../../docs/board-grams.json';

const BY_BOARD: Record<string, number> = grams.gramsByBoard;
const SAMPLES = new Set(['solid', 'lightened', 'skeleton']);

/** The sample's grams for a board type and its look, or undefined for a part the file has no figure for. */
export function gramsFor(typeId: string, values: { look?: unknown }): number | undefined {
  if (!SAMPLES.has(typeId)) return undefined;
  return BY_BOARD[
    typeId === 'solid' ? 'solid' : `${typeId}-${typeof values.look === 'string' ? values.look : 'curved'}`
  ];
}

/** The line the page shows under the form, or '' when the part has no figure. */
export function gramsLine(typeId: string, values: { look?: unknown }): string {
  const g = gramsFor(typeId, values);
  if (g === undefined) return '';
  const material = grams.filament.split(' ')[0];
  return `About ${Math.round(g)} g for a ${grams.sizeMm} × ${grams.sizeMm} mm board at the starting values, printed in ${material}. Other sizes and settings weigh differently.`;
}
