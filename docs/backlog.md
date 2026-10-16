# Backlog

Every piece of work the decisions in [`status.md`](status.md) call for, ordered by priority and
then by expected ease. **Approved 12 Oct 2026** (A19). Priorities and ease are
estimates (inferred), not measurements. Each row names the decision it comes from, so a changed
decision shows which rows move.

## The first version (D16)

**Released as `v0.1.0` on 12 Oct 2026**: every P0 row below is done. Nothing in it has been test-printed yet.

> A user opens the page, chooses a solid SKÅDIS board, sets its size and thickness, sees it in
> 3D and downloads an STL that prints, with every check passing.

It proves the whole path once: the geometry in TypeScript on Manifold (D2), the page, the
preview, the download and the checks. Every later row adds a board, a connector or an option to
that path. None needs the path rebuilt.

## How to read the table

- **Priority**: P0 is the first version (`v0.1.0`), P1 the next releases, P2 planned, P3 maybe
  later.
- **Ease**: **S** one self-contained piece with its tests; **M** several parts, a new area of
  the page, or a shape tuned by a test print; **L** a subsystem of its own, several rounds of
  test prints, or a specification to verify first; **XL** open-ended.
- **Print**: the fit is only settled by a test print, which is the owner's step on his own
  printer. Until then, fit is checked only by geometry tests.
- **Spec**: depends on a third party's dimensions (the SKÅDIS grid, IKEA's holes, a bed size),
  taken from a cited source and marked `<<CONFIRM>>` until measured (Q3).

## Items

