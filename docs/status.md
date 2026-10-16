# Status and plan

Working document: the brief, every decision so far, and every open question. Keep it current;
a fresh session resumes from here.

Last updated: 16 Oct 2026. Phase: **building**. `v0.1.0` is released (12 Oct 2026); since then the boards print face down (D66), the fit coupon is a board type, the project is named Skådis Air (D79), Gitea and the GitHub copy are kept in step (A77), and **`mounting` is done** (14 Oct 2026): corner screw holes for 4 mm screws (D76), countersunk or round, and optional standoffs on the back (D73 to D75), with the visible picks kept (D88). The repositories are renamed `skadis-air` on Gitea and GitHub (A80, T89); the local folder is renamed between sessions. Keyhole heads and corner holes kept as an option (D130) are in `mounting-ikea`; IKEA's own board has none, its spacer held through a peg slot by a screw with a nub (T17). **`conn-standoff` is done** (D91 to D94, D97): a standoff for 1, 2 or 4 boards under "Connectors", the shared ones with a tunnel for hooks, sized from a replica of IKEA's hook on Printables (T98). A **seam-test pair** (D69) prints with the fit coupon, to test how tiles join. The first test print (the coupon and the pair) and a real board are measured (T109, T17, 15 Oct 2026): the sources' SKÅDIS numbers hold, a slot drawn at 0.2 mm prints at the wide end of the board's slot width and about 0.3 mm shorter than its slot, and the grid holds across the seam, so the default clearance stays 0.2 mm (D129). **The repository is public on GitHub** (D103, T132, 15 Oct 2026), and pushes keep it in step with Gitea (D134); Pages is on, and a workflow publishes the page there after each green checks run on `main` (T132); the first deployment was checked live (15 Oct 2026), and the page has a tab icon (D137). The page has the shared design system's fonts, colours and dark theme (`design-system-base`, D111, D113) and its controls, every choice as buttons (`design-system-controls`, D112), and is its workbench: the board in a stage it always fits, beside the form or above it on a phone, with a theme toggle (`workbench`, D123). **`board-lightened` is done with full-depth members** (D141 to D145, 15 Oct 2026): about 41 % of the solid board's plastic, measured; the I-beam the owner asked about goes to the skeleton board, on the same lattice (D146, D147), and the test print is T151. The design system's v0.3.0 is in (D153, 15 Oct 2026), and **`mounting-ikea` is done** (D155 to D158): keyholes in the top two corners, with lock screws at the bottom as an option. **`board-skeleton` is done** (D146, D147, D161): every rim and web an I-beam, 32 % of the solid board's plastic. Every build now runs in the background (D166, `build-worker`), and the page offers 30 printers by maker (`printer-presets`, D170 to D172). **`tiling` is done** (D175 to D178, 16 Oct 2026): walls of panels that fit the bed. 3MF and a wall's files in one download followed (D181 to D183, `download-3mf-zip`). Boards join with the slot clip, not a seam plate (D185). Next: `conn-slot-clip`, its questions D187 to D190 asked. The evidence for the board types and
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
| D155 | **A keyhole sinks the screw head in a channel from the front**, 3.5 mm deep for a 4 mm screw, below the face, with 1.5 mm of board behind it ([figure](figures/keyhole.png)) | 15 Oct 2026 |
| D156 | **Keyholes go in the top two corners**, so the board lifts straight off its screws; **countersunk lock screws at the bottom two corners are an option** | 15 Oct 2026 |
| D157 | **A keyhole's sizes follow the screw size**: the head twice the screw, the entry 1 mm wider, the slide as long as the entry, the slot the screw's hole, the channel the head's height and 0.3 mm (9, 9, 4.5 and 3.5 mm for a 4 mm screw); a board that would keep less than 1.2 mm behind the channel is refused, saying so | 15 Oct 2026 |
| D158 | **Standoffs are refused with keyholes**, as a keyhole hangs the board flat on the wall; on the lightened board the whole keyhole and 2 mm round it stay solid | 15 Oct 2026 |
| D161 | **The skeleton's rims taper at 45 degrees like every other member**, so they stay 2.1 mm wide through the middle of a 5 mm board rather than reaching 1.2 mm: about a third of a solid board's plastic, and no face overhangs more than 45 degrees | 15 Oct 2026 |
| D166 | **Every build runs in the background**, so the page always answers while a board is made: the build moves to a web worker, before the next item | 15 Oct 2026 |
| D167 | **The next items are all four P1 rows offered**: `printer-presets`, then `tiling`, then `download-3mf-zip`, whose zip holds a wall's parts, then `conn-seam-plate`; each asks what a user would see before it is built | 15 Oct 2026 |
| A168 | **The Manifold speed traps go into `engineering-practices`**, as A140's did | 15 Oct 2026 |
| D170 | **A printer is chosen by its maker, then its model**: under "Printer bed", the two choices there now and a button for each maker; a maker shows a second row of its models, all as Choice buttons | 15 Oct 2026 |
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
| Q18 | The owner's own plate-connector attempt is **not used**; the seam plate is designed afresh | 12 Oct 2026 |

