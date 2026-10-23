# Physics tests of the boards and connectors

Research date: 23 Oct 2026. The owner's decisions: D323 (hand calculations and a simulation, a bar's bending its
control), D324 (the boards from before the design passes beside today's), Q325 (IKEA's ratings as the loads), Q326
(PLA, PETG and ASA from a maker's sheets) and Q327 (the three boards, the standoff, the slot clip and walls), all in
[`status.md`](../status.md), and Q329 (b, 23 Oct 2026: no target load, each part's capacity in each material, in N and
kg, and the stress shown on pictures of the parts). The choices made on the way are C330 to C344 in
[`choices.md`](../choices.md).

## Status

| Step | State |
|---|---|
| 1. Tooling and controls | done: `scripts/physics/`, `tests/test-physics.sh` |
| 2. Loads, hook and materials cited | done: IKEA publishes no rating, so the runs use a reference load and give each part's capacity ([below](#the-loads)) |
| 3. Today's parts | level 1 done but the skeleton's wall; level 2, the convergence check, running |
| 4. The old versions | level 1 done but one window (v0.2.1's skeleton, hook at the edge, which no try meshed); level 2 running |
| 5. Walls | solid and lightened at level 1; the skeleton's wall not solved (its iterative solve outlasted a window) |
| 6. Capacities (Q329) | done for every run: the headline table, in N and kg per material |
| 7. Figures | `scripts/physics/figures.py`, `figure.html`, `figures.mjs`; drawn as each case's run with its saved surface lands |
| 8. The report | this file; its tables are `scripts/physics/tables.py`'s output, as of the last run |

### Resume point

Kept current at each checkpoint. **23 Oct 2026, 14:10:** the level 2 batch is running in 28-minute windows, in the
brief's order (`run.py --levels 2 --order=-160,-80-,standoff-,slot-clip-,-wall- --budget 1680`): the hooks' whole
boards, then the spread cases, the connectors, the walls. `run.py` skips what `results.jsonl` holds, so the same command
picks up where a window stopped. Since this checkpoint each run also saves its surface stress for the figures
(`fields/<version>/<part>/<case>-L<level>-surface.npz`); a run reported before it is run again by `run.py --one` to
save one (a run is deterministic: the same mesh and the same peak to 1e-11, checked on v0.4.2's skeleton window). Next:
the rest of level 2; the surfaces of the figures' runs that predate the surface file; the figures; the findings and
the owner's questions.

**What these results are, and are not.** The simulation models each part as solid, isotropic plastic with a data
sheet's stiffness. A printed part is perimeters and sparse infill in layers, weaker across the layers than along
them, and the model overstates it. So the results **rank the designs and find their weak spots**; they do not
predict a breaking load, and a capacity below is the load at which the model's peak stress reaches the sheet's
strength, not a load the print is known to hold. Printed tests (T320) stay the check of what breaks.

## The loads

**What was found: IKEA publishes no load rating** for the SKÅDIS board, its hooks or its shelf. The pages checked,
all read 23 Oct 2026, are listed with their links in [`skadis-standard.md`](../skadis-standard.md#loads): the 56 x 56
cm pegboard 003.208.03 (its "Good to know" and safety text, and a packed weight only), the hooks 203.208.02 and
303.216.17, the shelf 003.207.99, a pegboard combination with each part's net weight only, the text of all eight
pages of the assembly instructions AA-1891323-4, and searches in English and German. Q325 asked for IKEA's ratings,
and a number from elsewhere would be invented, so **every case is run at a reference load of 10 N (about 1 kg)**: one
hook's, the whole spread load's on a board, or one connector's. A linear static result scales with its load, so the
tables give each part's stress and deflection for 10 N and **what it holds**: the load, in kg, at which its peak stress
reaches the material's strength, per hook for a hook's case, per board for the spread load, per connector.

### The hook's load path (C332)

A SKÅDIS hook bears on its slot's wall, and its load hangs in front of the board, so it also pries:

- its rod, 4.5 mm wide, bears the load **W** down on the slot's bottom end (the slot's own wall, not its chamfers);
- the load hangs at most 25 mm in front of the face, the small hook's depth on IKEA's page, so about the slot it
  makes a moment W (25 + 2.5) mm;
- that moment is taken by two equal and opposite pushes: the hook's back tab on the back face below the slot
  (4.5 x 8.25 mm, as the replica hook's tab reaches), pushing the board off the wall, and the hook's body on the
  front face round the slot 40 mm below, where its second peg goes, pushing it in. With the two patches' centres
  27.6 mm apart, each push is about 10 N for a 10 N load (computed).

Every run logs what it applied: 10 N down, and 300 N mm about the back face's line (verified: each run's
`appliedMoment`). The hook's real shape was not measured: where its rod and body bear, and where on the hook the
load really sits, are a question for the owner ([below](#questions-for-the-owner)).

## The materials (C330)

One maker's sheets for all three, Prusament's (version 1.1, 16 Feb 2022), as they give values measured on printed
bars and an interlayer figure, the maker's own test across the layers. A board prints face down, so a hook's load
runs in the layer plane: the runs read the horizontal bars.

| Material | Tensile modulus (GPa) | Yield, along the layers (MPa) | Interlayer adhesion (MPa) | HDT at 0.45 MPa (°C) | Sheet |
|---|---|---|---|---|---|
| PLA | 2.3 | 51 | 17 | 55 | [PLA](https://prusament.com/wp-content/uploads/2022/10/PLA_Prusament_TDS_2021_10_EN.pdf) |
| PETG | 1.5 | 47 | 18 | 68 | [PETG](https://prusament.com/wp-content/uploads/2022/10/PETG_Prusament_TDS_2021_10_EN.pdf) |
| ASA | 1.6 | 42 | 11 | 93 | [ASA](https://prusament.com/wp-content/uploads/2022/10/ASA_Prusament_TDS_2022_16_EN.pdf) |

No sheet gives a Poisson's ratio; the runs use 0.35 (C331). For prescribed loads the stresses do not depend on the
modulus, so each geometry runs once, at 1000 MPa, and each material's deflection is that one's times 1000 / E.

## The model

- **Parts** (`scripts/physics/write-parts.mjs`): each written from the library as it hangs, x across, y up, the
  front toward +z. The hooks on the page's 160 mm board, closed all round, held off the wall on its four corner
  screws, one hook in the middle slot (80, 80) and one by the left edge (20, 100) (C334); the spread load on an 80 mm
  board for each mounting (C335), a board on keyholes also standing on its bottom standoffs (C340); the standoff and
  the slot clip alone (C336); a two-panel wall joined by a clip (C337).
- **Mountings** as held surfaces, every degree of freedom: a corner screw's countersink, a standoff's wall face, a
  keyhole's lip under the screw's head; the wall itself left out (C333).
- **Mesh and solver** (`scripts/physics/run.py`, `fe.py`): gmsh's tetrahedra from the STL, quadratic (P2), the
  stiffness assembled here and solved by PARDISO, or by conjugate gradients past what it can factor; two mesh levels
  for every reported result (C338).
- **Peaks** read more than 1 mm from a held face (a clamp's edge is singular), and split between the load's contact,
  within 3 mm of a loaded face, and the part itself (C339).

## The controls

`bash tests/test-physics.sh` runs `scripts/physics/controls.py` unchanged and with a fault seeded in each control:

| Control | Unchanged | Seeded fault, which must fail it |
|---|---|---|
| Assembly: this repo's P2 stiffness against scikit-fem's, entry by entry | largest difference 1.2e-15 of the largest entry | modulus 10 % off: difference 0.10, fails |
| Patch test: a uniform strain's energy, exact on any mesh | relative error 1e-14 | exact energy 5 % off: fails |
| A bar 30 x 3 x 0.9 mm, the skeleton's core, clamped and loaded at its tip, against the beam formulas (limit 3 %) | P2, 2 elements across: tip -1.1 %, mid-span stress +1.1 % | modulus 10 % high: tip -10.1 %, fails; load 10 % high: +8.8 % and +11.2 %, fails |
| The same bar, reported | P2, 1 element across: -1.3 % and +3.4 %; **P1: -44 %**, which is why the runs use P2 | |
| The iterative solver against PARDISO on the bar (limit 1e-6) | the same answer | stopped at a tolerance of 0.5: fails |
| A mesh's volume against Manifold's (limit 1 %): the solid 80 mm board, chamfered at 45 degrees round every slot and edge | +0.04 % | the reference 2 % off: fails |

Every run also checks its own mesh's volume against the part's, and refuses a solution whose supports' reactions miss
its load (one did, by 23 %, before flat slivers were taken out of the meshes; C338).

## Hand calculations

`scripts/physics/hand.py`, the members' sections cut from the built boards by `scripts/physics/sections.mjs`. Per
10 N.

<!-- hand:begin -->

- Bearing of the hook's rod on the slot's end: 10 N over 4.5 x 3 mm = 0.74 MPa (computed)
- Prying push at the back tab and at the lower slot: R = W (e + t/2) / arm = 10.0 N (computed)

| Version | Board | Rim in plane (MPa) | Web axial (MPa) | Web out of plane (MPa) | Rim I in / out (mm4) | Web I in / out (mm4) |
|---|---|---|---|---|---|---|
| today | lightened | 0.90 | 0.24 | 1.70 | 23.6 / 36.9 | 11.25 / 31.2 |
| today | skeleton | 2.15 | 0.48 | 2.72 | 11.5 / 24.7 | 2.87 / 21.5 |
| v0.2.1 | lightened | 0.90 | 0.24 | 1.70 | 23.7 / 36.9 | 11.25 / 31.2 |
| v0.2.1 | skeleton | 1.45 | 0.36 | 1.94 | 15.7 / 34.7 | 4.76 / 27.5 |
| v0.4.2 | skeleton | 1.45 | 0.36 | 1.95 | 15.6 / 34.7 | 4.63 / 27.2 |

- Standoff (1 board), 10 N down at its board face: M = 150 N mm, I = 471 mm4, 1.59 MPa along its axis, across its layers (computed)
- Slot clip's bar, 10 N carried 40 mm: 3.43 MPa in its own plane, along its layers (computed)
- Corner screw's edge distance: the rule wants 10.0 mm from the hole's edge, the board has 7.75 mm (computed)
- A 3 mm lightened member as printed: 95 % of the solid's stiffness in its plane, 85 % through the board (computed, from relayed and inferred print settings)
- The solid board as printed with 0.6 mm skins and 15 % infill: 35 % of the model's stiffness in its plane, 63 % through it (computed, from inferred print settings)

| Material | Board's 10 N rim stress reaches yield at (N), lightened today | Standoff across layers, load to reach interlayer adhesion (N) | Below HDT at 23 C (C) |
|---|---|---|---|
| PLA | 564 | 107 | 32 |
| PETG | 520 | 113 | 45 |
| ASA | 464 | 69 | 70 |

<!-- hand:end -->

## Results

Per 10 N. *Holds* is the load at which the model's peak stress reaches the material's strength (Q329, C342): in the
part, the lesser of its peak against the yield along the layers (y) and its stress across the layers against their
adhesion (l); at the contact, the stress within 3 mm of a loaded face against the yield, where the model's even
pressure makes the value the model's as much as the hook's (C339). The first table gives each part's in N and kg, per
hook for a hook, per board for the spread load, per connector for a connector; the case tables after it give kg. A
wall's peaks are its panels' and its clip's, the bonded pegs' edges left out (C341). Deflection is the hook's slot's
movement in a hook's case, the part's largest otherwise. *Mesh change* is how far the part's peak (at its own place,
C338), the contact's peak and the deflection moved from level 1 to level 2.

<!-- tables:begin -->

### What each part holds (Q329)

| Part | Version | Load | Case | In the part, PLA | PETG | ASA | Where | At the contact, PLA / PETG / ASA | Mesh level: part / contact / deflection |
|---|---|---|---|---|---|---|---|---|---|
| solid | v0.2.1 | one hook | hook-mid | 456 N, 46.5 kg (l) | 483 N, 49.2 kg (l) | 295 N, 30.1 kg (l) | across the layers: 8.6 mm from slot below (80, 40), back | 317 / 292 / 261 N (32.3 / 29.8 / 26.6 kg), 1.61 MPa | 1 only |
| solid | today | one hook | hook-mid | 469 N, 47.8 kg (l) | 497 N, 50.6 kg (l) | 304 N, 30.9 kg (l) | across the layers: 8.6 mm from slot below (80, 40), back | 292 / 269 / 240 N (29.7 / 27.4 / 24.5 kg), 1.75 MPa | 2, converged: 0 % / 7 % / 0 % |
| lightened | v0.2.1 | one hook | hook-mid | 88 N, 9.0 kg (y) | 81 N, 8.3 kg (y) | 60 N, 6.1 kg (l) | yield: 10.5 mm from slot (80, 80), mid | 100 / 93 / 83 N (10.2 / 9.4 / 8.4 kg), 5.08 MPa | 1 only |
| lightened | today | one hook | hook-edge | 119 N, 12.2 kg (y) | 110 N, 11.2 kg (y) | 98 N, 10.0 kg (y) | yield: 25.7 mm from slot (20, 100), mid | 107 / 99 / 88 N (10.9 / 10.1 / 9.0 kg), 4.76 MPa | 2, converged: 5 % / 1 % / 1 % |
| skeleton | v0.2.1 | one hook | hook-edge | 7 N, 0.7 kg (l) | 7 N, 0.7 kg (l) | 4 N, 0.4 kg (l) | across the layers: 10.0 mm from slot (20, 100), mid | 34 / 32 / 28 N (3.5 / 3.2 / 2.9 kg), 14.81 MPa | 1 only |
| skeleton | v0.4.2 | one hook | hook-edge | 58 N, 5.9 kg (y) | 53 N, 5.4 kg (y) | 48 N, 4.8 kg (y) | yield: 25.8 mm from slot (20, 100), mid | 55 / 51 / 45 N (5.6 / 5.2 / 4.6 kg), 9.26 MPa | 2, not converged: 12 % / 0 % / 0 % |
| skeleton | today | one hook | hook-edge | 29 N, 2.9 kg (l) | 31 N, 3.1 kg (l) | 19 N, 1.9 kg (l) | across the layers: 9.8 mm from slot (20, 100), front | 26 / 24 / 22 N (2.7 / 2.5 / 2.2 kg), 19.32 MPa | 2, converged: 6 % / 6 % / 0 % |
| solid | v0.2.1 | spread, on corner screws | spread-screws | 828 N, 84.4 kg (l) | 876 N, 89.3 kg (l) | 536 N, 54.6 kg (l) | across the layers: 5.2 mm from countersink (10, 70), mid | 588 / 542 / 484 N (60.0 / 55.3 / 49.4 kg), 0.87 MPa | 1 only |
| solid | v0.2.1 | spread, on standoffs | spread-standoffs | 69 N, 7.1 kg (l) | 73 N, 7.5 kg (l) | 45 N, 4.6 kg (l) | across the layers: 10.4 mm from slot (60, 60), back | 542 / 499 / 446 N (55.2 / 50.9 / 45.5 kg), 0.94 MPa | 1 only |
| solid | v0.2.1 | spread, on keyholes, hung (the brief's) | spread-keyholes | 23 N, 2.4 kg (l) | 25 N, 2.5 kg (l) | 15 N, 1.5 kg (l) | across the layers: 5.0 mm from keyhole lip (70, 70), back | 318 / 293 / 262 N (32.4 / 29.9 / 26.7 kg), 1.60 MPa | 1 only |
| solid | v0.2.1 | spread, on keyholes, standing on its standoffs (the design's) | spread-keyholes-standing | 123 N, 12.5 kg (l) | 130 N, 13.3 kg (l) | 80 N, 8.1 kg (l) | across the layers: 5.0 mm from keyhole lip (70, 70), back | 510 / 470 / 420 N (52.0 / 47.9 / 42.8 kg), 1.00 MPa | 1 only |
| solid | today | spread, on corner screws | spread-screws | 770 N, 78.5 kg (l) | 815 N, 83.1 kg (l) | 498 N, 50.8 kg (l) | across the layers: 5.1 mm from countersink (10, 70), mid | 616 / 568 / 507 N (62.8 / 57.9 / 51.7 kg), 0.83 MPa | 1 only |
| solid | today | spread, on standoffs | spread-standoffs | 90 N, 9.2 kg (l) | 95 N, 9.7 kg (l) | 58 N, 5.9 kg (l) | across the layers: 9.6 mm from slot (20, 60), back | 452 / 416 / 372 N (46.1 / 42.5 / 37.9 kg), 1.13 MPa | 1 only |
| solid | today | spread, on keyholes, hung (the brief's) | spread-keyholes | 24 N, 2.4 kg (l) | 25 N, 2.6 kg (l) | 16 N, 1.6 kg (l) | across the layers: 2.3 mm from slot (20, 60), z -15.0 | 76 / 70 / 63 N (7.8 / 7.2 / 6.4 kg), 6.67 MPa | 1 only |
| solid | today | spread, on keyholes, standing on its standoffs (the design's) | spread-keyholes-standing | 386 N, 39.3 kg (l) | 408 N, 41.6 kg (l) | 250 N, 25.4 kg (l) | across the layers: 11.5 mm from slot below (60, 20), back | 584 / 538 / 481 N (59.5 / 54.8 / 49.0 kg), 0.87 MPa | 1 only |
| lightened | v0.2.1 | spread, on corner screws | spread-screws | 139 N, 14.1 kg (y) | 128 N, 13.0 kg (y) | 114 N, 11.6 kg (y) | yield: 7.1 mm from countersink (10, 70), back | 292 / 269 / 241 N (29.8 / 27.5 / 24.5 kg), 1.75 MPa | 1 only |
| lightened | v0.2.1 | spread, on standoffs | spread-standoffs | 45 N, 4.6 kg (l) | 48 N, 4.9 kg (l) | 29 N, 3.0 kg (l) | across the layers: 7.8 mm from slot (20, 60), back | 292 / 269 / 240 N (29.7 / 27.4 / 24.5 kg), 1.75 MPa | 1 only |
| lightened | v0.2.1 | spread, on keyholes, hung (the brief's) | spread-keyholes | 26 N, 2.7 kg (l) | 28 N, 2.9 kg (l) | 17 N, 1.7 kg (l) | across the layers: 5.0 mm from keyhole lip (10, 70), back | 170 / 157 / 140 N (17.3 / 16.0 / 14.3 kg), 3.00 MPa | 1 only |
| lightened | v0.2.1 | spread, on keyholes, standing on its standoffs (the design's) | spread-keyholes-standing | 44 N, 4.5 kg (l) | 46 N, 4.7 kg (l) | 28 N, 2.9 kg (l) | across the layers: 5.0 mm from keyhole lip (70, 70), back | 293 / 270 / 242 N (29.9 / 27.6 / 24.6 kg), 1.74 MPa | 1 only |
| lightened | today | spread, on corner screws | spread-screws | 241 N, 24.6 kg (y) | 222 N, 22.6 kg (y) | 198 N, 20.2 kg (y) | yield: 7.2 mm from slot (20, 60), back | 304 / 280 / 251 N (31.0 / 28.6 / 25.5 kg), 1.68 MPa | 1 only |
| lightened | today | spread, on standoffs | spread-standoffs | 47 N, 4.8 kg (l) | 50 N, 5.1 kg (l) | 31 N, 3.1 kg (l) | across the layers: 9.4 mm from slot (60, 60), back | 313 / 288 / 258 N (31.9 / 29.4 / 26.3 kg), 1.63 MPa | 1 only |
| lightened | today | spread, on keyholes, hung (the brief's) | spread-keyholes | 25 N, 2.6 kg (l) | 27 N, 2.7 kg (l) | 16 N, 1.7 kg (l) | across the layers: 26.2 mm from slot (20, 60), front | 98 / 90 / 80 N (10.0 / 9.2 / 8.2 kg), 5.22 MPa | 1 only |
| lightened | today | spread, on keyholes, standing on its standoffs (the design's) | spread-keyholes-standing | 253 N, 25.8 kg (l) | 244 N, 24.9 kg (y) | 164 N, 16.7 kg (l) | across the layers: 10.8 mm from slot below (20, 20), back | 132 / 121 / 108 N (13.4 / 12.4 / 11.1 kg), 3.87 MPa | 1 only |
| skeleton | v0.2.1 | spread, on corner screws | spread-screws | 20 N, 2.0 kg (l) | 21 N, 2.1 kg (l) | 13 N, 1.3 kg (l) | across the layers: 6.5 mm from countersink (70, 70), mid | 85 / 79 / 70 N (8.7 / 8.0 / 7.2 kg), 5.97 MPa | 1 only |
| skeleton | v0.2.1 | spread, on standoffs | spread-standoffs | 21 N, 2.1 kg (l) | 22 N, 2.3 kg (l) | 14 N, 1.4 kg (l) | across the layers: 7.9 mm from slot (60, 60), mid | 104 / 96 / 86 N (10.6 / 9.8 / 8.8 kg), 4.89 MPa | 1 only |
| skeleton | v0.2.1 | spread, on keyholes, hung (the brief's) | spread-keyholes | 7 N, 0.7 kg (l) | 7 N, 0.7 kg (l) | 4 N, 0.4 kg (l) | across the layers: 10.0 mm from slot (60, 60), back | 37 / 34 / 30 N (3.7 / 3.4 / 3.1 kg), 13.95 MPa | 1 only |
| skeleton | v0.2.1 | spread, on keyholes, standing on its standoffs (the design's) | spread-keyholes-standing | 16 N, 1.7 kg (l) | 17 N, 1.8 kg (l) | 11 N, 1.1 kg (l) | across the layers: 10.0 mm from slot (60, 60), back | 87 / 80 / 71 N (8.8 / 8.2 / 7.3 kg), 5.88 MPa | 1 only |
| skeleton | v0.4.2 | spread, on corner screws | spread-screws | 128 N, 13.0 kg (l) | 135 N, 13.8 kg (l) | 83 N, 8.4 kg (l) | across the layers: 6.9 mm from slot (20, 60), mid | 177 / 163 / 146 N (18.1 / 16.6 / 14.9 kg), 2.88 MPa | 1 only |
| skeleton | v0.4.2 | spread, on standoffs | spread-standoffs | 28 N, 2.9 kg (l) | 30 N, 3.0 kg (l) | 18 N, 1.9 kg (l) | across the layers: 9.2 mm from slot (20, 60), back | 158 / 146 / 130 N (16.1 / 14.9 / 13.3 kg), 3.22 MPa | 1 only |
| skeleton | v0.4.2 | spread, on keyholes, hung (the brief's) | spread-keyholes | 13 N, 1.3 kg (l) | 14 N, 1.4 kg (l) | 8 N, 0.9 kg (l) | across the layers: 26.1 mm from slot below (60, 20), mid | 72 / 67 / 60 N (7.4 / 6.8 / 6.1 kg), 7.04 MPa | 1 only |
| skeleton | v0.4.2 | spread, on keyholes, standing on its standoffs (the design's) | spread-keyholes-standing | 196 N, 20.0 kg (l) | 207 N, 21.1 kg (l) | 127 N, 12.9 kg (l) | across the layers: 10.8 mm from slot below (60, 20), back | 129 / 119 / 106 N (13.2 / 12.1 / 10.8 kg), 3.95 MPa | 1 only |
| skeleton | today | spread, on corner screws | spread-screws | 57 N, 5.8 kg (l) | 60 N, 6.1 kg (l) | 37 N, 3.7 kg (l) | across the layers: 6.9 mm from slot (60, 60), front | 63 / 58 / 52 N (6.4 / 5.9 / 5.3 kg), 8.10 MPa | 1 only |
| skeleton | today | spread, on standoffs | spread-standoffs | 29 N, 2.9 kg (l) | 31 N, 3.1 kg (l) | 19 N, 1.9 kg (l) | across the layers: 9.6 mm from slot (20, 60), back | 52 / 48 / 42 N (5.3 / 4.8 / 4.3 kg), 9.89 MPa | 1 only |
| skeleton | today | spread, on keyholes, hung (the brief's) | spread-keyholes | 20 N, 2.0 kg (l) | 21 N, 2.1 kg (l) | 13 N, 1.3 kg (l) | across the layers: 25.9 mm from slot below (60, 20), front | 58 / 54 / 48 N (5.9 / 5.5 / 4.9 kg), 8.78 MPa | 1 only |
| skeleton | today | spread, on keyholes, standing on its standoffs (the design's) | spread-keyholes-standing | 166 N, 16.9 kg (l) | 176 N, 17.9 kg (l) | 107 N, 10.9 kg (l) | across the layers: 10.9 mm from slot below (60, 20), front | 54 / 50 / 44 N (5.5 / 5.1 / 4.5 kg), 9.44 MPa | 1 only |
| standoff, 1 board | today | 10 N down | shear | 73 N, 7.4 kg (l) | 77 N, 7.8 kg (l) | 47 N, 4.8 kg (l) | across the layers: (-1.3, 3.8, 1.1) | 504 / 464 / 415 N (51.4 / 47.3 / 42.3 kg), 1.01 MPa | 1 only |
| standoff, 4 boards | today | 10 N down | shear | 205 N, 20.9 kg (l) | 217 N, 22.1 kg (l) | 133 N, 13.5 kg (l) | across the layers: (9.4, -5.0, 7.0) | 1999 / 1842 / 1646 N (203.8 / 187.8 / 167.8 kg), 0.26 MPa | 1 only |
| slot clip, 2 boards | today | 10 N down | shear | 67 N, 6.8 kg (l) | 71 N, 7.2 kg (l) | 43 N, 4.4 kg (l) | across the layers: (10.4, -2.7, 7.0) | 524 / 483 / 432 N (53.4 / 49.2 / 44.0 kg), 0.97 MPa | 1 only |
| solid wall | today | one hook at the seam, each panel on its screws | wall-seam-hook | 208 N, 21.2 kg (l) | 220 N, 22.4 kg (l) | 134 N, 13.7 kg (l) | across the layers: 5.7 mm from countersink (90, 10), front | 322 / 297 / 266 N (32.9 / 30.3 / 27.1 kg), 1.58 MPa | 1 only |
| solid wall | today | spread, each panel on its screws | wall-spread | 404 N, 41.2 kg (l) | 428 N, 43.6 kg (l) | 261 N, 26.6 kg (l) | across the layers: 5.9 mm from countersink (150, 110), front | 1631 / 1503 / 1343 N (166.2 / 153.2 / 136.9 kg), 0.31 MPa | 1 only |
| solid wall | today | one hook at the seam, the wall's four outer screws | wall-seam-hook-outer-screws | 113 N, 11.6 kg (l) | 120 N, 12.2 kg (l) | 73 N, 7.5 kg (l) | across the layers: 5.6 mm from countersink (150, 10), front | 334 / 308 / 275 N (34.0 / 31.4 / 28.0 kg), 1.53 MPa | 1 only |
| lightened wall | today | one hook at the seam, each panel on its screws | wall-seam-hook | 199 N, 20.3 kg (y) | 183 N, 18.7 kg (y) | 147 N, 15.0 kg (l) | yield: 12.9 mm from slot (80, 80), front | 211 / 195 / 174 N (21.6 / 19.9 / 17.8 kg), 2.41 MPa | 1 only |
| lightened wall | today | spread, each panel on its screws | wall-spread | 398 N, 40.6 kg (y) | 367 N, 37.4 kg (y) | 308 N, 31.4 kg (l) | yield: 6.7 mm from countersink (150, 110), back | 902 / 832 / 743 N (92.0 / 84.8 / 75.7 kg), 0.57 MPa | 1 only |
| lightened wall | today | one hook at the seam, the wall's four outer screws | wall-seam-hook-outer-screws | 164 N, 16.7 kg (y) | 151 N, 15.4 kg (y) | 123 N, 12.6 kg (l) | yield: 12.4 mm from slot (80, 80), front | 184 / 170 / 152 N (18.8 / 17.3 / 15.5 kg), 2.77 MPa | 1 only |
| skeleton wall | today | one hook at the seam, each panel on its screws | not run | | | | | | |
| skeleton wall | today | spread, each panel on its screws | not run | | | | | | |
| skeleton wall | today | one hook at the seam, the wall's four outer screws | not run | | | | | | |

### One hook, 10 N, on the 160 mm board held off the wall on its corner screws

| Part | Version | Case | Peak in the part (MPa) | Where | At the contact (MPa) | Across the layers (MPa) | Deflection, PLA / PETG / ASA (mm) | Holds in the part, PLA / PETG / ASA (kg) | Holds at the contact, PLA / PETG / ASA (kg) | Mesh change: part / contact / deflection |
|---|---|---|---|---|---|---|---|---|---|---|
| solid | v0.2.1 | hook-mid | 0.91 | 8.6 mm from slot below (80, 40), back | 1.61 | 0.37 | 0.041 / 0.062 / 0.059 | 46.5 l / 49.2 l / 30.1 l | 32.3 / 29.8 / 26.6 | level 1 only |
| solid | v0.2.1 | hook-edge | 0.75 | 8.5 mm from slot below (20, 60), back | 1.88 | 0.31 | 0.036 / 0.055 / 0.052 | 56.2 l / 59.5 l / 36.4 l | 27.7 / 25.5 / 22.8 | level 1 only |
| solid | today | hook-mid | 0.93 | 8.6 mm from slot below (80, 40), back | 1.75 | 0.36 | 0.041 / 0.062 / 0.059 | 47.8 l / 50.6 l / 30.9 l | 29.7 / 27.4 / 24.5 | 0 % / 7 % / 0 % |
| solid | today | hook-edge | 0.76 | 8.6 mm from slot below (20, 60), back | 1.79 | 0.32 | 0.037 / 0.056 / 0.053 | 54.6 l / 57.8 l / 35.3 l | 29.0 / 26.8 / 23.9 | 0 % / 3 % / 0 % |
| lightened | v0.2.1 | hook-mid | 5.79 | 10.5 mm from slot (80, 80), mid | 5.08 | 1.84 | 0.285 / 0.437 / 0.410 | 9.0 y / 8.3 y / 6.1 l | 10.2 / 9.4 / 8.4 | level 1 only |
| lightened | v0.2.1 | hook-edge | 5.66 | 8.4 mm from slot (20, 100), back | 4.86 | 1.79 | 0.190 / 0.291 / 0.273 | 9.2 y / 8.5 y / 6.3 l | 10.7 / 9.9 / 8.8 | level 1 only |
| lightened | today | hook-mid | 3.98 | 10.3 mm from slot (80, 80), back | 5.09 | 0.60 | 0.259 / 0.397 / 0.373 | 13.0 y / 12.0 y / 10.7 y | 10.2 / 9.4 / 8.4 | 1 % / 2 % / 0 % |
| lightened | today | hook-edge | 4.27 | 25.7 mm from slot (20, 100), mid | 4.76 | 1.07 | 0.182 / 0.279 / 0.261 | 12.2 y / 11.2 y / 10.0 y | 10.9 / 10.1 / 9.0 | 5 % / 1 % / 1 % |
| skeleton | v0.2.1 | hook-mid | 38.76 | 9.9 mm from slot (80, 80), mid | 15.53 | 23.94 | 0.469 / 0.719 / 0.674 | 0.7 l / 0.8 l / 0.5 l | 3.3 / 3.1 / 2.8 | 7 % / 9 % / 0 % |
| skeleton | v0.2.1 | hook-edge | 54.45 | 10.0 mm from slot (20, 100), mid | 14.81 | 25.85 | 0.304 / 0.466 / 0.437 | 0.7 l / 0.7 l / 0.4 l | 3.5 / 3.2 / 2.9 | level 1 only |
| skeleton | v0.4.2 | hook-mid | 7.64 | 9.2 mm from slot (80, 80), mid | 10.02 | 1.82 | 0.380 / 0.583 / 0.546 | 6.8 y / 6.3 y / 5.6 y | 5.2 / 4.8 / 4.3 | 5 % / 10 % / 0 % |
| skeleton | v0.4.2 | hook-edge | 8.84 | 25.8 mm from slot (20, 100), mid | 9.26 | 1.91 | 0.256 / 0.393 / 0.368 | 5.9 y / 5.4 y / 4.8 y | 5.6 / 5.2 / 4.6 | 12 % / 0 % / 0 % (not converged) |
| skeleton | today | hook-mid | 9.93 | 9.8 mm from slot (80, 80), front | 19.30 | 3.88 | 0.493 / 0.755 / 0.708 | 4.5 l / 4.7 l / 2.9 l | 2.7 / 2.5 / 2.2 | 1 % / 12 % / 0 % |
| skeleton | today | hook-edge | 9.28 | 9.8 mm from slot (20, 100), front | 19.32 | 5.89 | 0.327 / 0.502 / 0.471 | 2.9 l / 3.1 l / 1.9 l | 2.7 / 2.5 / 2.2 | 6 % / 6 % / 0 % |

### The same hooks in windows of the board, their cut faces held: the local stress alone (C334)

| Part | Version | Case | Peak in the part (MPa) | Where | At the contact (MPa) | Across the layers (MPa) | Deflection, PLA / PETG / ASA (mm) | Holds in the part, PLA / PETG / ASA (kg) | Holds at the contact, PLA / PETG / ASA (kg) | Mesh change: part / contact / deflection |
|---|---|---|---|---|---|---|---|---|---|---|
| solid | v0.2.1 | hook-mid | 0.70 | 10.5 mm from slot (80, 80), front | 1.47 | 0.19 | 0.010 / 0.015 / 0.014 | 74.7 y / 68.9 y / 58.4 l | 35.3 / 32.6 / 29.1 | level 1 only |
| solid | v0.2.1 | hook-edge | 0.66 | 10.5 mm from slot (20, 100), front | 1.61 | 0.18 | 0.014 / 0.022 / 0.021 | 78.3 y / 72.2 y / 63.3 l | 32.4 / 29.8 / 26.7 | level 1 only |
| solid | today | hook-mid | 0.70 | 10.4 mm from slot (80, 80), front | 1.47 | 0.17 | 0.010 / 0.015 / 0.014 | 74.2 y / 68.4 y / 61.1 y | 35.4 / 32.6 / 29.1 | level 1 only |
| solid | today | hook-edge | 0.65 | 10.6 mm from slot (20, 100), front | 1.77 | 0.17 | 0.015 / 0.022 / 0.021 | 79.6 y / 73.3 y / 65.5 y | 29.3 / 27.0 / 24.2 | level 1 only |
| lightened | v0.2.1 | hook-mid | 4.46 | 10.4 mm from slot (80, 80), mid | 4.37 | 1.23 | 0.070 / 0.107 / 0.100 | 11.7 y / 10.7 y / 9.1 l | 11.9 / 11.0 / 9.8 | level 1 only |
| lightened | v0.2.1 | hook-edge | 5.39 | 28.3 mm from slot (20, 100), front | 4.40 | 1.61 | 0.093 / 0.143 / 0.134 | 9.6 y / 8.9 y / 7.0 l | 11.8 / 10.9 / 9.7 | level 1 only |
| lightened | today | hook-mid | 2.61 | 10.9 mm from slot (80, 80), mid | 4.15 | 0.63 | 0.061 / 0.094 / 0.088 | 19.9 y / 18.3 y / 16.4 y | 12.5 / 11.5 / 10.3 | level 1 only |
| lightened | today | hook-edge | 4.00 | 26.2 mm from slot (20, 100), back | 4.23 | 1.00 | 0.087 / 0.133 / 0.125 | 13.0 y / 12.0 y / 10.7 y | 12.3 / 11.3 / 10.1 | level 1 only |
| skeleton | v0.2.1 | hook-mid | 54.05 | 9.9 mm from slot (80, 80), mid | 11.21 | 35.16 | 0.127 / 0.194 / 0.182 | 0.5 l / 0.5 l / 0.3 l | 4.6 / 4.3 / 3.8 | level 1 only |
| skeleton | v0.2.1 | hook-edge | not run | | | | | | | |
| skeleton | v0.4.2 | hook-mid | 5.45 | 9.3 mm from slot (80, 80), mid | 7.70 | 1.55 | 0.096 / 0.146 / 0.137 | 9.5 y / 8.8 y / 7.3 l | 6.8 / 6.2 / 5.6 | level 1 only |
| skeleton | v0.4.2 | hook-edge | 6.49 | 9.1 mm from slot (20, 100), mid | 8.39 | 2.40 | 0.128 / 0.196 / 0.183 | 7.2 l / 7.4 y / 4.7 l | 6.2 / 5.7 / 5.1 | level 1 only |
| skeleton | today | hook-mid | 8.83 | 9.8 mm from slot (80, 80), front | 18.02 | 4.22 | 0.125 / 0.192 / 0.180 | 4.1 l / 4.3 l / 2.7 l | 2.9 / 2.7 / 2.4 | level 1 only |
| skeleton | today | hook-edge | 9.04 | 9.8 mm from slot (20, 100), front | 18.08 | 4.61 | 0.164 / 0.252 / 0.236 | 3.8 l / 4.0 l / 2.4 l | 2.9 / 2.7 / 2.4 | level 1 only |

### 10 N spread over an 80 mm board's hooks, on each mounting

| Part | Version | Case | Peak in the part (MPa) | Where | At the contact (MPa) | Across the layers (MPa) | Deflection, PLA / PETG / ASA (mm) | Holds in the part, PLA / PETG / ASA (kg) | Holds at the contact, PLA / PETG / ASA (kg) | Mesh change: part / contact / deflection |
|---|---|---|---|---|---|---|---|---|---|---|
| solid | v0.2.1 | spread-screws | 0.42 | 5.2 mm from countersink (10, 70), mid | 0.87 | 0.21 | 0.006 / 0.010 / 0.009 | 84.4 l / 89.3 l / 54.6 l | 60.0 / 55.3 / 49.4 | level 1 only |
| solid | v0.2.1 | spread-standoffs | 2.14 | 10.4 mm from slot (60, 60), back | 0.94 | 2.46 | 0.008 / 0.012 / 0.011 | 7.1 l / 7.5 l / 4.6 l | 55.2 / 50.9 / 45.5 | level 1 only |
| solid | v0.2.1 | spread-keyholes | 8.81 | 5.0 mm from keyhole lip (70, 70), back | 1.60 | 7.24 | 0.645 / 0.989 / 0.927 | 2.4 l / 2.5 l / 1.5 l | 32.4 / 29.9 / 26.7 | level 1 only |
| solid | v0.2.1 | spread-keyholes-standing | 1.49 | 5.0 mm from keyhole lip (70, 70), back | 1.00 | 1.38 | 0.009 / 0.014 / 0.013 | 12.5 l / 13.3 l / 8.1 l | 52.0 / 47.9 / 42.8 | level 1 only |
| solid | today | spread-screws | 0.41 | 5.1 mm from countersink (10, 70), mid | 0.83 | 0.22 | 0.006 / 0.010 / 0.009 | 78.5 l / 83.1 l / 50.8 l | 62.8 / 57.9 / 51.7 | level 1 only |
| solid | today | spread-standoffs | 1.64 | 9.6 mm from slot (20, 60), back | 1.13 | 1.89 | 0.008 / 0.012 / 0.011 | 9.2 l / 9.7 l / 5.9 l | 46.1 / 42.5 / 37.9 | level 1 only |
| solid | today | spread-keyholes | 6.25 | 2.3 mm from slot (20, 60), z -15.0 | 6.67 | 7.08 | 0.380 / 0.583 / 0.547 | 2.4 l / 2.6 l / 1.6 l | 7.8 / 7.2 / 6.4 | level 1 only |
| solid | today | spread-keyholes-standing | 0.74 | 11.5 mm from slot below (60, 20), back | 0.87 | 0.44 | 0.002 / 0.003 / 0.003 | 39.3 l / 41.6 l / 25.4 l | 59.5 / 54.8 / 49.0 | level 1 only |
| lightened | v0.2.1 | spread-screws | 3.68 | 7.1 mm from countersink (10, 70), back | 1.75 | 0.83 | 0.040 / 0.061 / 0.057 | 14.1 y / 13.0 y / 11.6 y | 29.8 / 27.5 / 24.5 | level 1 only |
| lightened | v0.2.1 | spread-standoffs | 3.83 | 7.8 mm from slot (20, 60), back | 1.75 | 3.74 | 0.041 / 0.063 / 0.059 | 4.6 l / 4.9 l / 3.0 l | 29.7 / 27.4 / 24.5 | level 1 only |
| lightened | v0.2.1 | spread-keyholes | 12.25 | 5.0 mm from keyhole lip (10, 70), back | 3.00 | 6.44 | 1.608 / 2.466 / 2.312 | 2.7 l / 2.9 l / 1.7 l | 17.3 / 16.0 / 14.3 | level 1 only |
| lightened | v0.2.1 | spread-keyholes-standing | 4.17 | 5.0 mm from keyhole lip (70, 70), back | 1.74 | 3.89 | 0.047 / 0.072 / 0.067 | 4.5 l / 4.7 l / 2.9 l | 29.9 / 27.6 / 24.6 | level 1 only |
| lightened | today | spread-screws | 2.12 | 7.2 mm from slot (20, 60), back | 1.68 | 0.50 | 0.036 / 0.055 / 0.051 | 24.6 y / 22.6 y / 20.2 y | 31.0 / 28.6 / 25.5 | level 1 only |
| lightened | today | spread-standoffs | 4.00 | 9.4 mm from slot (60, 60), back | 1.63 | 3.59 | 0.038 / 0.058 / 0.054 | 4.8 l / 5.1 l / 3.1 l | 31.9 / 29.4 / 26.3 | level 1 only |
| lightened | today | spread-keyholes | 9.26 | 26.2 mm from slot (20, 60), front | 5.22 | 6.70 | 1.274 / 1.954 / 1.832 | 2.6 l / 2.7 l / 1.7 l | 10.0 / 9.2 / 8.2 | level 1 only |
| lightened | today | spread-keyholes-standing | 1.93 | 10.8 mm from slot below (20, 20), back | 3.87 | 0.67 | 0.006 / 0.009 / 0.008 | 25.8 l / 24.9 y / 16.7 l | 13.4 / 12.4 / 11.1 | level 1 only |
| skeleton | v0.2.1 | spread-screws | 17.89 | 6.5 mm from countersink (70, 70), mid | 5.97 | 8.62 | 0.068 / 0.104 / 0.098 | 2.0 l / 2.1 l / 1.3 l | 8.7 / 8.0 / 7.2 | level 1 only |
| skeleton | v0.2.1 | spread-standoffs | 18.37 | 7.9 mm from slot (60, 60), mid | 4.89 | 8.13 | 0.072 / 0.111 / 0.104 | 2.1 l / 2.3 l / 1.4 l | 10.6 / 9.8 / 8.8 | level 1 only |
| skeleton | v0.2.1 | spread-keyholes | 46.71 | 10.0 mm from slot (60, 60), back | 13.95 | 25.66 | 2.217 / 3.399 / 3.187 | 0.7 l / 0.7 l / 0.4 l | 3.7 / 3.4 / 3.1 | level 1 only |
| skeleton | v0.2.1 | spread-keyholes-standing | 18.03 | 10.0 mm from slot (60, 60), back | 5.88 | 10.34 | 0.085 / 0.130 / 0.122 | 1.7 l / 1.8 l / 1.1 l | 8.8 / 8.2 / 7.3 | level 1 only |
| skeleton | v0.4.2 | spread-screws | 3.33 | 6.9 mm from slot (20, 60), mid | 2.88 | 1.33 | 0.052 / 0.080 / 0.075 | 13.0 l / 13.8 l / 8.4 l | 18.1 / 16.6 / 14.9 | level 1 only |
| skeleton | v0.4.2 | spread-standoffs | 4.96 | 9.2 mm from slot (20, 60), back | 3.22 | 6.04 | 0.056 / 0.085 / 0.080 | 2.9 l / 3.0 l / 1.9 l | 16.1 / 14.9 / 13.3 | level 1 only |
| skeleton | v0.4.2 | spread-keyholes | 19.52 | 26.1 mm from slot below (60, 20), mid | 7.04 | 13.00 | 1.703 / 2.611 / 2.448 | 1.3 l / 1.4 l / 0.9 l | 7.4 / 6.8 / 6.1 | level 1 only |
| skeleton | v0.4.2 | spread-keyholes-standing | 2.16 | 10.8 mm from slot below (60, 20), back | 3.95 | 0.87 | 0.010 / 0.015 / 0.014 | 20.0 l / 21.1 l / 12.9 l | 13.2 / 12.1 / 10.8 | level 1 only |
| skeleton | today | spread-screws | 4.62 | 6.9 mm from slot (60, 60), front | 8.10 | 3.00 | 0.065 / 0.100 / 0.094 | 5.8 l / 6.1 l / 3.7 l | 6.4 / 5.9 / 5.3 | level 1 only |
| skeleton | today | spread-standoffs | 5.81 | 9.6 mm from slot (20, 60), back | 9.89 | 5.90 | 0.069 / 0.106 / 0.099 | 2.9 l / 3.1 l / 1.9 l | 5.3 / 4.8 / 4.3 | level 1 only |
| skeleton | today | spread-keyholes | 22.01 | 25.9 mm from slot below (60, 20), front | 8.78 | 8.61 | 2.140 / 3.282 / 3.077 | 2.0 l / 2.1 l / 1.3 l | 5.9 / 5.5 / 4.9 | level 1 only |
| skeleton | today | spread-keyholes-standing | 2.21 | 10.9 mm from slot below (60, 20), front | 9.44 | 1.02 | 0.057 / 0.087 / 0.082 | 16.9 l / 17.9 l / 10.9 l | 5.5 / 5.1 / 4.5 | level 1 only |

### The connectors, 10 N

| Part | Version | Case | Peak in the part (MPa) | Where | At the contact (MPa) | Across the layers (MPa) | Deflection, PLA / PETG / ASA (mm) | Holds in the part, PLA / PETG / ASA (kg) | Holds at the contact, PLA / PETG / ASA (kg) | Mesh change: part / contact / deflection |
|---|---|---|---|---|---|---|---|---|---|---|
| standoff, 1 board | today | shear | 2.28 | (-1.3, 3.8, 1.1) | 1.01 | 2.34 | 0.020 / 0.031 / 0.029 | 7.4 l / 7.8 l / 4.8 l | 51.4 / 47.3 / 42.3 | level 1 only |
| standoff, 4 boards | today | shear | 0.70 | (9.4, -5.0, 7.0) | 0.26 | 0.83 | 0.002 / 0.003 / 0.003 | 20.9 l / 22.1 l / 13.5 l | 203.8 / 187.8 / 167.8 | level 1 only |
| slot clip, 2 boards | today | shear | 4.21 | (10.4, -2.7, 7.0) | 0.97 | 2.54 | 0.229 / 0.351 / 0.329 | 6.8 l / 7.2 l / 4.4 l | 53.4 / 49.2 / 44.0 | level 1 only |

### Two-panel walls joined by a slot clip, 10 N

| Part | Version | Case | Peak in the part (MPa) | Where | At the contact (MPa) | Across the layers (MPa) | Deflection, PLA / PETG / ASA (mm) | Holds in the part, PLA / PETG / ASA (kg) | Holds at the contact, PLA / PETG / ASA (kg) | Mesh change: part / contact / deflection |
|---|---|---|---|---|---|---|---|---|---|---|
| solid wall | today | wall-seam-hook | 0.88 | 5.7 mm from countersink (90, 10), front | 1.58 | 0.82 | 0.018 / 0.028 / 0.026 | 21.2 l / 22.4 l / 13.7 l | 32.9 / 30.3 / 27.1 | level 1 only |
| solid wall | today | wall-spread | 0.35 | 5.9 mm from countersink (150, 110), front | 0.31 | 0.42 | 0.005 / 0.007 / 0.007 | 41.2 l / 43.6 l / 26.6 l | 166.2 / 153.2 / 136.9 | level 1 only |
| solid wall | today | wall-seam-hook-outer-screws | 1.46 | 5.6 mm from countersink (150, 10), front | 1.53 | 1.50 | 0.032 / 0.050 / 0.047 | 11.6 l / 12.2 l / 7.5 l | 34.0 / 31.4 / 28.0 | level 1 only |
| lightened wall | today | wall-seam-hook | 2.56 | 12.9 mm from slot (80, 80), front | 2.41 | 0.75 | 0.066 / 0.101 / 0.095 | 20.3 y / 18.7 y / 15.0 l | 21.6 / 19.9 / 17.8 | level 1 only |
| lightened wall | today | wall-spread | 1.28 | 6.7 mm from countersink (150, 110), back | 0.57 | 0.36 | 0.022 / 0.034 / 0.031 | 40.6 y / 37.4 y / 31.4 l | 92.0 / 84.8 / 75.7 | level 1 only |
| lightened wall | today | wall-seam-hook-outer-screws | 3.11 | 12.4 mm from slot (80, 80), front | 2.77 | 0.89 | 0.139 / 0.213 / 0.200 | 16.7 y / 15.4 y / 12.6 l | 18.8 / 17.3 / 15.5 | level 1 only |
| skeleton wall | today | wall-seam-hook | not run | | | | | | | |
| skeleton wall | today | wall-spread | not run | | | | | | | |
| skeleton wall | today | wall-seam-hook-outer-screws | not run | | | | | | | |

### The walls, the panels and the clip apart

| Wall | Case | Level | Peak in the panels (MPa) | Where | Peak in the clip (MPa) | Where |
|---|---|---|---|---|---|---|
| solid wall | wall-seam-hook | 1 | 0.88 | 5.7 mm from countersink (90, 10), front | 0.34 | 20.6 mm from slot (80, 80), z -1.2 |
| solid wall | wall-spread | 1 | 0.35 | 5.9 mm from countersink (150, 110), front | 0.05 | 20.0 mm from slot (40, 80), z -1.3 |
| solid wall | wall-seam-hook-outer-screws | 1 | 1.46 | 5.6 mm from countersink (150, 10), front | 0.68 | 19.7 mm from slot below (80, 40), z -1.0 |
| lightened wall | wall-seam-hook | 1 | 2.56 | 12.9 mm from slot (80, 80), front | 0.37 | 19.4 mm from slot (80, 80), z -1.1 |
| lightened wall | wall-spread | 1 | 1.28 | 6.7 mm from countersink (150, 110), back | 0.09 | 19.2 mm from slot below (120, 40), z -1.2 |
| lightened wall | wall-seam-hook-outer-screws | 1 | 3.11 | 12.4 mm from slot (80, 80), front | 0.78 | 30.3 mm from slot below (80, 40), z -1.2 |

73 runs; mesh volume against Manifold's: largest difference 0.98 %; reactions against loads: largest imbalance 1.3e-10

<!-- tables:end -->

## Questions for the owner

Pending, with the findings.

## Reproducing

```bash
npm run build -w skadis-air                         # today's library
node scripts/physics/write-parts.mjs                # today's parts and their cases, into .check/physics/parts/today/
node scripts/physics/write-parts.mjs --lib <v0.2.1 worktree>/packages/core/dist/index.js --version v0.2.1 --boards-only
node scripts/physics/write-parts.mjs --lib <v0.4.2 worktree>/packages/core/dist/index.js --version v0.4.2 --boards-only --types skeleton
cd scripts/physics
uv run python run.py --budget 1620                  # every run not yet in .check/physics/results.jsonl, for 27 minutes
node sections.mjs > ../../.check/physics/sections-today.json   # and per version, with --lib and --version
uv run python hand.py ../../.check/physics/sections-*.json > ../../.check/physics/hand.md
uv run python tables.py --into ../../docs/research/2026-10-23-physics-tests.md --hand ../../.check/physics/hand.md
uv run figures.py                                   # the figures' scenes, into .check/physics/figures/
cd ../.. && node scripts/physics/figures.mjs        # their pictures, into docs/figures/physics/
bash tests/test-physics.sh                          # the controls
```

A figure whose run was reported before runs saved their surface (23 Oct 2026, 14:00) is named by `figures.py` with the
`run.py --one` command that saves it.
