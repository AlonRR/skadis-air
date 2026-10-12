# Status and plan

Working document: the brief, every decision so far, and every open question. Keep it current;
a fresh session resumes from here.

Last updated: 12 Oct 2026. Phase: **building** (plan approved, A19). `repo-bootstrap` is done and on Gitea; next is `page-skeleton`. The evidence for the board types and
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
| Q18 | The owner's own plate-connector attempt is **not used**; the seam plate is designed afresh | 12 Oct 2026 |

## Open questions

- **D15** How tiles line up at a seam: whole slots with a 40 mm step, every tile the same, or a
  20 mm step with every other tile turned 180°. The figure is
  [`figures/tile-seams.png`](figures/tile-seams.png).
- **T17** The owner's caliper measurements of his board (not blocking: sources first, Q3).

## Inputs from outside this repository

- The owner's unfinished plate connector in his workshop repository (commit b68a17a) is not
  used (Q18).
