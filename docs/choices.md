# Choices made without asking

Working notes. The owner has the agent build the option it would recommend for implementation
details nobody using the page would see, and list each one here with the options not taken
(D6, 12 Oct 2026). Anything a user would see, or that changes the design, is asked instead.
To change a choice, name its ID; a changed choice moves to the decisions in
[`status.md`](status.md).

**IDs share one number pool with the questions** (`C20` cannot exist beside a `D20`), so a
number alone always names one item. A withdrawn choice keeps its row and its number.

| ID | Item | Choice made | Other options |
| --- | --- | --- | --- |
| C20 | `registry` | **The list of settings lives in TypeScript**: each board type, option and connector declares its settings (name, label, unit, default, range, help, when shown) once, and the page's controls and the file names are derived from it. A contract test runs over every entry, and a test-only entry with a missing piece must fail it | A JSON file read by the page; each control written by hand |
| C21 | — | **Withdrawn 12 Oct 2026 (D2: no OpenSCAD).** Was: the `@lofcz/openscad-wasm` build | — |
| C22 | — | **Withdrawn 12 Oct 2026 (D2).** Was: the slot grid moves to scad-tools `lib/` later | — |
| C23 | — | **Withdrawn 12 Oct 2026 (D2).** Was: checks run OpenSCAD 2021.01, named in `OPENSCAD` | — |
| C24 | `repo-bootstrap` | **scad-tools as a submodule at `../scad-tools.git`**, the relative address the owner's other projects use, so it resolves on Gitea and on GitHub alike | The GitHub address; the Gitea address |
| C25 | `printer-default` | **Bed sizes from the reference's [`printer-beds.md`](https://github.com/AlonRR/parametric-window-sealer/blob/main/docs/printer-beds.md)**, read from the makers' sites on 5 Oct 2026, copied with their sources | Research the beds again |
| C26 | `page-skeleton` | **The reference's web tools, pinned exactly**: Vite, TypeScript, Vitest, Playwright, three.js, oxlint, Prettier, `manifold-3d` | Another bundler or test runner; a framework such as React |
| C27 | Process | **The backlog lives in [`backlog.md`](backlog.md) only**, with no forge issues for now (D7: Gitea first) | Gitea issues mirroring the backlog, as the reference does on GitHub |
| C28 | — | **Withdrawn 12 Oct 2026 (D2).** Was: OpenSCAD in a Web Worker, no download after a failed assert | — |
| C29 | — | **Withdrawn 12 Oct 2026 (D2).** Was: the models laid out as scad-tools' `project-layout.md` | — |
| C31 | `repo-bootstrap` | **scad-tools stays, for its STL checks only**: `stl-mesh.py` judges every exported part as one closed body from its own edges, and its slicing step slices it in PrusaSlicer. It holds no model of this project's | No scad-tools at all, and checks of our own; the reference's checks alone, which do not slice |
| C32 | `page-skeleton` | **The reference's own code is copied in where it fits** (STL and 3MF export, the printer list, the three.js preview, the form reading, the download dialog), each file saying where it came from; both repositories are the owner's and MPL-2.0. A package shared by both waits until both are stable (D5) | Depend on the reference's library package; extract a shared package now; write them afresh |
| C33 | Docs | **The documents credit each published design they cite by its page and its designer's handle**, as the designers' licences ask (CC BY and its variants require attribution); nobody else is named, and the IKEA designer's name in the survey is the one other name, as IKEA's page gives it. `.repo-status` keeps "review the survey before publishing" as a blocker. This is wider than the owner's general rule, which names no exception for credits | Cite each design by its page alone, with no designer named |
| C36 | — | **Changed by the owner 12 Oct 2026 → D37.** Was: a single board starts closed on every side; when split, the sides between tiles are open | — |
| C38 | `page-skeleton` | **The npm packages are `skadis-ultralight-generator` (the library) and `skadis-ultralight-generator-web` (the page)**, after the repository's name (D9), and renamed with it; neither is published. Copied in from the reference (C32): the engine module and its test, the browser test, and the TypeScript, Vitest, Vite, Playwright, oxlint and Prettier configurations | `skadis-board-generator`; a scoped name such as `@alonrr/skadis` |
| C42 | `board-solid` | **A board is built as it hangs**: x across, y up the wall, its front toward +z; the download turns it over to print face down (D66). Changed 12 Oct 2026 with C58 and D66 | Built as it prints |
| C43 | `board-solid` | **The library takes any thickness thicker than the two slot chamfers together**; the page will warn outside 4 to 5.5 mm, the range IKEA hooks accept (with `registry`) | Refuse thicknesses outside 4 to 5.5 mm |
| C44 | `board-solid` | **The STL check runs on five sample boards** (1 × 1 open and closed, 2 × 2 with two sides closed, 3 × 2 closed, 6 × 5 open, the largest a 250 × 210 mm bed takes), by `npm run check:stl`, on a machine with PrusaSlicer; it is not part of the unit tests | Every size up to the bed; inside the unit tests, which would then need PrusaSlicer |
| C49 | `registry` | **The list is of board types for now**; connectors get theirs, built on the same settings, with the first connector (`conn-standoff`), so it is shaped by a real one | One list of boards and connectors now, with no connector to test it |
| C50 | `registry` | **The page opens on a 160 × 160 mm board** (4 × 4 tiles) | 80 × 80 mm; the largest the default bed takes |
| C51 | `registry` | **A single board is 40 to 400 mm a side** (1 to 10 tiles), the largest size published boards come in, until `printer-default` warns against the bed and `tiling` makes walls | No upper limit |
| C52 | `registry` | **File names say the type, the size and the closed sides**: `skadis-solid-240x200.stl`, `skadis-solid-160x160-closed-left-bottom.stl` | A running number; the sides as letters (`-c-lb`) |
| C53 | `registry` | **The fine settings' ranges**: thickness 2.5 to 10 mm in 0.1 mm steps, slot clearance -0.5 to 1 mm in 0.05 mm steps, chamfer 0 to 2 mm, corner radius 0 to 20 mm | Narrower ranges |
| C54 | `registry` | **The board is rebuilt 150 ms after the last change**, and a line under the form says "Board ready" with its size and file name, or what is wrong; the preview takes its place with `preview-3d` | Rebuild on a button |
| C58 | — | **Changed by the owner 12 Oct 2026 → D66** (boards print face down). Was: the front is the face printed on top | — |
| C59 | `preview-3d` | **The preview sits under the form**, as wide as the page, 3 : 5 high; the board is outlined where faces meet at 30 degrees or more, so its edges and the slots' rims show but not the facets of their round ends | Beside the form; no outline |
| C63 | `download-stl` | **The button is disabled until a board exists**, and the STL is the very solid the preview shows, written by the library's writer | Always enabled, with a message when there is no board |
| C65 | `printer-default` | **The bed is a list, "Safe default: 200 × 200 mm, most printers" or "Custom"**, in a Printer section under the board's settings, so `printer-presets` adds printers to the same list; a custom bed is 50 to 1000 mm each way, and the board fits it either way round, edge to edge | Two size boxes and no list; a margin kept free round the board |
| C70 | `fit-coupon` | **The coupon is a board type on the page**, "Fit test coupon", second in the list, with its first clearance, its step, its thickness and (under Advanced) its chamfer as settings; its file is named for its thickness and clearances, `skadis-fit-coupon-5mm-0-to-0.3.stl` | A separate button and fixed settings |
| C71 | `fit-coupon` | **The dots are 1.6 mm across and 0.6 mm deep, 3 mm apart, 6 mm below each tile's top edge**, recessed into the front face, which prints on the bed (D66) | Raised dots; numbers, which need a font |
| C72 | `fit-coupon` | **The STL check's samples are built through the list**: every type at its starting values, and the solid board's five edge cases | A hand-written sample per type |