| Key | Item | Priority | Ease | Depends on | From | Print | Spec | What makes the estimate uncertain |
|---|---|---|---|---|---|---|---|---|
| `repo-bootstrap` | **Done 12 Oct 2026.** Git, identity, the hooks from the convention kit, licences and REUSE, `README.md`, `CLAUDE.md`, `PROJECT.yml`, `.repo-status`, scad-tools as a submodule for its STL checks (C31), pushed to Gitea | P0 | S | | D2, D7, D8 | | | None |
| `skadis-standard` | **Done 12 Oct 2026.** [`skadis-standard.md`](skadis-standard.md) reviewed; the survey read in full for anything that must not be published | P0 | S | `repo-bootstrap` | Q3 | | yes | None |
| `page-skeleton` | **Done 12 Oct 2026.** The page and the geometry library as one npm workspace: Vite, TypeScript, Vitest, Playwright, oxlint, Prettier, Manifold loaded; a browser test that the built page builds a part | P0 | S | `repo-bootstrap` | D2 | | | None: the reference has it (C32) |
| `board-solid` | **Done 12 Oct 2026.** The solid board: the slot grid, in 40 mm steps with its edges through slot centres, each side open (half and quarter slots) or closed, open all round by default (D15, D34, D37), outline and corner radius, thickness. Geometry tests (slot count, pitch, volume), each with a control that must fail; the exported STL is one closed body by scad-tools' `stl-mesh.py` and slices in PrusaSlicer | P0 | M | `page-skeleton` | D2, D11 | slot fit | yes | None significant |
| `registry` | **Done 12 Oct 2026, for board types (C49).** Board types, options and connectors as one list; the page's controls and the file names derived from it; a contract test over every entry, with a test-only entry | P0 | M | `board-solid` | D6, D11 | | | None: the reference has the pattern |
| `preview-3d` | **Done 12 Oct 2026.** 3D preview, updating as the settings change | P0 | S | `page-skeleton` | D2 | | | Triangle count of a large board (C32) |
| `download-stl` | **Done 12 Oct 2026.** Download the board as STL, named by type and size | P0 | S | `preview-3d` | D2 | | | None (C32) |
| `printer-default` | **Done 12 Oct 2026.** The largest board that fits a bed: a safe default plus custom; a warning when the board is larger | P0 | S | `registry` | D4 | | | None: bed sizes from the reference's verified list (C25) |
| `fit-coupon` | **Done 12 Oct 2026** (D67, D68; a board type on the page). A small test piece of a few slots and the board's edge, to settle slot clearance and thickness before printing a whole board | P1 | S | `board-solid` | Q3 | yes | yes | None |
| `seam-test` | **Done 14 Oct 2026** (D69; C106, C107). A seam-test pair printed with the fit coupon: two 40 × 80 mm tiles open on their facing sides, which push together into one slot across the seam | P1 | S | `fit-coupon` | D69 | yes | | How flush printed edges butt: the print itself answers it |
| `mounting` | **Done 14 Oct 2026** (D73 to D75; C82 to C87). A screw hole in each corner tile, 10 mm in from both edges, countersunk or for a round head, for 3 to 5 mm screws; standoffs on the back as an option, 20 mm by default, hollow for the screw; on the solid board, and ready for any board built on it | P1 | M | `board-solid` | D11, D73 to D75 | yes | yes | None |
| `mounting-ikea` | **Done 15 Oct 2026** (D155 to D158; C159, C160): keyholes in the top two corners, the head sunk in a channel from the front, sized from the screw; countersunk lock screws at the bottom as an option; standoffs refused with keyholes; and a test that no screw hole, countersink or keyhole comes within 0.5 mm of a slot, at every screw size and corner, so IKEA's spacer and rail fit (D131) | P1 | S | `mounting` | D14, D130, D131, D155 to D158 | yes | yes | How a keyhole holds on a real screw: a test print |
| `conn-standoff` | **Done 14 Oct 2026** (D91 to D94, D97, T98; C95, C96, C99 to C101): on the page under "Connectors", for 1, 2 or 4 boards; the shared ones leave a tunnel along the seam for hooks. Connector 1: a standoff or spacer, screwed or push-in, of any height; under 1 board's corner, or shared by 2 or 4 boards where they meet; solid, lightened or skeleton (D13) | P1 | S | `mounting` | D13 | yes | | None |
| `design-system-base` | **Done 14 Oct 2026** (D111, D113; C116 to C119). The shared design system's look: its tokens, stylesheet and fonts copied from its tag `v0.1.0` with their licences; its fonts and colours on the page; a dark theme that follows the system setting (D113); the preview's colours from its tokens. The layout and the controls stay as they are | P1 | S | `page-skeleton` | D111, D113 | | | None: the plan was made by reading this repository |
| `design-system-controls` | **Done 14 Oct 2026** (D111, D112; C120 to C122). The design system's controls: every choice as buttons, the board type among them under "Boards" and "Connectors" (D112), and the printer; the number fields, the side toggles, "Advanced" and the warnings in its style | P1 | M | `design-system-base` | D111, D112 | | | The browser tests that pick from a list change with it |
| `workbench` | **Done 14 Oct 2026** (D111, D113, D114, D123; C124 to C126). The design system's layout: a header with the name and a theme toggle (D113); the preview filling the stage, with a status bar and "Reset view"; the download in a bar under it; the form, the introduction and the two statements in a sidebar (D114); the phone layout; the board always fits the stage (D123) | P1 | M | `design-system-controls` | D111, D113, D114, D123 | | | The preview resizing to fill the stage |
| `design-system-v030` | **Done 15 Oct 2026** (D153; C154): the design system's v0.3.0 copied and its rules in place of the page's own; `web/index.html` keeps only `.tagline`, `.note` and the error colours. Screenshots of 10 states before and after (`scripts/design-system/`): 5 changed, each as the release says, and a 320 px screen no longer scrolls sideways | P1 | S | `workbench` | D111, D153 | | | None |
| `steps` | The numbered steps, Board, Size and sides, Mounting, Printer, once the form grows (D115): each setting says which step it belongs to, with a contract test over every entry | P2 | M | `workbench` | D115 | | | When the form has grown enough is a judgement |
| `board-lightened` | **Done 15 Oct 2026, full depth** (D141 to D145; C148 to C150): pockets through the board, a rim round each slot, diagonal webs, an edge band and screw pads, about 41 % of the solid board's plastic; the rim and web widths under Advanced, refused under 1.2 mm. The I-beam goes to `board-skeleton`, on the same lattice (D146); the test print is T151 | P1 | M | `board-solid` | D11 | yes | | Strength and hook fit of thin webs: test prints |
| `board-skeleton` | **Done 15 Oct 2026** (D146, D147, D161; C162 to C165): the lightened board's lattice with every rim, web and the edge band an I-beam, 3 mm at both faces for 0.6 mm, then 45 degrees towards a 1.2 mm core; the rims stay 2.1 mm through a 5 mm board (D161); the screw pads full depth; the core under Advanced, refused under 0.8 mm. 32 % of the solid board's plastic at 160 x 160 mm; no face overhangs more than 45 degrees, printed face down | P1 | L | `board-lightened` | D11, Q12, D146, D147, D161 | yes | | Stiffness under load and hook fit: a test print; a 400 x 400 mm board takes 5.4 s to build (D166) |
| `build-worker` | **Done 15 Oct 2026** (D166; C169): every build in a web worker, which starts the engine, makes its check part, builds each part and keeps the last, and writes its STL when asked; the page answers while a 400 x 400 mm skeleton board is made, and a change made during a build replaces it | P1 | M | `board-skeleton` | D166 | | | None |
| `conn-seam-plate` | **Replaced 16 Oct 2026 by `conn-slot-clip`** (D185, D186): boards join with pegs in their slots, needing no screw holes; it was to be a plate behind the seam, fixed through the boards' corner holes | P1 | M | `mounting` | D13, Q18, D185 | | | None |
| `tiling` | **Done 16 Oct 2026** (D175 to D178; C179, C180): "Panels: Split into panels" on the solid, lightened and skeleton boards makes their size a wall's, up to 1600 mm each way, cut into panels the chosen bed takes, as even as they can be, none larger than the largest panel set; closed round the wall's outer edge, open at the seams; each panel with the board's settings and mounting; the preview shows the whole wall, and a print list gives each kind of panel, its count and its download | P1 | L | `printer-default` | D4, D15, D37, D175 to D178 | yes | | How panels join on a wall: `edge-joins` and `conn-seam-plate` |
| `edge-joins` | Joins built into the tile edges, between the notches the half slots leave (every 40 mm) | P1 | L | `tiling` | D11 | yes | | Several rounds of test prints for the fit |
| `conn-slot-clip` | Connector 3, in place of the seam plate (D185): a part behind the seam with a peg in the nearest whole slot of each board, for 2 boards, or for 4 where their corners meet (D13); its questions D187 to D190 asked on 16 Oct 2026 ([figure](figures/slot-clip.png)) | P1 | M | `tiling` | D13, D185, D187 to D190 | yes | yes | Peg fit in a 5 mm slot: a test print |
| `conn-angle` | Connector 4: boards at an angle (90°, 135°), inside or outside, joining 2 boards, or 4 where two meet on each side (D13) | P1 | M | `mounting` | D13 | yes | | None significant |
| `conn-desk-clamp` | Connector 5: holds 1 board, or the seam of 2, upright on a desk edge of a given thickness (D13) | P1 | M | `mounting` | D13 | yes | | Clamp force in printed plastic |
| `ci` | **Done 14 Oct 2026** (A102). CI on GitHub: the kit's workflow and the npm workspace's checks with the browser test; `tests/test-workflow.sh` holds it to the kit's first-run bugs | P1 | S | `page-skeleton` | A102 | | | None |
| `printer-presets` | **Done 15 Oct 2026** (D170 to D172; C174): 30 printers from 7 makers, [`printer-beds.md`](printer-beds.md), each bed from its maker's site, the owner's MK3S+ among them; under "Printer bed" a button for each maker after the default and "Custom", then its models; remembered in the browser | P1 | S | `printer-default` | D4, D170 to D172 | | yes | None |
| `download-3mf-zip` | **Done 16 Oct 2026** (D181 to D183; C184): "STL / 3MF" beside the download, for one board or a line of a wall's print list; a wall's "Download all" gives a zip of every kind's STL with `print-list.txt`, or one 3MF with an object for each kind named with its count; the 3MF writer adapted from the reference's (C32) | P1 | M | `download-stl` | D4, D181 to D183 | | | Connectors join a wall's files when walls take them |
| `outline-shapes` | Outlines other than a rectangle: hexagon, triangle, round | P2 | M | `registry` | D11 | | | Where the slot grid sits in a non-rectangular outline |
| `face-patterns` | More pocket patterns for the lightened board (hexagon, Voronoi, decorative) | P2 | M | `board-lightened` | D11 | yes | | Minimum web per pattern |
| `offline-file` | The page as one file that works offline (about 0.7 MB with Manifold, inferred by the reference) | P2 | S | `download-stl` | D2 | | | None |
| `extending-doc` | **Started 12 Oct 2026** with board types and settings. `docs/extending.md`: where a new board type, option or connector goes, and which test fails if a step is missed | P2 | S | `registry` | D6 | | | None |
| `preview-colour` | The preview's colour as a setting, for the filament the user prints in | P2 | S | `preview-3d` | D56 | | | None |
| `listings` | Printables and MakerWorld listings, "Skådis Air: …" with the search words in the title, ready-made STL sets in common sizes, the fit coupon, photos of real prints, a link to the page (D79, D81) | P2 | M | `pages-deploy`, first test prints | D81 | yes | | Photos need real prints; the page must be public first |
| `pages-deploy` | **Done 15 Oct 2026** (D103, T132; C135): the site published on GitHub Pages after each green checks run on `main`, at <https://alonrr.github.io/skadis-air/> | P2 | S | `download-stl` | D7, D103 | | | None |
