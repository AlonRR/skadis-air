# Status and plan

Working document: the brief, every decision so far, and every open question. Keep it current;
a fresh session resumes from here.

Last updated: 16 Oct 2026. Phase: **building**. `v0.2.1` is released (16 Oct 2026, A224), with the code review's fixes, after `v0.2.0` (D214) and `v0.1.0` (12 Oct 2026); since `v0.1.0` the boards print face down (D66), the fit coupon is a board type, the project is named Skådis Air (D79), Gitea and the GitHub copy are kept in step (A77), and **`mounting` is done** (14 Oct 2026): corner screw holes for 4 mm screws (D76), countersunk or round, and optional standoffs on the back (D73 to D75), with the visible picks kept (D88). The repositories are renamed `skadis-air` on Gitea and GitHub (A80, T89); the local folder is renamed between sessions. Keyhole heads and corner holes kept as an option (D130) are in `mounting-ikea`; IKEA's own board has none, its spacer held through a peg slot by a screw with a nub (T17). **`conn-standoff` is done** (D91 to D94, D97): a standoff for 1, 2 or 4 boards under "Connectors", the shared ones with a tunnel for hooks, sized from a replica of IKEA's hook on Printables (T98). A **seam-test pair** (D69) prints with the fit coupon, to test how tiles join. The first test print (the coupon and the pair) and a real board are measured (T109, T17, 15 Oct 2026): the sources' SKÅDIS numbers hold, a slot drawn at 0.2 mm prints at the wide end of the board's slot width and about 0.3 mm shorter than its slot, and the grid holds across the seam, so the default clearance stays 0.2 mm (D129). **The repository is public on GitHub** (D103, T132, 15 Oct 2026), and pushes keep it in step with Gitea (D134); Pages is on, and a workflow publishes the page there after each green checks run on `main` (T132); the first deployment was checked live (15 Oct 2026), and the page has a tab icon (D137). The page has the shared design system's fonts, colours and dark theme (`design-system-base`, D111, D113) and its controls, every choice as buttons (`design-system-controls`, D112), and is its workbench: the board in a stage it always fits, beside the form or above it on a phone, with a theme toggle (`workbench`, D123). **`board-lightened` is done with full-depth members** (D141 to D145, 15 Oct 2026): about 41 % of the solid board's plastic, measured; the I-beam the owner asked about goes to the skeleton board, on the same lattice (D146, D147), and the test print is T151. The design system's v0.3.0 is in (D153, 15 Oct 2026), and **`mounting-ikea` is done** (D155 to D158): keyholes in the top two corners, with lock screws at the bottom as an option. **`board-skeleton` is done** (D146, D147, D161): every rim and web an I-beam, 32 % of the solid board's plastic. Every build now runs in the background (D166, `build-worker`), and the page offers 30 printers by maker (`printer-presets`, D170 to D172). **`tiling` is done** (D175 to D178, 16 Oct 2026): walls of panels that fit the bed. 3MF and a wall's files in one download followed (D181 to D183, `download-3mf-zip`). Boards join with the slot clip, not a seam plate (D185). **`conn-slot-clip` is done** (D187 to D189): boards join behind a seam by pegs in their slots. Boards on keyholes now stand on standoffs, so a hook has room behind them (D190, D191, `keyhole-pads`). The slot clip's pegs grip by ribs or a snap lip, and it takes a screw or a keyhole (`clip-grip-fixing`, D194, D195). A wall's plan holds its columns and rows rather than every panel (`wall-grid`, C200). **Walls have no size limit and the preview draws a large one in full only where the view needs it** (`wall-detail`, D196, D197; [how](large-walls.md)). The page follows the design system's v0.5.0 (`design-system-v050`, D202, D206, D207). Next: the release and the Printables page for the Pegboard Wall Organizers contest, which closes on 22 Oct 2026 (D211 to D214). The evidence for the board types and
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
| D14 | **IKEA-compatible corner holes** as a mounting option, so IKEA's rail, spacers and joining plate fit; their positions wait on T17. IKEA's board has none, its spacer held through a peg slot by a screw with a nub (D130, 15 Oct 2026) | 12 Oct 2026 |
| D16 | **The first version (`v0.1.0`) is the solid board end to end**: page, preview, STL download, every check passing. Lightened, skeleton and mounting follow | 12 Oct 2026 |
| Q12 | **The skeleton type follows the owner's pick**, [Ultra Light SKÅDIS Board - Parametric](https://www.printables.com/model/1812712), itself a parametric rebuild of [Azat's board](https://www.printables.com/model/1049033): rims round the slots tied by I-section beams. Its idea is rebuilt, not its geometry (CC BY-NC-SA); the weaknesses its users report (sagging at low infill, hooks that jam, too little room behind the board, tight connectors) become settings and tolerances | 12 Oct 2026 |
| D13 | **Connectors in this order: standoff, seam plate, slot clip, angle joiner, desk clamp** ([figure](figures/connector-types.png)). **Each joiner (seam plate, slot clip, angle joiner) comes for 2 boards and for 4 boards**, where four corners meet; **each mount (standoff, desk clamp) for 1, 2 or 4 boards**, where that applies (a desk clamp reaches only the bottom row, so 1 or 2). **Connectors and mounts take D11's strength options (solid, lightened, skeleton) where they apply** | 12 Oct 2026 |
| A19 | **The plan is approved; build starts with `repo-bootstrap`** | 12 Oct 2026 |
| A30 | **One of Azat's STLs may be downloaded to measure** its beams and weight; measuring only, nothing copied. Done the same day: [`research/2026-10-12-ultralight-measured.md`](research/2026-10-12-ultralight-measured.md) (an I-section, a quarter of a solid board's plastic, slots at exactly 5 × 15 mm with no clearance, 5 mm standoffs) | 12 Oct 2026 |
| D15 | **Tiles are cut through slot centres, as Azat's and AU3D's boards are, in 40 mm steps**: the smallest tile, 40 × 40 mm, is one whole slot in its centre and a quarter slot at each corner; a larger tile has half a slot every 40 mm along each side. Tiles of the same pattern side by side make whole slots, so the grid runs on with no slot missing, and every tile is the same, with no mirrored copies. **Each side is open or closed, the user's choice**: open (the half and quarter slots, to join a neighbour or add one later) or closed (a solid edge, those slots left out); a board closed all round has IKEA's 20 mm from edge to first slot. Corrected the same day: 20 mm steps were first recorded, and the owner set 40 mm as the smallest, after measuring Azat's 40 × 40 tile ([measured](research/2026-10-12-ultralight-measured.md), [figure](figures/tile-seams.png)) | 12 Oct 2026 |
| D34 | **Open or closed is chosen side by side**, on every board and tile. In the figure's panel (c), two tiles have one side closed, one has two, and one is open all round. The defaults are D37 | 12 Oct 2026 |
| D37 | **The sides' defaults, and a wall's panels** (replacing choice C36): **a single panel is open all round** by default; **a wall is closed round its outer edge** and open at its seams; and for a wall the user sets **the panel size as a whole number of the smallest panel**, n × 40 mm in each direction | 12 Oct 2026 |
| D39 | **The board's corner radius is 10 mm**, where both sides at a corner are closed; open corners stay square so tiles fit together. `<<CONFIRM>>` until T17, which did not measure it (15 Oct 2026) | 12 Oct 2026 |
| D40 | **Slots start at 5.2 × 15.2 mm**: the nominal 5 × 15 plus a 0.2 mm clearance setting, as real IKEA boards measure; the fit coupon and T17 settle it. Settled at 0.2 mm by D129 (15 Oct 2026) | 12 Oct 2026 |
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
| A102 | **CI on GitHub**: the convention kit's workflow (every pre-commit hook, the identity of every pushed commit, a full-history secret scan) and a job for the npm workspace's checks and the browser test, `.github/workflows/checks.yml`; its two repository variables set with `gh`; the STL check stays local | 14 Oct 2026 |
| D104 | **`pre-commit install`**: the hooks run on every commit, the kit's own hooks kept and run first | 14 Oct 2026 |
| D69 | **The seam is tested now, by a seam-test pair printed with the fit coupon**: two 40 × 80 mm tiles, open only on the sides that face each other, so pushed together they make one whole slot across the seam; its own entry beside the coupon, one clearance setting (0.2 mm unless set). It shows whether a hook fits a slot made of two halves, whether the tiles butt flush, and whether the pitch stays 40 mm across the seam. Sliced for a Prusa MK3S in ASA: the pair 1 h 19 min and 16.3 g, against 4 h 54 min and 63.5 g for two coupons with a second row | 14 Oct 2026 |
| D111 | **The shared design system comes next, before `board-lightened`**: its first three parts, `design-system-base` (its fonts, colours and a dark theme), `design-system-controls` (buttons for every choice, and the rest of the form in its style) and `workbench` (its layout), copied from `AlonRR/printable-parts-design-system` at tag `v0.1.0` by the plan its session wrote from this repository (see *Inputs from outside this repository*). The fourth, `steps`, waits for the form to grow (D115). They need no print and no measurement, so they go ahead while the test print is judged (T109, Q110) | 14 Oct 2026 |
| D112 | **The board type is chosen with buttons**, under "Boards" and "Connectors", keeping D91; a gallery of drawings waits until every type has one. (Relayed: the owner's answer in the design-system repository, its D10) | 14 Oct 2026 |
| D113 | **A dark theme that follows the system setting, with a toggle in the header.** (Relayed: its D11) | 14 Oct 2026 |
| D114 | **The introduction stays on the page, in the sidebar**; a welcome dialog is a feature of its own. (Relayed: its D12) | 14 Oct 2026 |
| D123 | **The part always fits the stage**: framed to fill the design system's `--stage-fit` (0.85) of the stage's limiting side whenever the part or its size changes; when the stage changes size, the view keeps the user's angle and pulls back only as far as the whole part needs to fit again; zooming out stops when the part spans `--stage-min-fill` (0.25) of the stage's shorter side; panning cannot take the part off the stage; "Reset view" returns to the first view. Both ratios are read from the tokens, copied from the design system's tag `v0.2.0`. (Relayed: the owner's answer in the design-system repository, its D15) | 14 Oct 2026 |
| D115 | **One sidebar form first**; the numbered steps (Board, Size and sides, Mounting, Printer) come when the form grows. (Relayed: its D13) | 14 Oct 2026 |
| Q110 | **The printed slots are judged with calipers**, as the owner has no IKEA hook: each coupon slot's width beside a slot of the real board (T17), and the clearance whose print matches is the one to use; the measurements are lettered in [`figures/measure-board.png`](figures/measure-board.png) | 14 Oct 2026 |
| D127 | **The design-system parts' visible picks are kept** (C121, C122, C124 to C126) | 14 Oct 2026 |
| A128 | **The three merged branches of the design-system parts are deleted** on Gitea and GitHub, and locally; done 14 Oct 2026 | 14 Oct 2026 |
| T17 | **The owner measured a real board** with calipers: slot 5.05 to 5.15 × 15.2 mm (a printed slot had better err wide, so things go in easily), thickness 5.09 mm, 35 mm between two slots side by side, the first slot's centre 20 mm from the side and the top edge, an IKEA spacer 19.89 mm long, and **no corner holes**; all hard to take, so read with their error in mind. Recorded in [`skadis-standard.md`](skadis-standard.md#measured-on-a-real-board) | 15 Oct 2026 |
| T109 | **The test print is measured** (PrusaLink job 274, PETG): the coupon's slots, drawn 5.0 to 5.3 × 15.0 to 15.3 mm, print 4.94 × 14.7, 5.08 × 14.8, 5.16 × 14.9 and 5.25 × 15.11 mm; the seam pair meets flush, its slot across the seam is 5.25 mm wide, and 34.8 mm of material between the slots either side of it keeps the 40 mm grid. Recorded in [`skadis-standard.md`](skadis-standard.md#the-test-print-t109) | 15 Oct 2026 |
| D129 | **The default slot clearance stays 0.2 mm** (D40): a slot prints 5.16 mm wide, the wide end of the board's 5.05 to 5.15, as the owner prefers, and about 14.9 mm long against the board's 15.2 (T17, T109) | 15 Oct 2026 |
| D130 | **Corner holes stay in `mounting-ikea`, as an option that can be off**: most printed panels have them, the owner thinks, and a board that does without them turns them off. IKEA's own board has none: its spacer is held through a peg slot by a screw with a nub (the owner) | 15 Oct 2026 |
| D131 | **`mounting-ikea`'s corner holes add nothing to the solid board's own** (a screw hole in each corner tile, 10 mm in, "None" to switch them off): the row is keyhole heads, plus a test that keeps the corner slots whole and clear of the screw holes, so IKEA's spacer and rail fit | 15 Oct 2026 |
| D103 | **Go public** (the owner, 15 Oct 2026): the agent sets `.repo-status` to `ready`, its blockers cleared with their evidence, and adds `.github/workflows/pages.yml`, which publishes the page on GitHub Pages after a green checks run on `main` and skips while the repository is private (C135); making the repository public and switching Pages on are the owner's (T132) | 15 Oct 2026 |
| D105 | **Gitea's Actions are switched off for this repository**, so GitHub is the one CI; the switch is in Gitea's repository settings, the owner's (T133), as the Gitea tools here have no switch for it and this Gitea answers its API's cancel with 404, so the 18 queued runs (681 to 699) stay until Actions is off | 15 Oct 2026 |
| T133 | **Gitea's Actions are off for this repository** (the owner, 15 Oct 2026) | 15 Oct 2026 |
| D134 | **Pushes keep going to GitHub now that it is public**: A77 holds for the public repository, and `CLAUDE.md` says so; the secret gate checks every push | 15 Oct 2026 |
| T132 | **The repository is public and Pages is on** (the owner, 15 Oct 2026; verified with GitHub's API: visibility public, a Pages site with `build_type` workflow at <https://alonrr.github.io/skadis-air/>) | 15 Oct 2026 |
| A136 | **Not needed**: the agent was to switch Pages on through GitHub's API, but the owner's setting had taken when it looked, so no call was made | 15 Oct 2026 |
| D137 | **The page gets a tab icon**: a few SKÅDIS slots in the design system's colours, as an SVG (the owner's choice a). Without one, the browser's request for `favicon.ico` was the one console error on the published page: the first deployment (checks run 38727236758, Pages run 38727437749) served the page and every file it loads, and in Chromium the engine, the board and the preview were ready | 15 Oct 2026 |
| A138 | **The GitHub repository's Website field is the page's address**, set by the agent with the owner's yes | 15 Oct 2026 |
| D141 | **The lightened board's pockets go through it**: an open lattice, printed face down (D66) with nothing to bridge | 15 Oct 2026 |
| D142 | **Its lattice is webs along the slot grid's diagonals, each slot joined to its four nearest neighbours**, with no tongue below the slots (pattern B of [the figure](figures/lightened-patterns.png)); and the owner asked to look into the I-beam of the ultralight boards (D146, D147) | 15 Oct 2026 |
| D143 | **Its sizes: a 3 mm rim round each slot, measured from the slot's edge at the face (outside its chamfer), and 3 mm webs**; no tongue | 15 Oct 2026 |
| D144 | **A 3 mm band along every edge, open or closed, and a pad round each screw hole and standoff**, the countersink plus the rim (13 mm across for a 4 mm screw), stay solid | 15 Oct 2026 |
| D145 | **The rim and web widths are settings under "Advanced", refused below 1.2 mm and warned below 2 mm**; no pattern control until a second pattern exists | 15 Oct 2026 |
| D146 | **Two board types on one lattice**: "Lightened", its members full depth, and "Skeleton", the same lattice with I-beam members, so D11's three boards stay; Azat's board, which Q12 chose for the skeleton, is that lattice with I-beams (measured, [research](research/2026-10-12-ultralight-measured.md)) | 15 Oct 2026 |
| D147 | **The skeleton's I-beam**: as wide as the rim and web (3 mm, D143) at both faces for 0.6 mm, then a 45 degree taper, so it prints face down with no supports, to a core 1.2 mm wide; the rims and the edge band take the same profile, the screw pads stay full depth; the core width is a setting under "Advanced", refused below 0.8 mm and warned below 1.2 mm | 15 Oct 2026 |
| D152 | **Next: `mounting-ikea`**, after the design system's v0.3.0 (D153); then `board-skeleton` | 15 Oct 2026 |
| D153 | **The design system's v0.3.0 is adopted now** (backlog `design-system-v030`): its rules replace the page's local copies; a warning is outlined in the warning colour as well as headed in it, and the buttons under the 3D view wrap to the right on a narrow screen | 15 Oct 2026 |
| D155 | **A keyhole sinks the screw head in a channel from the front**, 3.5 mm deep for a 4 mm screw, below the face, with 1.5 mm of board behind it ([figure](figures/keyhole.png)); since D235 the channel is in the top standoffs' wall faces, not the board's front, and the figure shows the design before it | 15 Oct 2026 |
| D156 | **Keyholes go in the top two corners**, so the board lifts straight off its screws; **countersunk lock screws at the bottom two corners are an option**; since A248 (17 Oct 2026) the lock screws go in through the bottom corner slots, not their own countersunk holes | 15 Oct 2026 |
| D157 | **A keyhole's sizes follow the screw size**: the head twice the screw, the entry 1 mm wider, the slide as long as the entry, the slot the screw's hole, the channel the head's height and 0.3 mm (9, 9, 4.5 and 3.5 mm for a 4 mm screw); a board that would keep less than 1.2 mm behind the channel is refused, saying so | 15 Oct 2026 |
| D158 | **Standoffs are refused with keyholes**, as a keyhole hangs the board flat on the wall; on the lightened board the whole keyhole and 2 mm round it stay solid | 15 Oct 2026 |
| D161 | **The skeleton's rims taper at 45 degrees like every other member**, so they stay 2.1 mm wide through the middle of a 5 mm board rather than reaching 1.2 mm: about a third of a solid board's plastic, and no face overhangs more than 45 degrees | 15 Oct 2026 |
| D166 | **Every build runs in the background**, so the page always answers while a board is made: the build moves to a web worker, before the next item | 15 Oct 2026 |
| D167 | **The next items are all four P1 rows offered**: `printer-presets`, then `tiling`, then `download-3mf-zip`, whose zip holds a wall's parts, then `conn-seam-plate`; each asks what a user would see before it is built | 15 Oct 2026 |
| A168 | **The Manifold speed traps go into `engineering-practices`**, as A140's did | 15 Oct 2026 |
| D170 | **A printer is chosen by its maker, then its model**: under "Printer bed", the two choices there now and a button for each maker; a maker shows a second row of its models, all as Choice buttons (the models a field of their own since D257, 18 Oct 2026) | 15 Oct 2026 |
| D171 | **The chosen printer, or a custom size, is remembered in this browser**, as the theme is | 15 Oct 2026 |
| D172 | **The list adds the Original Prusa i3 MK3S+, 250 x 210 mm**, from Prusa's page for its 10th Anniversary Edition ("25x21x21 cm") | 15 Oct 2026 |
| A173 | **A root `LICENSE` names the split and points to `LICENSES/`**, so GitHub shows the repository's licence; raised by an audit of the public repository | 15 Oct 2026 |
| D175 | **A wall is made on the boards themselves**: "Panels: One board / Split into panels" on the solid, lightened and skeleton boards; split, their width and height are the wall's, up to 1600 mm each way, and every panel takes the board's settings | 16 Oct 2026 |
| D176 | **A wall's panels are as even as they can be**, none larger than the panel size, which starts at the largest the chosen bed takes and can be set smaller (a 440 mm wall in 200 mm panels: 160 + 160 + 120) | 16 Oct 2026 |
| D177 | **Each panel keeps the board's mounting in its own four corners**, so a seam plate can fix through them | 16 Oct 2026 |
| D178 | **The page shows the whole wall and a print list**: a line for each kind of panel, its count and its own download, one STL each until `download-3mf-zip` | 16 Oct 2026 |
| D181 | **STL or 3MF, chosen beside the download**; a wall keeps a download on each line of its print list and gains "Download all": a zip of every kind's STL, or one 3MF holding every kind | 16 Oct 2026 |
| D182 | **A wall's 3MF has one object for each kind of panel, named with its count**, the copies left to the slicer | 16 Oct 2026 |
| D183 | **A wall's zip or 3MF is named for the wall** (`skadis-solid-1600x1600-wall.zip`), and a zip holds `print-list.txt` | 16 Oct 2026 |
| D185 | **Boards join with the slot clip, not a seam plate** (`conn-seam-plate` replaced by `conn-slot-clip`): a part behind the seam held by pegs in the slots either side, needing no screw holes, so it works on every board type and with "Screw holes: None". Its "working with keyholes" holds only if D190 gives a board on keyholes room behind it | 16 Oct 2026 |
| D186 | **No seam plate shape**: not needed once D185 dropped the plate | 16 Oct 2026 |
| D187 | **The slot clip sits behind the boards, as deep as the gap the standoffs leave** (20 mm unless set), so the wall holds it on once the boards are up: plain pegs, nothing that bends. Between its pegs it stands 8 mm clear of the boards' back (C99), so a hook fits in every slot the pegs leave free | 16 Oct 2026 |
| D188 | **For 4 boards the clip is a square ring** through the four whole slots round the point where the corners meet, 40 mm on a side, the slot they share left free | 16 Oct 2026 |
| D189 | **The pegs are the slot as the board cuts it less a 0.4 mm peg clearance** (4.8 x 14.8 mm; the clearance under Advanced), stopping 2.5 mm short of the front face; the bar is 10 mm wide. On the page under "Connectors" as "Slot clip", for 2 or 4 boards, its depth 20 mm by default, 12 to 40 mm; solid only; saved as `skadis-slot-clip-2-boards-20mm.stl`. The questions' text said boards one above the other take the same clip turned a quarter, which is wrong: the slots stand upright, so they take a clip of their own (C191) | 16 Oct 2026 |
| D190 | **A board on keyholes stands off the wall on pads at its four corners**, as tall as the standoffs (20 mm unless set, at least 8 mm, C99), the keyholes through the top two, so a hook has room behind it; standoffs then go with keyholes, which reverses D158. When: D191; since D235 and D237 the keyholes are cut in the top two standoffs themselves, 12 x 21 mm | 16 Oct 2026 |
| D191 | **The pads were built at once**, not after T151, which then prints the padded board: every hook measured needs room behind the board, which a flat board does not give | 16 Oct 2026 |
| D194 | **The clip's pegs grip with friction ribs or a snap lip**, a "Grip" choice under Advanced, ribs unless set: ribs crush as the peg goes in and keep the pegs 2.5 mm long (D189); the lip, on a peg split along its length, springs into the slot's front chamfer and holds firmly, and costs the slot 40 mm above each peg its two-peg hooks (the lip taken out by D261, 19 Oct 2026) | 16 Oct 2026 |
| D195 | **The clip takes a screw or a keyhole, or neither**: one "Fixing" choice, None, Screw or Keyhole, None unless set. The screw goes through the clip's free half once the first board is up, so the pegs set its place; the keyhole hangs the clip on a screw already in the wall | 16 Oct 2026 |
| D196 | **A wall has no size limit**; at most 1 km each way since D223 | 16 Oct 2026 |
| D197 | **A large wall is drawn in full detail only where the view needs it**, as games draw large scenes: panels near the camera or zoomed in on in full, up to about 5 million triangles, and the rest as flat plates with their slots drawn on them as a picture, fewer and larger the farther they are | 16 Oct 2026 |
| D201 | **`wall-detail` next**, before the design system and the remaining connectors | 16 Oct 2026 |
| D202 | **The design system's v0.5.0 is adopted after `wall-detail`**, with v0.4.0's steps, as v0.5.0 supersedes it (`design-system-v050`) | 16 Oct 2026 |
| D206 | **No "More..." menu in the header** while "Dark theme" is its only action; it comes with a second one | 16 Oct 2026 |
| D207 | **The file's format, STL or 3MF, is chosen in the form, under "Printer"**, set once as the printer is; the plan bar keeps the download alone, which a phone's one row needs | 16 Oct 2026 |
| Q210 | The contest's rule against AI-generated models does not apply: **the models are generated by a program**, the owner's answer | 16 Oct 2026 |
| D211 | **One Printables model page, "Skadis Air"**, for the Pegboard Wall Organizers contest | 16 Oct 2026 |
| D212 | **Its files**: the solid, lightened and skeleton boards at 200 x 200 and 240 x 200 mm, the fit coupon, the standoff for 1, 2 and 4 boards, and the slot clip side by side, one above the other and for 4 boards, made by a script from the release; and **a link to the page** for any other size | 16 Oct 2026 |
| Q213 | **The Printables files are CC0**, public domain, as the files the tool makes already are free of conditions | 16 Oct 2026 |
| D214 | **The latest version is released before the upload** | 16 Oct 2026 |
| D222 | **A comma in a number is a decimal point, unless it stands before three digits**, as in "40,000", which could as well be a thousands separator and is refused as unclear; every field is read by the one reader, the library's (the code review, 16 Oct 2026) | 16 Oct 2026 |
| D223 | **A wall is at most 1 km each way**: a larger size is taken for a slip of the keys and refused | 16 Oct 2026 |
| D235 | **A keyhole belongs on the standoff, not the board**, the owner's words: "the keyholes are on the panel when they should be on the standoff. the key hole in its current state wont hold onto the wall" (relayed, before T151 was printed). The head will slide behind lips in the top standoffs' wall faces, as the slot clip's keyhole does (C199), and the board's face is left plain; this replaces D155's channel from the front and C198. Where the standoff goes: D237 | 17 Oct 2026 |
| D237 | **The keyhole standoff goes at one place in every top corner tile** ([figure](figures/keyhole-standoff-options.svg)): the keyhole's middle 8.9 mm in from the side and 24.25 mm below the top, 1.5 mm of wall round it (12 x 21 mm for a 4 mm screw), 1.28 mm clear of every slot and hook's back tab where panels meet and 1.50 mm at a wall's outer corner, less than C83's 2 mm, which no place keeps; a wall's screws make one pattern (option a); replaced the same day by D244 | 17 Oct 2026 |
| D244 | **The keyhole standoffs stand behind the top corner tiles' centre slots, and leave a hook its room behind them** ([figure](figures/keyhole-behind-slot.svg), drawn at 13 x 22 mm before C246's 3 mm walls), the owner's "244 a but cut room for hooks": the standoff closes the slot's back, and a pocket in it, the slot and the hook's back tab and 8 mm deep, keeps the slot for a hook; about 10 mm clear of every other slot and hook, screws 3 to 5 mm (Q243: behind a slot, as IKEA's spacer stands) | 17 Oct 2026 |
| D245 | **A board on keyholes stands behind its bottom corner tiles' centre slots too**, as the top (D244), with a hook's room behind those slots; the owner's "245 move the standoffs". With lock screws the bottom standoffs stayed round them in the corners until A248, which puts the lock screws through these slots | 17 Oct 2026 |
| D247 | **Lock screws go through the bottom corner slots and leave them usable**, the owner's "for the bottom standoffs with a screw option have a hole so a screw can fit tucked into the skadis peg and so the peg can be used" ([figure](figures/lock-screw-tucked.svg); the options asked: [figure](figures/screws-through-slot.svg)); boards with screw holes keep their corner holes | 17 Oct 2026 |
| A248 | **Built as drawn**: the lock screw goes in through the slot, head and all, its head in a recess behind the hook's room; "and if the screw that is desired is larger than the 5mm we cut a groove into the skadis peg walls for the screw to fit thru" (the owner) | 17 Oct 2026 |
| D250 | **The owner's review of the page and the trial print** (17 Oct 2026): (a) the ribbed slot clip's pegs are too short, "they don't reach thru to be flush with the board": they reach the board's front; (b) a slot clip starts with a screw, not none; (c) number fields get arrows for larger and smaller; (d) a wall's list of files collapses and expands, its button beside "Download all"; (e) the design system's latest version is copied (v0.5.1), and checked for these; (f) a board on keyholes does not thicken the slots its standoffs stand behind, as the lightened and skeleton boards showed; (g) the choices are kept when switching between types, in the browser; (h) boards or connectors is a toggle at the top, not one list. Asked too: why the page's head holds an inline script (the theme, set before the page is drawn so a dark screen never flashes light, as the design system asks; it moves to its own file) | 17 Oct 2026 |
| D242 | **T193's plate is the two slot clips alone**, tried in boards the owner already has: the 40 x 40 mm boards are dropped (the owner's "242 clips only") | 18 Oct 2026 |
| D256 | **Boards or connectors is a field of its own**, "a separate choice then the type of board or connector" (the owner): "What to make", Boards or Connectors, and after it the type's field, titled "Board" or "Connector" for the one chosen | 18 Oct 2026 |
| D236 | **The Printables draft is labelled "Yes — AI-assisted creation"** (the owner's "236 assisted"); set and saved as a draft 18 Oct 2026, checked after a reload | 18 Oct 2026 |
| Q221 | **The listing names no filament or settings**: "any, there is no specific settings needed" (the owner); its line reads "Any filament, and no special settings", the files checked at a 0.4 mm nozzle and 0.2 mm layers, in the draft and in [`printables.md`](printables.md) | 18 Oct 2026 |
| A255 | **The design system's session is told what this page built that it lacks**, a number stepper and a group toggle (D250 c, h), with the theme script as a file and the hidden-list trap (C179, C253); adding them is its decision. Sent 18 Oct 2026 | 18 Oct 2026 |
| D257 | **The printer's maker is a field of its own**, as boards and connectors are (D256): "Printer", the safe default, Custom and a button for each maker; after it a field titled for the choice, "Prusa printers" with the maker's models and its bed, or "Custom bed" with the width and depth; none on the safe default (the owner: "company should be in a separate box than machine") | 18 Oct 2026 |
| T193 | **The slot clips tried** (relayed, 19 Oct 2026): "The ribbed version holds to the 2 dot peg and to the Ikea original really well. The clip, clips in but doesn't hold. They are both flush. I think the ribbed version is better." Read as (inferred): the ribbed clip holds well in the fit coupon's slot with 2 dots, 0.1 mm clearance (D67), and in an IKEA board, whose slots are about the page's starting 0.2 mm (D40); the lip clip snaps in but does not hold; both clips' pegs end flush with the board's front, as D250 a asked. The ribs are already the starting grip (D194) | 19 Oct 2026 |
| A254 | **The Printables draft's slot clips are the new defaults**: its three clip files replaced by `skadis-slot-clip-2-boards-15mm-screw`, `-2-boards-stacked-15mm-screw` and `-4-boards-15mm-screw` (pegs flush, a screw first; 13 of 13 files pass the STL check), and its clip picture by a new one, which Printables puts last as it does not reorder by dragging; saved as a draft, checked after a reload, still unpublished. Approved 18 Oct 2026 for once the clips work, which T193 found | 19 Oct 2026 |
| D259 | **The design system's v0.6.0 is adopted**, as an item of its own (`design-system-v060`): its Stepper in place of the page's own arrows (C253), its `hidden` without the wrapping divs (C179), its `theme-init.js` in place of the page's (keyed `skadis-air-theme`), and its steps from the release's "Moving to it" (the owner's "259 a"). Built 19 Oct 2026 (C262): of its steps, the menu's close, the button's short label and the Stepper applied; the header shows no version, so the version step did not | 19 Oct 2026 |
| D260 | **The printer list is the design system's Select**, one row in place of five: the safe default, Custom and the 7 makers; every maker's models stay buttons, the same for each maker (the owner's "260 a"). Built 19 Oct 2026 (C263) | 19 Oct 2026 |
| D261 | **The lip grip is taken out**, as it snaps in but does not hold (T193): the slot clip's pegs grip by ribs alone, and the Printables text loses "a snap lip in place of the ribs" (the owner's "261 a"). Built in `9c78e56`, the ribbed parts byte for byte as before; the draft's line now reads "a screw or a keyhole to fix it to the wall, or neither", saved and checked after a reload | 19 Oct 2026 |
| D238 | **Standoffs start at 15 mm**: the boards' standoffs, the standoff connector and the slot clip's depth, so the parts of one wall still match; IKEA's spacer stays 20 mm (`WALL_DISTANCE_MM`), the owner's choice | 17 Oct 2026 |
| D239 | **The Printables draft's standoff and slot clip files are made again at 15 mm** and replace the 20 mm ones, as its files are the page's starting values | 17 Oct 2026 |
| A224 | **The code review's other findings are fixed**, each with its test first, and released as `v0.2.1` before the Printables files are made again | 16 Oct 2026 |
| Q18 | The owner's own plate-connector attempt is **not used**; the seam plate is designed afresh | 12 Oct 2026 |

## Open questions

`board-lightened` and `mounting-ikea` were planned and built on 15 Oct 2026 (D141 to D147, D155 to D158; C148 to
C150, C159, C160; the backlog rows have the results). Waiting on the owner:

`conn-slot-clip` was built on 16 Oct 2026 (D187 to D189; C191, C192; the backlog row has the result;
[figure](figures/slot-clip.png)).

`keyhole-pads` was built on 16 Oct 2026 (D190, D191; C198; the backlog row has the result). The owner then asked
for a lip or friction ribs on the slot clip's pegs, a screw or a keyhole on the clip, and walls larger than 1.6 m,
drawn without slowing or crashing the page (16 Oct 2026), and answered D194 to D197. Measured that day, the page builds each kind of panel once,
2 kinds for a 1.6 m wall, in 0.1 s (solid) to 2.6 s (skeleton), but draws every panel in full: 56 panels and 2.6,
3.9 and 4.9 million triangles for the solid, lightened and skeleton boards on a 250 x 210 mm bed. A wall of
4 x 2.5 m would draw about 10 to 20 million.

`clip-grip-fixing` was built on 16 Oct 2026 (D194, D195; C199), then `wall-grid` (C200) and `wall-detail` (D196,
D197; C203 to C205) and `design-system-v050` (D202, D206, D207; C208, C209); the backlog rows have the results.
Building next: the release and the Printables page (`printables-entry`, D211 to D214).

`v0.2.0` was released and the Printables files and pictures made (16 Oct 2026); a code review then found 15
faults, fixed in `review-findings` (D222, D223, A224; C225 to C231) for `v0.2.1`. The draft on Printables is
made in the owner's browser, once it is connected again (T219, done 17 Oct 2026): saved as model 1880460, unpublished.

- **T215** Photos of printed parts for the Printables page, before it is published: the contest asks for at
  least one printed part, and closes on 22 Oct 2026 at 23:59 UTC.

- **T151** Print the 80 x 80 mm lightened board on keyholes and hang it: `.check/test-print/skadis-trial-keyhole.stl`
  (`node scripts/test-print/write-trial-plate.mjs keyhole`; `skadis-lightened-80x80-keyholes-standoffs-15mm.stl` from
  the page), sent again 17 Oct 2026 for the owner to slice. The keyholes are in the top standoffs' wall faces,
  behind the top corner slots, with a hook's room behind those slots (D235, D244); printed face down, their 1.5 mm
  lips are a ledge about 2.25 mm wide over the head's channel; the bottom standoffs stand behind the bottom corner
  slots (D245). Put two 4 mm pan-head screws in the wall 40 mm apart
  and level, their heads standing about 5 mm out (the underside 1.5 to 1.8 mm off the wall); push the board on with
  the heads through the wide entries, let it drop, and put an IKEA hook in each corner slot and in another.
  Then say how the lips printed, whether the heads went in and held behind them, whether the board sat snug and
  straight, whether the hooks sat straight, and what it weighs.

## Inputs from outside this repository

- The design system's v0.6.0 (D259), from its session on 19 Oct 2026 (relayed): the tag `v0.6.0` on `020baf0`,
  signed, its CI green in Chromium, WebKit and Firefox, the repository now public; it answers A255 with the Stepper,
  `hidden` that always hides, `theme-init.js` as a file, the fold button for a row of buttons, and the Select. The
  steps are its release's "Moving to it", which also lists how the page's own stepping differs from the Stepper's.
  Its history was rewritten to remove a hostname: `v0.5.0` and `v0.5.1`, which this page copied, are on the owner's
  Gitea, re-signed, and no longer on GitHub.

- The design system's v0.5.0 (D202), from its cloud session on 16 Oct 2026 (relayed): the tag object 06aec76 on
  38b9cae, signed and verified, its CI green; it supersedes v0.4.0 (on 691bca9). Copy it with
  `scripts/design-system/copy-design-system.sh`, name it in `web/public/design-system/README.md`, and apply the
  "Moving to it" steps of v0.4.0 and then v0.5.0 from its `CHANGELOG.md`.

- The owner's unfinished plate connector in his workshop repository (commit b68a17a) is not
  used (Q18).
- The design-system adoption plan (D111): `docs/adoption-skadis-air.md` in
  `AlonRR/printable-parts-design-system`, at `0bc6d62` on its `main`; the files to copy are at
  its tag `v0.1.0`, commit `aa3188e` (verified with `git ls-remote` and the GitHub API,
  14 Oct 2026). Its sessions do not push to this repository. Two findings from its own checks,
  for the browser tests here: a full-page screenshot of a page wider than the phone viewport
  turns touch emulation off for later pages in the same context (use a fresh page, and take the
  screenshot last); and load every font face and wait for a layout before checking fonts, as
  `document.fonts.ready` alone raced once in CI.
- The design system's v0.3.0 (tag `abbe841` on `937f5c3`), relayed by its session on 15 Oct 2026 (its D18): it
  carries the rules this page had added, and a rule the page lacks goes to it rather than into local CSS. One
  thing for it, seen in the comparison (C154): on a 320 px screen the two buttons under the 3D view wrap inside
  their group and sit on the left, one above the other, while on a 390 px phone they sit on the right.
  A second (C179): a `hidden` attribute does not hide a `.ws-btn`, whose display the bundle sets; the page hides
  its download button by its style instead.
