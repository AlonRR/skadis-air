<!--
SPDX-FileCopyrightText: 2026 Alon A. Rabinowitz
SPDX-License-Identifier: CERN-OHL-S-2.0
-->

# The thin Straight skeleton, parted through its depth (D519, 28 Oct 2026)

Pictures for D519 (C538): the skeleton board with Look = Straight at its thinnest settings, rims and webs 1.2 mm and
a 0.8 mm core, on a 240 x 200 mm board with all sides open. Each part is the library's own; orange is where the edge
band and the webs fail to meet. Made by `node scripts/figures/shoot.mjs d519`, which also writes `numbers.json`.

## How the places were found

From the geometry alone, not placed by hand (C570). The board is cut at mid-depth (2.5 mm) and compared with the
plastic it has at both faces (0.3 mm in from each). Two voids that are apart at the faces but one void at mid-depth
meet through a passage, and the passage is where the two face voids, each grown 0.3 mm, overlap inside it. The
lengths of band parted from the rest are the mid-depth section's pieces other than the largest. The depths it parts
between are where the section's outline count leaves the faces' count.

What it found (`numbers.json`):

- 126 outlines at both faces, 122 at mid-depth; genus 145. The Curved skeleton at the same settings, and the Straight
  one at starting values: 126 and 126, genus 125, no places. These are C538's numbers again.
- 20 places, 10 along the bottom edge and 10 along the top, one either side of each half slot, 2.93 mm in from the
  edge. The left and right edges, and everything inside, stay joined (on 200 x 240 and 160 x 160 mm boards as well).
- At mid-depth, 8 lengths of edge band, each from one half slot to the next (35 mm, 1.1 mm deep at mid-depth), are
  pieces of their own: held to the rest only near the faces. The bands beside the corners part from the end half slot
  too, but stay joined at mid-depth through the corner.
- The section is parted from 1.57 mm to 3.43 mm deep, 1.87 mm of the 5 mm: the 0.6 mm flange at each face and about
  1 mm of the taper hold. Cut across at a place itself, the hole runs from 0.72 to 4.28 mm deep, so there only 0.72 mm
  at each face joins band and web: about the flange, as C538 says.
- At mid-depth the band ends 0.93 mm short of the half slot's rim and the web.

## The pictures

- `d519-1-where.png`: the whole board from the front, three-quarter. The 20 places in orange, the 8 parted lengths
  of band pale.
- `d519-2-cutaway.png`: one place close, at the left end of the bottom edge's first parted band, the board's front
  half taken away down to mid-depth. From outside the board looks whole, as both faces are joined, so a plain close-up
  shows nothing (C570); cut open, the band's end stands 0.9 mm off the web and the half slot's rim. Orange is the
  plastic both faces have there and the middle lacks.
- `d519-3-sections.png`: the section at mid-depth at the same half slot and band, over the outline at the front face,
  for the thin Straight skeleton, the Curved one at the same settings and the Straight one at starting values. Only
  the first parts; orange where its band stops short.
- `d519-4-through.png`: a cut across the board at the place (x = 43.57 mm), the front at the top. Band and web are one
  at each face, and a hole runs through between, from the half slot into the pocket.
