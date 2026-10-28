<!--
SPDX-FileCopyrightText: 2026 Alon A. Rabinowitz
SPDX-License-Identifier: CERN-OHL-S-2.0
-->

# The thin Straight skeleton, parted through its depth and joined (D519, 28 Oct 2026)

Pictures for D519 (C538): the skeleton board with Look = Straight at its thinnest settings, rims and webs 1.2 mm and
a 0.8 mm core, on a 240 x 200 mm board with all sides open. Each part is the library's own. **Before**, the pictures
below with `numbers.json`: orange is where the edge band and the webs fail to meet. **[After](#after)** the fix
(D519 a, C580), the same pictures at the same places, `-after`, with `numbers-after.json`: blue is where they meet now.
Made by `node scripts/figures/shoot.mjs d519`: on a library that parts it draws the before set, on one that is joined
it says so and draws the after set (C583).

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

## After

Built 28 Oct 2026 (D519 a, C580 to C583). The cause, measured: beside a half slot the pocket's corner at the faces
is 45 degrees, the band against a web, at (43.85, 3) beside the slot at x = 40. Through the board the band's edge
widens 1.9 mm and the web's 0.2 mm, so their meeting point runs down the web's line to (41.67, 1.1), 0.93 mm past the
slot's wall at x = 42.6. Now the sharp-cornered skeleton keeps each such half slot's rim core, 0.8 mm beside the
slot's straight sides, from face to face, so that corner meets a flat wall parallel to the slot. Every edge stays
straight, and the faces are unchanged down to the 0.6 mm flanges.

What the pass finds now (`numbers-after.json`):

- 126 outlines at both faces and at mid-depth, genus 125: the Curved skeleton's. No place parts, so the pictures are
  drawn at the 20 places `numbers.json` recorded.
- All 20 places are joined: the mid-depth section within 3 mm of each is one piece (0 of 20 on the code before).
- At mid-depth the joint is 0.8 mm across, the core, where the gap was 0.93 mm.
- 29.3 mm3 is added to the board. The Curved boards and the Straight skeleton at its starting values are the same
  bytes as before (C580), so their grams are unchanged.

The pictures:

- `d519-1-where-after.png`: the whole board from the same camera. The 20 places in blue, and the 8 lengths of band
  that were held only near the faces in pale.
- `d519-2-cutaway-after.png`: the same place, cut open at mid-depth the same way. The band, the half slot's rim and
  the web meet. Blue is the plastic there through the depths that parted before.
- `d519-3-sections-after.png`: the same three mid-depth sections. The thin Straight one's band runs into the 0.8 mm wall
  beside the half slot at each end (blue), and all three are joined.
- `d519-4-through-after.png`: a cut through the depth at x = 43.00 mm, through the kept core. It is not at the place
  itself, x = 43.57 mm, because that plane lies past the core: it crosses the pocket's own tip, which shows as a void
  there as before but is closed off from the half slot now. The band and the half slot's rim and web are one piece
  from face to face, with no hole. Blue is where the cut spans the depths that parted before.
