# Changelog

All notable changes to this project are recorded here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Standoffs "For tape" on the boards: each corner post ends at the wall in a rectangular pad for a piece of
  double-sided tape, and the board has no screw holes (D593, C601).
- "Tape width" and "Tape length", 19 x 19 mm unless set, the piece of tape cut from the roll that each pad takes; the
  boards and the standoff connector share them (Q594, C601, D603). With tape the standoffs start at 18 mm, which a
  19 mm piece needs, and go back to 15 mm without it, unless set by hand (D603, C604).
- The standoff connector can be fixed by a nut and tape: a nut of the screw size (M3, M4 or M5) slides into each post under a roof, a countersunk machine screw through the board holds the board to it, and it stands on a pad for double-sided tape, with no hole into the wall (D592). Or it stands on a foot screwed to the
  wall by two countersunk screws, driven before the boards go on: "Nut, screwed to the wall" (D600).

### Changed

- The Sides control draws the board as set: its buttons sit inside the board's drawing, a closed side is a solid blue
  edge and an open one dashed, and a corner is round where both its sides are closed, as the board is built (D528).
- "Open sides" comes first on a board's form, right under the Look, then "Sides" (D529); then "Screw holes" and
  "Standoffs", and the width, height and thickness right above the screw size (Q588).
- "What to make" is Board, Wall or Connector, and the "Panels" field is gone: Wall makes a wall of panels, as "Split
  into panels" did (D590).
- With keyholes or lock screws, the standoffs' "None" is greyed out, a note under it saying they need standoffs, where
  choosing it had left a board that could not be made (D589).

## [0.9.0] - 2026-10-28

### Added

- A "Look" for the lightened and skeleton boards, first on their form: Curved, today's board and the start, or
  Straight, in the straighter lines of the first boards, the long eased pocket corners left out: the lightened board's
  pockets meet its rims and webs in 1 mm round corners, the skeleton's in sharp ones, on today's I-beam. Both keep the
  front's edge chamfer, the V groove where boards meet, and all of the mounting. A Straight board's file is named
  `skadis-<board>-straight-...`; a Curved board is unchanged, its file name too. At 200 x 200 mm Straight is 66.8 g
  against 67.6 g for the lightened board and 67.3 g against 69.5 g for the skeleton, sliced in PETG (Q510).

- A board's plastic is given in printed grams, not as a share of the solid board's volume (D313): the page says under the
  form, for a solid, lightened or skeleton board and its Look, "About 68 g for a 200 × 200 mm board at the starting
  values, printed in PETG", and the README and the Printables text and its board picture give the same figures. They are
  in `docs/board-grams.json`, which `npm run grams` makes by slicing a 200 x 200 mm board of each kind (PETG, Prusa
  MK3S, 0.2 mm), so none is typed.

### Fixed

- The Sides control fits a phone narrower than 375 px: it ran 7 px into its fieldset's padding at 360 px and 30 px
  past the fieldset, 14 px past the screen, at 320 px. It now takes no more than its fieldset, the board's drawing
  between its buttons giving way and the buttons keeping their size. At 375 px and wider it is as it was.

- The Straight skeleton at its thinnest, rims and webs 1.2 mm and a 0.8 mm core, is joined through its whole depth
  (D519): beside each half slot of an open top or bottom edge its edge band met the web only near the faces, a 0.93 mm
  gap between them from 1.57 to 3.43 mm deep. The half slot's rim keeps its core beside the slot from face to face now,
  in straight lines; the faces are as they were, and the Curved boards and the Straight ones at their starting values
  are unchanged.

### Changed

- The STL check slices each plate with its parts split, so the slicer arranges them together round the bed's middle rather than where the plate put them, as parts near the bed's edges print worse.
- The screw size carries across the boards and the connectors, one choice everywhere: set on a board it is the
  slot clip's and the standoff's, and back (Q511, C550). The sizes under Advanced for each kind of place, and every
  other setting, still carry only within their group.
- The design system is v0.9.0: the 3D view and the form go side by side from 640 px wide, so a phone held sideways
  (740 x 360, 750 x 342) shows both, and the Sides control fits a 320 px sidebar. The page's own rule for the control's
  width is gone; the drawing's shape rule stays (C516).
