# Status and plan

Working document: the brief, every decision so far, and every open question. Keep it current;
a fresh session resumes from here.

Last updated: 14 Oct 2026. Phase: **building**. `v0.1.0` is released (12 Oct 2026); since then the boards print face down (D66), the fit coupon is a board type, the project is named Skådis Air (D79), Gitea and the private GitHub copy are kept in step (A77), and **`mounting` is done** (14 Oct 2026): corner screw holes for 4 mm screws (D76), countersunk or round, and optional standoffs on the back (D73 to D75), with the visible picks kept (D88). The repositories are renamed `skadis-air` on Gitea and GitHub (A80, T89); the local folder is renamed between sessions. Keyhole heads and IKEA's corner holes are in `mounting-ikea`, which waits on T17. **`conn-standoff` is done** (D91 to D94, D97): a standoff for 1, 2 or 4 boards under "Connectors", the shared ones with a tunnel for hooks, sized from a replica of IKEA's hook on Printables (T98). **Next: `board-lightened`.** Nothing is test-printed yet. The evidence for the board types and
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
| D55 | **The preview shows the board as it hangs**: upright, its front toward the viewer, slots vertical | 12 Oct 2026 |
| D56 | **The preview draws the board in a fixed light grey**; a colour option can be added later (`preview-colour`) | 12 Oct 2026 |
| D57 | **Drag turns the preview, the wheel or a pinch zooms, and "Reset view" brings back the first view** | 12 Oct 2026 |
| D60 | **One "Download STL" button under the preview**, the file named as C52 says; STL and 3MF choices come with `download-3mf-zip` | 12 Oct 2026 |
| D61 | **The printer bed starts at 200 × 200 mm**, which every full-size printer in the reference project's verified list fits, with a custom size beside it | 12 Oct 2026 |
| D62 | **A board larger than the bed is warned about, not refused**: it can still be downloaded; splitting it into tiles comes with `tiling` | 12 Oct 2026 |
| D66 | **Boards print face down**: the front on the bed, the back up, since some designs put standoffs on the back (replacing choice C58). A board is built and previewed as it hangs, front toward the viewer, and the download turns it over about the vertical axis, as a person turns it over to lay it on the bed; so a side chosen as left on the page is at the far x of the STL seen from above, and on the left again once it hangs | 12 Oct 2026 |
| D67 | **The fit coupon is four 40 mm tiles in a row**, 160 × 40 mm, each slot at its own clearance (0, 0.1, 0.2 and 0.3 mm unless set), told apart by 1 to 4 dots in the front face | 12 Oct 2026 |
| D68 | **The coupon's left and right sides are open, its top and bottom closed.** Found when building it: on one row the only grid points on its edges are its corners, and a corner keeps its slot only when both its sides are open, so the open sides cut no half slots and only leave the corners square; testing that two coupons' halves meet needs a second row (D69) | 12 Oct 2026 |
| D73 | **Screw holes go in the corner tiles, 10 mm in from both edges**, between the corner and the first slot, clear of the slots whether the sides are open or closed | 13 Oct 2026 |
| D74 | **Screw heads are countersunk by default**, the front kept flat; a round head is the other choice | 13 Oct 2026 |
| D75 | **Standoffs on the back are an option, 20 mm tall by default** (IKEA's distance from the wall), printed on top as boards print face down (D66) | 13 Oct 2026 |
| D79 | **The project is named Skådis Air, `skadis-air`**: light boards, mostly air, and a light, quick page; the listings' titles carry the words people search for ("IKEA Skadis pegboard generator", "parametric", "lightweight", "tileable", "connector") | 13 Oct 2026 |
| D81 | **Printables and MakerWorld listings are planned** (`listings`, P2), after the first test prints, with ready-made STL sets, the coupon, photos and a link to the page; `pages-deploy` moves from P3 to P2 to go with them, as a listing needs the page public | 13 Oct 2026 |
| A77 | **The repository is kept in step with a private GitHub copy**, `AlonRR/skadis_ultralight_generator`: "keep the repo in sync with github". The owner creates it and makes the first push; from then on every push to `gitea` goes to both (`CLAUDE.md`, Git). CI and Pages stay the owner's decision (D7) | 13 Oct 2026 |
| A35 | **The history is rewritten to drop the bytecode file**: the last three commits replayed without it, signed, with their authors, committers and dates; force-pushed to Gitea with a lease on 12 Oct 2026. Gitea still serves the old commits by their full SHA until it prunes them | 12 Oct 2026 |
| D76 | **Screws are 4 mm by default**: a 4.5 mm hole and a 90 degree countersink 9 mm across; the screw size stays a setting, 3 to 5 mm | 14 Oct 2026 |
| D88 | **The mounting's visible picks are kept** as built: the standoff 10 mm across for a 4 mm screw (C83), file names that add only the mounting that differs from the start (C85), and "None" as a third screw-hole choice, holes made unless it is chosen (C86) | 14 Oct 2026 |
| A80 | **The repositories are renamed `skadis-air`.** GitHub's became `AlonRR/skadis-air` the same day (it redirects the old name); Gitea's the owner renamed the same day (T89), as its page would not open in the browser the agent drives; the local folder is renamed between sessions, and the project memory and the message-bus address move with it | 14 Oct 2026 |
| D91 | **Connectors are in the same list as the boards, under a "Connectors" heading**, with the same form, preview and download | 14 Oct 2026 |
| D92 | **The standoff comes for 1 board (a round spacer, one hole), 2 boards (one spacer, two holes 20 mm apart, the corner holes either side of a seam) and 4 boards (four holes on a 20 mm square)**, solid only, as a part this small has nothing to lighten | 14 Oct 2026 |
| D93 | **The standoff is screwed**: hollow, the screw through the board and the spacer into the wall, at the board's screw size (D76) | 14 Oct 2026 |
| D94 | **The standoff is the size of the built-in standoffs**: 20 mm tall unless set (D75), 3 to 40 mm, 10 mm across for a 4 mm screw (C83); the 2- and 4-board versions are that outline stretched over their holes | 14 Oct 2026 |
| D97 | **The 2- and 4-board standoffs cross the seam with a tunnel**: next to the board they are cut away along the slot column, so a hook in any slot of it has room behind the board, and they are joined only on the wall side | 14 Oct 2026 |
| T98 | **The room a hook takes comes from Printables**, as the owner has no hook: measured from a replica of IKEA's hook (model 107818), its back tab sits up to 6 mm behind the board and reaches 8.25 mm below its slot ([`skadis-standard.md`](skadis-standard.md)); `<<CONFIRM>>` until a real hook is measured | 14 Oct 2026 |
| Q18 | The owner's own plate-connector attempt is **not used**; the seam plate is designed afresh | 12 Oct 2026 |

## Open questions

- **D69** A second row on the fit coupon, so two coupons pushed together test that the half slots meet into a whole slot, or one row and that test left to `tiling`.
- **A102** CI: a GitHub Actions workflow from the convention kit's template (every pre-commit hook, the identity of every pushed commit, a full-history secret scan) and a job for the type check, lint, formatting, the unit and browser tests and the build; it needs two repository variables, the expected commit name and address. The STL check stays local, as it needs PrusaSlicer.
- **D103** Going public: (a) after the fit coupon is printed and its clearance confirmed (recommended), or (b) now. Either way the agent sets `.repo-status` to `ready` with its stale blockers cleared and adds a Pages workflow; making the repository public and switching Pages on are the owner's.
- **D104** The pre-commit hooks: (a) `pre-commit install`, so they run on every commit beside the kit's hooks (recommended), or (b) keep running them by hand before each commit.
- **T17** The owner's caliper measurements of his board (not blocking: sources first, Q3).

## Inputs from outside this repository

- The owner's unfinished plate connector in his workshop repository (commit b68a17a) is not
  used (Q18).
