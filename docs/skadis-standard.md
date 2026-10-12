# The SKÅDIS standard: the numbers and where each comes from

Every dimension the boards and connectors are built on, with its source. IKEA publishes **no**
slot size, pitch, board thickness or wall offset. Those figures come from a community
specification and from the parameters of existing generators, which agree with each other.
**Every value is `<<CONFIRM>>` until it is measured on a real board** (Q3, T17). The full
evidence, with every source and every disagreement, is in
[`research/2026-10-12-skadis-survey.md`](research/2026-10-12-skadis-survey.md).

Labels: **IKEA** read on IKEA's product page or assembly PDF; **community** a published
specification or a person's measurement; **code** a value in an existing generator's source;
**inferred** worked out from the others, stated by no source.

## The slot and the grid

| Value | Figure | Source | Label | Status |
|---|---|---|---|---|
| Slot width × height | 5 × 15 mm | [6d6178, "Skadis T-Nuts Mounting System"](https://www.printables.com/model/228663); [yasg `skadis.js`](https://github.com/ciawhatsthat/yasg/blob/HEAD/skadis.js) (`HOLE_W = 5`, `HOLE_H = 15`) and four other generators | community, code | `<<CONFIRM>>` |
| Slot ends | fully round, radius 2.5 mm (a stadium) | same two sources (`HOLE_R = 2.5`) | community, code | `<<CONFIRM>>` |
| Slot edge fillet | 1 mm, front and back | 6d6178 | community | `<<CONFIRM>>` |
| Slot on a real board | about 5.2 × 15.2 mm | [ShugyoPrint, "IKEA SKADIS - Board Generator"](https://makerworld.com/en/models/2060457): "In practice, I measured about 5.2 mm on my boards", and 15.2 mm for the height (read in a browser, 12 Oct 2026) | community | `<<CONFIRM>>` |
| Slot orientation | long axis vertical on a hung board | every source; IKEA's assembly drawings | IKEA | settled |
| Grid | 40 × 40 mm, with a second 40 × 40 mm grid shifted 20 mm in X and in Y | 6d6178 ("spaced 40mm apart in both directions"); yasg `PITCH_X = 40`, `PITCH_Y = 20`; four other generators | community, code | `<<CONFIRM>>` |
| Nearest slot centres | about 28.3 mm, on the diagonal | from the grid | inferred | follows |
| Clear material between slots | 35 mm across a row, 25 mm down a column, about 17.4 mm on the diagonal | from the grid and the slot | inferred | follows |

## The board

| Value | Figure | Source | Label | Status |
|---|---|---|---|---|
| Thickness | 5 mm | 6d6178; three generators default to 5; others use 4.5 or 5.5 | community, code | `<<CONFIRM>>` |
| Thickness that IKEA hooks accept | about 4 to 5.5 mm | [brandonstephens/skadis-generator](https://github.com/brandonstephens/skadis-generator) warnings; a 4 mm printed board was reported too thin (MakerWorld 208330, snippet) | code, community | `<<CONFIRM>>` |
| First slot centre from the edge | 20 mm | yasg `MARGIN = 20`, and two other generators | code | `<<CONFIRM>>`: IKEA's own margin is not published |
| Corner radius | 8 mm in three generators; 10 mm in two, and ShugyoPrint's page calls 10 mm official | yasg, skraeddar, Pegboard Studio; tabicat, boecko; [ShugyoPrint](https://makerworld.com/en/models/2060457) | code, community | `<<CONFIRM>>` |
| IKEA board sizes, width × height | 360 × 560, 560 × 560, 760 × 560 mm | [IKEA assembly instructions AA-1891323-4](https://www.ikea.com/gb/en/assembly_instructions/skadis-pegboard-white__AA-1891323-4-100.pdf), page 5 | IKEA | settled |

## Mounting

| Value | Figure | Source | Label | Status |
|---|---|---|---|---|
| Distance from the wall | 20 mm | 6d6178 ("roughly 20mm away from the wall") | community | `<<CONFIRM>>` |
| IKEA's scheme | one steel rail at the top whose bent tabs hold the two upper corners, two loose spacers at the lower corners, four thumb screws through round holes near the corners | IKEA AA-1891323-4 | IKEA | settled |
| IKEA's corner holes | position and diameter **not published** | — | — | needs a measurement (T17) |
| Gap between IKEA boards hung by the instructions | 5 mm, both stacked and side by side, which puts the slot grid 5 mm off across the seam | from IKEA's rail spacing (565 mm for 560 mm boards) and wall-screw spacing (200 / 400 / 600 mm) | inferred | `<<CONFIRM>>` |

## IKEA's connectors

| Part | Figure | Source | Label |
|---|---|---|---|
| Connector for SKÅDIS pegboards, 404.776.46 | a 30 × 65 × 2 mm steel plate behind a seam, held by the boards' corner screws and spacers | [IKEA product page](https://www.ikea.com/gb/en/p/-40477646/); assembly AA-2231911-1 | IKEA |
| Connector (desk clamp), 103.207.89 | holds a board upright on a desk or shelf 1 to 25 mm or 25 to 50 mm thick | [IKEA product page](https://www.ikea.com/gb/en/p/skadis-connector-white-10320789/); assembly AA-1891338-2 | IKEA |

## What a check of these numbers needs

Measured on a real board with calipers (T17): slot width and height, board thickness, the
first slot's distance from each edge, the corner holes' positions and diameter, the spacer's
length, and the gap between two boards hung by IKEA's instructions. A printed fit coupon then
settles the clearance a printed slot needs.