- The standoff connector's wall-side edge takes a 0.4 mm chamfer, not 1 mm, so it holds the bed with more: a 1-board
  standoff's first layer (the section 0.1 mm up) goes from 30.7 to 47.2 mm2, a 2-board one's from 172.6 to 213.2 and a
  4-board one's from 553.4 to 644.8. The board side keeps its 1 mm chamfer. A print that needs a brim is redesigned
  instead (C463).
- The trial standoffs plate's dots are in the face that is up as the standoffs print, not the bed face, so they cost no
  contact and nothing prints over air (C464, T274).

- One "Screw size" on the main form, the screw for every hole: 4 mm unless set, a countersunk screw with an 8 mm
  head. Under Advanced, the keyholes, the lock screws and the slot clip's screw each offer "Same as the screw size" or
  "Own", their own size greyed out until "Own" is chosen. The standoff connector's holes, which the boards' corner
  screws go through, take the screw size itself.
- Lock screws start at the screw size, 4 mm, where they started at 2.5 mm, and are the same countersunk screw as the
  rest. An 8 mm head does not pass a slot 5.2 mm wide, so each lock screw's slot has a groove in its sides for the head,
  8.5 mm across round the slot's middle; the slot keeps its 5.2 mm for 4.2 mm up from its bottom end, where a hook
  rests. Behind the hook's room the head seats on a 45 degree countersink, as a keyhole's head does, where a pan head's
  recess had a flat floor printed over air. A lock screw of its own size up to 2.5 mm, whose pan head passes the slot,
  keeps the flat recess, as before; from 3 mm it is countersunk too. A file named `-lock-screws` now has 4 mm lock
  screws, and lock screws alone need standoffs at least 12.53 mm tall, where 2.5 mm ones needed 12.3 mm.
- A board kept in the browser by an older page still builds, its lock screws at the screw size; the size it held for
  them stays in their own size, greyed out, until "Own" is chosen.

## [0.8.0] - 2026-10-24

### Changed

- The design system's v0.8.1: the "i" button that folds a setting's help and the ring over the 3D view while a part is
  made are now the design system's own, in place of the page's rules for them. Nothing on the page changes: shot at
  1280 px in both themes and at 375 px, with each help folded and unfolded and the ring showing, every shot is the same.

- Between the slots, every corner has its screw. A corner whose usual place, 10 mm in from both edges, would land on
  a slot has its screw at the nearest place at least 10 mm in from both edges with as much room round it as a corner
  through the slots has, 8.5 mm to the nearest slot, and its standoff and a lattice board's pad with it: on a 160 mm
  board open all round, the bottom left and top right screws move 11.5 mm along their edge, to 21.5 mm from the
  corner. On a board one tile
  across, two corners whose screws would stand within 20 mm of each other share one.
- A setting that applies only with another choice is greyed out while it does not apply, and its value is not
  checked then, so a value left in it no longer stops the board: "Lock screws: at the bottom" applies only with
  keyholes, the standoff height only with standoffs on the back, keyholes or lock screws, and the lock screw size
  only with lock screws, at the bottom with keyholes or as the screw holes. Each one's help says when it applies.
- Where a standoff meets a board's back, and where the slot clip's posts meet its bar, the part runs out onto the face
  on a rounded root, up to 1.5 mm out and 3 mm up the post, as far as the face leaves it room: clear of every slot and
  hook, inside the edge's chamfer, and on a lightened or skeleton board only over the frame, the webs and the pads,
  never over a pocket. The physics tests found each of these a sharp inner edge, and a standoff's root the weakest
  place on every board on standoffs. Nothing of a root prints over air.
- On the slot clip, each post's rounded root runs on over the bar's chamfered sides, where it stopped short of them,
  so the post meets the bar on a curve all the way across and the bar keeps its chamfered edges.
- In a standoff behind a slot, where the walls of the hook's room meet the board's back round the slot, they run out
  onto the back on the same rounded root, up to 1.25 mm into the room and 3 mm up its walls; the room keeps all a
  hook takes, the slot and its chamfer and the back tab's room with its 2 mm all round, as before.

### Fixed

- Standoffs on the back are no longer left off a board whose open sides run between the slots, where the file name
  said they were there.

## [0.7.0] - 2026-10-23

### Changed

