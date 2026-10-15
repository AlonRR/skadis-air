# SKÅDIS-compatible boards and connectors: evidence base for a generator taxonomy

Research date: 12 Oct 2026. Scope: boards and board connectors only (no hooks, shelves, bins).

## How to read this report

**Evidence labels** (one per claim or per table row):

- **(verified)**: I read it on the page itself. For Printables this means the model's own description, licence and file list, read through Printables' public GraphQL API (the same data the page renders). For GitHub it means the source file, read through the GitHub API. For IKEA it means the product page JSON and the assembly-instruction PDFs.
- **(snippet only)**: seen only in a search-engine result snippet or summary. MakerWorld, 3dgo.app, Printables HTML and Thingiverse pages returned HTTP 403 to direct fetches, so every MakerWorld figure in this report is snippet-only.
- **(inferred)**: my own reasoning from the evidence, not stated by any source.

**Source classes** used in section 1: IKEA (product page or assembly PDF), technical drawing (third-party drawing site), community measurement (a person reporting a caliper reading), CAD/code parameter (a value hard-coded in an existing generator or model).

All units are metric. Where a source gave inches, only the converted mm figure is given.

---

## 1. The SKÅDIS hole standard

### 1.1 What IKEA itself publishes

IKEA publishes **no** figure for slot size, pitch, board thickness or wall offset on any page or PDF I read. The numbers IKEA does publish are below.

