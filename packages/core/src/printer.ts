// The printer bed a board must fit (backlog item printer-default). Boards are printed on the user's
// own printer (D4), so the bed is a setting; until the user sets one, the page uses 200 x 200 mm (D61),
// which every full-size printer in parametric-window-sealer's docs/printer-beds.md fits, read from
// the makers' sites (C25). A board larger than the bed is warned about, not refused (D62).

export interface Bed {
  xMm: number;
  yMm: number;
}

export const DEFAULT_BED: Readonly<Bed> = Object.freeze({ xMm: 200, yMm: 200 });

/** Whether a board, width by height as it lies, fits the bed either way round. */
export function fitsBed(widthMm: number, heightMm: number, bed: Bed): boolean {
  for (const v of [bed.xMm, bed.yMm]) {
    if (!(Number.isFinite(v) && v > 0)) throw new RangeError(`A bed must be a positive size in mm, not ${v}`);
  }
  return (widthMm <= bed.xMm && heightMm <= bed.yMm) || (widthMm <= bed.yMm && heightMm <= bed.xMm);
}
