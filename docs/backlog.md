# Backlog

Every piece of work the decisions in [`status.md`](status.md) call for, ordered by priority and
then by expected ease. **Approved 12 Oct 2026** (A19). Priorities and ease are
estimates (inferred), not measurements. Each row names the decision it comes from, so a changed
decision shows which rows move.

## The first version (D16)

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
| `skadis-standard` | [`skadis-standard.md`](skadis-standard.md) reviewed; the survey read in full for anything that must not be published | P0 | S | `repo-bootstrap` | Q3 | | yes | None |
| `page-skeleton` | The page and the geometry library as one npm workspace: Vite, TypeScript, Vitest, Playwright, oxlint, Prettier, Manifold loaded; a browser test that the built page builds a part | P0 | S | `repo-bootstrap` | D2 | | | None: the reference has it (C32) |
| `board-solid` | The solid board: the slot grid, margins, outline and corner radius, thickness. Geometry tests (slot count, pitch, volume), each with a control that must fail; the exported STL is one closed body by scad-tools' `stl-mesh.py` and slices in PrusaSlicer | P0 | M | `page-skeleton` | D2, D11 | slot fit | yes | None significant |
| `registry` | Board types, options and connectors as one list; the page's controls and the file names derived from it; a contract test over every entry, with a test-only entry | P0 | M | `board-solid` | D6, D11 | | | None: the reference has the pattern |
| `preview-3d` | 3D preview, updating as the settings change | P0 | S | `page-skeleton` | D2 | | | Triangle count of a large board (C32) |
| `download-stl` | Download the board as STL, named by type and size | P0 | S | `preview-3d` | D2 | | | None (C32) |
| `printer-default` | The largest board that fits a bed: a safe default plus custom; a warning when the board is larger | P0 | S | `registry` | D4 | | | None: bed sizes from the reference's verified list (C25) |
| `fit-coupon` | A small test piece of a few slots and the board's edge, to settle slot clearance and thickness before printing a whole board | P1 | S | `board-solid` | Q3 | yes | yes | None |
| `mounting` | Screw holes (round, countersunk, keyhole), integrated standoffs, and IKEA-compatible corner holes so IKEA's rail, spacers and joining plate fit | P1 | M | `board-solid` | D11, D14 | yes | yes | IKEA's hole positions are not published (T17) |
| `conn-standoff` | Connector 1: a standoff or spacer, screwed or push-in, of any height; under 1 board's corner, or shared by 2 or 4 boards where they meet; solid, lightened or skeleton (D13) | P1 | S | `mounting` | D13 | yes | | None |
| `board-lightened` | Lightened board: pockets between the slots, a rim kept round each slot; a first pattern, then more; a minimum web check | P1 | M | `board-solid` | D11 | yes | | Strength and hook fit of thin webs: test prints |
| `board-skeleton` | Skeleton (ultralight) board: rims round the slots tied by I-section beams, mostly open, as the owner's pick (Q12) does; beam size, wall count and standoff height as settings | P1 | L | `board-solid` | D11, Q12 | yes | | Stiffness under load and hook fit: users of the original report sagging and hooks that jam; its slots measure exactly 5 × 15 mm with no clearance ([measured](research/2026-10-12-ultralight-measured.md)) |
| `conn-seam-plate` | Connector 2: a plate behind the seam, fixed through the boards' corner holes, for 2 boards or for 4 where their corners meet; solid, lightened or skeleton; designed afresh (Q18, D13) | P1 | M | `mounting` | D13, Q18 | yes | yes | Matching IKEA's 404.776.46 needs T17 |
| `tiling` | A board larger than the bed split into tiles whose slot grid continues across the seams (D15); edge, corner and centre tiles | P1 | L | `printer-default` | D4, D15 | yes | | A straight horizontal seam leaves only 2.5 mm beside the slot ends |
| `edge-joins` | Joins built into the tile edges (tongue and groove, dovetail, a stepped seam) | P1 | L | `tiling` | D11 | yes | | Several rounds of test prints for the fit |
| `conn-slot-clip` | Connector 3: a bar behind the seam with a peg in a slot of each board, for 2 boards, or a cross for 4 (D13) | P1 | M | `tiling` | D13 | yes | yes | Peg fit in a 5 mm slot |
| `conn-angle` | Connector 4: boards at an angle (90°, 135°), inside or outside, joining 2 boards, or 4 where two meet on each side (D13) | P1 | M | `mounting` | D13 | yes | | None significant |
| `conn-desk-clamp` | Connector 5: holds 1 board, or the seam of 2, upright on a desk edge of a given thickness (D13) | P1 | M | `mounting` | D13 | yes | | Clamp force in printed plastic |
| `printer-presets` | The printer list, from the reference's verified bed sizes | P1 | S | `printer-default` | D4 | | yes | None |
| `download-3mf-zip` | 3MF, and every tile and connector of a wall in one zip | P1 | M | `download-stl` | D4 | | | None: the reference writes 3MF (C32) |
| `outline-shapes` | Outlines other than a rectangle: hexagon, triangle, round | P2 | M | `registry` | D11 | | | Where the slot grid sits in a non-rectangular outline |
| `face-patterns` | More pocket patterns for the lightened board (hexagon, Voronoi, decorative) | P2 | M | `board-lightened` | D11 | yes | | Minimum web per pattern |
| `offline-file` | The page as one file that works offline (about 0.7 MB with Manifold, inferred by the reference) | P2 | S | `download-stl` | D2 | | | None |
| `extending-doc` | `docs/extending.md`: where a new board type, option or connector goes, and which test fails if a step is missed | P2 | S | `registry` | D6 | | | None |
| `pages-deploy` | The site built for GitHub Pages; live only when the owner publishes | P3 | S | `download-stl` | D7 | | | The owner's decision (D7) |
