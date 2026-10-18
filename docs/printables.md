# The Printables model page

The text of the model page on Printables, kept here so it changes with the code (D81, D211 to D214). Saved as a
draft, model 1880460, on 17 Oct 2026 (T216): the 13 files, the 7 pictures, this text; the contest is not chosen on the
model's form, and its question whether AI was used is answered "Yes — AI-assisted creation" (D236, 18 Oct 2026).
The page is entered in the Designer Challenge: Pegboard Wall Organizers (entries close on 22 Oct 2026 at 23:59 UTC). Its files
come from `npm run printables`, which writes them into `.check/printables/` from the release and checks each one;
its pictures from `scripts/printables/write-images.mjs`, run against the built page while it is served. The owner adds photos of printed parts and publishes it.

## Settings

| Field | Value |
| --- | --- |
| Name | Skådis Air: IKEA Skadis pegboard generator, parametric, lightweight and tileable, with connectors |
| Licence | Creative Commons, Public Domain (CC0) (Q213) |
| Contest | Designer Challenge: Pegboard Wall Organizers |
| Tags | skadis, ikea, pegboard, parametric, customizable, lightweight, tileable, wall, organizer, connector, modular (Printables splits a tag at its spaces) |

## Summary

At most 120 characters on Printables:

Pegboards for IKEA SKÅDIS hooks, in any size: solid, lightened or skeleton, tiled into walls, with standoffs and clips.

## Description

**Make your own: <https://alonrr.github.io/skadis-air/>**. Choose a board, its size and its edges, see it in 3D, and
download an STL or 3MF. Everything runs in the page; nothing is sent anywhere.

The files here are ready to print at the page's starting values. For any other size, edge or mounting, use the page.

### What is here

- **Boards, 200 x 200 mm** (fits most printers) **and 240 x 200 mm** (fits a 250 x 210 mm bed), in three kinds:
  - **Solid**: a plain plate with the SKÅDIS slots.
  - **Lightened**: open pockets between the slots, a rim kept round each slot, in about 41 % of the solid board's
    plastic.
  - **Skeleton**: every rim and web an I-beam, thin through the middle, in about 32 %.
- **Fit coupon**: four slots at four clearances, told apart by dots. Print it first and try a hook in each, to find
  the clearance your printer needs; the page takes it as "Slot clearance" under Advanced.
- **Standoff** for 1, 2 and 4 boards: a 15 mm spacer between the boards and the wall (IKEA's are 20 mm), so hooks have
  room behind the board. The shared ones leave a tunnel along the seam, so a hook fits there too.
- **Slot clip** for 2 boards side by side, 2 one above the other, and 4 where their corners meet: it joins boards
  behind a seam by pegs in their slots, so it needs no screw holes. It is as deep as the gap behind the boards, so
  the wall holds it on; ribs on the pegs press into the slots.

### On the page, beyond these files

- **Any size**: a wall of any size is split into panels as even as your printer's bed allows, closed round the
  outside and open at the seams, so the slots run on across them. A print list says how many of each panel to print,
  and "Download all" gives them in one zip or one 3MF.
- **Mounting**: countersunk or round-head screw holes in the corners, or keyholes at the top, on standoffs, so the
  board lifts off its screws.
- **The slot clip's options**: a snap lip in place of the ribs, and a screw or a keyhole to fix it to the wall.
- **Printers**: 30 printers' beds by maker, or your own.

### Printing

- Print each file as it comes: the boards face down, so the front is the smooth side on the bed; the connectors
  wall side down. No supports.
- Any filament, and no special settings; the files were checked with a 0.4 mm nozzle and 0.2 mm layers (Q221).
- The SKÅDIS slots are 5 x 15 mm on a 40 mm grid with a second grid set 20 mm across and up, and the board is 5 mm
  thick; every number and its source is in [the repository's notes on the standard](https://github.com/AlonRR/skadis-air/blob/main/docs/skadis-standard.md).

### Made in the open

The generator is programmatic, and its source is on GitHub: <https://github.com/AlonRR/skadis-air>. The skeleton
board's idea, rims round the slots tied by beams, follows
[Ultra Light SKÅDIS Board - Parametric](https://www.printables.com/model/1812712), itself after
[Azat's board](https://www.printables.com/model/1049033); its geometry is new.

These files are public domain (CC0). The files you make with the page, and anything you print from them, are yours
to use, change, share or sell, with no conditions from this project.

Not affiliated with IKEA. SKÅDIS is IKEA's name for its pegboard system.
