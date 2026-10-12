# Status and plan

Working document: the brief, every decision so far, and every open question. Keep it current;
a fresh session resumes from here.

Last updated: 12 Oct 2026. Phase: **building** (plan approved, A19). `repo-bootstrap`, `page-skeleton`, `board-solid` and `registry` are done and on Gitea; next is `preview-3d`. The evidence for the board types and
the SKÅDIS numbers is in [`research/2026-10-12-skadis-survey.md`](research/2026-10-12-skadis-survey.md),
the numbers themselves in [`skadis-standard.md`](skadis-standard.md), the work in
[`backlog.md`](backlog.md), the choices made without asking in [`choices.md`](choices.md), and the
connector types drawn in [`figures/connector-types.png`](figures/connector-types.png).

## The brief (the owner's request, 12 Oct 2026)

- A SKÅDIS board generator that runs in the browser, with
  [parametric-window-sealer](https://github.com/AlonRR/parametric-window-sealer) as the reference.
- It is **the one place to get every SKÅDIS board type**: there are many published designs, and
  they come down to a few types, each easy to adjust and to print.
- For now, **boards and connectors only**.
- Follow the owner's engineering-practices and scad-tools guides. Ask rather than assume;
  plan first, then build.

## Decisions

| ID | Decision | Date |
|---|---|---|
| Q1 | Scope: **boards and connectors only**, and the generator is the one place for every board type. No list was given; the types come from a survey (D11) | 12 Oct 2026 |
| D2 | Engine: **TypeScript on the Manifold geometry library, from the start; no OpenSCAD models.** OpenSCAD is acceptable only as a stopgap where something needs it (a planning figure, say), never as the product's geometry. (First answered as OpenSCAD now and Manifold later; reopened the same day, because every model is written from scratch either way, so that would have written each one twice) | 12 Oct 2026 |
| Q3 | The owner has a SKÅDIS board and will measure it, but **cited sources come first**; every number stays `<<CONFIRM>>` until he has (T17) | 12 Oct 2026 |
| D4 | **Anyone's printer**: a safe default bed, presets, and a custom size | 12 Oct 2026 |
| D5 | **A standalone repository**; the SKÅDIS numbers are written down here, where the window sealer's Skådis fill can reuse them | 12 Oct 2026 |
| D6 | **Ask anything a user would see or that changes the design**; implementation details take the recommended option, logged in [`choices.md`](choices.md) | 12 Oct 2026 |
| D7 | **Gitea first**: a branch per item, fast-forwarded into `main`, checks run locally. GitHub, its CI and Pages come when the owner decides | 12 Oct 2026 |
| D8 | Licences **as the reference**: MPL-2.0 for code, CERN-OHL-S-2.0 for the documentation, the REUSE layout, the files the tool generates are the user's, `.repo-status` `not-yet` | 12 Oct 2026 |
| D9 | Name **`skadis_ultralight_generator`** for now; it may change | 12 Oct 2026 |
| D10 | (Superseded by D2's reopening: with no OpenSCAD in the page there is no GPL engine to ship.) Was: ship OpenSCAD's GPL-2.0 WebAssembly build as a separate, unmodified file | 12 Oct 2026 |
| D11 | **Three board types: solid, lightened, skeleton**, each with its outline, tiling and mounting as options; **five connector types**: standoff, seam plate, slot clip, angle joiner, desk clamp. More can be added later | 12 Oct 2026 |
| D14 | **IKEA-compatible corner holes** as a mounting option, so IKEA's rail, spacers and joining plate fit; their positions wait on T17 | 12 Oct 2026 |
| D16 | **The first version (`v0.1.0`) is the solid board end to end**: page, preview, STL download, every check passing. Lightened, skeleton and mounting follow | 12 Oct 2026 |
| Q12 | **The skeleton type follows the owner's pick**, [Ultra Light SKÅDIS Board - Parametric](https://www.printables.com/model/1812712), itself a parametric rebuild of [Azat's board](https://www.printables.com/model/1049033): rims round the slots tied by I-section beams. Its idea is rebuilt, not its geometry (CC BY-NC-SA); the weaknesses its users report (sagging at low infill, hooks that jam, too little room behind the board, tight connectors) become settings and tolerances | 12 Oct 2026 |
| D13 | **Connectors in this order: standoff, seam plate, slot clip, angle joiner, desk clamp** ([figure](figures/connector-types.png)). **Each joiner (seam plate, slot clip, angle joiner) comes for 2 boards and for 4 boards**, where four corners meet; **each mount (standoff, desk clamp) for 1, 2 or 4 boards**, where that applies (a desk clamp reaches only the bottom row, so 1 or 2). **Connectors and mounts take D11's strength options (solid, lightened, skeleton) where they apply** | 12 Oct 2026 |
| A19 | **The plan is approved; build starts with `repo-bootstrap`** | 12 Oct 2026 |
| A30 | **One of Azat's STLs may be downloaded to measure** its beams and weight; measuring only, nothing copied. Done the same day: [`research/2026-10-12-ultralight-measured.md`](research/2026-10-12-ultralight-measured.md) (an I-section, a quarter of a solid board's plastic, slots at exactly 5 × 15 mm with no clearance, 5 mm standoffs) | 12 Oct 2026 |
| D15 | **Tiles are cut through slot centres, as Azat's and AU3D's boards are, in 40 mm steps**: the smallest tile, 40 × 40 mm, is one whole slot in its centre and a quarter slot at each corner; a larger tile has half a slot every 40 mm along each side. Tiles of the same pattern side by side make whole slots, so the grid runs on with no slot missing, and every tile is the same, with no mirrored copies. **Each side is open or closed, the user's choice**: open (the half and quarter slots, to join a neighbour or add one later) or closed (a solid edge, those slots left out); a board closed all round has IKEA's 20 mm from edge to first slot. Corrected the same day: 20 mm steps were first recorded, and the owner set 40 mm as the smallest, after measuring Azat's 40 × 40 tile ([measured](research/2026-10-12-ultralight-measured.md), [figure](figures/tile-seams.png)) | 12 Oct 2026 |
| D34 | **Open or closed is chosen side by side**, on every board and tile. In the figure's panel (c), two tiles have one side closed, one has two, and one is open all round. The defaults are D37 | 12 Oct 2026 |
| D37 | **The sides' defaults, and a wall's panels** (replacing choice C36): **a single panel is open all round** by default; **a wall is closed round its outer edge** and open at its seams; and for a wall the user sets **the panel size as a whole number of the smallest panel**, n × 40 mm in each direction | 12 Oct 2026 |
| D39 | **The board's corner radius is 10 mm**, where both sides at a corner are closed; open corners stay square so tiles fit together. `<<CONFIRM>>` until T17 | 12 Oct 2026 |
| D40 | **Slots start at 5.2 × 15.2 mm**: the nominal 5 × 15 plus a 0.2 mm clearance setting, as real IKEA boards measure; the fit coupon and T17 settle it | 12 Oct 2026 |
| D41 | **A 1 mm chamfer round each slot, at both faces** | 12 Oct 2026 |
| D45 | **The board's size is entered in mm, in 40 mm steps, with its count of tiles shown beside** ("= 6 tiles") | 12 Oct 2026 |
| D46 | **The four sides are toggles placed round a small drawing of the board**, one at each side | 12 Oct 2026 |
| D47 | **The page lists only the board types that are built**; each appears when it is | 12 Oct 2026 |
| D48 | **The fine settings (slot clearance, chamfer, corner radius) are folded under "Advanced"**; size, thickness and sides on the main form, with a warning outside 4 to 5.5 mm | 12 Oct 2026 |
| A35 | **The history is rewritten to drop the bytecode file**: the last three commits replayed without it, signed, with their authors, committers and dates; force-pushed to Gitea with a lease on 12 Oct 2026. Gitea still serves the old commits by their full SHA until it prunes them | 12 Oct 2026 |
| Q18 | The owner's own plate-connector attempt is **not used**; the seam plate is designed afresh | 12 Oct 2026 |

## Open questions

- **T17** The owner's caliper measurements of his board (not blocking: sources first, Q3).

## Inputs from outside this repository

- The owner's unfinished plate connector in his workshop repository (commit b68a17a) is not
  used (Q18).
