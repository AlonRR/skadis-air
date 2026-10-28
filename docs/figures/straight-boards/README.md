<!--
SPDX-FileCopyrightText: 2026 Alon A. Rabinowitz
SPDX-License-Identifier: CERN-OHL-S-2.0
-->

# The two looks of the lattice boards (28 Oct 2026)

Pictures of the lightened and skeleton boards in each look, for Q510 (the straight-line boards come back, as a Look
choice on each board since the owner's 515 answer), D514 (which of today's changes they take: built with (a), today's
I-beam and 1.2 mm core) and Q518 (the look's names; "Curved" and "Straight" for now). Curved is today's board; Straight
leaves out the long eased pocket corners (D278): the lightened board's pockets get L1's 1 mm round corners, the
skeleton's S1's sharp ones. Both keep today's front chamfer, the V groove where boards meet (D276, D277) and all of the
mounting. Compare the [board history](../board-history/README.md)'s L1 and S1.

Each board is 160 x 160 mm at its type's starting values, drawn from the board history's cameras: `<type>-<look>-front`
(three-quarter), `-corner` (a corner slot, close) and `-middle` (the middle, close). Made by
`node scripts/figures/shoot.mjs straight-boards`, which also writes the 200 x 200 mm STLs the numbers come from.

The numbers are for a 200 x 200 mm board at starting values (all sides open, mounting as it starts): model volume, and
grams sliced in PETG Basic on the MK3S profile (`FILAMENT="PETG Basic NPETG087-ZX" bash scripts/checks/stl-check.sh`),
the board as built, as the board history sliced it. The solid board is 179.0 cm3 and 115.7 g.

| Board | Look | Volume | Grams | Of the solid board's plastic |
| ----- | ---- | ------ | ----- | ---------------------------- |
| Lightened | Curved (today's, L3) | 72.9 cm3 | 67.6 g | 41 % |
| Lightened | Straight | 70.5 cm3 | 66.8 g | 39 % |
| Skeleton | Curved (today's, S3) | 58.5 cm3 | 69.5 g | 33 % |
| Skeleton | Straight | 54.7 cm3 | 67.3 g | 31 % |

- The Curved boards' numbers are the board history's L3 and S3 again, to the tenth: the same boards.
- Straight takes 2.4 cm3 (0.7 g) off the lightened board and 3.8 cm3 (2.2 g) off the skeleton: the plastic the eased
  corners added. Grams fall less than the volume, as the slicer's perimeters follow every member.
- Volumes and grams are in `numbers.json` and `grams.json`.
