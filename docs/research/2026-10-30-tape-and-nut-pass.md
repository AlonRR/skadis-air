# The tape and nut options, a design and engineering pass (30 Oct 2026)

The owner's request, 30 Oct 2026: "run a design pass on the new tape options. run an engineering pass on the nut
options, they may need to be pull instead of slots, or a mix of slot that gets pulled into a groove. im thinking there
may be an issue due to how hard it was to get the nuts not to turn around in slots, when tested, look at the test
results."

It reviews what D592, D593, Q594, D600 and D603 built, at `3bb9801`, against the owner's `printed-part-design` and
`printed-part-engineering` practices, as the passes of 19 and 21 Oct did. Nothing was changed by it; each change it
recommends is a question in [`status.md`](../status.md): D607 (the nut's pocket), Q608 (which tape, and for what load)
and D609 (how much a taped board holds).

Figures: `node scripts/figures/shoot.mjs nut-pass`, the library's own parts, in
[`docs/figures/nut-pass/`](../figures/nut-pass/README.md); the tape board as built is D603's
[`d603-tape-board-back.png`](../figures/explain-2026-10-30/d603-tape-board-back.png). Tags: **(verified: code)** read
from the source; **(verified: sliced)** the library's part cut across with Manifold's `slice`; **(computed)** arithmetic
on verified numbers; **(relayed)** from a cited record; **(inferred)** reasoning.

## 1. The test results the owner meant

They are the printer-enclosure repository's nut tests, in its `docs/bentobox-scrubber.md` (relayed): M3 nuts, 5.5 mm
across the flats, in ASA on the owner's printer, in walls far thicker than ours.

| Test | What | Result, in the owner's words where quoted |
|---|---|---|
| T131, 9 Oct 2026 | two tray nuts, each in a side slot 6.1 mm wide (+0.6), its end square | one held; **the other "spun in its slot"**: a 5.5 mm nut in a 6.1 mm slot turns about 16 degrees before its corners jam, so that slot printed wider or its nut was small |
| T131 | a pull nut's seat, 5.9 mm (+0.4) | "very loose": the nut slides in and falls out, and the screw does not seat it |
| T189, 10 Oct 2026, seats 1 to 5 | pull-nut seats, 5.5 to 5.9 mm | 5.5 "doesn't go in", 5.6 "too tight", **5.7 (+0.2) "just right"**, 5.8 "holds", 5.9 "slips out" |
| T189, slot 6 | side slot +0.6, square end | "works, the nut is stuck" |
| T189, slot 7 | side slot **+0.3, square end** | "slips in easily, grips with no slippage, falls out easily" |
| T189, slots 8 and 9 | side slot +0.6 and +0.3, **ended in the nut's own hexagon** | as 7, but "does not come out easily": the enclosure's slots since, and scad-tools' `nut_slot_hex_end` |
| T189, slot 10 | tapered, +0.6 to +0.1 | as 7 |

What they say for this part:

- **A nut did not turn in a slot as tight as ours.** The pocket is the nut plus 0.3 mm across (C597), slot 7's fit,
  which gripped with no slippage; the nut that spun was in a slot twice as loose. So the fit of our slot is not what
  the tests fault (verified: code, `NUT_ROOM_MM`).
- **The tests' real lessons are two.** A fit 0.1 mm off changes the answer (a seat went from "doesn't go in" to "slips
  out" over 0.4 mm), and only a slot ended in the nut's hexagon, or a pull nut's seat, kept the nut in once its screw
  was out.
- **They were one printer, one material, one size, in thick walls.** Ours is mostly M4, likely PETG, in a post 10 mm
  across (section 2): their fits are a starting point here, not a measurement.

## 2. The nut standoff as built: the post round the nut is too thin

Every nut standoff, taped or screwed, for 1, 2 or 4 boards, has each nut in a post the screw plus 6 mm across
(C83's standoff size), a strip the nut's width plus 0.3 mm cut through it from behind the hole out of its side, the
nut's corners pointing along the strip (verified: code). At the nut's mid-height:

| | M3 | M4 | M5 |
|---|---|---|---|
| Post, across | 9 mm | 10 mm | 11 mm |
| Pocket, across (the nut + 0.3) | 5.8 mm | 7.3 mm | 8.3 mm |
| Wall beside the nut's middle | 1.6 mm | 1.35 mm | 1.35 mm |
| **Wall where the nut's corners press as it turns** | 1.31 mm | **0.92 mm** | **0.84 mm** |
| **The pocket's closed end** | **0.1 mm of wall at its corners** | **broken through: two windows 0.8 mm long** | **broken through: two windows 1.2 mm long** |

(computed, and verified: sliced at the nut's mid-height for 1, 2 and 4 boards, both fixings: at M4 and M5 each post
falls into three pieces there, at M3 one piece with a 0.1 mm wall). [`nut-walls.png`](../figures/nut-pass/nut-walls.png)
shows it.

**Why it matters (inferred, bounded):** a screwdriver's last turn puts something like 0.5 N·m on the thread, which the
nut hands to the post through two of its corners, about 70 N each (500 N·mm over 2 × 4.04 mm × cos 30°). A wall
0.9 mm thick and as tall as the nut, bending over about 4 mm, takes about 75 MPa at that, past PETG's 47 MPa yield
(`printed-part-engineering`, a maker's sheet); 2.5 mm of wall takes about 10 MPa. So the thin side walls, not the
slot's width, are where this nut would turn: the corner crushes and bends a wall that is two or three lines thick, and
at the closed end there is no wall to stop it. The pocket's walls in the enclosure's tests were thick; ours are not.

**Why the post cannot simply be wider.** Within 8 mm of a board's back, the hooks' room (C99), a slot's chamfer comes
7.6 mm from the corner hole, and a hook's room 7.8 mm, on a closed board and an open one alike (computed from the
library's slot places); C83 keeps 2 mm of that clear, so a post there is at most about 11 mm across, the M5 post's
size today. Further from the board than the hooks' room nothing stands behind a board: a post may grow there, as the
boards' tape pads flare out (D593). On an 18 mm taped standoff that is its lowest 10 mm; on a 15 mm screwed one, its
lowest 7.

## 3. Other findings on the nut standoff

- **The 2-board stacked standoff's lower nut goes in from below.** Each nut slides in out from the seam, so on the one
  for boards one above the other the lower nut's way in faces down the wall (verified: code, `wayIn`; sliced, the
  pocket opens toward -y). Taped up and waiting for its board, that nut is held only by the slot's friction, and slot
  7's fit "falls out easily". [`nut-stacked-mouth.png`](../figures/nut-pass/nut-stacked-mouth.png) shows it.
  `printed-part-design` §4: "A nut stays put without its screw, in every orientation".
- **Driving the screw twists a taped standoff on its tape.** The thread's torque goes through the nut into the standoff,
  and on the 1-board taped one only its pad holds it: a 19 x 19 mm pad twisted by 0.5 N·m is sheared about 0.31 MPa at
  its corners (torque × 13.4 mm over the square's polar moment, 19⁴/6), and 0.2 N·m about 0.12 MPa, against 3M's
  85 kPa design figure for dynamic loads on its VHB tapes (relayed, below) (computed). Behind the board, the standoff
  cannot be held by hand. The 2- and 4-board ones share one pad under all their posts, larger, and the screwed foot has
  its two screws. So the screw's note should say to tighten it only snug, whichever nut pocket is chosen.
- **The taped standoff's help pairs it with the wrong boards.** "18 mm taped, as tape boards stand": a board on tape
  standoffs has no corner holes (D593), so this standoff cannot hold it. It holds boards with countersunk screw holes
  and Standoffs "None" (verified: built).
- **The nut's ceiling is a 45 degree gable**, so the nut bears on the gable's two feet beside its flats, not on a flat
  face (verified: code). The clamp goes through the roof in compression, board to nut, which is the right load path;
  the line contact will dent in, and a pull nut's flat seat under a two-bridge ceiling would bear on a ring instead.

## 4. The nut's pocket: three ways (D607)

Each moves the nut behind the hooks' room, into the post grown there to keep at least 2.5 mm of wall round the nut's
corners, so section 2's walls are gone whichever is chosen. Each keeps the countersunk machine screw through the board.

| | (a) Pull nut from the wall face | (b) Side slot pulled into a seat (the owner's mix) | (c) Side slot, ended in the nut's hexagon |
|---|---|---|---|
| Shape | a hex pocket on the screw's axis, open at the wall face, a lead-in the nut + 0.3 and a seat the nut + 0.2 (T189's seat 3) at its top under a two-bridge ceiling | a slot from the side, the nut + 0.3, as now, with a seat the nut + 0.2 and 1 to 1.5 mm deep above it; the first turns of the screw pull the nut up into it | the slot as now, its end the nut's own hexagon at + 0.6 (T189's slot 8) |
| Turning | six flats in thick walls | six flats once pulled; two before | four faces, in thick walls |
| Stays in without its screw | yes: the seat, and the wall or the tape behind it | once pulled; before that, the slot's friction | the hexagon end's friction ("does not come out easily") |
| The stacked one's lower nut | held by its seat | way in turned sideways, or held once pulled | way in turned sideways |
| Tape pad | **a hole the nut's size in it, 45 mm² for M4, 12 % of a 19 x 19 mm piece**, which the tape closes over | whole | whole |
| When the nut goes in | before the standoff goes on the wall: pulled home with the board's screw, which then comes out | any time before the board; best pulled in on the bench too | any time before the board |
| Height it needs behind the hooks' room | the nut + 1 mm, from the wall face up: fits every size at the starting heights; the screw no longer than its note says, or its tip pushes on the tape | the nut + 0.3 + the seat + the ceiling, above the screw's tip: M3 and M4 fit at 18 and 15 mm; **M5 needs about 1 to 2 mm more** (inferred, not built) | the nut + 0.3 + the gable: like (b) |
| Strength, M3 in PETG (relayed, `printed-part-engineering`) | a nut seated from the far side pulls out at about 1.63 kN | between | a side slit about 0.84 kN |

**Recommended (a), for both fixings.** It holds the nut by all six flats, keeps it without its screw in every way the
part hangs, needs the least height, is the strongest, and is the fit the owner's coupon proved ("just right"). Its cost
is the hole in the tape pad and pulling each nut in before the standoff goes up. On the screwed standoff (D600) the
cost is nothing: its post's hole already goes through to the wall, which closes the pocket.

**With any of them:** a nut-fit setting under Advanced, the nut plus 0.2 mm unless set, as the slot clearance is, since
T189's numbers are one printer's; a nut coupon for the owner to print, a seat each at + 0.1, + 0.2 and + 0.3 for M3, M4
and M5 in the loaded filament, to set it from; the screw's note to tighten only snug; and the standoff's help to say it
holds boards with corner screw holes and no standoffs of their own.

## 5. The tape options, a design pass

The parts (verified: code): a board "For tape" stands on its four corner posts, each flaring out at 45 degrees, behind
the hooks' room, to a rectangle the piece of tape, 19 x 19 mm on 18 mm standoffs unless set (D603), with no screw
holes; the standoff connector "Nut, taped to the wall" stands on the pieces' rectangles round its posts, joined into one
plate; Tape width and Tape length are one pair of settings for both.

| `printed-part-design` | Finding |
|---|---|
| §1 dimensions measured or cited | the tape is the user's setting; the 19 mm roll is the owner's choice (D603); **which tape is not known (Q608)** |
| §2 support, as it prints | none. The board prints face down, so its pads are its last layers, a top skin; the connector's pad is its bed face, its flattest face. Both take foam tape |
| §3 located before released | the tape locates nothing until pressed: the board goes on by eye. A taped board's corners show where its pads go, which helps |
| §4 fastening | the board itself: tape only, no holes. The connector: section 4 |
| §6 how it looks | the flare is a straight 45 degree hull, not an eased blend, but it is on the back, which nobody sees once hung: no change |

**What a taped board holds** (the engineering half): 3M's VHB datasheets give a rule for static loads, about four
square inches of tape for each pound held, to keep creep down (relayed: [4655](https://multimedia.3m.com/mws/media/2523038O/3m-vhb-tape-specialty-tape-4655.pdf),
[RP+040GF](https://multimedia.3m.com/mws/media/2523024O/3m-vhb-tape-rp-040gf.pdf)): about 17.6 g per cm² (computed).
Four 19 x 19 mm pieces, 14.4 cm², hold about 250 g by it, the board included; at most 20 x 20 mm at a corner (C601),
about 280 g. The 240 x 200 mm boards weigh 66 g (lightened), 67 g (skeleton) and 115 g (solid) as sliced on 21 Oct
2026 (relayed: the boards' pass), which leaves about 140 to 190 g to hang on them. And the rule is for a weight hanging
in shear: a tool on a hook levers the board off the wall, which pulls the top pads straight off it, the way tape holds
least (inferred). Another foam tape has its own figures, and removable strips, pulled out by a tab, need room for the
tab past the pad. So what a taped board can carry depends on the tape and on what hangs on it, and neither is
known yet (Q608, D609).

D609's options, once Q608 is answered: (a) say it on the page, beside the tape's settings: the pieces' area and about
what that tape holds by its maker's rule, the board's own weight from it; (b) more pads: posts behind the board between
the slots, each with its own piece, so a board can stand on 8 pieces, not 4; (c) as it is. Recommended (a), and (b)
if Q608's load needs more than four pieces hold.

## What was not checked

- No nut standoff was printed or loaded; section 2's turning is an estimate, bounded, not a test. The pocket a choice
  in D607 makes gets a coupon before it is trusted (section 4).
- The tape rule is one maker's, for its VHB range; no foam tape was tested.