## Open questions

`board-lightened` and `mounting-ikea` were planned and built on 15 Oct 2026 (D141 to D147, D155 to D158; C148 to
C150, C159, C160; the backlog rows have the results). Waiting on the owner:

`conn-slot-clip`, asked on 16 Oct 2026 ([figure](figures/slot-clip.png)). D185 replaced the seam plate with the
slot clip: a part behind a seam with pegs in the slots either side, needing no screw holes. Its pegs go in the
nearest whole slot each side of the seam, 20 mm from it and 40 mm apart, a layout that crosses no slot and leaves
every seam slot free; pegs in the shared seam slots would keep the boards in line along the seam but not stop them
parting across it. Boards one above the other take the same part turned a quarter.

- **D187** Where the clip sits and what keeps it on: (a) behind the boards, as deep as the gap the standoffs leave
  (20 mm unless set, D75), so once the boards are up it is trapped between them and the wall, with plain pegs and
  nothing that bends; between its pegs it stands 8 mm clear of the boards' back (C99's room for a hook), so a hook
  fits in every slot the pegs leave free. It goes on the first board before that board goes up, held by hand or a
  strip of tape, and the next board goes onto its free pegs. (b) Behind the boards and 12 mm deep at any gap (C99's
  8 mm of room and 4 mm of bar), with split pegs whose lips spring over the front face: it can go in after the
  boards are up, but the lips show, and they bend as they go in, which can break a printed lip. (c) On the front: a
  bar on the face with pegs back into the slots; it works on any board, flat on the wall or not, but it shows, takes
  the face where things hang, and holds by friction alone. (a) and (b) need room behind the boards, which a board on
  keyholes lacks (D190): D185 (d)'s "working with keyholes" holds only if D190 gives them that room. Recommended:
  (a).
- **D188** For 4 boards: (a) a square ring through the four whole slots round the point where the corners meet,
  40 mm on a side, leaving the slot they share free (figure); (b) a cross through the same four, using less plastic,
  its arms meeting behind the shared slot, still clear of a hook there when D187 is (a) or (b). Recommended: (a),
  stiff in every direction, with the same 10 mm bar as the clip for 2 boards.
- **D189** Its sizes and its place on the page: pegs the size of the slot as the board cuts it (5.2 x 15.2 mm at the
  default 0.2 mm slot clearance, D40) less a peg clearance of 0.4 mm (4.8 x 14.8 mm), the peg clearance a setting
  under Advanced; the slot prints 5.16 x about 14.9 mm (D129), so 14.8 mm along it is nearly tight, which a test
  print of the clip in a board settles. The pegs stop 2.5 mm short of the front face, so a two-peg hook hung above
  a clip may still put its second peg in that slot (the replica's second peg reaches "about 2 mm through" its slot,
  T98, which does not say from which face: inferred). The bar is 10 mm wide, as a standoff is (C83). On the page it
  goes under "Connectors" as "Slot clip", with "For": 2 boards, across a seam, or 4 boards, where four corners meet,
  as the standoff's "For" (D92); its depth on the main form, 20 mm by default, 12 to 40 mm, as the standoff's
  height; solid only (D92); saved as `skadis-slot-clip-2-boards-20mm.stl`. Counting the clips a wall needs into its
  print list waits for the backlog's note that connectors join a wall's files. Recommended: these.
- **D190** A board on keyholes has no room for a hook (inferred, found while planning D187): a keyhole hangs the
  board flat on the wall (D158), leaving no room behind it for a hook's back tab, which sits up to 6 mm behind the
  back face by the replica's measurement (T98, `<<CONFIRM>>` until a real hook is measured). So a hook probably
  cannot go fully into a board on keyholes, and no slot clip fits behind one. This session's record and the docs
  show no discussion of it when D158 was decided. T151 hangs just such a board with a hook, so printing it settles
  whether the problem is real. (a) Keyholes stand the board off: pads at its four corners, as tall as the standoffs
  (20 mm unless set, at least 8 mm, C99), the keyholes going through the top two, each screw resting in a slot
  through its pad; standoffs then go with keyholes, which reverses D158. (b) The same with pads 8 mm tall only, the
  least that lets a hook in: the screws stand less far out of the wall, but the gap is not IKEA's 20 mm, so IKEA's
  spacers and a 20 mm clip don't match it. (c) Keep boards on keyholes flat, for things that need no room behind,
  the page saying that a hook needs standoffs. (d) Take keyholes off the page until this is settled. Recommended:
  (a), once T151 shows the problem.

- **T151** Print a lightened board with keyholes and hang it: an 80 x 80 mm one is enough
  (`skadis-lightened-80x80-keyholes.stl` from the page, "Keyholes" under "Screw holes"), in the filament you
  choose. Hang it on two 4 mm pan-head screws and put an IKEA hook in it. Then say whether the rims and webs
  held, whether the heads went in and sat below the face, whether the hook sat straight, and what it weighs.
  Such a board hangs flat, so the hook may not go in (D190): printing it now shows whether that problem is real,
  or it can wait for D190's answer.

## Inputs from outside this repository

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