| Item | Value | Source | Label |
|---|---|---|---|
| Board sizes (W x H) | 360 x 560, 560 x 560, 760 x 560 mm | Assembly instructions AA-1891323-4, page 5 (all three sizes drawn) <https://www.ikea.com/gb/en/assembly_instructions/skadis-pegboard-white__AA-1891323-4-100.pdf> | (verified) IKEA |
| 360 x 560 white, art. 503.208.05 | W 36 cm, H 56 cm; package 37 x 2 x 61 cm, 1.16 kg | <https://www.ikea.com/gb/en/p/skadis-pegboard-white-50320805/> | (verified) IKEA |
| 560 x 560 white, art. 003.208.03 | "Pegboard, white 56x56 cm"; US package 565 x 25 x 603 mm, 1.73 kg (converted from the US page's imperial figures) | <https://www.ikea.com/gb/en/p/skadis-pegboard-white-00320803/> and <https://www.ikea.com/us/en/p/skadis-pegboard-white-00320803/> | (verified) IKEA |
| 760 x 560 white, art. 103.216.18 | W 76 cm, H 56 cm; package 60 x 2 x 76 cm, 2.36 kg | <https://www.ikea.com/gb/en/p/skadis-pegboard-white-10321618/> | (verified) IKEA |
| Black boards | 36x56 (805.343.72), 56x56 (105.343.75), 76x56 (505.343.78), same package data as white for 36x56 | <https://www.ikea.com/gb/en/p/skadis-pegboard-black-80534372/> (others listed on the series page) | (verified) IKEA |
| Double-sided boards (dark grey-blue / dark lilac-red) | 36x56 (206.244.17) and 76x56 (006.244.23) | <https://www.ikea.com/gb/en/p/skadis-pegboard-double-sided-dark-grey-blue-dark-lilac-red-20624417/> | (verified) IKEA |
| Freestanding board, art. 005.415.74 | 56 x 37 cm (W x H), "1 pegboard and 4 feet", package 38 x 2 x 62 cm | <https://www.ikea.com/gb/en/p/skadis-freestanding-peg-board-white-00541574/> | (verified) IKEA |
| Wood-veneer boards (US art. 103.471.71, 903.471.72) | listed in US search results; one listing gives package 56 x 2 x 60 cm, 1.72 kg | <https://www.ikea.com/us/en/p/skadis-pegboard-wood-10347171/> | (snippet only) |
| Material | "Fiberboard, Acrylic paint" | GB/US product pages above | (verified) IKEA |
| Included hardware | "Rail for wall mounting included." "Screws for wall mounting sold separately." | Product page "Good to know" | (verified) IKEA |
| Designer | Eva Lilja Löwenhielm | Product page | (verified) IKEA |

**Board thickness and the "2 cm" figure.** IKEA gives no board thickness. Every package height is 2 cm (verified). The drawing site dimensions.com gives the 56 x 56 board a **depth of 20 mm** and 1.9 kg, <https://www.dimensions.com/element/ikea-skadis-pegboard-square> (verified, technical drawing site). That 20 mm matches both the package height and the community-reported wall offset, so it cannot by itself tell face-sheet thickness from mounted depth. (inferred) The face sheet itself is about 5 mm (see 1.2), and the ~20 mm is the gap behind it set by the rail tabs and spacers.

### 1.2 Hole geometry: every source and value

| Parameter | Value | Source | Source class | Label |
|---|---|---|---|---|
| Slot width x height | 5 x 15 mm | 6d6178, "Skadis T-Nuts Mounting System" (3,437 likes, the de facto community reference): "The peg holes measure 5x15mm (X/Y) and have a radius of 2.5mm and a 1mm fillet." <https://www.printables.com/model/228663> | community spec | (verified) |
| Slot end shape | full round ends, R 2.5 mm (stadium) | same page; also yasg `HOLE_R = 2.5` "5mm wide x 15mm tall stadium slot, R2.5mm" <https://github.com/ciawhatsthat/yasg/blob/HEAD/skadis.js> | community spec; code parameter | (verified) |
| Slot edge fillet (front/back edge of the slot) | 1 mm | 6d6178 T-nut page | community spec | (verified) |
| Slot measured on real boards | about 5.2 x 15.2 mm (official 5 x 15) | MakerWorld 2060457 "IKEA SKADIS - Board Generator" description | community measurement | (snippet only) |
| Slot (code defaults) | 5 x 15 | thetorminal/skraeddar `HOLE_WIDTH = 5; HOLE_HEIGHT = 15`; soloh4cker/skadis_pegboard_studio SKÅDIS preset `holeWidth:5, holeLength:15`; brandonstephens/skadis-generator defaults sw 5, sl 15 ("Reset to IKEA dimensions") | code parameter | (verified) |
| Slot (printed-board clearance variants) | 4.7 x 15 | tabicat "Customizable Skadis Pegboard" `skadis_board.scad` (`Hole_Width = 4.7`, `Hole_Height = 15`), reused in boecko's generator <https://www.printables.com/model/1093087> , <https://www.printables.com/model/1139823> | code parameter | (verified) |
| Slot (oversized variant) | 5.5 wide x 15 | DeckedKnight `parametric_base_plate_V2.1.scad` (`slot_width = 5.5`, `slot_height = 15`) <https://www.printables.com/model/1146188> | code parameter | (verified) |
| Slot for a printed accessory that must enter the slot | 4.7 x 14.7 mm, R 2.35 | 6d6178: "Use 4.7mm instead of 5mm and 14.7mm instead of 15mm and a 2.35mm radius" (for alignment guides) | community spec | (verified) |
| Horizontal pitch, same row | 40 mm | 6d6178 ("spaced 40mm apart in both directions"); yasg `PITCH_X = 40`; skraeddar `HOLE_SPACING_X = 40`; tabicat `Hole_Delta_X = 40`; DeckedKnight `horizontal_distance = 40`; skapa clip spacing `gw = 40` <https://github.com/nmattia/skapa/blob/HEAD/src/model/manifold.ts> | community spec; code | (verified) |
| Vertical pitch between adjacent (staggered) rows | 20 mm | yasg `PITCH_Y = 20`; skraeddar `HOLE_SPACING_Y = 20`; tabicat `Hole_Delta_Y = 20`; DeckedKnight `vertical_distance = 20` | code parameter | (verified) |
| Vertical pitch, same column | 40 mm | 6d6178 ("40mm apart in both directions") | community spec | (verified) |
| Stagger | alternate rows shifted 20 mm horizontally, i.e. "a 40x40mm hole pattern with a second pattern shifted 20mm in X and Y" | 6d6178; tabicat `Hole_Shift = 20`; DeckedKnight `odd_horizontal_distance = 20`, `odd_vertical_distance = 20`; Autodesk "Skadis Generator" add-in listing ("40mm grid spacing ... staggered holes offset by 20mm horizontally and 20mm vertically") | community spec; code; vendor listing | (verified) except Autodesk (snippet only) |
| Slot orientation | long axis vertical on a wall-hung board | every source and the IKEA assembly drawings | IKEA drawing | (verified) |
| Surface features of the real board | recesses of some kind (not described) | Pegboard Studio README: "the original IKEA board's surface recesses are not modeled" <https://github.com/soloh4cker/skadis_pegboard_studio> | code note | (verified quote; meaning unknown) |

(inferred) Taken together: the pattern is a centred-rectangular (diamond) lattice with a 40 mm x 40 mm unit cell and one extra slot at the cell centre. Nearest slot-to-slot centre distance is about 28.3 mm (diagonal). Clear material between slot outlines: 35 mm between same-row neighbours (40 - 5), 25 mm between same-column neighbours (40 - 15), and about 17.4 mm between diagonal neighbours (closest slot-end points are 22.4 mm apart, minus 2 x 2.5 mm radius). These follow arithmetically from the figures above; they bound how wide a lightening rib or pocket can be.

### 1.3 Edge margins and board outline

| Parameter | Value | Source | Source class | Label |
|---|---|---|---|---|
| First slot centre from edge | 20 mm | yasg `MARGIN = 20` ("first hole center from edge"); skraeddar `EDGE_MARGIN = 20`; EmilBjorn `x_margin=20, y_margin=20` <https://github.com/EmilBjorn/Skadis-generator> | code parameter | (verified) |
| Minimum edge margin default | 15 mm | brandonstephens/skadis-generator "Min. edge margin" default 15 | code parameter | (verified) |
| Edge margin on real IKEA boards | **not found** in any IKEA source or caliper report | — | — | — |
| Corner radius of board outline | 8 mm; 10 mm | 8 mm: yasg ("R8 corner radii"), skraeddar `BOARD_RADIUS = 8`, soloh4cker default `corner:8`; 10 mm: tabicat `Radius = 10`, boecko `board_radius = 10` | code parameter | (verified) |
| Width rule that keeps the grid continuous across a vertical seam | panel width ≡ 20 (mod 40); a shared slot at the seam is formed from two half-slots | yasg header comment | code design note | (verified) |
| Shelf width rule | sheet width = n x 40 - 5 mm | Printables "SKADIS large shelf" 251304 | community design note | (snippet only) |

(inferred) A 560 mm board with 20 mm margins gives slot-centre columns at 20, 40, ... 540 mm (27 positions on a 20 mm half-pitch, used alternately by the two row sets). This is consistent with every 40 mm-multiple IKEA width (360, 560, 760), but I found no measurement confirming IKEA's actual margin, so the generator should expose the margin as a parameter defaulting to 20 mm. Arithmetic constraint: with columns on a 20 mm step, symmetric margins on a 560 mm board can only be 10, 20, 30 ... mm, so a value like 17.5 mm is impossible for a symmetric IKEA board.

**What IKEA's own spacing figures imply about seams** (inferred from the verified PDF numbers, worth confirming on a real board):

- **Stacked boards:** the rails are 565 mm apart for 560 mm-tall boards, so IKEA leaves a **5 mm gap** between stacked boards. The vertical repeat across the seam is 565 mm, and 565 is not a multiple of 40 (565 = 14 x 40 + 5), so the slot grid of the upper board is **5 mm off-pitch** relative to the lower one. This needs no assumption beyond each rail sitting at the same place on its board.
- **Side by side:** the wall-screw spacing X is 200 / 400 / 600 mm on 360 / 560 / 760 mm boards, i.e. 80 mm in from each board edge on all three sizes if the rail is centred. The 165 mm between the inner screws of neighbouring rails then gives 80 + gap + 80 = 165, a **5 mm gap** again.
- **Consequence:** for identical or 40 mm-multiple boards the edge margin cancels out; what decides continuity is whether board width (or height) + gap is a multiple of 40 mm. With IKEA's 5 mm gap it never is, so accessories cannot bridge two IKEA boards hung by the instructions. Even at zero gap, a 20 mm margin leaves one slot column missing at the seam, which matches the observation that IKEA boards side by side "are missing a row of slots" (stefanwest, Printables 497136, verified).
- For the generator this means "IKEA-compatible board" (20 mm margins, IKEA-style corner holes) and "tileable board" (grid continuous across seams, section 4 axis C) are two different presets, not one.

### 1.4 Board thickness

| Value | Source | Source class | Label |
|---|---|---|---|
| 5 mm | 6d6178 T-nut page: "the board thickness is 5mm" | community spec | (verified) |
| 5 mm ± 0.2 mm; a 4 mm print did not fit accessories | MakerWorld 208330 "IKEA Skadis 5mm Pegboard Infinitely Splicing Version", update log (March 2024): users reported the 4 mm board made accessories incompatible, so a 5 mm version was released <https://makerworld.com/en/models/208330> | community measurement | (snippet only) |
| 4.4 mm slot suggested for accessories meant for printed boards | MakerWorld 2042896: printed boards' holes "are rarely as large as the original Skadis" | designer heuristic | (snippet only) |
| 5 mm default | skraeddar `thickness = 5`; soloh4cker SKÅDIS preset `thickness:5`; brandonstephens default `t = 5` | code parameter | (verified) |
| 4.5 mm | tabicat `Thickness = 4.5`, boecko `board_thickness = 4.5` | code parameter | (verified) |
| 5.5 mm | DeckedKnight `skadis_thick = 5.5` | code parameter | (verified) |
| 3 mm and 5 mm options | MAQUINA "200x200 / 360x360" ships both "standard thickness which is 3mm and 5mm" <https://www.printables.com/model/73926> | designer choice | (verified) |
| 5.1 mm | RyanCastillo "reinforced distressed vornai skadis board panel 220x220x5.1" (title) <https://www.printables.com/model/1493021> | designer choice | (verified) |

**Accessory-fit thickness window** (designer heuristic, not a measurement): brandonstephens/skadis-generator warns below 4 mm ("IKEA hooks will sit loose"), accepts 4 to 5.5 mm ("IKEA accessories should seat normally"), calls 5.5 to 6.5 mm "tight", and above 6.5 mm "too thick for IKEA hooks" (verified, code in `app.js`). A MakerWorld minimal-hook design ships "4.75mm" and "5.0mm hooks clearance" variants because "the thickness of the pegboard may vary" (snippet only).

### 1.5 How IKEA boards mount (wall offset, rail, screws)

From the IKEA assembly PDF AA-1891323-4 (verified, IKEA, drawings read page by page):

- **Parts per board:** one steel wall rail (part numbers 153300/153303 for 36x56, 153301/153304 for 56x56, 153302/153305 for 76x56), **4 slotted thumb screws** (153311/153312), **2 cylindrical spacers** (152741/153307). Wall screws are not included.
- **Step 1-2:** the rail is screwed to the wall with 2 screws. Wall-screw spacing X = **200 mm** (36x56), **400 mm** (56x56), **600 mm** (76x56).
- **Step 3:** the 2 spacers are screwed onto the back of the board at the **two lower corners**, using a thumb screw through a dedicated round mounting hole in the board. (Corrected 15 Oct 2026: the owner's board has no such hole; IKEA's spacer is held through a peg slot by a screw with a nub. See `skadis-standard.md`.)
- **Step 4:** the board's two **upper corners** are screwed to the rail's two bent-out end tabs (the tabs are the upper standoffs).
- **Stacking (info panel, page 7):** rails for vertically stacked boards are **565 mm** apart; for boards side by side, the gap between the inner wall-screw holes of adjacent rails is **165 mm**.
- **Mounting holes:** the overview drawing shows 4 round holes, one near each corner, placed in the slot field (they appear in place of a slot position). (inferred from the drawing; no dimension given.) (Corrected 15 Oct 2026: there are none; see step 3.)

So IKEA's scheme is **one top rail with integral standoff tabs + two loose bottom spacers**, not four identical corner standoffs. Many printed "wall mount" designs replace exactly these parts.

**Wall offset (spacer depth):** not dimensioned by IKEA. Community figures: "The pegboard stands roughly 20mm away from the wall and the board thickness is 5mm" (6d6178, verified); "Ikea Skadis has 20mm wall distance with original mounting accessories" and a replacement spacer offered in 20 mm plus an 18 mm version "for the connector plates" because IKEA supplies no extra spacers with them (MakerWorld 861073 "Skadis Multi Board Wall Mount", snippet only). Printed designs also use 25 mm (Crosslink, 30 mm to the board face) and 27.5 mm (HighDesertHacker) standoffs (verified, see section 2).

### 1.6 Accessory-side clearance

- **IKEA hooks:** steel, powder coated; the small hook is listed as depth 2.5 cm, height 6 cm (5-pack, art. 203.208.02), the long hook depth 9.5 cm, height 6 cm (2-pack). <https://www.ikea.com/gb/en/p/skadis-hook-white-20320802/> (verified, IKEA). IKEA gives **no wire or strip thickness** and no engagement depth. I did not find a caliper measurement of an IKEA hook's tongue.
- **Behind-board space needed:** the 6d6178 T-nut "measures 7.4mm in height and reaches 4mm into the Skadis peg hole (1mm gap)"; maximum screw length = part thickness + 25 mm - 2 mm, i.e. it assumes 20 mm clear behind a 5 mm board (verified). (inferred) Any printed board must keep the zone behind each slot free for at least the depth of the hooks it should accept; a lattice that puts a rib directly behind a slot, or a standoff under 10 mm or so, can block hooks.
- **Printed clip profile (CAD parameter):** SKÅPA's clip cross-section, nmattia/skapa `src/model/manifold.ts` (verified, code): polygon vertices (0.95,0) (2.45,0) (2.45,3.7) (3.05,4.3) (3.05,5.9) (2.45,6.5) (0.95,6.5), mirrored as a left/right pair and extruded 12 mm (`CLIP_HEIGHT = 12`), clip pairs every 40 mm. (inferred) That reads as two 1.5 mm legs whose outer faces sit 4.9 mm apart (fits a 5 mm slot), with a 0.6 mm barb; the exact axis meaning was not documented.
- **Printed peg through-board dimension (code parameter):** franpoli's GPL-3.0 accessory library `ikea_skadis.scad` uses `peg_default_width = 5`, `peg_default_thickness = 4.6`, `distance_between_pegs = 40`, `tolerance = 0.6` <https://github.com/franpoli/OpenSCADutil> (verified, code). The library does not say whether "thickness" is the through-board depth or the peg's cross-section; if it is the depth (inferred, plausible next to a 5 mm board), it is the only code figure found for how far a printed peg passes through.
- **Edge-on fit test:** several designers recommend printing a small test coupon first because "materials shrink differently" (MakerWorld 2060457, snippet only); soloh4cker's studio generates a "fit coupon" automatically (verified, code `fitCoupon`).

### 1.7 IKEA's own connectors (relevant to section 3)

| IKEA part | Dimensions | Key facts | Source | Label |
|---|---|---|---|---|
| SKÅDIS connector (desk/shelf clamp), art. 103.207.89, 2-pack | W 2 x D 5 x H 18 cm | "Can be used for desks or shelves with a thickness up to 5 cm"; uses the screws included with the pegboard; steel, epoxy/polyester powder coat. PDF AA-1891338-2: a long L-strip with a screw clamp plus a short L-bracket; two set-ups for **1-25 mm** and **25-50 mm** tops; the board stands vertically on the desk edge. | <https://www.ikea.com/gb/en/p/skadis-connector-white-10320789/> ; <https://www.ikea.cn/cn/en/p/skadis-connector-white-10320794/> | (verified) IKEA |
| SKÅDIS connector for SKÅDIS pegboards, art. 404.776.46, 2-pack | W 3 x H 6.5 cm x 0.2 cm (steel plate) | "Can only be mounted vertically" (snippet); PDF AA-2231911-1: a flat steel plate placed behind the seam of two vertically stacked boards; each board's corner thumb screw passes through the board, the plate's centre hole and into a spacer; two small holes per group locate the spacer's pins; the parts page shows 6 screws and 4 spacers next to the SKÅDIS booklet icon, i.e. taken from the boards' own packs (inferred). (inferred) Because the 2 mm plate sits between board and spacer, a standard spacer pushes that seam 2 mm further out, which is why MakerWorld 861073 offers an 18 mm spacer "for the connector plates". | <https://www.ikea.com/gb/en/p/-40477646/> | (verified) IKEA; "vertical only" (snippet only) |
| SKÅDIS connector for wardrobe, art. 104.776.43, 2-pack | W 5 x D 6 x H 19 cm | steel; hangs a board on the side of a PLATSA wardrobe frame (PDF AA-2231894-3, not opened) | <https://www.ikea.com/gb/en/p/-10477643/> | (verified) dims; use (snippet only) |
| "Connector for ALEX" | — | **not found** under that name at IKEA. The desk connector above is IKEA's furniture connector; an IKEA Hackers post shows a board used as an ALEX back panel without a connector. | <https://ikeahackers.net/2019/05/alex-storage-unit-back-panel.html> | (snippet only) |

---

## 2. Survey of printable SKÅDIS-compatible boards

68 rows: 41 Printables, 17 MakerWorld, 8 Thingiverse/Cults3D, 2 GitHub. Variants of one design share a row. Column key: **Face** = how the face is built; **Join** = how tiles join each other; **Mount** = wall mounting. "—" means the page says nothing about it. Licence is as shown on the page. Filament/time figures are the designer's claims.

### 2.1 Printables (every row verified through the Printables API: title, author handle, licence, file list and description)

| # | Design | Author | Licence | Size | Thick. | Face | Join | Mount | Special form; claims |
|---|---|---|---|---|---|---|---|---|---|
| P1 | [Parametric SKADIS Board Generator](https://www.printables.com/model/206256) | LineArcLine | CC BY-NC-SA | per-printer presets (Prusa Core One/MK4/MK3, Core One L, XL; Bambu X1C/P2S/A1, H2D/H2C); any size in OnShape/Fusion | parameter `BoardThickness` | solid | none | not in the part of the description read | Driving params: Columns, Rows, SpacingFromSide, SpacingFromTop, BoardThickness; uneven rows/cols; "you can change the hole starting pattern"; DXF export for laser/CNC. 2,760 likes; remixed by P25 (stated) and P40 (ships the same "Printable SKADIS v38" .f3d). |
| P2 | [Skadis Pegboard, all sizes 80 to 360mm](https://www.printables.com/model/1473739) | RobertG | CC Public Domain | 80 to 360 mm in 20 mm steps (225 STLs) | — | solid | none | **integrated 20 mm standoffs** + countersunk screw holes | Fusion .f3d, two parameters. |
| P3 | [Truly modular skadis panel system](https://www.printables.com/model/1404020) | Jupera | CC BY-NC-ND | Mini / Standard / XL tile sets (tiles A–I) | — | solid | **separate connectors** that press-fit into tiles, M3x12 flat-head screws thread into them | the connectors double as **20 mm wall spacers** with wall-screw holes | "every hole is usable, and none of the holes are split or omitted"; corner tiles, single-row/column sets with rounded border. NoDerivatives: study only. |
| P4 | [Skadis hexagon board with interconnection system](https://www.printables.com/model/1591944) | Mitchman1411 | CC BY-NC | one hexagon, fits MK4/Core One bed | — | solid, **hexagon outline** | included connector piece | screw holes (supports needed for head recess), screw cover | "holes on each tile does not line up with the holes on the next tile". 960 likes. |
| P5 | [IKEA Skadis Wall Panel with standoffs](https://www.printables.com/model/798248) | Crosslink | CC BY-NC-SA | 3x4 to 6x6 holes | — | solid | none | **integrated 25 mm standoffs**, board face 30 mm from wall, 4 countersunk screws | "about 150g of filament usage per panel" (10% gyroid, 3 perimeters). |
| P6 | [IKEA SKADIS PEGBOARD 200X200MM / 360X360MM](https://www.printables.com/model/73926) | MAQUINA | CC BY-NC-SA | 200x200, 360x360 | 3 and 5 mm | solid | none | — | 5 h 03 min (3 mm) / 6 h 05 min (5 mm) at 0.3 mm layers. Its 3 mm version is the target of the desk clamps in section 3 (Silverbeast 420636; GetLife 1655122 "holding 3mm pegboards"). |
| P7 | [Light SKÅDIS (Skadis) Board](https://www.printables.com/model/847283) | Yellowicz_270965 (credited elsewhere as grafit.xyz) | CC BY-NC-SA | 160, 200, 200x240, 240, 280 mm | — | **lightened lattice** ("light version does not need a lot of filament") | separate printed connectors, plus a "mount tool" for assembly | — | 587 likes; parent of several remixes (P8, P9, C-entries). |
| P8 | [Midweight (Light) SKÅDIS Board Accent Panel + Edge Connectors](https://www.printables.com/model/1215630) | MuteKnee3D | CC BY-NC-SA | 200x200 | — | lattice **plus a solid skin** (accent/stiffer) | edge connectors (2- and 4-way) | — | connectors scaled to 99 % for fit. |
| P9 | [Slightly Reinforced Light Skadis Board](https://www.printables.com/model/1716625) | MarcinKowals | CC BY-NC-SA | 200x200 | — | lattice + extra vertical ribs | (as P7) | small **rear protrusions** bear on the wall | anti-wobble remix. |
| P10 | [Ultra light SKÅDIS (Skadis) Board](https://www.printables.com/model/1049033) | _1977792 ("Azat" per remixers) | CC BY-NC-SA | 40x40 to 400x400 in 40 mm steps | — | **ultralight: thin-walled channels / I-beam (H) profile** | "u-connector light" (STL + STEP) | — | 2–3 perimeters, 5–15 % infill recommended. |
| P11 | [Ultra Light SKÅDIS Board - Parametric](https://www.printables.com/model/1812712) (+ size packs [1813253](https://www.printables.com/model/1813253), [1848889](https://www.printables.com/model/1848889)) | crashingtardis | CC BY-NC-SA | 40 to 400 mm in 40 mm increments (102 STLs) | — | as P10, rebuilt in Fusion from "base elements" | as P10 | **standoff distance parameter** (added 23 Aug 2026) | proves P10's lattice decomposes into repeatable cells. |
| P12 | [IKEA SKÅDIS Lightweight (With Connector)](https://www.printables.com/model/856593) | HUX3D | CC Public Domain | — | — | lightweight | IKEA-style connector replica included | "feet on bottom" | "Uses less filament than most others". |
| P13 | [Skadis panels modular kit](https://www.printables.com/model/1562991) | ThorinOakenshield | CC BY-NC-ND | 9 positional tiles (corner/edge/centre) for 1x3, 2x2, 2x3, 3x3 | half thickness + raised slot rims | **thin plate with full-thickness bosses only around the slots** ("lightened to half the thickness, the rest is filled by the protruding hole") | interference-fit edge joints, no tolerance; test-joint STL supplied | wall mount parts for a 4 mm screw + spacer | NoDerivatives. |
| P14 | [Skadis Hexagon Tile](https://www.printables.com/model/565691) | db_202780 | CC BY-NC-SA | hexagon (MK3/4 bed) + small hexagon | — | solid, hexagon outline | none (holes symmetric per tile, do not align) | with/without **integrated rear spacer**; wood screw through slots + screw cap; or Command strips cut in half | — |
| P15 | [Parametric Skadis Panel (Solidworks)](https://www.printables.com/model/1615966) | _333804 | GPL-3.0 | 2x1 to 4x4 | — | solid | — | 4x M4x12 screws | Solidworks 2022+. |
| P16 | [Ikea Skadis compatible tiles](https://www.printables.com/model/158015) | theo | CC BY-NC | 180x180, 180x280, 200x280, 240x240, 280x280, **triangles** | — | solid | separate connectors (`Connector_80ab`, `Connector_40ab_t`, `Connector_80a_mount`) | separate standoff | sized to tile into IKEA's 36/56/76 cm boards; triangles for roof slopes. |
| P17 | [IKEA Skadis Board Side Addition](https://www.printables.com/model/214027) | BeaRes | CC BY-NC-SA | 200x180, 180x180 | — | solid | connectors from Anymars' "Mini-Montagebrett" (STEP supplied) | screw holes + feet | notes that two generators' hole grids sit differently relative to the border, so mixed sets misalign. |
| P18 | [Foldable SKADIS Pegboard](https://www.printables.com/model/1402925) | AKO_Division | CC BY-NC | Prusa Mini / A1 mini plates (left, middle, right) | — | solid | **T-pins (with lock) or one-piece tooth pins** hinge/link plates; middle plate repeats for "infinite" | **desk stands** (two styles) | foldable, portable. |
| P19 | [Modular Peggy Panel](https://www.printables.com/model/19442) + [Braces](https://www.printables.com/model/19443) (+ Prusa Mini build [90221](https://www.printables.com/model/90221)) | AsraffAmzani | CC BY | OpenSCAD (`peggy.scad`) | 5 mm braces | solid; slots continue to the edge so adjoining panels keep a slot row | **front+back brace pairs** (dual horizontal, dual vertical, diagonal, quad) with M3 + nylon nuts | countersunk screw mounts, drilling jig, spacer | an early OpenSCAD board generator (early by its low model id; inferred). |
| P20 | [Modular Skadis Panel / Pegboard](https://www.printables.com/model/497136) | stefanwest | CC BY-SA | 200 mm | — | solid | as P19 (remix) | — | adds smooth-edge and rounded-corner edge pieces for the outer border. |
| P21 | [Skadis Panel 240x240 / 240x160 / 240x120](https://www.printables.com/model/1457794) ([240x120](https://www.printables.com/model/1457736)) | HighDesertHacker | CC BY-NC-SA | 240 W x 120/160/240 H | 5 mm | solid | **tongue & groove** edges + rear M3 bracket connectors (2- and 4-panel) | separate standoffs, face at 27.5 mm | "maintaining a consistent slot pattern so that accessories can connect across panels"; corner M3 holes free the slots. |
| P22 | [Infinity Skadis Compatible Board — Tileable Parametric](https://www.printables.com/model/1622722) | RichardRice | CC Public Domain | 160x80 to 320x320 (cols x rows of 40 mm) | 5 mm | solid; 0.5 mm top / 0.3 mm bottom edge chamfer; slots chamfered both faces | butt joint with a decorative V-groove; alignment tool | 4 countersunk corner holes in the "dead zone"; separate **10 mm standoffs** (4 per tile); M4x40 flat-head | OpenSCAD files. |
| P23 | [Skadis wall storage tiles](https://www.printables.com/model/604797) and [hexagon-pattern tile](https://www.printables.com/model/972056) | bogust | CC BY / CC Public Domain | standard + 360x360 XL | — | solid; "Hexified" and hexagon-pattern lighter variants; "apodized" variant | tile coupler | integrated standoffs, or a no-standoff tile | "No bald spots": slot pattern carried to the edges. |
| P24 | [Mini pegboard - inspired by IKEA Skadis](https://www.printables.com/model/107719) | MonsterSmurf | CC BY | Prusa MINI bed | — | solid | — | — | — |
| P25 | [SKADIS Board for Ikea Platsa Printer Enclosure](https://www.printables.com/model/497333) | Clemi | CC BY-NC-SA | Platsa side | — | solid (from P1) | — | **hangs on the cabinet** using Platsa's existing holes; integrated spacers | furniture-specific board. |
| P26 | [Ikea Skadis pegboard for Ikea Lack enclosure](https://www.printables.com/model/482270) | JD_593935 | CC BY | 9 parts (corners, edges, middle) | — | solid | front and rear connectors + M5 bolts | direct to enclosure side or via printed distance washers | — |
| P27 | [Prusa CORE One L SKADIS Mod (Chamfered panel)](https://www.printables.com/model/1653370) | chmn | CC BY-NC | full panel (340x340 bed) or 4 quadrants | — | solid, chamfered panel and holes | quadrant split for small beds | printer enclosure side | enclosure panel. |
| P28 | [Ikea Skadis With Standoffs](https://www.printables.com/model/563220) | Ecwag | CC BY | — | — | solid | — | **standoffs merged into the board** | — |
| P29 | [Skadis Style Panel](https://www.printables.com/model/1168612) + [Skadis Corner](https://www.printables.com/model/1168604) | Callsign0 | CC BY-NC-SA / CC BY-NC | 200x200 panel + corner piece | — | solid | — | — | **corner board** companion. |
| P30 | [Parametric Skadis Board](https://www.printables.com/model/1146188) | DeckedKnight | CC BY-SA | rows x columns (OpenSCAD) | 5.5 mm | solid, 1 mm slot fillet, 8 mm corner radius | — | — | slot 5.5 mm wide (oversized). |
| P31 | [Parametric Ikea Skadis Board + SCAD-Customizer/Generator](https://www.printables.com/model/1139823) | boecko | CC Public Domain | default 248x209 | 4.5 mm | solid | — | **integrated standoffs** (`board_distance`, default 6 mm), per-corner screw offsets, skip-hole flags | `convex` and `dreieck` (triangle) variants; built on P32. |
| P32 | [Customizable Skadis Pegboard](https://www.printables.com/model/1093087) | tabicat | CC Public Domain | any (OpenSCAD) | 4.5 mm | solid | — | — | slot 4.7 x 15. |
| P33 | [IKEA Skadis V2 - Composable version](https://www.printables.com/model/369925) (+ 240x240 remix [1764237](https://www.printables.com/model/1764237)) | Clay2F | CC Public Domain | composable elements | — | solid | composable elements | — | STEP of the IKEA hole pattern; remixer advises 0.15–0.2 mm X-Y hole compensation. |
| P34 | [SkadisPanelGenerator – Fusion 360 Script](https://www.printables.com/model/1490580) | Schiewo | BSD | any | parameter | solid | — | 0/4/6/8 mounting holes, custom diameter | — |
| P35 | [Skådis Pegboard - Fillet Corners (20mm) - 5 Sizes](https://www.printables.com/model/1866103) | Jappie | CC BY-NC-SA | 80, 120, 160, 200, 240 | — | solid, 20 mm corner fillets | — | optional mounting hole for a 3.5 mm screw; separate wall mount + screw tool | — |
| P36 | [Skadis board for steel shelves](https://www.printables.com/model/830600) | Cloud7 | CC BY-NC | medium | — | **honeycomb** holes | — | bolts to steel shelving with its own M10 hardware | "less filament than original". |
| P37 | [Lightweight Skådis board](https://www.printables.com/model/1859297) | ezPappi | CC BY-NC | 100x100 to 300x200 (16 files) | — | lightweight | — | uses the EZ-install wall mounts (C-entry 611540) | — |
| P38 | [reinforced distressed vornai skadis board panel](https://www.printables.com/model/1493021) | RyanCastillo | CC Public Domain | 220x220 | 5.1 mm | **decorative Voronoi** with reinforced load paths | — | — | — |
| P39 | [SKADIS board with hearts](https://www.printables.com/model/1514294) | sfwfsdsfdfsf | CC BY-NC-SA | — | — | decorative | — | integrated clamp (0.2 mm indentation) | — |
| P40 | [Ikea Skadis for Bambu Lab build plates](https://www.printables.com/model/666774) and [Parametric SKADIS Board for Prusa Mini+](https://www.printables.com/model/363566) | Mjdinneen; Frames | CC BY-NC-SA | bed-sized boards | — | solid | — | — | Mjdinneen ships P1's .f3d; Frames credits "a SKADIS board by Will" with an editable Fusion file (inferred to be P1). Counted once. |
| P41 | [IKEA Skadis board small 200mm parametric](https://www.printables.com/model/648141) | Skully23 | CC Public Domain | 200 mm | — | solid | — | — | no description. |

Also seen on Printables but not counted as boards: [IKEA Skadis Panel](https://www.printables.com/model/1001654) (NightHawk, CC BY-NC-SA) is a reference CAD model "for reference" only; [Skadis Pegboard DIY](https://www.printables.com/model/282537) is a drilling/routing guide (8 x 28 mm slots); [LED Frame 2.0 for IKEA SKADIS](https://www.printables.com/model/656291) (Hawk7, 3,177 likes) is a lit edge frame that surrounds a board (a board-edge accessory worth noting as a possible "frame" add-on).

### 2.2 MakerWorld (every row snippet only; direct fetches returned HTTP 403)

| # | Design | Author | Licence | Size | Thick. | Face | Join | Mount | Special form; claims |
|---|---|---|---|---|---|---|---|---|---|
| M1 | [IKEA Skadis Infinity](https://makerworld.com/en/models/1309689) | AU3D | not read | "169 sizes"; board edge = 20 x (holes + 1) mm, 2–15 holes per side (60–320 mm) | — | solid | none on the board; separate [Multi Board Wall Mount](https://makerworld.com/en/models/861073) plates join boards | "integrated recess for M4 panhead screws"; [Single Wall Mount](https://makerworld.com/en/models/420877), [Screw Spacers](https://makerworld.com/en/models/418874); 20 mm clearance | even-hole boards must be **printed mirrored** so slots line up (the size formula and mirror rule were verified in vanessa/3d-skadis-planner `src/models/skadisInfinity.ts`). |
| M2 | [Infinite seamless modular skadis boards](https://makerworld.com/en/models/1708043) | Sabata | not read | 40 to 240 mm wide | — | solid | connectors with M3x10 screws, hex-nut notches on the back | separate direct-wall-mount set | "No space is wasted between the separate boards". |
| M3 | [Lightweight Infinite Skadis 240x240mm](https://makerworld.com/en/models/1741798) (+ [desktop wall](https://makerworld.com/en/models/1809267)) | zomb | not read | 240x240, 120 pack, widths 40–200 at 240 tall | 5 mm | lightweight | edge to edge | **nine mounting points** per panel | — |
| M4 | [Lightweight Classic Skadis 240x240mm](https://makerworld.com/en/models/2804159) | zomb | not read | 240x240 | — | lightweight; infill pattern visible from the front; no-holes decorative variant | — | — | — |
| M5 | [Lightweight Kumiko Skadis Pegboard Panel](https://makerworld.com/en/models/2795512) | ChillyGumbo! | not read | 240x200 full, 120x200 half | — | **Kumiko pattern based on the slots' diamond grid** | — | — | 0.2 mm layers, 2 walls, 10 % infill, no supports. |
| M6 | [Skådis Kumiko Tile – Lightweight Strength Edition](https://makerworld.com/en/models/1377008) | Lilith3dPrint | not read | 240x220 | — | Kumiko | — | — | "about 152 grams of PLA at 3 walls and 15% gyroid". |
| M7 | [Ultimate Parametric IKEA Skadis Board Perfect Fit](https://makerworld.com/en/models/2779591) | BluzXz | not read | OpenSCAD customizer | — | solid, or **Decorative Infill** file: Hexagon, Triangle, Octagon, Circle, Square, Rhombus, Star, Cross; adjustable size, wall, rotation; auto margins around slots | — | up to 4 custom mounting holes | **eight board shapes**; adjustable hole alignment. |
| M8 | [IKEA SKADIS - Board Generator](https://makerworld.com/en/models/2060457) | ShugyoPrint | not read | OpenSCAD | — | solid, chamfered edges | — | mounting holes with parametric outer diameter | measured real slots ~5.2 x 15.2. |
| M9 | [Parameterized IKEA SKADIS Pegboard](https://makerworld.com/en/models/485806) | not read | not read | width/height | parameter | solid; one user calls their generated panel "skeletonized" (Printables 978553, verified) | v2.0 "Infinite Extension Mode"; "fewer screw mode" with 16 mm bolt pitch (pitch verified via Printables [978553](https://www.printables.com/model/978553)) | corner screw holes, edge distance default 8 mm (8–12) | — |
| M10 | [Parametric IKEA SKADIS Generator for OpenSCAD](https://makerworld.com/en/models/1194912) | Tommusrhodus | not read | rows x cols | — | solid | — | corner holes | **2D mode outputs SVG for CNC**. |
| M11 | [Parametric IKEA Skadis Board Generator](https://makerworld.com/en/models/1658286) | omriklein | not read | rows x cols in the browser (Parametric Model Maker) | — | solid | — | — | — |
| M12 | [IKEA Skadis Interlocking Pegboard Generator](https://makerworld.com/en/models/2152358) ("Fully Customisable Skadis Pegboard Generator") | not read | not read | 120/160/200 panels | — | solid | **interlocking edges** + connectors | one screw in the middle option (from comments) | — |
| M13 | [Perfect IKEA SKADIS pegboard, infinitely expandable, 100% peg hole utilization](https://makerworld.com/en/models/1300763) | not read | not read | 160x160, 240x240, 200x280; multiples of 40 on request | — | solid | expandable | several methods incl. **aluminium-extrusion mounting** (~10 mm extra standoff) | every hole usable. |
| M14 | [Infinite Pegboard: Ikea Skadis Compatible Design](https://makerworld.com/en/models/448269) | ZioFester | not read | 140, 180, 220 | — | solid | **interlocking joints** | — | — |
| M15 | [IKEA Skadis 5mm Pegboard Infinitely Splicing Version](https://makerworld.com/en/models/208330) (+ A1 mini [236615](https://makerworld.com/en/models/236615)) | not read | not read | 200x200; A1-mini re-cut | 5 mm (was 4 mm) | solid | splicing | — | 4 mm version made accessories incompatible. |
| M16 | [Modular Pegboard (IKEA Skadis compatible)](https://makerworld.com/en/models/1900963) | not read | not read | 240x240 | — | — | expandable | — | — |
| M17 | [KAIZEN PEGBOARD Modular System - SKÅDIS compatible](https://makerworld.com/en/models/1750905) | not read | not read | — | — | — | modular | — | title only. |

### 2.3 Thingiverse and Cults3D (snippet only)

| # | Design | Author | Licence | Notes |
|---|---|---|---|---|
| T1 | [Printable-customized IKEA SKADIS pegboard](https://www.thingiverse.com/thing:5497195) | Wombatson | not read | title only |
| T2 | [Skadis IKEA pegboard](https://www.thingiverse.com/thing:7312153) | Khkmv | not read | replica board |
| T3 | [Printable Pegboard (IKEA Skadis-like Hole Dimension)](https://www.thingiverse.com/thing:4939659) | syahrefi | not read | small board for budget beds; rectangular and rounded-corner versions |
| T4 | [Pegboard (SKADIS) printable sections](https://www.thingiverse.com/thing:4126947) | mcooz | not read | 160 mm sections joined into a larger board |
| T5 | [Ikea Pegboard Skadis](https://www.thingiverse.com/thing:6754000) | Plastic_Diamond | not read | board + bracket, M4 bolts and drywall screws; "about 12 hours" print |
| T6 | [Modular Pegboard System (22 sizes)](https://cults3d.com/en/3d-model/home/modular-pegboard-system-3d-printable-editable-ikea-skadis-compatible-22-s) | TINKER1 | not read | 60x60 to 400x400; listing gives "5 mm hole diameter, 40 mm spacing, 5.2 mm thickness"; 3MF/F3D/STEP |
| T7 | [Printer-Friendly Ikea Skadis Boards (25 variations)](https://cults3d.com/en/3d-model/home/printer-friendly-ikea-skadis-boards-25-variations) | Erbium-68 | not read | sized for 240x240 beds; corner screw holes |
| T8 | [Ikea Skadis Extension](https://cults3d.com/en/3d-model/home/ikea-skadis-extension) | Sketch_N_Design | not read | **round** and square 200x200 extensions |

### 2.4 GitHub (verified, read through the GitHub API)

| # | Design | Licence | Notes |
|---|---|---|---|
| G1 | [RaphTronic/SkaTile](https://github.com/RaphTronic/SkaTile) | no licence file; README says "Feel free to copy, modify, publish, whatever" | STEP tiles 220x220 to 360x360 (10x10 to 17x17 slots), "11mmSkirt"/"15mmSkirt" variants with and without perimeter holes: **interlocking tiles** so not every tile needs wall screws, perimeter wall screws, M4 inserts to mount tiles back to back, the 15 mm skirt is "backlight ready". The skirt is a rear rim that sets the wall offset. |
| G2 | [sietsenefs/Ikea-Skadis-Display-Project](https://github.com/sietsenefs/Ikea-Skadis-Display-Project) | no licence file | Fusion parametric board for print and laser cut; standing desk board with printed feet. |

### 2.5 What the board survey shows (inferred)

- **Face build** falls into five kinds: solid plate (most designs); lightened lattice ("Light", P7–P9, M3–M4); ultralight beam/channel lattice (P10–P11); decorative cut-outs (Kumiko M5–M6, Voronoi P38, honeycomb P36, hexagon P23, BluzXz's 8 patterns M7, hearts P39); and "thin plate with bosses around the slots" (P13). No surveyed design is a true open frame of bars; P10 and P13 come closest.
- **Tile joins** fall into: none (single board); butt joint with a separate connector or brace (P3, P16, P19, P21-rear, M1, M2); interlocking edge geometry (tongue and groove P21, interference joints P13, interlocking M12/M14, SkaTile G1); pins (P18); and a decorative V-groove butt (P22).
- **Grid continuity across seams** is a real geometric property that designs advertise: continuous with full slots at the seam (P3 "none split or omitted", P21, P23 "no bald spots", M13 "100% peg hole utilization"); continuous via mirrored printing (M1); continuous via a half-slot on each tile edge (P19, yasg); or deliberately not continuous (hexagon tiles P4, P14).
- **Mounting** falls into: integrated standoffs (P2, P5, P14, P23, P28, P31); separate standoffs/spacers (P21, P22, M1); connectors that double as spacers (P3); hangs on furniture or enclosure (P25–P27, P36); desk stands (P18); adhesive strips (P14).
- **Special forms**: hexagon (P4, P14), triangle (P16, P31), convex (P31), corner piece (P29), round (T8), foldable (P18), enclosure panels (P25–P27), 8 outline shapes (M7).

## 3. Survey of connectors

Labels: every Printables row is (verified) through the API; every MakerWorld row is (snippet only); GitHub rows are (verified). IKEA's own connectors are in section 1.7. Licence as shown on the page.

### 3.1 Board-to-board, in plane (straight, T, cross)

| # | Design | Author | Licence | Mechanism | Key fit dimension | Notes |
|---|---|---|---|---|---|---|
| C1 | [Connector for SKÅDIS pegboards](https://www.printables.com/model/173629) | debolestis | CC Public Domain | **replica of IKEA's 404.776.46 plate**, long and a **half-size** short version | uses IKEA's corner screw and spacer positions | half part goes on the top of the upper and bottom of the lower board to remove the "small but visible bulge" the original causes; PLA and PETG tested. |
| C2 | [Horizontal and vertical Connector for SKÅDIS pegboards](https://www.printables.com/model/232068) | Timbo | CC BY-NC-SA | IKEA plate rebuilt so it works for side-by-side as well as stacked boards | as C1 | "The original connector from Ikea can only be used for a vertical connection." |
| C3 | [Ikea SKÅDIS (Skadis) board connect](https://www.printables.com/model/479180) (+ [less material remix](https://www.printables.com/model/495324)) | Bouli_599629 | CC BY-NC-SA | rear plates in "mini" (align only), "riser" and "full" (align + bear on wall) forms; for 1 board corner, 2 boards left-right, 2 boards up-down, 4 boards | **17 mm riser** fills the gap from the plate to the wall (designer's caliper measurement) | 2,639 likes; the most-liked joiner surveyed. |
| C4 | [IKEA Skadis Board Connector](https://www.printables.com/model/261400) (+ [side-by-side](https://www.printables.com/model/805013)) | rdmueller; dick | CC BY-SA | **one piece on the front and one at the back** clamping the seam | — | Tinkercad source. |
| C5 | [Skadis Boards linker](https://www.printables.com/model/306174), [v2.0](https://www.printables.com/model/375246), [SnapLock](https://www.printables.com/model/1038514) | Koprov; nivekmai | CC PD; CC BY; CC PD | **snap-in bracket through two slots** across the seam; v2 adds two 3.5x15 mm screws; SnapLock inserts from behind with a flexing lip (PETG) | "Uses holes 40 mm apart" | 999 likes for v1. |
| C6 | [IKEA Skadis Board Connector (T-Clip System)](https://www.printables.com/model/802730); [No Gap T-clip](https://www.printables.com/model/1759671); [Vertical T-clips](https://www.printables.com/model/633071) | Mike_88377; SimplyHong; Zacsquatch | CC BY-SA; CC BY-SA; CC BY-NC-SA | front plate held by separate **T-clips** pushed through the slots (3- and 5-hole versions) | T-clip variants for "painted or not" boards (i.e. thickness-dependent) | — |
| C7 | [SKÅDIS Quarter-Turn Locking Board Connectors](https://www.printables.com/model/1868175) | ArtSuzhou | CC BY-NC-SA | front plate; locking anchors through the slots, levers turned 90° | dual and quad plates; clip file named "13.2" | tool-free. |
| C8 | [ikea skadis invisible connector / alignment tool](https://www.printables.com/model/1134366) | MatteoDea | CC BY-NC | rear piece using the **original IKEA screws** (self-tapped, or M4 tap) | short and long versions "for all ro[ws]" | also aligns IKEA rails for zero gap. |
| C9 | [Connector for Skadis boards (vertical)](https://www.printables.com/model/606552) | Hoopy | CC Public Domain | spacer bar leaving a gap between boards for cables | **40 mm gap** so the grid stays on pitch across boards; 2x M4x20 countersunk | — |
| C10 | [Ikea Skadis Connector](https://www.printables.com/model/1147054) | HagenNaturstein | CC BY-NC | bolted | M5 x 20 socket head + M5 nut | — |
| C11 | [Ikea Skadis Connector](https://www.printables.com/model/1202081) | Rraudmae | CC BY-NC-SA | connector + plug | — | PETG. 110 likes. |
| C12 | [Skadis Plate connection with support](https://www.printables.com/model/460582) | DirkHoefle | CC BY-SA | **replaces IKEA's spacer ("feed")** and joins two boards, keeping the standard wall distance | 2 M4 nuts (print pause) or M4 brass inserts in 5.6 x 8.1 holes | — |
| C13 | [SKADIS plate connector and spacer](https://www.printables.com/model/495077) (+ [horizontal remix](https://www.printables.com/model/1221595)) | EdlefVanEdlefsen; Enzi | CC BY-NC | joiner + spacer, M4 nut inserted at a print pause | **60 mm hole to hole**; "thickness is exactly like the normal mounts" | joins IKEA boards to printed ones. |
| C14 | [Simple Skadis panel connector](https://www.printables.com/model/978553) | mickouji | CC BY-NC | double and quad plates + single nut | for MakerWorld 485806 boards: **16 mm bolt pitch** ("similar connectors ... are 20mm pitch") | shows that each board generator's corner-hole layout needs its own connector. |
| C15 | [Skadis Panel Connector - 2 panels](https://www.printables.com/model/1456418) / [4 panels](https://www.printables.com/model/1456436) | HighDesertHacker | CC BY-SA | rear brackets on corner M3 holes; middle M3 hole takes a standoff | M3 | one standoff supports 2 or 4 panels. |
| C16 | [Light Skadis connectors](https://www.printables.com/model/1045621) | EvaNina | CC BY-NC-SA | horizontal and vertical connectors for the lattice board P7 | tight fit | "don't block the holes as much". |
| C17 | [Threaded Connector for IKEA SKÅDIS Infinity](https://www.printables.com/model/1371785) | foprel | CC Public Domain | remix of AU3D's Multi Board Wall Mount with integrated threads; 2x and 4x versions | M4 x 10 countersunk; central wall-screw hole | for M1. |
| C18 | [4 corners connector for ikea skadis](https://www.printables.com/model/1351149) | LeneViolaVil | CC BY-NC-SA | cross joint where four boards meet | — | OBJ only. |
| C19 | [Skadis Desk Mount Board Connector](https://www.printables.com/model/1062451) | KnoppersDE | CC BY-NC-SA | joins two boards within the THL_94116 desk-mount system | "nogap" and "midpart" versions | — |
| C20 | [skadis panel aligner](https://www.printables.com/model/737999) | OveRmak | CC BY-NC | straightens bent IKEA panels so they align | — | — |
| C21 | [Skadis Multi Board Wall Mount](https://makerworld.com/en/models/861073) | AU3D | not read | wall plate joining board corners | for boards with integrated M4 holes; 20 mm clearance; 18 mm variant "for the connector plates" | (snippet only) |
| C22 | [Skadis Wall Spacer Connector Kit](https://makerworld.com/en/models/1402872) | Lilith3dPrint | not read | single-corner, 2-point inline, 3-point hub, 4-point grid; sandwich the boards | spacer rings for M4x25 and M4x30 bolts | (snippet only) |
| — | Edge joins built into boards | — | — | braces (P19), tongue & groove (P21), press-fit connectors (P3), pins (P18), interlocking (M12, M14, G1) | — | see section 2 |

### 3.2 Corner connectors (boards at an angle)

| # | Design | Author | Licence | Angle and mechanism | Key fit dimension | Notes |
|---|---|---|---|---|---|---|
| K1 | [IKEA Skadis L corner connector](https://www.printables.com/model/666847) | OleksiiZelivianskyi | CC BY-NC | 90°, top front/back + bottom pieces, styled like IKEA's mounts | uses the screws supplied with the board; nut pockets | lets one IKEA desk-clamp set hold two boards at 90°. |
| K2 | [SKADIS L-Corner connector](https://www.printables.com/model/585019) | jcintra | CC BY-SA | 90°, no screws | — | desktop pair of boards. |
| K3 | [Yet Another Right Angle IKEA Skadis Connector](https://www.printables.com/model/725135); source [AnthonyZ71/yara-skadis](https://github.com/AnthonyZ71/yara-skadis) | AnthonyZ71 | CC BY-NC (GitHub: GPL-3.0) | 90°, flush corner, bolted | M3 x 16 bolt; washer sized to a 17 mm hex socket | — |
| K4 | [Ikea Skadis Corner Connector](https://www.printables.com/model/1149510) | HagenNaturstein | CC BY-NC | 90°, bolted | M5 x 20 + M5 nut | — |
| K5 | [IKEA Skadis Board 90° Connector (T-Clip System)](https://www.printables.com/model/802746) | Mike_88377 | CC BY-SA | 90°, T-clips | **30 mm from corner to the first hole centre**; 1- and 2-hole | — |
| K6 | [Ikea Skadis small corner connector](https://www.printables.com/model/1711175) | KarelPesorna | CC BY-NC | corner | — | no description. |
| K7 | [135 degree skadis connector](https://www.printables.com/model/1863529) | willliu | CC BY | **135°** | — | "shows at the front ... a bit shaky" (designer). |
| K8 | [Ikea Skadis desk mount and connector](https://www.printables.com/model/1101205) | Fabian | CC BY-NC | 90° corner of two boards, lower part screws down to a surface | 4 mm holes; original IKEA screws; IKEA spacer sets geometry | — |
| K9 | [Ikea Skadis corner connector when used angled 90 degrees](https://makerworld.com/en/models/91135) | de.tom | not read | 90° L-part, two screws | — | (snippet only) |
| K10 | [Skadis – Corner Connector](https://makerworld.com/en/models/856960) | honza | not read | 90°, reinforced, "almost no gap"; needs supports | — | (snippet only) |
| K11 | [Skadis Corner Bracket](https://makerworld.com/en/models/524919) | not read | not read | title only | — | (snippet only) |

No connector described as an outside-corner (convex) joiner was found by name, and no connector with an adjustable angle was found; the fixed angles seen are 90° and 135°.

### 3.3 Board-to-wall spacers and standoffs

| # | Design | Author | Licence | Mechanism | Key fit dimension | Notes |
|---|---|---|---|---|---|---|
| W1 | [Ikea Skadis Spacer](https://www.printables.com/model/137742) | jcq | CC Public Domain | replacement spacer, printable thread or pressed M4 nut | **24 mm**; "The original spacer is 20mm long" | community measurement of IKEA's spacer. 711 likes. |
| W2 | [IKEA Skadis Wall Mount](https://www.printables.com/model/242490) | JonasTae | CC BY-NC | screw-through mount | wall screw up to 6 mm diameter, 30 mm or longer | 2,900 likes. |
| W3 | [IKEA SKÅDIS wall mount screw adapter](https://www.printables.com/model/135908) (+ [copy with spacers](https://www.printables.com/model/241430)) | Kilian; midego | CC BY; CC PD | adapter seated in a slot, optional stacked spacer | **5 mm max screw**, "limited by the width of the holes" | print at 100 % infill. |
| W4 | [IKEA SKADIS Wall Mount (3M Command)](https://www.printables.com/model/319941) | DaHouzKat | CC BY-NC-SA | adhesive strips | 10 or 20 mm plates | screwless. |
| W5 | [IKEA Skadis Spacer](https://www.printables.com/model/622686) | 3DMorris | CC BY-NC | screwless push-in spacer | 20 mm body + 5 mm peg = 25 mm; "gap of 20mm ... to the wall" | — |
| W6 | [IKEA Skadis Wall Mount - Multiple Spacers](https://www.printables.com/model/514773) | winkelchri | CC BY | spacer + screw head + cap | 10, 12, 20 mm | for tight cabinets. |
| W7 | [IKEA Skadis Wall Mount - EZ Install](https://www.printables.com/model/611540) | MKEDan | CC BY-NC | spacer locks into the board during install; washer + cap | US No. 8 and No. 10 flat-head screws (about 4.2 and 4.8 mm shank) | — |
| W8 | [The Adjustable Skadis Spacer](https://www.printables.com/model/504132) | ed3d | CC BY-NC-SA | stackable segments + knob | 6 mm segments (file names) | — |
| W9 | [Skadis Tesa Powerstrips Tape Wall Mount](https://www.printables.com/model/536629) | capze | CC BY-NC-SA | hooks into slots, adhesive pad on back; parametric F3D | 21 mm (single tape) or 42 mm wide, 50 mm long; 7 or 10 mm deep | — |
| W10 | [Skadis Wall Mount Spacer For Command Strips](https://www.printables.com/model/488974) | stefanwest | CC BY | spacer with rear clearance for hooks | — | — |
| W11 | [IKEA SKADIS standoff with parametric height](https://www.printables.com/model/982448) | ericyeargan | CC BY | Fusion parameter `AdditionalHeight` | 0 gives "the standard 20mm height" | — |
| W12 | [Skadis Panel Standoffs](https://www.printables.com/model/1456507) | HighDesertHacker | CC BY-SA | pad-mount standoff, M3 | face at **27.5 mm** from wall; 10 mm felt pad recess | — |
| W13 | [SKADIS (DIRECT) WALL MOUNT](https://www.printables.com/model/704005) | TJJ | CC BY-NC | direct mount instead of IKEA's rail; extra mid supports | full and **8 mm half-height** | — |
| W14 | [Round Wall Spacer](https://www.printables.com/model/1478543) | lighthouse | CC BY-NC | fits into a slot, flush with the face | — | anti-flex support. |
| W15 | [Skadis Standoff](https://www.printables.com/model/881018) | CurtisAdams | GPL-3.0 | simple standoff | **10 mm** | — |
| W16 | [Adjustable Wall Spacer for IKEA Skadis](https://makerworld.com/en/models/943688) | yoHasse | not read | three-part adjustable, M4 | — | (snippet only) |
| W17 | [IKEA SKÅDIS Drywall Mount Set](https://makerworld.com/en/models/2305419) | commojun | not read | thin push pins | 10 or 20 mm offset | (snippet only) |
| W18 | [SKÅDIS no-drill wall mounting connectors](https://makerworld.com/en/models/3104361) | not read | not read | construction adhesive; straight, L, diagonal, four-corner layouts | 3 x 10 mm countersunk screws | (snippet only) |
| W19 | AU3D [Single Wall Mount](https://makerworld.com/en/models/420877), [Screw Spacers](https://makerworld.com/en/models/418874) | AU3D | not read | for M1 boards | — | (snippet only, links verified in vanessa/3d-skadis-planner README) |

### 3.4 Board-to-furniture

| # | Design | Author | Licence | Furniture and mechanism | Key fit dimension | Notes |
|---|---|---|---|---|---|---|
| F1 | [IKEA SKADIS invisible desk mount / table clamp](https://www.printables.com/model/1561135) | bensen | CC BY-NC-SA | desk clamp, board flush to the desk, invisible from the front | tops **up to 36 mm**; M5 screws 10–36 mm | 667 likes. |
| F2 | [ikea skadis pegboard desk clamp](https://www.printables.com/model/420636) | Silverbeast | CC BY | desk clamp | for **3 mm** boards (MAQUINA P6) | 531 likes. |
| F3 | [IKEA SKADIS stand with clamp](https://www.printables.com/model/304752) (+ [heavy duty](https://www.printables.com/model/463213)) | ChippWalters; DanielG | CC BY; CC BY-SA | feet that hook into a printed clamp | "Should work with any size of SKADIS" | heavy-duty adds ribs. |
| F4 | [Skadis Table Clamp (Long)](https://www.printables.com/model/308905) | aspoon | CC BY | printed G-clamp | M5 x 20 flat-head + M5 nut to the board | remix of a pegboard table clamp. |
| F5 | [Skadis Desk Clamp (Universal Clamp with Snap Fit)](https://www.printables.com/model/643451) | Lozagon1234 | CC BY-NC | clamp with snap-fit add-ons | 50 mm desk; STEP for other sizes | — |
| F6 | [Skadis Desktop Pegboard Clamp Half-Size 66mm](https://www.printables.com/model/1655122) | GetLife | CC BY-NC | single centred clamp | 66 mm wide, worktops to 60 mm, 48 mm screw | "01hr 58m", "44g". |
| F7 | [Ikea SKÅDIS pegboard screw in desk mount](https://www.printables.com/model/241060) | THL_94116 | CC BY-NC-SA | screwed to desk | — | title read only. |
| F8 | [SKADIS - IVAR Connector](https://www.printables.com/model/299751) (+ [IVAR corner post](https://www.printables.com/model/433993)) | Ulysse; blunaowl | CC BY-NC-SA | hangs on IVAR uprights with IVAR pins | 4 bolts | corner posts have a different profile. |
| F9 | [SKADIS pegboard corner plates for BROR](https://www.printables.com/model/1298747); [BROR to SKADIS mounting plate](https://www.printables.com/model/465198) | jimmyd; HexagonIndustries | CC BY-SA; CC BY-NC | plates bolted to BROR shelving | M5 x 16 into BROR square-nut slots; 55 cm to 56 cm and 40 cm to 36 cm versions | — |
| F10 | [SKALLAX-DIS](https://www.printables.com/model/324486) | Ruxi | GPL-2.0 | hangs a board on the side of a KALLAX, no drilling | optional 4 M4 nuts | 2 top + 2 side mounts. |
| F11 | [SKÅDIS RÅSKOG Clamp](https://www.printables.com/model/814112) | BrownMuffin | CC BY-NC-SA | clamps to a RÅSKOG trolley | 6x M3 x 40 + heat inserts per 36x56 board | — |
| F12 | [Ikea Flisat toddler table connector](https://www.printables.com/model/919240) | Koray | CC BY-NC | friction fit to the table, clicks into the board | — | — |
| F13 | [Platsa to Skadis connector](https://www.printables.com/model/1320486) | Upside3048 | CC BY-NC-SA | screws into PLATSA's top/bottom M8 nuts | M8 x 12; original IKEA screws or M4 x 16 to the board | printed alternative to IKEA 104.776.43. |
| F14 | [Hang any IKEA Skadis Peg Board on a 4mm Thick panel](https://www.printables.com/model/729975) | AFARProducti | CC BY-SA | hanger with T-clip for a 4 mm enclosure panel (Bambu P1P) | 4 mm panel | — |
| F15 | [mhuot/skadis-bench-frame-mount](https://github.com/mhuot/skadis-bench-frame-mount) | mhuot | MIT (GitHub) | brackets hang a board on the slotted uprights of a steel bench frame | — | (verified: repo description) |
| F16 | Desk clamp stand copy on MakerWorld ([40989](https://makerworld.com/en/models/40989)) | — | not read | as F3 | — | (snippet only) |

**"Connector for ALEX":** no IKEA part and no printed part by that name was found (section 1.7). The nearest IKEA parts are the desk connector 103.207.89 and the wardrobe connector 104.776.43.

**Out of scope but adjacent:** accessory-mounting systems that sit in the slots, such as [Skadis T-Nuts](https://www.printables.com/model/228663) (6d6178, CC BY) and [SUMS](https://www.printables.com/model/1337207) (delederman, CC BY-NC), are not board connectors; they matter only because their engagement depths (T-nut: 4 mm into the slot, 7.4 mm tall) set the clearance a printed board must leave behind each slot.

### 3.5 What the connector survey shows (inferred)

- Nearly every printed joiner keys to one of three references: **the slots themselves** (C5, C6, C7: clips or brackets through two slots, usually 40 mm apart), **the board's corner mounting holes** (C1, C2, C8, C12–C15: depends on each board family's corner-hole layout, e.g. 16 mm vs 20 mm pitch), or **edge geometry built into the board** (section 2).
- Spacer length clusters at **20 mm** (IKEA's, and copies W5, W11), with shorter **8–12 mm** and **10 mm** options for tight spaces and longer **24–27.5 mm** ones for uneven walls or extra hook room.
- Furniture connectors are each tied to one product's geometry (IVAR pins, KALLAX side, BROR nut slots, PLATSA M8 nuts, RÅSKOG rim, desk thickness ranges), so they are a long tail rather than a type.

## 4. Proposed taxonomy and prior-art generators

Everything in this section is (inferred) from sections 1–3 unless a source is cited.

### 4.1 Recommendation: an axis model, not a flat list of board types

**Recommended model: a board is one choice on each of five independent axes; connectors are five separate part types.** Face pattern, edge join and mounting are three of the axes, as the brief suggested; the evidence adds two more that are geometry, not decoration: the **outline** and the **grid registration** (how the slot grid sits against the edges, which decides whether tiles can be combined).

Why axes rather than a flat list: the surveyed designs combine these choices freely, so a flat list would multiply out. Examples of independent variation, all from section 2:

- Solid face + integrated 20 mm standoffs + no join (P2); solid face + integrated 25 mm standoffs (P5); solid face + tongue-and-groove join + separate 27.5 mm standoffs (P21).
- Ultralight beam face + separate u-connector (P10); the same face + a standoff-height parameter (P11).
- Solid tiles + press-fit connectors that are also the 20 mm wall spacers (P3).
- Hexagon outline + per-tile symmetric grid that does not align + rear spacer or adhesive strips (P14), versus hexagon outline + joining connector (P4).
- Lattice face + solid skin (P8) or + reinforcing ribs and rear bumps (P9): face variants of one board.

A flat list would also hide the one compatibility rule users hit most: two tiles combine only if they share a grid registration and a join (P17's author notes two generators' grids "have different disposition of the hole matrix respect to the borders"; C14 exists because 485806 boards use a 16 mm corner-hole pitch where other connectors assume 20 mm).

### 4.2 The board axes

**Fixed for every board (the SKÅDIS standard, section 1):** slot 5 x 15 mm stadium (R 2.5), vertical; 40 x 40 mm lattice plus a centred second lattice (20 mm stagger in X and Y). Expose as tolerances only: slot width/height offset (sources range 4.7 to 5.5 wide; real boards measured ~5.2 x 15.2), slot edge chamfer or fillet (1 mm fillet per 6d6178; 0.5 mm chamfers in P22), board thickness (default 5; sources 3, 4.5, 5, 5.1, 5.2, 5.5; accessory-fit window about 4 to 5.5).

| Axis | Values seen in the survey | Designs | Parameters |
|---|---|---|---|
| **A. Outline** | rectangle with corner radius (default; 8 or 10 mm radius in code, 20 mm in P35); hexagon; triangle; convex/round; corner piece; enclosure-specific panel | rectangle: most; hexagon P4, P14, M7, Pegboard Studio; triangle P16, P31; convex/round P31, T8, M7; corner P29; enclosure P25–P27 | width, height (snap to 20 or 40 mm steps or free), corner radius, shape, IKEA presets 360/560/760 x 560, printer-bed presets |
| **B. Face construction** (what fills the webs between slots) | **B1 solid**; **B2 through-cut lattice** (pockets cut between slots, a rim kept round each slot; pattern may be geometric or decorative); **B3 stepped relief** (plate thinned between slots, full-thickness rims round slots and edges, or a lattice with a skin, or added ribs); **B4 beam/channel skeleton** (thin walls with I/H cross-sections, mostly open) | B1: P1–P6, P15–P35, M1, M8–M15; B2: P7, P36, P37, P38, P39, P23 hex variants, M3, M4, M5, M6, M7 decorative infill; B3: P8, P9, P13; B4: P10, P11 | rim width round each slot, web/rib width, pocket pattern (diamond-grid, hexagon, Kumiko, Voronoi, plus BluzXz's 8 shapes), pattern scale/rotation, skin on/off and skin thickness, rib depth, flange width |
| **C. Grid registration** (where the slot grid sits relative to the edges) | **C1 standalone**: symmetric margins (20 mm in code defaults), like an IKEA board; note IKEA boards hung by IKEA's instructions are not grid-continuous across seams (5 mm gap, section 1.3); **C2 tileable, full slots**: tile size a multiple of 40 mm and grid phase chosen so seams fall between slots, every slot whole (P3, P21, P23, M13); **C3 tileable, shared half-slot**: each edge carries half a slot and two tiles make one slot (P19/P20, yasg width ≡ 20 mod 40); **C4 tileable by mirroring**: one file, even-count boards printed mirrored (M1, AU3D rule size = 20 x (holes + 1)); **C5 non-aligned**: grid centred per tile, does not continue across tiles (P4, P14) | as listed | margin X/Y, grid phase (which lattice starts at the corner), tile pitch multiple, half-slot edges on/off per edge, mirror flag |
| **D. Edge join** (tile to tile) | **D0 none**; **D1 integral interlock** (tongue and groove P21; interference joints P13; interlocking M12, M14, G1; dovetail/puzzle shapes are named in search results but no page with a dovetail was read); **D2 pins/hinge** (P18 T-pins and tooth pins); **D3 butt + separate joiner** (connector types CN1–CN2 below; braces P19; press-fit connectors P3; rear brackets P21/C15); **D4 butt + cosmetic V-groove**, relies on each tile's own wall screws (P22) | as listed | join type per edge, clearance (designers report 0 to 0.2 mm and 99 % scaling), joiner hole pitch (16 or 20 mm seen), which edges get the feature (outer edges plain: P20's smooth-edge pieces) |
| **E. Mounting** | **E0 flat back** (external mounts or IKEA hardware); **E1 integrated standoffs** at screw holes (heights 6, 10, 20, 25 mm seen; countersunk or counterbored screw seats; P2, P5, P14, P23, P28, P31; P11 parametric); **E2 holes for separate spacers** (IKEA-compatible corner holes so the IKEA rail, spacers and 404.776.46 plate still fit; M4 recesses M1; M3 holes P21); **E3 joiners that double as spacers** (P3, C12, C21, C22); **E4 adhesive pads** (P14 Command strips; W4, W9, W10, W18); **E5 hangs on furniture/enclosure** (P25–P27, P36; F-entries); **E6 stands/feet for a desk** (P18; IKEA freestanding board; F3) | as listed | hole count and positions (4 corners / 6 / 8 / custom; "dead zone" placement that frees slots), screw size and seat type, standoff height and diameter, keyhole vs round vs slotted holes (Pegboard Studio), rear hook-clearance check |

### 4.3 If a flat list is wanted: the smallest set of distinct board types

Collapsing the axes to the combinations that actually occur gives **five board types**. Size, colour and the decorative pattern within a face type do not create a new type.

| Type | One-line definition | Surveyed designs | What varies it |
|---|---|---|---|
| **BT1 Standalone solid board** | full-thickness plate, symmetric margins, used alone | P1, P2, P5, P6, P15, P24, P28, P30–P35, P41, M8–M11, T1–T3, T5, T7 | size/outline, thickness, margin, mounting (E0–E6) |
| **BT2 Lightened board** | plate whose webs between slots are cut, thinned or ribbed, keeping a rim round every slot | P7–P9, P12, P13, P36–P39, P23 variants, M3–M7 | face construction B2/B3, pattern and its scale, rim and web width, skin; plus all BT1 parameters |
| **BT3 Skeleton (beam/channel) board** | mostly open network of thin I/H-section walls carrying the slot rims, not a plate | P10, P11 | rib grid, wall thickness, flange width, depth, standoff height |
| **BT4 Tileable board system** | any of BT1–BT3 designed to be joined into one larger surface, as positional tiles or one repeatable tile; most keep the grid continuous across seams (P17 is a counter-example) | P3, P16, P17, P19–P22, P26, P27, M1–M3, M12–M16, T4, T6, G1 | registration (C2/C3/C4), edge join (D1–D4), positional tiles (corner/edge/centre), bed-size split |
| **BT5 Shaped or non-aligned tile** | outline other than a rectangle, grid centred per tile, not meant to carry accessories across tiles | P4, P14, P29, T8, M7 shape options, P31 triangle/convex | outline shape, tile size, join (often D3 or none), mounting |

And **five connector types** (section 3), each a separate part a generator could emit:

| Type | Definition | Surveyed designs | Key parameters |
|---|---|---|---|
| **CN1 Corner-hole joiner plate** | flat plate behind (or in front of) a seam, fixed through the boards' corner mounting holes; straight, T, cross, single-corner | IKEA 404.776.46; C1, C2, C3, C8, C10–C15, C17–C19, C21 | hole pitch across the seam (board family dependent), plate thickness (riser to the wall 17 mm in C3), screw/nut/insert type, half-size end piece (C1) |
| **CN2 Slot-keyed joiner** | bracket that locks into slots on both sides of a seam, no extra holes needed | C5, C6, C7, C9, C16 | slot pitch spanned (40 mm), clip type (snap, T-clip, quarter-turn), board thickness/tolerance, gap between boards (0 or 40 mm C9) |
| **CN3 Angle joiner** | joins two boards at a fixed angle | K1–K11 | angle (90° and 135° seen), inside/outside, offset from corner to first hole (30 mm in K5), fastener |
| **CN4 Standoff / spacer** | separates a board from the wall, screwed, push-in or adhesive | IKEA spacer (20 mm); W1–W19 | height (8–27.5 mm seen; 20 standard), screw diameter (max 5 mm through a slot), seat type, push-in peg, adhesive pad size, adjustable stack |
| **CN5 Desk clamp / stand** | holds a board upright on a desk edge | IKEA 103.207.89 (1–25 and 25–50 mm); F1–F6, F16 | desk thickness range, clamp screw length, flush vs behind the desk edge, board thickness (3 mm boards need their own clamp) |

Furniture adapters (IVAR, BROR, KALLAX, PLATSA, RÅSKOG, FLISAT, bench frames: F8–F15) are each tied to one product's geometry. They are a long tail rather than a type, and I recommend leaving them out of the generator's first scope.

### 4.4 Existing parametric generators (prior art)

| Generator | Platform | What it covers | Licence | Label |
|---|---|---|---|---|
| [Parametric SKADIS Board Generator](https://www.printables.com/model/206256) (LineArcLine) | OnShape (current) and Fusion 360 (old) | rectangle, columns/rows, side/top spacing, thickness, fillets, hole start pattern, DXF export | CC BY-NC-SA | (verified) |
| [Skadis Pegboard, all sizes 80 to 360mm](https://www.printables.com/model/1473739) (RobertG) | Fusion 360 | size + integrated 20 mm standoffs + countersunk holes | CC Public Domain | (verified) |
| [Ultra Light SKÅDIS Board - Parametric](https://www.printables.com/model/1812712) (crashingtardis) | Fusion 360 | the ultralight skeleton in 40 mm steps + standoff height | CC BY-NC-SA | (verified) |
| [Customizable Skadis Pegboard](https://www.printables.com/model/1093087) (tabicat) and [boecko's generator](https://www.printables.com/model/1139823) | OpenSCAD (boecko needs BOSL) | tabicat: size, thickness, radius, slot size, pitch, stagger; boecko adds integrated standoffs, per-corner offsets, skipped holes, convex and triangle variants | CC Public Domain | (verified, SCAD read) |
| [Parametric Skadis Board](https://www.printables.com/model/1146188) (DeckedKnight) | OpenSCAD | rows x columns, slot width, thickness, fillets | CC BY-SA | (verified, SCAD read) |
| [Infinity Skadis Compatible Board](https://www.printables.com/model/1622722) (RichardRice) | OpenSCAD | tileable tiles, chamfers, countersunk corner holes, standoffs | CC Public Domain | (verified, description) |
| [Modular Peggy Panel](https://www.printables.com/model/19442) (AsraffAmzani) | OpenSCAD | modular panel, countersinks, movable slot field, braces | CC BY | (verified, description) |
| [SkadisPanelGenerator](https://www.printables.com/model/1490580) (Schiewo) | Fusion 360 script | size, thickness, rounded corners, 0/4/6/8 mounting holes | BSD | (verified) |
| [Parametric Skadis Panel](https://www.printables.com/model/1615966) (_333804) | Solidworks 2022+ | 2x1 to 4x4 panels | GPL-3.0 | (verified) |
| MakerWorld Parametric Model Maker generators: [BluzXz 2779591](https://makerworld.com/en/models/2779591), [ShugyoPrint 2060457](https://makerworld.com/en/models/2060457), [485806](https://makerworld.com/en/models/485806), [Tommusrhodus 1194912](https://makerworld.com/en/models/1194912), [omriklein 1658286](https://makerworld.com/en/models/1658286), [interlocking generator 2152358](https://makerworld.com/en/models/2152358) | OpenSCAD in the browser | BluzXz: 8 outlines, hole alignment, 4 mounting holes, decorative infill with 8 patterns and safe margins; ShugyoPrint: mounting holes, chamfers; 485806: infinite-extension and fewer-screw modes; Tommusrhodus: rows/cols, corner holes, 2D SVG for CNC; 2152358: interlocking panels + connectors | not read | (snippet only) |
| [soloh4cker/skadis_pegboard_studio](https://github.com/soloh4cker/skadis_pegboard_studio) ("Pegboard Studio 1.0.1") | single-file offline web app (manifold-based) | **closest prior art to the planned tool**: outlines rectangle/rounded/oval/hexagon; 6 hole shapes incl. SKÅDIS slot preset (5 x 15, 40/20, stagger, 5 mm); screw mounts round/slot/keyhole with counterbore or countersink; "rear clearance" integrated spacers; tiles a board to a printer bed with seam margins; rejects webs under 1.2 mm; fit-test coupon; STL/3MF export. README notes "the original IKEA board's surface recesses are not modeled." No lattice/lightening and no edge joins. | no licence file (all rights reserved by default) | (verified) |
| [thetorminal/skraeddar](https://github.com/thetorminal/skraeddar) ([skraedda.torminal.com](https://skraedda.torminal.com)) | web (React + three.js) | width, height, thickness, optional mounting holes; constants 5 x 15, 40/20, margin 20, radius 8 | no licence file | (verified) |
| [idlerus/skadis_generator](https://github.com/idlerus/skadis_generator) | web (three.js + CSG) | size, cut grid into tiles, clearance near cuts, STL | no licence file | (verified) |
| [ciawhatsthat/yasg](https://github.com/ciawhatsthat/yasg) | web | laser-cut panel planning for a wall, **continuous grid across seams with half-slot notches**, DXF/SVG | MIT | (verified) |
| [colin2014/skadis-cut-studio](https://github.com/colin2014/skadis-cut-studio) | web | laser-cut boards, centred grid, through-drilled standoff hardware, washer STLs | no licence file | (verified) |
| [brandonstephens/skadis-generator](https://github.com/brandonstephens/skadis-generator) | web | Shaper Origin SVG + cut plan; IKEA presets; thickness-fit warnings | no licence file | (verified) |
| [EmilBjorn/Skadis-generator](https://github.com/EmilBjorn/Skadis-generator); [Benj4865 SVG generator](https://github.com/Benj4865/Skadis-Pegboard_SVG_Generator) | Python | 2D SVG/PDF boards | none; CC0 | (verified) |
| [vanessa/3d-skadis-planner](https://github.com/vanessa/3d-skadis-planner) ([skadis.vcfb.me](https://skadis.vcfb.me)) | web | plans which AU3D Infinity boards to print for a wall; extensible `BoardModel` registry | no licence file | (verified) |
| [nmattia/skapa](https://github.com/nmattia/skapa) ([skapa.build](https://skapa.build)) | web (manifold) | accessories (boxes with clips), not boards; useful clip geometry | no licence detected by the GitHub API | (verified) |
| Autodesk Fusion "Skadis Generator" add-ins ([1](https://marketplace.autodesk.com/apps/d067959c-6906-4a6d-833c-7f8f602d7d58), [2](https://marketplace.autodesk.com/apps/880f2e71-a0b1-41ec-b148-294452d2419c)) | Fusion add-in, paid (USD 4.99 per snippet) | hooks and receiving holes on a 40 mm grid with 20 mm stagger | commercial | (snippet only) |
| [Hole grid / pegboard generator](https://www.thingiverse.com/thing:3926282) (dementedmonkeyhorde); [franpoli ikea_skadis.scad](https://github.com/franpoli/OpenSCADutil) | OpenSCAD | generic round-hole pegboard library; franpoli is an accessory library (peg width 5, peg thickness 4.6, pitch 40, tolerance 0.6) | not read; GPL-3.0 | (snippet only); (verified) |
| [Parametric MultiBoard Generator](https://makerworld.com/en/models/2238855) | OpenSCAD | not SKÅDIS: a sibling pegboard system's generator offering **butt or overlap joints with a tunable overlap tolerance**, i.e. the edge-join axis already exposed as a parameter elsewhere | not read | (snippet only) |

**Gaps in the prior art** (inferred): no surveyed generator combines a lightened or skeleton face with tileable registration, edge joins and integrated standoffs in one tool. BluzXz (M7) has decorative infill but no joins; Pegboard Studio has tiling and mounts but no lattice; crashingtardis (P11) has the skeleton but only in Fusion and only one join. Connector generation is absent from every board generator surveyed; connectors exist only as fixed STLs tied to one board family.

**Licensing note for a clean-room generator** (inferred, not legal advice): the dimensions in section 1 are facts and free to use. Many board designs carry NonCommercial or NoDerivatives terms (P3 and P13 are NoDerivatives), so their geometry should be re-derived, not copied. Public-domain or permissive sources that could be read directly: tabicat and boecko SCAD, RichardRice, RobertG (all labelled "Creative Commons — Public Domain" on Printables), yasg (MIT), Schiewo (BSD), Benj4865 (CC0-1.0 on GitHub). GitHub repos with no licence file (Pegboard Studio, skraeddar, skapa and others above) are all rights reserved by default.

### 4.5 Decisions the generator design will need (for the owner; not asked of anyone yet)

- Default slot size: nominal 5 x 15 (IKEA-nominal, most code) or a measured-fit 5.2 x 15.2 (MakerWorld 2060457), with a tolerance offset either way.
- Default grid registration for tiles: C2 (whole slots, seams between slots) is what the best-liked tile systems use; C3 (half-slots) halves the seam gap but makes every edge fragile.
- Whether IKEA hardware compatibility (corner holes that accept the IKEA rail, spacers and 404.776.46 plate) is a requirement; IKEA's hole positions are not dimensioned in any source read, so they would need a measurement from a real board. A real-board measurement would also settle the edge margin (20 mm assumed) and the 5 mm seam gap inferred in section 1.3.
- Whether printed tiles should be able to sit next to IKEA boards with the grid continuous; by the section 1.3 arithmetic that needs zero gap and a 20 mm margin on the IKEA side, and still loses one slot column at the seam.
- Whether furniture adapters are in or out of scope (recommendation above: out).

## 5. MakerWorld rows read in a browser (12 Oct 2026, after the report)

MakerWorld refuses plain fetches, so these were opened in a browser and read on the page. Each is now (verified).

| Model | What the page says | Licence shown |
|---|---|---|
| [IKEA SKADIS Light 240x240](https://makerworld.com/en/models/1345965) (Helder Rossa) | "ultra-lightweight", 74 g of filament; expandable, "no wasted holes"; **includes 7 mm spacers**; the gallery shows each slot inside an oval rim, the rims joined by short struts into an open lattice. 179 reviews | MakerWorld Exclusive License |
| [Light Weight SKADIS IKEA](https://makerworld.com/en/models/58396) (Gabb.99) | 200 x 200 mm panel in a **Voronoi** lattice, 70-80 g; "Infinite" tiling version; a corner-hole edition; a **4-pin snap-interlock joint** through dedicated corner holes, no screws. 21.1 k downloads, 1 902 reviews | Standard Digital File License; selling prints needs the designer's membership |
| [IKEA SKADIS - Board Generator](https://makerworld.com/en/models/2060457) (ShugyoPrint) | OpenSCAD on MakerWorld's Parametric Model Maker, **13 150 customizations**; "Officially, SKADIS holes are 5 mm wide. In practice, I measured about 5.2 mm", and 15.2 mm for the height; states 5 mm thickness, **10 mm corner radius** and 40 mm hole distance as official; half holes on chosen edges, checkered on/off, numbered board patterns, mounting holes with standoffs; a 1-hole "Settings Sample" profile; a newer [V2](https://makerworld.com/en/models/3010212) exists | Standard Digital File License |
| [IKEA Skadis 5mm Pegboard Infinitely Splicing Version](https://makerworld.com/en/models/208330) | update log of 2024-03-07: "Increased thickness from 4 mm to 5 mm" | CC BY-NC-SA |