- Keyholes take a countersunk screw, its head 90 degrees, in place of a pan head, on the boards' top standoffs and in
  the slot clip alike, so one screw holds a whole wall: the head seats on a 45 degree countersink behind the lips,
  which centres it. A 4 mm screw is left standing with the top of its head 3.73 to 4.03 mm out of the wall, where a
  pan head stood 4.7 to 5 mm out, and a board on such keyholes, or a slot clip with one, now needs standoffs or a
  depth of at least 13.23 mm, where it needed 14.2. This is so the keyhole prints as drawn: a board prints face down,
  and nothing over a countersunk head faces down more steeply than 45 degrees, where the pan head's flat lips were a
  ledge over air.

### Fixed

- A keyhole no longer prints its lips over air, a ledge round the slot that sagged into the head's channel.
- Where the hook's room behind a corner slot runs out of its standoff, its ceiling rises at 45 degrees to the
  standoff's face, so it no longer ends in a curved edge printed over air; the hook's room is as before.
- A connector whose settings are refused says "to make the connector", not "to make the board".
- A number field left empty is refused, "Width must be a number", where it had been made at its starting value
  while the field stood empty.
- The fit test coupon refuses a clearance step of 0, which gave all four slots the same clearance; its least step is
  0.05 mm.
- With keyholes or lock screws on standoffs too short for them, the note under the screw size no longer gives a
  length less than nothing ("passes -9.3 mm of standoff"); it says nothing, and the status line says how tall the
  standoffs must be.
- The size under the 3D view keeps the decimals it has, up to two: a 5.25 mm thick board showed as 5.3 mm.
- With 3MF chosen, the status line names the file as it will download, `.3mf`, where it named the `.stl`.
- A wall's "Download all" says what its file holds, each kind of panel once ("All 9 kinds of panel in one file"),
  where it said "All 24 panels in one file"; a wall of one panel no longer says "All 1 panels".
- A wall whose settings are refused no longer leaves the wall before it in the print list, its "Download all" still
  live: as for one board, nothing can be downloaded until the settings are corrected.
- A custom bed outside 50 to 1000 mm makes nothing, as any refused setting does, where the part had been made, and a
  wall cut, for the default bed beside the bed's error.
- A board type chosen within a moment of a size typed is the one made and downloaded: the type before it, whose build
  was still waiting out the typing, had been made last, under the new type's tick.
- The skeleton board says in plain words what to change for a core it cannot make, where it said "A 2.503 mm move is
  larger than the outline takes": a core wider than the 3 mm edge band is refused on its field, the Core width now
  0.8 to 3 mm, and pockets too small to narrow to the core ask for a wider core or narrower webs.
- A wall's panels that fit the chosen bed only turned, as the panels are cut to whichever way makes fewer, come
  turned in their files, the zip and the 3MF alike, so each fits the bed as it is downloaded: on a Prusa MK4S a
  1000 x 640 mm wall's 200 x 240 mm panels came 200 x 240 mm for a 250 x 210 mm bed. One board that fits only
  turned comes turned too.
- A combination of settings that cannot be made is shown beside the setting it belongs to as well as on the status
  line: the core width, the thickness for a countersunk screw, the width or height of one board over 400 mm, the
  standoff height for keyholes or lock screws, and the slot chamfer.

## [0.6.0] - 2026-10-23

### Changed

- The fit test coupon and the seam test pair are under Advanced, as "Test prints" at the top of every board's Advanced
  fold, and the Board list holds the three boards alone. Choosing a test print opens its form with Advanced open on
  it; choosing a board in the list goes back. The page still remembers a test print chosen after a reload.

## [0.5.0] - 2026-10-23

### Added

- The page as it stands on `main`, not released, at <https://alonrr.github.io/skadis-air/dev/>, under a banner that
  names its commit and links the released page; search engines are asked not to list it.
- While a change is being built, the part on show dims and a ring turns over it, until the new part is drawn or
  the form says it cannot be made. It waits 0.4 s first, so a quick rebuild does not flicker, and with reduced motion
  the ring does not turn.

### Changed

- Each setting's help is folded behind an "i" button beside its label, so the form is about a quarter shorter;
  the button shows and hides it, under the label and above the setting's control, moving what is below it down. A
  screen reader still reads the help with its control. Warnings, errors and the counts beside a value are always
  shown.

### Fixed

- A wall of one panel says "Wall ready: 1 panel", where it said "1 panels".
- On a phone, a wall's "Download all" row is whole and scrolls away under the 3D view: it stayed on the screen
  as the page scrolled, drawn over the view, and was cut in half. Its label is now whole, "All 4 panels in one
  file", with its buttons on a line under it, where the buttons beside it cut it to "All 4 panels i…".
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
