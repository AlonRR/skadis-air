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
UTC on 22 Oct 2026; not an agent's change), the owner's decision (Q312, 28 Oct 2026: "due to how my use of llm is
different than the intention that prusa have"), which replaces D236's answer. Its files
come from `npm run printables`, which writes them into `.check/printables/` from the release and checks each one;
the picture of the page from `scripts/printables/write-images.mjs`, run against the built page while it is served, and
the others from `scripts/printables/write-gallery.mjs` (the owner, 22 Oct 2026: "add images of features and board types
to the printables page, use a better img for the main image", then "use a gifs also"). The owner adds photos of
printed parts. Published at 18:46:30 UTC on 22 Oct 2026, from the owner's browser; since then a save in
the editor is "Publish now", which changes the public page. The pictures and the text's GIFs below went up with one
such save at 20:01:09 UTC that day (A310, A311), read back from Printables' API: the cover first, the eleven in order,
the four GIFs in the text (the text then gave each board as a share of the solid board, replaced by grams under D313); the GIFs are served as the GIFs made, so they move. Another at 20:38:10 UTC put the turning cover first and the page tour second, the other ten after them as before (the owner's request that evening), read back the same way. At 21:01:37 UTC the page tour that opens on a wall took second place, read back the same way. On 23 Oct 2026 the owner approved a new set, a picture for each section of the page and the text's GIFs smaller, each with a line under it (A356; the Pictures below), made from `v0.6.0`, put in the editor by the agent and published by the owner at 15:35:53 UTC on 23 Oct 2026 (A352, A356; read back from Printables' API: the nine pictures in order, the six images in the text each with its line, and the Feedback and requests section). On 24 Oct 2026 the set was made again from `v0.8.0` (A407): six of the nine pictures, the three slot clips' files and five of the text's six GIFs changed, the rest came out the same; put in the editor by the agent, the order kept, and published by the owner at 10:57:40 UTC (T457; read back from Printables' API: the nine pictures in order, the thirteen files, the six images in the text each with its line). On 31 Oct 2026 the set was made again from `v0.10.0` (A587): of the gallery only the cover changed (D591), and all six page GIFs were recorded again from the published page; put in the editor by the agent, the eight pictures in their order with the new cover set as the cover, four of the text's GIFs replaced (page-in-use, page-types, page-edges, page-mounting; the turntable and the skeleton's close-up unchanged), the lines on tape and on standoffs held by nuts or wood screws, and the Updates section at the very bottom, which the live text had not had; published by the agent on the owner's word ("614 publish") at 05:55:53 UTC on 31 Oct 2026 (T614; read back from Printables' API: the eight pictures in order with the new cover, the four new GIFs in the text, the lines on tape and on the new standoffs, and the Updates section). On 31 Oct 2026 the set was made again from `v0.11.0` and `v0.11.1` (A629): the gallery's renders came out byte for byte as before, so of the gallery only the page tour and the phone GIFs, which show the form, were replaced, the four after them uploaded again to keep the order, the cover kept; in the text all four page GIFs were recorded again from the published page, the mounting one now choosing Tape and turning the board to its back to show the pads (D619 a), and the lines on Mounting and Tape and the v0.11.0 Updates entry written in; staged in the editor by the agent and published by the agent on the owner's word ("631 y") at 11:34:38 UTC on 31 Oct 2026 (A631; read back from Printables' API: the eight pictures in order, the new page tour and phone GIFs third and fourth, the four new GIFs in the text, the lines on Mounting and Tape, and the v0.11.0 Updates entry).

## Pictures

The set the owner approved on 23 Oct 2026 (A356): each picture about a section of the page, more or less ("each gif
should represent a section of the page more or less, instead of a gif being of one type"), the connectors together with
close-ups, and the text's GIFs smaller. Made from `v0.6.0`, again from `v0.8.0` on 24 Oct 2026, and from `v0.9.0` on 28 Oct 2026: the library's renders from the release's code (`node
scripts/printables/write-gallery.mjs <folder>`, after `npm run build -w skadis-air`), each part the library's own, the
feature a picture is about in orange, under a title in the page's font; the page's GIFs recorded from the published
page (`node scripts/printables/write-page-gifs.mjs https://alonrr.github.io/skadis-air/ <folder>`); ffmpeg makes the
GIFs. They are made again once a newer version is published (the owner: "once the newest version is published update
the gifs"). The owner uploads and arranges them on Printables.

In this order, the first the cover, as the owner arranged them on 30 Oct 2026 ("I removed and rearranged the photos
section on printables"; read back from the page that day: `board-types.png` gone, `wall-together.gif` second):

| Picture | What it shows |
| --- | --- |
| `cover-turn.gif` | Skådis Air: the solid, lightened and skeleton boards, each turning on its own axis, countersunk, on keyholes and on lock screws (the owner, 22 Oct 2026: "have the main image have each of the boards rotating and give each a different type of Screw holes"); the lightened and skeleton boards Curved above their middle and Straight below (D531), the halves 10 mm apart and a bar beside each half naming its look (D591, 30 Oct 2026) |
| `wall-together.gif` | The Size and panels section: six panels of a wall coming together and opening again, half a slot each side of a seam |
| `page-tour.gif` | The page: a wall in panels first, so its first frame shows one ("the second webpage view should also show the wall option, so that users know its an option right away"), then the board types and their mountings, the 3D view turned by hand ("have the second image be a gif of the webpage switching between different options and rotating"), from `write-page-gifs.mjs`, 800 wide |
| `page-phone.gif` | The page on a phone (the owner, 23 Oct 2026: "add a gif of the mobile version to printables"): the board turned by a finger, the 3D view staying at the top as the form scrolls under it, the board types, a setting's help opened and shut, a wall in panels and back, from `write-page-gifs.mjs page-phone`, 480 wide |
| `mounting.png` | The Mounting section: from the back, keyholes on standoffs and lock screws; at the front, close-ups of a countersunk and a round-head hole, each cut through, its screw seated flush |
| `connectors.png` | The Connectors section: the standoffs for 1, 2 and 4 boards and the slot clip, with close-ups of a hook's room between a shared standoff's posts, under four boards' corners, and of the ribs on a clip's peg |
| `slot-clip-in.gif` | A slot clip going into the slots behind a seam, and out again, on boards with no screw holes (the owner: "the board connector clip gif should be on a board without screw holes") |
| `sides.png` | The Sides section: a board closed all round, four boards meeting at seams through the slots, half a slot each side, and four meeting between the slots, every slot whole; the closed edge and the seams in orange |

Out of the gallery since 30 Oct 2026: `board-types.png`, removed by the owner. Out of the gallery since A356: `turntable.gif` and `skeleton-ibeam.png`, now close-ups in the text at the boards;
`standoffs.png`, folded into `connectors.png`; `between-slots.png`, into `sides.png`; `fit-coupon.png`, as the test
prints are under Advanced (D357); and `page.png`, as the page tour shows the page.

Every GIF loops with no jump, its last frame running on into its first (the owner: "make all of the gifs seamless").
The text has six more, each where the text below marks it: four of the page in use (`write-page-gifs.mjs`), a pointer
going to each control and using it, each frame shown for as long as it really took, each ending as it began, its first
and last frames the same to the pixel; and the two close-ups. All six are 560 wide (the owner: "we might want to shrink
the description gifs size"). Under each is a line in italics that says what it shows, starting with "ℹ️" (the owner:
"maybe add a small italic 'whats in the image' with an 'i' under each image"); Printables' editor has italics but no
smaller text.

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

A line in square brackets marks where a picture goes, and is not part of the text; the line in italics under it is.

**Make your own: <https://alonrr.github.io/skadis-air/>**. Choose a board, its size and its edges, see it in 3D, and
download an STL or 3MF. Everything runs in the page; nothing is sent anywhere.

[GIF `page-in-use.gif`]

_ℹ️ In the GIF: a lightened board sized 240 x 200 mm, then split into panels for a 1200 x 800 mm wall, and back to one
solid board._

The files here are ready to print at the page's starting values. For any other size, edge or mounting, use the page.

### What is here

- **Boards, 200 x 200 mm** (fits most printers), in three kinds, the lightened and skeleton boards both Curved and
  Straight, in a folder for each mounting: countersunk screw holes, round-head screw holes, keyholes, keyholes with
  lock screws, lock screws (these three on 15 mm standoffs), and none (for slot clips alone); each file's name says
  what it is:
  - **Solid**: a plain plate with the SKÅDIS slots, 116 g of PETG for a 200 x 200 mm board.
  - **Lightened**: open pockets between the slots, a rim kept round each slot, in about 68 g of PETG for a 200 x 200 mm board.
  - **Skeleton**: every rim and web an I-beam, thin through the middle, in about 70 g for the same board.

[GIF `turntable.gif`]

_ℹ️ In the GIF: the lightened board on keyholes, turning: its pockets and the rims round its slots, then the four
standoffs behind it._

[Picture `skeleton-ibeam.png`]

_ℹ️ In the picture: a skeleton board cut open across a row of its members, each cut face an I-beam, wide at both faces
and thin through the middle._

- **Fit coupon**, on the page under Advanced: four slots at four clearances, told apart by dots. Print it first and
  try a hook in each, to find the clearance your printer needs; the page takes it as "Slot clearance" there.
- **Standoff** for 1 board at a corner, 2 side by side, 2 one above the other, and 4 where their corners meet: a 15 mm
  spacer between the boards and the wall (IKEA's are 20 mm), so hooks have room behind the board. The shared ones are
  a post at each screw hole, joined only on the wall side, as the slot clip is, so a hook fits next to the boards
  there too.
- **Slot clip**, 15 mm deep, for 2 boards side by side, 2 one above the other, and 4 where their corners meet, and
  one for boards whose seam runs between the slots, each with a countersunk or round-head screw, a keyhole, or no
  fixing: it joins boards behind a seam by pegs in their slots, so it needs no screw holes. It is as deep as the gap
  behind the boards, so the wall holds it on; ribs on the pegs press into the slots.

[GIF `page-types.gif`]

_ℹ️ In the GIF: the lightened and skeleton boards, the fit test coupon under Advanced, then the standoff and the slot
clip, and back to the solid board._

### On the page, beyond these files

- **Any size**: a wall of any size is split into panels as even as your printer's bed allows, closed round the
  outside and open at the seams, so the slots run on across them. A print list says how many of each panel to print,
  and "Download all" gives them in one zip or one 3MF.
- **A straighter look**: the lightened and skeleton boards come Curved, as here, or Straight, their pockets in
  straighter lines, with the same edge chamfer, V groove at the seams and mounting.
- **Mounting**: countersunk or round-head screw holes in the corners, keyholes at the top so the board lifts off its
  screws, lock screws or tape, on standoffs at the corners or behind the corner slots.
- **The slot clip's options**: a screw or a keyhole to fix it to the wall, or neither.
- **Open sides between the slots**: a board's open sides can run midway between the slots, so every slot at a seam
  is whole.
- **Lock screws**: in place of keyholes, a screw through a slot at each corner into the standoff behind it holds the
  board; every slot still takes a hook.
- **A slot clip for seams between the slots**: a peg in the nearest slot each side, its bar on the diagonal.
- **Tape**: for a wall you would rather not drill, the board stands on posts behind its corner slots, each ending in a
  pad for a piece of double-sided tape, up to 40 mm each way; it has no screw holes, and the page says about what the
  tape holds. For light things.
- **Standoffs held by nuts or wood screws**: the standoff can hold the boards by an M3 to M5 nut in each post, pulled
  into its seat from the wall side, or by a wood or PT screw cutting its own thread, and stand on tape or a foot
  screwed to the wall.
- **Printers**: 30 printers' beds by maker, or your own.

[GIF `page-edges.gif`]

_ℹ️ In the GIF: the top and right sides ticked closed, the open sides moved between the slots, and back._

[GIF `page-mounting.gif`]

_ℹ️ In the GIF: standoffs at the corners, keyholes, the board seen from the back, lock screws, tape, then the front
again, countersunk and without standoffs._

### Printing

- Print each file as it comes: the boards face down, so the front is the smooth side on the bed; the connectors
  wall side down. No supports.
- Any filament, and no special settings; the files were checked with a 0.4 mm nozzle and 0.2 mm layers (Q221).
- Screws: 4 mm countersunk, with an 8 mm head, for every hole, the lock screws too; the page takes one screw size
  for them all, or a size of its own for each kind of hole under Advanced. A board's corner screw passes its 5 mm and the standoff behind it, 20 mm in all with the standoffs
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

### Updates

#### 2026-10-31 · v0.11.0

- "Mounting" in place of "Screw holes", with Tape in it, and the standoffs at the corners or behind the slots.
- A board on tape stands on posts behind its corner slots, so a larger piece fits, up to 40 mm each way.
- A setting that does not apply is hidden.
- On a phone, the Sides control stays under the 3D view as the form scrolls.

#### 2026-10-31 · v0.10.0

- "What to make" is Board, Wall or Connector: Wall makes a wall of panels your bed takes.
- The Sides control draws the board as you set it, and the form runs Look, Open sides, Sides, the screw holes and
  standoffs, then the size right above the screw size.
- With keyholes or lock screws, the standoffs stay on: "None" is greyed out, with a note saying why.
- Standoffs for double-sided tape, 19 x 19 mm pieces on 18 mm standoffs unless set, and a line on what they hold.
- The standoff connector can hold the boards by nuts, or by wood or PT screws, taped or screwed to the wall.

#### 2026-10-29 · files

- Every board at 200 x 200 mm for every mounting the page offers, in folders, and the Straight look too.

#### 2026-10-28 · v0.9.0

- A Look for the lightened and skeleton boards: Curved, or Straight, in the straighter lines of the first boards.
- Each board's plastic is given in printed grams, sliced in PETG.
- One screw size for the boards and the connectors.

#### 2026-10-24 · v0.8.0

- Between the slots, every corner keeps its screw, moved in where it would land on a slot.
- A setting that does not apply is greyed out.

#### 2026-10-23 · v0.5.0 to v0.7.0

- Keyholes take a countersunk screw, and print without lips sagging over air.
- The test prints are under Advanced, and each setting's help is folded behind an "i".

#### 2026-10-22 · v0.4.2

- First published.

Every change, with its reasons: [the changelog on GitHub](https://github.com/AlonRR/skadis-air/blob/main/CHANGELOG.md).
