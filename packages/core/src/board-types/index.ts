// The board types, in the order the page lists them (D47: only types that are built). A new type is
// one file beside this one and one line here; docs/extending.md says what else, if anything, it needs.
import type { AnyBoardType } from './define.js';
import { FIT_COUPON } from './fit-coupon.js';
import { SEAM_TEST } from './seam-test.js';
import { SOLID } from './solid.js';
import { STANDOFF } from './standoff.js';

// The boards first, then the connectors (D91): the page starts a new heading where the group changes.
export const BOARD_TYPES: readonly AnyBoardType[] = [SOLID, FIT_COUPON, SEAM_TEST, STANDOFF];

export function boardType(id: string): AnyBoardType {
  const type = BOARD_TYPES.find((t) => t.id === id);
  if (type === undefined) throw new RangeError(`There is no board type "${id}"`);
  return type;
}

export * from './define.js';
export { FIT_COUPON } from './fit-coupon.js';
export { SEAM_TEST } from './seam-test.js';
export { SOLID } from './solid.js';
export { STANDOFF } from './standoff.js';
