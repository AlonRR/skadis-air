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
- A seam-test pair beside the fit coupon: two small tiles that push together into one slot across a
  seam, to check how tiles join before printing a tiled wall.
- Continuous integration on GitHub: every commit hook, the identity of every pushed commit, a
  full-history secret scan, and the type check, lint, formatting, unit and browser tests.
- The page is published at <https://alonrr.github.io/skadis-air/>, rebuilt from every change that passes
  the checks.
- A tab icon: five slots of a SKÅDIS board in the page's blue, lighter when your system is set to dark.
- A skeleton board, listed after the lightened one: the same lattice with every rim and web an I-beam, full width
  at both faces and narrowing at 45 degrees to a 1.2 mm core through the middle, so it prints face down with no
  face overhanging more than 45 degrees. A 160 x 160 mm board takes about 32 % of the solid board's plastic. The
  core can be set under "Advanced", from 0.8 mm, with a warning under 1.2 mm.
- Keyholes, a choice among the screw holes: in the top two corners, so a board drops onto two pan-head screws
  and lifts off them, the head sunk in a channel from the front; countersunk lock screws at the bottom as an
  option under "Advanced". Standoffs are not offered with them.
- A lightened board, listed after the solid one: open pockets cut through it between the slots, a 3 mm
  rim round each slot joined to its four nearest neighbours by 3 mm diagonal webs, a solid band along
  each edge and a pad round each screw. A 160 x 160 mm board takes about 41 % of the solid board's
  plastic. The rim and the webs can be set under "Advanced", from 1.2 mm, with a warning under 2 mm.
- The first connector: a standoff, a hollow spacer between boards and the wall at their corner screw
  holes, 20 mm tall unless set, for 1 board, or for 2 or 4 where their corners meet; the shared ones
  leave a tunnel along the seam, so hooks fit behind them. Connectors are listed under their own
  heading, below the boards.

### Changed

- The page takes the design system's v0.3.0, which holds the rules the page had added itself. A warning is
  now outlined in the warning colour as well as headed in it; on a phone the buttons under the 3D view sit
  on the right under the status line, and on a 320 px screen they wrap instead of making the page scroll
  sideways.

- The page takes the look of the shared design system for printable-part tools: its fonts and
  colours, and a dark theme that follows your system setting, the 3D preview included.
- Every choice on the page is a row of buttons instead of a list: the board or connector, under
  "Boards" and "Connectors", the screw holes, the standoffs and the printer bed. Each side of a board is
  a button that is ticked when the side is closed, and a warning shows in a box beside what it concerns.
- The page is laid out as a workbench: the 3D view fills the screen beside the settings, or sits above
  them on a phone, with the download and "Reset view" just under it; a header holds a dark theme switch,
  which the page remembers. The board always fits the view: framed to fill most of it, pulled back if the
  window shrinks, and never zoomed out to a dot.
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
