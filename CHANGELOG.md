# Changelog

All notable changes to this project are recorded here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- The skeleton board prints lighter (D314). Printed face down, each rim and web now steps straight to its core just
  behind the front face, where it narrowed at 45 degrees, and narrows at 45 degrees from the back alone; the full
  width at the faces is 0.4 mm deep, where it was 0.6 mm, and the core 0.9 mm, where it was 1.2 mm. A core under
  0.9 mm, two lines of a 0.4 mm nozzle, is warned about, where it was one under 1.2 mm.

### Fixed

- The skeleton board's members are never narrower than the core: the web leaving a half slot at a side edge was
  0.84 mm at the middle of the board, with a 1.2 mm core.
- A board still being made when the form turns invalid is dropped: it used to arrive later and say "ready", with the
  download on, for values the form no longer held.

## [0.4.2] - 2026-10-22

### Fixed

- On the lightened and skeleton boards, the standoffs behind the corner slots (keyholes, lock screws) take the
  outline of the frame round their slot, 13 x 23 mm with the starting 3 mm rim, so none stands past it over a pocket.
  Where a 5 mm keyhole or a narrow rim needs a larger standoff, the frame grows round those slots. The solid board's
  standoffs are as before.

## [0.4.1] - 2026-10-22

### Changed

- The design system's v0.8.0: each icon sits on its label's capitals, 0.5 to 1.75 px higher than before (the theme
  toggle, the view's buttons and the download button), and in the dark theme the board drawn in "Sides" is darker
  than the panel round it.

## [0.4.0] - 2026-10-21

### Added

- "Open sides": a board's open sides can run between the slots, midway between two columns of them or across
  the plate between two slots' ends, so every slot is whole; through the slots stays the start. A board with
  one side of a pair open and the other closed is 10 mm larger or smaller that way, and a wall's panels still
  add up to its size. A corner on such a side has no screw, which would land on a slot; keyhole and bottom
  standoffs stand behind the slot nearest their corner that keeps them on the board.
- The slot clip for seams between the slots ("Seam"): a peg in the nearest slot each side, 10 mm from the seam and
  a row apart, its bar on the diagonal, for boards side by side or one above the other; its screw goes past the
  second board's post.
- "Lock screws" among the screw holes: a board held by four lock screws, one through a slot at each corner into
  the standoff behind it, in place of keyholes; every slot still takes a hook.

## [0.3.0] - 2026-10-21

### Added

- Under the screw size, what each screw passes, from the part's own settings: "20 mm of board and standoff, plus
  your wall plug", or where a keyhole's screw stands out of the wall.
- The slot clip's screw can have a round (pan) head, sunk in a counterbore below the bar's face ("Screw head" under
  Advanced); countersunk stays the start.
- Boards or connectors is a toggle at the top of the form, in a field of its own, "What to make"; the next field,
  titled "Board" or "Connector", shows the types of the one chosen.
- The choices are kept in the browser: switching between types, or reloading, loses none of them, and a board's
  size goes on to the next board.
- Arrows beside each number field for larger and smaller, by the setting's own step; the arrow keys do the same.
- A wall's list of files is folded away under "Download all", with "Show files" beside it.

### Changed

- The page at <https://alonrr.github.io/skadis-air/> is the latest release, built from its tag, where it was
  `main`'s newest commit: what it makes is what a release holds.
- The page takes the design system's v0.7.0: beside the form, the bar under the 3D view keeps one row, its
  button reading "Download" (its format still read out to a screen reader), and the hints under it are cut
  short; a phone held sideways, from 800 x 360, shows the 3D view beside the form.
- The lightened and skeleton boards' pockets turn each corner, where a web meets a rim, the band or a pad, on a
  parabola 3 mm along each side, in place of a 1 mm round; the skeleton's I-beams taper along the curves. They
  keep a little more of the solid board's plastic: 40 % and 32 %, from 39 % and 30 %. The skeleton's STL is larger,
  7.5 MB at 240 x 200 mm where it was about 4 MB, after the points its straight walls do not need are taken out.
- The standoff has the slot clip's shape and choices: a post over each screw hole, joined only on the wall side by a
  bar as wide, a square ring for 4 boards; for 1 board, 2 side by side, 2 one above the other, or 4. In the library,
  `StandoffParams.boards` takes `'1'`, `'2'`, `'2-stacked'` or `'4'`, in place of 1, 2 or 4. `TUNNEL_WIDTH_MM` is no
  longer exported, as the standoff has no tunnel cut.
- A board's outer edge is chamfered 1 mm, the connectors' chamfer: at the front all round, so two boards meet in a V
  groove, and at the back where a side is closed. Its own standoffs are chamfered 1 mm at the wall, their screw holes
  0.5 mm.
- A board's round head is sunk in a counterbore, flush with the front, where the board leaves 1 mm under it; it stood
  on the front before. The screw note counts the board under the head.
- The standoff and the slot clip have a 1 mm chamfer round their outside edges, the wall face's included, and a
  0.5 mm one at each end of a screw hole; the clip's bar and the 2-board standoff's bridge run into their posts on long
  curves, and the standoffs' tunnels are chamfered where they meet the board.
- The slot clip's pegs are chamfered 0.8 mm at their root, where they meet their posts, inside the slot's back
  chamfer, so a levered board does not snap them at a sharp corner.
- The printer's maker is a field of its own, "Printer", a dropdown list of the safe default, Custom and the 7
  makers (the design system's Select); the next field, titled for the maker ("Prusa printers") or "Custom bed",
  holds its models, as buttons, or the custom size.
- The theme is set by its own script file, before the page is drawn, not by a script written into the page.
- The slot clip's ribbed pegs reach the front of a 5 mm board, flush with it; they stopped halfway before. A clip
  starts with a screw, and a screw size other than 4 mm is named `-screw-3.5mm`.
- On a lightened or skeleton board on keyholes, the slots behind which the standoffs stand keep the same rims as
  every other slot: no solid pad round them.
- The design system's v0.5.1: the wide header and the space under each legend and above each note.
- The design system's v0.6.0: the arrows beside a number field are its Stepper, faded and doing nothing at a
  limit, and a value typed finer than the step keeps its decimals (0.275 less 0.05 is 0.225); every field is a
  button's height; the View... menu closes once a view is picked; on a phone the download button reads
  "Download"; the theme is set by the design system's own file.
- Keyholes are in the top two standoffs, cut in their wall faces as the slot clip's keyhole is, so the board's
  face is plain and the screws stand about 5 mm out of the wall. Each standoff stands behind a top corner slot,
  as IKEA's spacer does, with room cut for a hook behind that slot, and the bottom standoffs stand behind the
  bottom corner slots the same way. Lock screws go in through those slots, head and all, the head in a recess
  behind the hook's room, so the slots still take hooks: a 2.5 mm screw unless set ("Lock screw size"), and a
  larger one gets a groove in the slot's sides to pass. They take screws of 3 to 5 mm on boards at
  least 80 x 80 mm, and standoffs at least 14.2 mm tall for a 4 mm screw. The old keyhole, in the board's front,
  would not hold on the wall.
- Standoffs, the standoff connector and the slot clip start at 15 mm deep, not IKEA's 20 mm; any depth can still
  be set.

### Removed

- The slot clip's lip grip, which snapped into the slots but did not hold: its pegs grip by ribs alone, and "Grip"
  is gone from Advanced.

### Fixed

- The count under a board's size reads "= 1 tile" at one tile, not "= 1 tiles".

## [0.2.1] - 2026-10-16

### Fixed

- A size typed with a comma before three digits, such as "40,000", was read as 40 mm; it is now refused as
  unclear, and every field reads a number the same way. A number field the browser cannot read says so, rather
  than taking the starting value.
- A wall is refused larger than 1 km each way, so a slip of the keys cannot hang the page.
- Ctrl, Cmd or Alt with an arrow, + or - is left to the browser, rather than turning or zooming the 3D view.
- A view chosen while nothing is drawn is no longer kept chosen, and the 3D view's stage is named as its
  drawing is: the board, the wall or the connector.
- The slot clip's screw countersink no longer notches the post beside it.
- A slot clip with ribbed pegs is no longer refused at a peg clearance only the lip's slit needs room for.
- A large wall's far panels are painted with the wall's own slot size and chamfer, and are not rebuilt on
  every turn of the view.

## [0.2.0] - 2026-10-16

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
- The slot clip's pegs grip by ribs, or by a snap lip that catches in the slots of a 5 mm board; and the clip can
  be screwed to the wall through its free half or hung on a wall screw by a keyhole.
- Boards on keyholes stand on standoffs, so a hook has room behind them: choosing keyholes turns the standoffs
  on, and the keyhole's slot runs on up through the top two, where the screw rests.
- The slot clip, a connector that joins boards behind a seam by pegs in their slots, so it needs no screw holes:
  for 2 boards side by side or one above the other, or 4 where their corners meet. It is as deep as the gap
  behind the boards, so the wall holds it on, and leaves every other slot room for a hook.
- 3MF as well as STL: a choice beside the download. A wall's print list also gives every panel in one file, a zip of
  STLs with the print list in it, or one 3MF with an object for each kind of panel named with how many to print.
- The files and pictures for the Printables page: `npm run printables` makes a ready set of boards and connectors
  and checks each one; `scripts/printables/write-images.mjs` takes the pictures; `docs/printables.md` holds the text.
- The 3D view's own controls: Zoom in, Zoom out and Front, Back and Top beside Reset view, in a "View..." menu on
  a phone; the arrow keys turn the view and + and - zoom it. The page follows the design system's v0.5.0, and the
  file's format, STL or 3MF, is now chosen in the form, under "Printer".
- Walls of any size: the 3D view draws the panels near the camera, or zoomed in on, in full, and the rest of a
  large wall as flat plates with the slots shown, so it stays quick however large the wall. A wall's print list
  scrolls in its own share of the stage, so the 3D view keeps most of it.
- Walls: "Split into panels" on a board makes its size a wall's, cut into panels your
  printer's bed takes, as even as they can be, closed round the outside and open at the seams so the slots run
  on across them. The preview shows the whole wall, and a print list gives each kind of panel, how many to
  print and its own download.
- Printers to choose from: under "Printer bed", a button for each of seven makers, then its models, 30 printers
  in all, each bed from its maker's website (`docs/printer-beds.md`). The page remembers the printer, or a custom
  bed, in your browser.
- The page answers while a board is made: every build runs in the background, and a change made while a large
  board is being made replaces it.
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

### Fixed

- A wall is framed to the 3D view its print list leaves: on a tall screen it had sat at half the size.

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
