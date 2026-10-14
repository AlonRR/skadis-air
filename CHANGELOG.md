# Changelog

All notable changes to this project are recorded here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- A fit test coupon, chosen on the page like a board: four slots at four clearances, told apart by
  dots, to find the clearance that fits your printer before printing a whole board.
- Screw holes in the solid board, one in each corner, countersunk (the default) or for a round head,
  for 3 to 5 mm screws; and standoffs on the back as an option, 20 mm tall unless set, hollow for the
  screw, so the board stands off the wall and hooks have room.
- The first connector: a standoff, a hollow spacer between a board and the wall at a corner screw hole,
  20 mm tall unless set. Connectors are listed under their own heading, below the boards.

### Changed

- The STL lies as boards are printed: face down, the back up, turned over from the way the page shows
  the board, so its sides keep their places once it hangs.

## [0.1.0] - 2026-10-12

The first version: a solid board, set up on the page, shown in 3D and downloaded as STL. Nothing in it has been test-printed yet.

### Added

- The plan: the decisions, the backlog, the SKÅDIS dimensions with their sources, the survey of
  published boards and connectors, and a figure of the connector types.
- Repository conventions: commit hooks, licences in the REUSE layout, the publish status.
- A figure of how tiles keep the slot grid across a seam, and the ultralight board's measurements.
- The page's skeleton: the geometry library and the page as one npm workspace, the Manifold engine
  started in the browser, and a browser test of the built page.
- The solid board in the library: 40 mm tiles cut through slot centres, each side open or closed,
  5.2 × 15.2 mm slots with a 1 mm chamfer, 10 mm corners where both sides are closed; and an STL check
  of sample boards through scad-tools and PrusaSlicer.
- The page's form, built from the list of board types: size in 40 mm steps with its tiles shown,
  thickness with a warning outside 4 to 5.5 mm, the four sides as toggles, the fine settings under
  Advanced; the board rebuilt as the settings change. `docs/extending.md` says how a type is added.
- A 3D preview of the board as it hangs, in light grey, turned by dragging and zoomed by scrolling,
  with a Reset view button; a message instead where the browser has no WebGL.
- A Download STL button: the board as a binary STL lying as it prints, named for its type, size and
  closed sides; offered only while the settings make a board.
- The printer bed: 200 × 200 mm unless set, or a custom size; a board larger than the bed is warned
  about and can still be downloaded.
