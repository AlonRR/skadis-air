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
