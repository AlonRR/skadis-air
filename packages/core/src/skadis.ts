// The SKÅDIS numbers the boards are built on, each with its source in docs/skadis-standard.md.
// IKEA publishes none of them; they come from a community specification and the parameters of
// existing generators, which agree. The owner measured the slot, the grid, the thickness and IKEA's spacer
// on a real board (T17, 15 Oct 2026); the rest stay <<CONFIRM>>.

/**
 * Slot width, mm: the nominal, which the slot clearance is added to (D40); a real board's is 5.05 to 5.15
 * (T17). 6d6178's T-nut page; yasg HOLE_W.
 */
export const SLOT_WIDTH_MM = 5;
/**
 * Slot height, mm: a stadium, its ends fully round. The nominal, as above; a real board's is 15.2 (T17).
 * The same sources; yasg HOLE_H.
 */
export const SLOT_HEIGHT_MM = 15;
/** The grid: slots 40 mm apart, with a second grid shifted 20 mm in x and y. Measured on a real board (T17). */
export const GRID_PITCH_MM = 40;
/** Board thickness, mm: a real board's is 5.09 (T17). 6d6178; IKEA hooks accept about 4 to 5.5 mm. */
export const BOARD_THICKNESS_MM = 5;

/** The smallest tile and the step between sizes (D15): one grid pitch. */
export const TILE_MM = GRID_PITCH_MM;
/** How far IKEA's spacers hold a board off the wall, mm: one measures 19.89 (T17). 6d6178 ("roughly 20mm"). */
export const WALL_DISTANCE_MM = 20;
/** How far an IKEA hook's back tab sits behind the board, mm. <<CONFIRM>> measured from Printables 107818. */
export const HOOK_DEPTH_MM = 6;
/** How far that tab reaches below the bottom end of the slot the hook rests in, mm. <<CONFIRM>> as above. */
export const HOOK_DROP_MM = 8.25;
/** How wide that tab is, mm. <<CONFIRM>> as above. */
export const HOOK_WIDTH_MM = 4.5;
