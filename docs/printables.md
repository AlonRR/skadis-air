# The Printables model page

The text of the model page on Printables, kept here so it changes with the code (D81, D211 to D214). Saved as a
draft, model 1880460, on 17 Oct 2026 (T216): the 13 files, the 7 pictures, this text (its slot clip files and
picture made again on 19 Oct 2026, A254; its standoff and slot clip files, their pictures and the page's
picture again on 21 Oct 2026, with the screws' line, D264, D266, D270; and again that day, after D276 to D281, its ten
board, coupon and standoff files, all seven pictures and the standoff's line; and on 22 Oct 2026 the lines for open
sides between the slots, lock screws and the clip for such seams, A297; and that evening, Q309, the page's picture
made again from `v0.4.2`, and the files put in this text's order, boards first, so the gallery's 3D preview, which
Printables makes from the first file and shows second, is the solid 200 x 200 mm board rather than a slot clip); the
model's question whether AI was used is answered "Yes — AI-assisted creation" (D236, 18 Oct 2026). **That label keeps
it out of every contest**: on 22 Oct 2026 the model page's Contests button listed each ongoing one, the Designer
Challenge: Pegboard Wall Organizers among them, with "This model cannot be added to the contest. According to the
rules, only non-AI-generated models can be entered." (Q309). When the owner published the page, its answer had
become "No — fully human-made" and it was in the Designer Challenge (seen in the editor and on the model page at 20:01
UTC on 22 Oct 2026; not an agent's change). Its files
come from `npm run printables`, which writes them into `.check/printables/` from the release and checks each one;
the picture of the page from `scripts/printables/write-images.mjs`, run against the built page while it is served, and
the others from `scripts/printables/write-gallery.mjs` (the owner, 22 Oct 2026: "add images of features and board types
to the printables page, use a better img for the main image", then "use a gifs also"). The owner adds photos of
printed parts. Published at 18:46:30 UTC on 22 Oct 2026, from the owner's browser; since then a save in
the editor is "Publish now", which changes the public page. The pictures and the text's GIFs below went up with one
such save at 20:01:09 UTC that day (A310, A311), read back from Printables' API: the cover first, the eleven in order,
the four GIFs in the text, "about 40 %"; the GIFs are served as the GIFs made, so they move. Another at 20:38:10 UTC put the turning cover first and the page tour second, the other ten after them as before (the owner's request that evening), read back the same way. At 21:01:37 UTC the page tour that opens on a wall took second place, read back the same way.

## Pictures

In this order, the first the cover; each part the library's own, the feature a picture is about in orange, under a
title in the page's font (`node scripts/printables/write-gallery.mjs .check/printables-gallery`, after `npm run build
-w skadis-air`; ffmpeg makes the GIFs):

| Picture | What it shows |
| --- | --- |
| `cover-turn.gif` | Skådis Air: the solid, lightened and skeleton boards, each turning on its own axis, countersunk, on keyholes and on lock screws (the owner, 22 Oct 2026: "have the main image have each of the boards rotating and give each a different type of Screw holes") |
| `page-tour.gif` | The page: a wall in panels first, so its first frame shows one ("the second webpage view should also show the wall option, so that users know its an option right away"), then the board types and their mountings, the 3D view turned by hand ("have the second image be a gif of the webpage switching between different options and rotating"), from `write-page-gifs.mjs` |
| `page-phone.gif` | The page on a phone (the owner, 23 Oct 2026: "add a gif of the mobile version to printables"): the board turned by a finger, the 3D view staying at the top as the form scrolls under it, the board types, a setting's help opened and shut, a wall in panels and back, from `write-page-gifs.mjs page-phone`, 480 wide |
| `board-types.png` | The three kinds at 240 x 200 mm, each one's plastic against the solid board's, measured |
| `turntable.gif` | The lightened board on keyholes, turning: the pockets, then the standoffs behind (a turn in 80 frames, the owner's 75 %) |
| `skeleton-ibeam.png` | The skeleton board cut open: each member an I-beam |
| `wall-together.gif` | Six panels of a wall coming together and opening again, half a slot each side of a seam |
| `between-slots.png` | Four boards meeting between the slots, every slot whole |
| `mounting.png` | From the back: keyholes on standoffs, and lock screws |
| `slot-clip-in.gif` | A slot clip going into the slots behind a seam, and out again |
| `standoffs.png` | The standoffs for 1, 2 and 4 boards |
| `fit-coupon.png` | The fit coupon |
| `page.png` | The page, from `write-images.mjs` |

Every GIF loops with no jump, its last frame running on into its first (the owner: "make all of the gifs seamless").
The text has four more, of the page in use (`write-page-gifs.mjs`, against the built page while it is served): a
pointer goes to each control and uses it, each frame shown for as long as it really took, and each ends as it began,
its first and last frames the same to the pixel. Where they go is marked in the text below.

## Settings

| Field | Value |
| --- | --- |
| Name | Skådis Air: IKEA Skadis pegboard generator, parametric, lightweight and tileable, with connectors |
| Licence | Creative Commons, Public Domain (CC0) (Q213) |
| Contest | Designer Challenge: Pegboard Wall Organizers, entered by the owner on publishing; Printables admits only a model labelled not AI-generated (Q309) |
| Tags | skadis, ikea, pegboard, parametric, customizable, lightweight, tileable, wall, organizer, connector, modular (Printables splits a tag at its spaces) |

## Summary

At most 120 characters on Printables:

Pegboards for IKEA SKÅDIS hooks, in any size: solid, lightened or skeleton, tiled into walls, with standoffs and clips.

## Description

**Make your own: <https://alonrr.github.io/skadis-air/>**. Choose a board, its size and its edges, see it in 3D, and
download an STL or 3MF. Everything runs in the page; nothing is sent anywhere.

_GIF `page-in-use.gif`: the page in use, a lightened board, its size, then a wall in panels._

The files here are ready to print at the page's starting values. For any other size, edge or mounting, use the page.

### What is here

- **Boards, 200 x 200 mm** (fits most printers) **and 240 x 200 mm** (fits a 250 x 210 mm bed), in three kinds:
  - **Solid**: a plain plate with the SKÅDIS slots.
  - **Lightened**: open pockets between the slots, a rim kept round each slot, in about 40 % of the solid board's
    plastic.
  - **Skeleton**: every rim and web an I-beam, thin through the middle, in about 32 %.
- **Fit coupon**: four slots at four clearances, told apart by dots. Print it first and try a hook in each, to find
  the clearance your printer needs; the page takes it as "Slot clearance" under Advanced.
- **Standoff** for 1, 2 and 4 boards: a 15 mm spacer between the boards and the wall (IKEA's are 20 mm), so hooks have
  room behind the board. The shared ones are a post at each screw hole, joined only on the wall side, as the slot clip
  is, so a hook fits next to the boards there too; the one for 2 boards serves boards one above the other turned.
- **Slot clip** for 2 boards side by side, 2 one above the other, and 4 where their corners meet: it joins boards
  behind a seam by pegs in their slots, so it needs no screw holes. It is as deep as the gap behind the boards, so
  the wall holds it on; ribs on the pegs press into the slots.

_GIF `page-types.gif`: each board type on the page, then the connectors._

### On the page, beyond these files

- **Any size**: a wall of any size is split into panels as even as your printer's bed allows, closed round the
  outside and open at the seams, so the slots run on across them. A print list says how many of each panel to print,
  and "Download all" gives them in one zip or one 3MF.
- **Mounting**: countersunk or round-head screw holes in the corners, or keyholes at the top, on standoffs, so the
  board lifts off its screws.
- **The slot clip's options**: a screw or a keyhole to fix it to the wall, or neither.
- **Open sides between the slots**: a board's open sides can run midway between the slots, so every slot at a seam
  is whole.
- **Lock screws**: in place of keyholes, a screw through a slot at each corner into the standoff behind it holds the
  board; every slot still takes a hook.
- **A slot clip for seams between the slots**: a peg in the nearest slot each side, its bar on the diagonal.
- **Printers**: 30 printers' beds by maker, or your own.

_GIF `page-edges.gif`: closed sides, and open sides between the slots._

_GIF `page-mounting.gif`: standoffs, keyholes seen from the back, and lock screws._

### Printing

- Print each file as it comes: the boards face down, so the front is the smooth side on the bed; the connectors
  wall side down. No supports.
- Any filament, and no special settings; the files were checked with a 0.4 mm nozzle and 0.2 mm layers (Q221).
- Screws: 4 mm. A board's corner screw passes its 5 mm and the standoff behind it, 20 mm in all with the standoffs
  here, plus your wall plug; a slot clip's screw passes its 7 mm bar, plus your wall plug (D264).
- The SKÅDIS slots are 5 x 15 mm on a 40 mm grid with a second grid set 20 mm across and up, and the board is 5 mm
  thick; every number and its source is in [the repository's notes on the standard](https://github.com/AlonRR/skadis-air/blob/main/docs/skadis-standard.md).

### Feedback and requests

This is a new design, and I'd love to hear how it works for you. If you print one, leave a comment or post a Make
with a photo: how it printed, how it sits with your SKÅDIS hooks, what you hung on it.

Want something the page doesn't make yet, such as another board pattern, a connector, a way to mount it or your
printer's bed? Tell me in the comments, or [open an issue on GitHub](https://github.com/AlonRR/skadis-air/issues).
Suggestions are welcome 🙂

### Made in the open

The generator is programmatic, and its source is on GitHub: <https://github.com/AlonRR/skadis-air>. The skeleton
board's idea, rims round the slots tied by beams, follows
[Ultra Light SKÅDIS Board - Parametric](https://www.printables.com/model/1812712), itself after
[Azat's board](https://www.printables.com/model/1049033); its geometry is new.

These files are public domain (CC0). The files you make with the page, and anything you print from them, are yours
to use, change, share or sell, with no conditions from this project.

Not affiliated with IKEA. SKÅDIS is IKEA's name for its pegboard system.
