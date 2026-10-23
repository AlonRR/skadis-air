# Physics tests of the boards and connectors

Research date: 23 Oct 2026. The owner's decisions: D323 (hand calculations and a simulation, a bar's bending its
control), D324 (the boards from before the design passes beside today's), Q325 (IKEA's ratings as the loads), Q326
(PLA, PETG and ASA from a maker's sheets) and Q327 (the three boards, the standoff, the slot clip and walls), all in
[`status.md`](../status.md), and Q329 (b, 23 Oct 2026: no target load, each part's capacity in each material, in N and
kg, and the stress shown on pictures of the parts). The choices made on the way are C330 to C349 in
[`choices.md`](../choices.md).

## Status

| Step | State |
|---|---|
| 1. Tooling and controls | done: `scripts/physics/`, `tests/test-physics.sh` |
| 2. Loads, hook and materials cited | done: IKEA publishes no rating, so the runs use a reference load and give each part's capacity ([below](#the-loads)) |
| 3. Today's parts | level 2 done for every hook, spread and connector case but one (the lightened board on standoffs, which no try meshed at level 2); level 3 for the skeleton on standoffs |
| 4. The old versions | level 2 done for every case but one window (v0.2.1's skeleton, hook at the edge, which no try meshed); level 3 for v0.4.2's skeleton under the edge hook |
| 5. Walls | solid and lightened at level 1, their level 2 past a window; the skeleton's wall not solved (its stiffness singular, C346) |
| 6. Capacities (Q329) | done for every run: the headline table, in N and kg per material |
| 7. Figures | done: eleven, in `docs/figures/physics/` ([below](#the-figures-c343)), by `scripts/physics/figures.py`, `figure.html` and `figures.mjs` |
| 8. The report | this file; its tables are `scripts/physics/tables.py`'s output, as of the last run |

### Resume point

Kept current at each checkpoint. **23 Oct 2026, the last:** the runs are done as far as this machine takes them.
Level 2 for every hook, spread and connector case but one (today's lightened board on standoffs, which no try meshed);
level 3 for the two skeleton cases that decide a before and after; the walls at level 1, their level 2 past a window;
the skeleton's wall not solved ([not done](#not-done-and-why)). Eleven figures. To take it further: `run.py --levels 2
--only <part> --cases <case> --retry-failed --budget <s>` in a window longer than 28 minutes runs a wall's level 2;
`run.py` skips what `results.jsonl` holds, starts no run it cannot finish and kills one that outlasts its window
(C344).

## Findings

What each part holds is the load at which the model's peak reaches the material's strength (Q329): a ranking of the
designs and a map of their weak spots, not a breaking load (the box above). PLA's figures below, all from the
[headline table](#what-each-part-holds-q329); PETG's are within about 10 % of PLA's, and ASA's are the lowest wherever
the layers govern, as its interlayer adhesion is 11 MPa against 17 and 18. **Two cautions on every capacity set
across the layers (l):** that stress, normal to the layers of parts printed as 5 mm plates, moved 10 % or more between
the mesh levels in 23 of the 44 cases run at two (C349), and 30 % with Poisson's ratio, which no sheet gives
([below](#poissons-ratio-c331-v042s-skeleton-hook-edge-hook-edge-level-1)); so the table also gives what each part holds
to the yield alone, from its peak, which converged in 31 of the 44.

**One hook** (per hook):

- **The solid board** holds the most: 469 N (47.8 kg) today, 513 N in v0.2.1, set across the layers 1 mm from a corner
  screw's countersink, where the fully held countersink sets the value (C345: 2 mm off it the stress is 0.22 against
  0.36 MPa), and not converged (the layers' stress moved 16 % today, 28 % in v0.2.1); to the yield alone 550 N,
  converged. The hook's contact comes first, at 292 N. Old and new are one board here.
- **The lightened board** holds 119 N (12.2 kg) today, converged, at the yield where a web meets the left rim 26 mm from
  the edge hook's slot, against 72 N (7.4 kg) in v0.2.1, across the layers 10 mm from it, not converged (that stress
  moved 24 %; 86 N to the yield alone): 65 % more. The hook's contact, 107 N on both, now comes first on today's.
- **The skeleton board** went from 4 N (0.4 kg) in v0.2.1, at a sharp pocket corner by the slot whose stress rose with
  each mesh (54 to 64 MPa: an upper bound), to 67 N (6.8 kg) in v0.4.2, its corners rounded, converged, and back to
  29 N (2.9 kg) today, converged: **43 % of v0.4.2's** (55 against 67 N to the yield alone). D314's stepped profile moved
  the weak spot to the step where a web meets the left rim, 27 mm from the slot: 5.89 MPa across the layers there,
  against at most 2.2 on v0.4.2's. And the hook's body pressing on the 0.4 mm front flange round the lower slot reads
  19.3 MPa at the contact against v0.4.2's 10.0, so today's contact holds 26 N against 51. D314 asked for a hook-load
  test print before release; these say where it will break first. (v0.4.2's edge hook had read 8.84 MPa at a web's
  junction at level 2, not converged; level 3, refined there, read 6.81 elsewhere: a mesh effect, and its middle hook
  governs.)

**The spread load**, 10 N over an 80 mm board's two hooks (per board):

- **On corner screws:** the solid board 761 N; the lightened 238 N today against 136 N in v0.2.1, at the yield, both
  converged; the skeleton 72 N today, 124 N in v0.4.2, 21 N in v0.2.1.
- **On standoffs, the weakest mounting for every board:** the solid board 83 N today, 92 N in v0.2.1; the lightened
  47 N today (level 1 only: its level 2 would not mesh in any try) against 40 N; the skeleton 18 N today, 24 N in
  v0.4.2, 17 N in v0.2.1. On every board the spot is across the layers at a bottom standoff's root on the board's back,
  and on three of them (v0.2.1's lightened, v0.4.2's and today's skeleton) its stress rose at its place with each mesh: a
  **sharp inner edge**, singular, so these are upper bounds and what the print holds there depends on the root's real radius (to the yield alone: 294, 127, 58 N today).
- **On keyholes, hung from their lips alone** (the brief's case, which no board has): 10 to 25 N on every board, a
  cantilever on 1.5 mm lips.
- **On keyholes, standing on their bottom standoffs** (the design's, D190, D245): the solid board 437 N, the lightened
  200 N, the skeleton 161 N today, against 112, 39 and 18 N in v0.2.1, and 188 N for v0.4.2's skeleton: today's keyhole
  boards hold 4 to 9 times v0.2.1's.

**The connectors** (per connector):

- **The standoff** for one board holds 80 N (8.2 kg) across its layers 1 mm off its held wall face, the band C345 flags:
  2 mm off it the stress is 1.30 against 2.11 MPa, the beam's 1.38 (about 130 N there); 243 N to the yield alone. For
  four boards, 175 N.
- **The slot clip** for two boards holds 53 N (5.4 kg) across the layers at its bar's root by the loaded peg, rising
  with the mesh (an upper bound); 111 N to the yield alone.

**The walls** (level 1 only, their level 2 past a window; per hook): one hook in the seam's slot, the wall on its four outer screws alone, the clip
carrying a panel's share: the solid wall 113 N across the layers at an outer screw's countersink band (C345: 2 mm off
it 0.67 against 1.50 MPa), the lightened 164 N at the yield on a web beside the seam; with each panel on
its own screws, 208 and 199 N. The clip is not the weak part: its peak is between a tenth and a half of the panels'.

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

### The hand calculations against the model

| Check, per 10 N | By hand | The model | Reading |
|---|---|---|---|
| The hook's prying push at the back tab and the lower slot | 10.0 N, on the nominal 27.6 mm between the patches | 9.2 to 9.8 N, each run's own from its patches' centres, 27.9 to 30.0 mm apart (logged); the moment 300 N mm in every run | agree within 8 %; the skeleton's back patch is 14 mm² against the solid board's 34, as its members behind the slot are narrower |
| The rod's bearing on the slot's end | 0.74 MPa, even over 4.5 x 3 mm of straight wall | 0.61 MPa mean over the model's patch, 16.2 to 16.5 mm² of the slot's round end across the rod's 4.5 mm (logged); 1.75 MPa at the patch's edges on the solid board | the model's patch is a fifth larger than the hand's; the contact's peak is the even pressure's edge (C339) |
| The standoff for one board, bent at its root | 1.59 MPa at the root, across its layers; 1.38 MPa 2 mm up its length | 2.11 MPa 1.01 mm off its held wall face, 1.30 MPa 2 mm off it (level 2) | within 6 % where the held face does not reach; at 1 mm the bonded face adds a third (C345) |
| The slot clip's bar, 10 N carried 40 mm | 3.43 MPa in its own plane | 4.21 MPa at the bar's root by the loaded peg (level 1) | 1.23 times the bar's nominal: the root's concentration |
| A board's members, the rim in its plane | 0.90 MPa (lightened, today), 2.15 (skeleton, today) | the parts' peaks 4.27 and 9.28 MPa, at a web's junction with the rim | 4.3 to 4.7 times the member's nominal: the junctions' concentration, which a member formula does not see |
| A corner screw's distance from the board's edge | the rule wants 10.0 mm from the hole's edge | the board has 7.75 mm | the solid boards' peak across the layers is at the countersink (C345); a print-test question, not the model's |

## Results

Per 10 N. *Holds* is the load at which the model's peak stress reaches the material's strength (Q329, C342): in the
part, the lesser of its peak against the yield along the layers (y) and its stress across the layers against their
adhesion (l); at the contact, the stress within 3 mm of a loaded face against the yield, where the model's even
pressure makes the value the model's as much as the hook's (C339). The first table gives each part's in N and kg, per
hook for a hook, per board for the spread load, per connector for a connector; the case tables after it give kg. A
wall's peaks are its panels' and its clip's, the bonded pegs' edges left out (C341). Deflection is the hook's slot's
movement in a hook's case, the part's largest otherwise. *Mesh change* is how far the part's peak and its stress across
the layers (each at its own place, C338, C349), the contact's peak and the deflection moved from level 1 to level 2. A row whose spot is *at a held face's band* lies just past the 1 mm
round a held face where no peak is read: the held face's idealisation, every degree of freedom, sets it as much as the
part does, so its capacity is a lower bound and the reading 2 mm off the held faces, given beside it, is nearer the
part's own (C345). Every capacity set across the layers (l) also moves with Poisson's ratio, -19 % and +30 % at 0.30
and 0.40 (the last table).

<!-- tables:begin -->

### What each part holds (Q329)

| Part | Version | Load | Case | In the part, PLA | PETG | ASA | Where | To the yield alone, PLA / PETG / ASA | At the contact, PLA / PETG / ASA | Mesh level: part / layers / contact / deflection |
|---|---|---|---|---|---|---|---|---|---|---|
| solid | v0.2.1 | one hook | hook-mid | 513 N, 52.3 kg (l) | 514 N, 52.4 kg (y) | 332 N, 33.8 kg (l) | across the layers: 4.8 mm from countersink (10, 10), mid; at a held face's band, 2 mm off it 0.16 against 0.33 MPa | 558 / 514 / 459 N (56.9 / 52.4 / 46.8 kg) | 298 / 275 / 245 N (30.4 / 28.0 / 25.0 kg), 1.71 MPa | 2, not converged: 0 % / 28 % / 6 % / 0 % |
| solid | today | one hook | hook-mid | 469 N, 47.8 kg (l) | 497 N, 50.6 kg (l) | 304 N, 30.9 kg (l) | across the layers: 4.8 mm from countersink (10, 10), mid; at a held face's band, 2 mm off it 0.22 against 0.36 MPa | 550 / 507 / 453 N (56.1 / 51.7 / 46.2 kg) | 292 / 269 / 240 N (29.7 / 27.4 / 24.5 kg), 1.75 MPa | 2, not converged: 0 % / 16 % / 7 % / 0 % |
| lightened | v0.2.1 | one hook | hook-edge | 72 N, 7.4 kg (l) | 76 N, 7.8 kg (l) | 47 N, 4.8 kg (l) | across the layers: 10.5 mm from slot (20, 100), mid | 86 / 79 / 70 N (8.7 / 8.0 / 7.2 kg) | 107 / 99 / 88 N (10.9 / 10.1 / 9.0 kg), 4.77 MPa | 2, not converged: 5 % / 24 % / 2 % / 0 % |
| lightened | today | one hook | hook-edge | 119 N, 12.2 kg (y) | 110 N, 11.2 kg (y) | 98 N, 10.0 kg (y) | yield: 25.7 mm from slot (20, 100), mid | 119 / 110 / 98 N (12.2 / 11.2 / 10.0 kg) | 107 / 99 / 88 N (10.9 / 10.1 / 9.0 kg), 4.76 MPa | 2, converged: 5 % / 2 % / 1 % / 1 % |
| skeleton | v0.2.1 | one hook | hook-edge | 4 N, 0.4 kg (l) | 5 N, 0.5 kg (l) | 3 N, 0.3 kg (l) | across the layers: 9.9 mm from slot (20, 100), mid | 8 / 7 / 7 N (0.8 / 0.8 / 0.7 kg) | 36 / 33 / 30 N (3.7 / 3.4 / 3.0 kg), 14.15 MPa | 2, not converged: 14 % / 33 % / 5 % / 1 % |
| skeleton | v0.4.2 | one hook | hook-mid | 67 N, 6.8 kg (y) | 62 N, 6.3 kg (y) | 55 N, 5.6 kg (y) | yield: 9.2 mm from slot (80, 80), mid | 67 / 62 / 55 N (6.8 / 6.3 / 5.6 kg) | 51 / 47 / 42 N (5.2 / 4.8 / 4.3 kg), 10.02 MPa | 2, converged: 5 % / 3 % / 10 % / 0 % |
| skeleton | today | one hook | hook-edge | 29 N, 2.9 kg (l) | 31 N, 3.1 kg (l) | 19 N, 1.9 kg (l) | across the layers: 26.6 mm from slot (20, 100), mid | 55 / 51 / 45 N (5.6 / 5.2 / 4.6 kg) | 26 / 24 / 22 N (2.7 / 2.5 / 2.2 kg), 19.32 MPa | 2, converged: 6 % / 3 % / 6 % / 0 % |
| solid | v0.2.1 | spread, on corner screws | spread-screws | 798 N, 81.3 kg (l) | 844 N, 86.1 kg (l) | 516 N, 52.6 kg (l) | across the layers: 4.6 mm from countersink (70, 10), mid; at a held face's band, 2 mm off it 0.09 against 0.21 MPa | 1513 / 1395 / 1246 N (154.3 / 142.2 / 127.0 kg) | 611 / 563 / 503 N (62.3 / 57.4 / 51.3 kg), 0.84 MPa | 2, not converged: 29 % / 4 % / 4 % / 1 % |
| solid | v0.2.1 | spread, on standoffs | spread-standoffs | 92 N, 9.4 kg (l) | 97 N, 9.9 kg (l) | 60 N, 6.1 kg (l) | across the layers: 10.1 mm from slot (60, 60), back | 282 / 260 / 232 N (28.8 / 26.5 / 23.7 kg) | 577 / 532 / 475 N (58.8 / 54.2 / 48.4 kg), 0.88 MPa | 2, not converged: 23 % / 33 % / 6 % / 0 % |
| solid | v0.2.1 | spread, on keyholes, hung (the brief's) | spread-keyholes | 15 N, 1.5 kg (l) | 16 N, 1.6 kg (l) | 10 N, 1.0 kg (l) | across the layers: 5.4 mm from keyhole lip (10, 70), mid; at a held face's band, 2 mm off it 4.17 against 11.28 MPa; rising with the mesh at its place, a sharp inner edge: an upper bound | 46 / 42 / 38 N (4.7 / 4.3 / 3.8 kg) | 298 / 274 / 245 N (30.3 / 28.0 / 25.0 kg), 1.71 MPa | 2, not converged: 9 % / 36 % / 6 % / 1 % |
| solid | v0.2.1 | spread, on keyholes, standing on its standoffs (the design's) | spread-keyholes-standing | 112 N, 11.4 kg (l) | 118 N, 12.1 kg (l) | 72 N, 7.4 kg (l) | across the layers: 5.0 mm from keyhole lip (10, 70), back | 324 / 299 / 267 N (33.0 / 30.4 / 27.2 kg) | 519 / 478 / 427 N (52.9 / 48.8 / 43.6 kg), 0.98 MPa | 2, converged: 5 % / 2 % / 2 % / 0 % |
| solid | today | spread, on corner screws | spread-screws | 761 N, 77.6 kg (l) | 806 N, 82.2 kg (l) | 493 N, 50.2 kg (l) | across the layers: 4.8 mm from countersink (70, 10), mid; at a held face's band, 2 mm off it 0.10 against 0.22 MPa | 1442 / 1329 / 1187 N (147.0 / 135.4 / 121.0 kg) | 615 / 566 / 506 N (62.6 / 57.7 / 51.6 kg), 0.83 MPa | 2, not converged: 32 % / 6 % / 0 % / 1 % |
| solid | today | spread, on standoffs | spread-standoffs | 83 N, 8.5 kg (l) | 88 N, 9.0 kg (l) | 54 N, 5.5 kg (l) | across the layers: 10.0 mm from slot (20, 60), back | 294 / 271 / 242 N (30.0 / 27.7 / 24.7 kg) | 520 / 479 / 428 N (53.0 / 48.8 / 43.6 kg), 0.98 MPa | 2, converged: 1 % / 7 % / 15 % / 1 % |
| solid | today | spread, on keyholes, hung (the brief's) | spread-keyholes | 25 N, 2.5 kg (l) | 26 N, 2.7 kg (l) | 16 N, 1.6 kg (l) | across the layers: 6.2 mm from keyhole lip (60, 64.5), z -13.8 | 82 / 76 / 68 N (8.4 / 7.7 / 6.9 kg) | 72 / 67 / 60 N (7.4 / 6.8 / 6.1 kg), 7.06 MPa | 2, not converged: 19 % / 3 % / 5 % / 11 % |
| solid | today | spread, on keyholes, standing on its standoffs (the design's) | spread-keyholes-standing | 437 N, 44.5 kg (l) | 462 N, 47.1 kg (l) | 282 N, 28.8 kg (l) | across the layers: 11.2 mm from slot (60, 60), back | 617 / 569 / 508 N (62.9 / 58.0 / 51.8 kg) | 513 / 472 / 422 N (52.2 / 48.1 / 43.0 kg), 1.00 MPa | 2, not converged: 8 % / 41 % / 12 % / 2 % |
| lightened | v0.2.1 | spread, on corner screws | spread-screws | 136 N, 13.8 kg (y) | 125 N, 12.8 kg (y) | 112 N, 11.4 kg (y) | yield: 7.1 mm from countersink (10, 70), back | 136 / 125 / 112 N (13.8 / 12.8 / 11.4 kg) | 292 / 269 / 240 N (29.8 / 27.4 / 24.5 kg), 1.75 MPa | 2, converged: 2 % / 7 % / 0 % / 0 % |
| lightened | v0.2.1 | spread, on standoffs | spread-standoffs | 40 N, 4.1 kg (l) | 42 N, 4.3 kg (l) | 26 N, 2.6 kg (l) | across the layers: 9.2 mm from slot (20, 60), back; rising with the mesh at its place, a sharp inner edge: an upper bound | 116 / 107 / 96 N (11.8 / 10.9 / 9.7 kg) | 301 / 278 / 248 N (30.7 / 28.3 / 25.3 kg), 1.69 MPa | 2, not converged: 7 % / 11 % / 3 % / 0 % |
| lightened | v0.2.1 | spread, on keyholes, hung (the brief's) | spread-keyholes | 23 N, 2.3 kg (l) | 24 N, 2.4 kg (l) | 15 N, 1.5 kg (l) | across the layers: 4.4 mm from keyhole lip (70, 70), back | 43 / 39 / 35 N (4.4 / 4.0 / 3.6 kg) | 177 / 163 / 146 N (18.1 / 16.7 / 14.9 kg), 2.88 MPa | 2, not converged: 5 % / 15 % / 4 % / 0 % |
| lightened | v0.2.1 | spread, on keyholes, standing on its standoffs (the design's) | spread-keyholes-standing | 39 N, 4.0 kg (l) | 42 N, 4.2 kg (l) | 25 N, 2.6 kg (l) | across the layers: 5.0 mm from keyhole lip (70, 70), back | 115 / 106 / 94 N (11.7 / 10.8 / 9.6 kg) | 293 / 270 / 241 N (29.9 / 27.5 / 24.6 kg), 1.74 MPa | 2, converged: 5 % / 0 % / 0 % / 1 % |
| lightened | today | spread, on corner screws | spread-screws | 238 N, 24.3 kg (y) | 220 N, 22.4 kg (y) | 196 N, 20.0 kg (y) | yield: 7.4 mm from slot (20, 60), back | 238 / 220 / 196 N (24.3 / 22.4 / 20.0 kg) | 304 / 280 / 250 N (30.9 / 28.5 / 25.5 kg), 1.68 MPa | 2, not converged: 1 % / 69 % / 0 % / 0 % |
| lightened | today | spread, on standoffs | spread-standoffs | 47 N, 4.8 kg (l) | 50 N, 5.1 kg (l) | 31 N, 3.1 kg (l) | across the layers: 9.4 mm from slot (20, 60), back | 127 / 117 / 105 N (13.0 / 12.0 / 10.7 kg) | 313 / 288 / 258 N (31.9 / 29.4 / 26.3 kg), 1.63 MPa | 1 only |
| lightened | today | spread, on keyholes, hung (the brief's) | spread-keyholes | 22 N, 2.2 kg (l) | 23 N, 2.4 kg (l) | 14 N, 1.4 kg (l) | across the layers: 5.6 mm from keyhole lip (60, 64.5), z -14.2; at a held face's band, 2 mm off it 4.67 against 7.73 MPa | 48 / 44 / 39 N (4.9 / 4.5 / 4.0 kg) | 92 / 85 / 76 N (9.4 / 8.7 / 7.7 kg), 5.53 MPa | 2, not converged: 7 % / 13 % / 6 % / 1 % |
| lightened | today | spread, on keyholes, standing on its standoffs (the design's) | spread-keyholes-standing | 200 N, 20.3 kg (l) | 211 N, 21.5 kg (l) | 129 N, 13.2 kg (l) | across the layers: 10.1 mm from slot (20, 60), back; rising with the mesh at its place, a sharp inner edge: an upper bound | 237 / 218 / 195 N (24.1 / 22.2 / 19.9 kg) | 133 / 123 / 110 N (13.6 / 12.5 / 11.2 kg), 3.83 MPa | 2, not converged: 11 % / 17 % / 1 % / 3 % |
| skeleton | v0.2.1 | spread, on corner screws | spread-screws | 21 N, 2.1 kg (l) | 22 N, 2.3 kg (l) | 14 N, 1.4 kg (l) | across the layers: 6.5 mm from countersink (70, 70), mid | 28 / 25 / 23 N (2.8 / 2.6 / 2.3 kg) | 109 / 101 / 90 N (11.1 / 10.3 / 9.2 kg), 4.66 MPa | 2, converged: 3 % / 6 % / 28 % / 1 % |
| skeleton | v0.2.1 | spread, on standoffs | spread-standoffs | 17 N, 1.8 kg (l) | 18 N, 1.9 kg (l) | 11 N, 1.1 kg (l) | across the layers: 9.9 mm from slot (60, 60), mid | 29 / 27 / 24 N (3.0 / 2.7 / 2.4 kg) | 110 / 102 / 91 N (11.2 / 10.3 / 9.2 kg), 4.63 MPa | 2, not converged: 5 % / 17 % / 6 % / 0 % |
| skeleton | v0.2.1 | spread, on keyholes, hung (the brief's) | spread-keyholes | 10 N, 1.0 kg (l) | 11 N, 1.1 kg (l) | 6 N, 0.7 kg (l) | across the layers: 8.2 mm from slot (60, 60), mid | 15 / 14 / 12 N (1.5 / 1.4 / 1.3 kg) | 52 / 48 / 43 N (5.3 / 4.9 / 4.4 kg), 9.79 MPa | 2, not converged (the part's peak moved): 39 % / 50 % / 42 % / 0 % |
| skeleton | v0.2.1 | spread, on keyholes, standing on its standoffs (the design's) | spread-keyholes-standing | 18 N, 1.8 kg (l) | 19 N, 1.9 kg (l) | 11 N, 1.2 kg (l) | across the layers: 9.9 mm from slot (60, 60), mid | 39 / 36 / 32 N (4.0 / 3.6 / 3.3 kg) | 104 / 95 / 85 N (10.6 / 9.7 / 8.7 kg), 4.93 MPa | 2, not converged (the part's peak moved): 37 % / 7 % / 19 % / 1 % |
| skeleton | v0.4.2 | spread, on corner screws | spread-screws | 124 N, 12.7 kg (l) | 131 N, 13.4 kg (l) | 80 N, 8.2 kg (l) | across the layers: 8.5 mm from countersink (10, 70), mid | 158 / 145 / 130 N (16.1 / 14.8 / 13.3 kg) | 163 / 151 / 135 N (16.7 / 15.4 / 13.7 kg), 3.12 MPa | 2, converged: 3 % / 2 % / 8 % / 1 % |
| skeleton | v0.4.2 | spread, on standoffs | spread-standoffs | 24 N, 2.4 kg (l) | 25 N, 2.5 kg (l) | 15 N, 1.6 kg (l) | across the layers: 9.4 mm from slot (20, 60), back; rising with the mesh at its place, a sharp inner edge: an upper bound | 88 / 81 / 73 N (9.0 / 8.3 / 7.4 kg) | 149 / 137 / 123 N (15.2 / 14.0 / 12.5 kg), 3.42 MPa | 2, not converged: 14 % / 16 % / 6 % / 0 % |
| skeleton | v0.4.2 | spread, on keyholes, hung (the brief's) | spread-keyholes | 21 N, 2.2 kg (l) | 23 N, 2.3 kg (l) | 14 N, 1.4 kg (l) | across the layers: 5.7 mm from keyhole lip (60, 64.5), z -14.1; at a held face's band, 2 mm off it 4.44 against 7.91 MPa | 31 / 29 / 26 N (3.2 / 2.9 / 2.6 kg) | 88 / 81 / 73 N (9.0 / 8.3 / 7.4 kg), 5.77 MPa | 2, not converged: 20 % / 64 % / 22 % / 1 % |
| skeleton | v0.4.2 | spread, on keyholes, standing on its standoffs (the design's) | spread-keyholes-standing | 188 N, 19.2 kg (l) | 198 N, 20.2 kg (y) | 122 N, 12.4 kg (l) | across the layers: 9.3 mm from slot (20, 60), mid | 215 / 198 / 177 N (21.9 / 20.2 / 18.0 kg) | 118 / 109 / 97 N (12.1 / 11.1 / 9.9 kg), 4.31 MPa | 2, converged: 9 % / 7 % / 8 % / 1 % |
| skeleton | today | spread, on corner screws | spread-screws | 72 N, 7.4 kg (l) | 77 N, 7.8 kg (l) | 47 N, 4.8 kg (l) | across the layers: 9.8 mm from slot (60, 60), front | 116 / 107 / 96 N (11.8 / 10.9 / 9.7 kg) | 60 / 55 / 49 N (6.1 / 5.6 / 5.0 kg), 8.55 MPa | 2, not converged: 5 % / 28 % / 5 % / 7 % |
| skeleton | today | spread, on standoffs | spread-standoffs | 18 N, 1.9 kg (l) | 19 N, 2.0 kg (l) | 12 N, 1.2 kg (l) | across the layers: 9.8 mm from slot (20, 60), back; rising with the mesh at its place, a sharp inner edge: an upper bound | 58 / 54 / 48 N (5.9 / 5.5 / 4.9 kg) | 58 / 53 / 48 N (5.9 / 5.4 / 4.9 kg), 8.81 MPa | 3, not converged (the part's peak from level 2; the contact and the deflection from level 1): 11 % / 45 % / 10 % / 2 % |
| skeleton | today | spread, on keyholes, hung (the brief's) | spread-keyholes | 20 N, 2.0 kg (l) | 21 N, 2.1 kg (l) | 13 N, 1.3 kg (l) | across the layers: 5.7 mm from keyhole lip (60, 64.5), z -14.1; at a held face's band, 2 mm off it 5.70 against 8.60 MPa | 23 / 21 / 19 N (2.3 / 2.2 / 1.9 kg) | 54 / 50 / 44 N (5.5 / 5.0 / 4.5 kg), 9.49 MPa | 2, converged: 1 % / 0 % / 8 % / 0 % |
| skeleton | today | spread, on keyholes, standing on its standoffs (the design's) | spread-keyholes-standing | 161 N, 16.5 kg (l) | 171 N, 17.4 kg (l) | 104 N, 10.6 kg (l) | across the layers: 7.4 mm from slot (60, 60), back | 280 / 258 / 231 N (28.6 / 26.3 / 23.5 kg) | 51 / 47 / 42 N (5.1 / 4.7 / 4.2 kg), 10.10 MPa | 2, not converged: 26 % / 3 % / 6 % / 1 % |
| standoff, 1 board | today | 10 N down | shear | 80 N, 8.2 kg (l) | 85 N, 8.7 kg (l) | 52 N, 5.3 kg (l) | across the layers: 1.0 mm from the wall face, at (1.2, 3.9, 1.0); at a held face's band, 2 mm off it 1.30 against 2.11 MPa | 243 / 224 / 200 N (24.8 / 22.9 / 20.4 kg) | 521 / 480 / 429 N (53.1 / 48.9 / 43.7 kg), 0.98 MPa | 2, not converged: 9 % / 12 % / 3 % / 0 % |
| standoff, 4 boards | today | 10 N down | shear | 175 N, 17.8 kg (l) | 185 N, 18.9 kg (l) | 113 N, 11.5 kg (l) | across the layers: 7.0 mm from the wall face, at (-10.1, -5.0, 7.0) | 664 / 612 / 547 N (67.7 / 62.4 / 55.7 kg) | 2008 / 1850 / 1654 N (204.7 / 188.6 / 168.6 kg), 0.25 MPa | 2, converged: 2 % / 4 % / 0 % / 0 % |
| slot clip, 2 boards | today | 10 N down | shear | 53 N, 5.4 kg (l) | 56 N, 5.8 kg (l) | 34 N, 3.5 kg (l) | across the layers: 27.7 mm from the peg in its slot, at (10.6, 3.3, 7.0); rising with the mesh at its place, a sharp inner edge: an upper bound | 111 / 103 / 92 N (11.4 / 10.5 / 9.4 kg) | 492 / 453 / 405 N (50.1 / 46.2 / 41.3 kg), 1.04 MPa | 2, not converged: 8 % / 20 % / 6 % / 0 % |
| solid wall | today | one hook at the seam, each panel on its screws | wall-seam-hook | 208 N, 21.2 kg (l) | 220 N, 22.4 kg (l) | 134 N, 13.7 kg (l) | across the layers: 5.7 mm from countersink (90, 110), front; at a held face's band, 2 mm off it 0.40 against 0.82 MPa | 576 / 531 / 475 N (58.8 / 54.2 / 48.4 kg) | 322 / 297 / 266 N (32.9 / 30.3 / 27.1 kg), 1.58 MPa | 1 only |
| solid wall | today | spread, each panel on its screws | wall-spread | 404 N, 41.2 kg (l) | 428 N, 43.6 kg (l) | 261 N, 26.6 kg (l) | across the layers: 5.9 mm from countersink (150, 110), front; at a held face's band, 2 mm off it 0.09 against 0.42 MPa | 1473 / 1357 / 1213 N (150.1 / 138.3 / 123.6 kg) | 1631 / 1503 / 1343 N (166.2 / 153.2 / 136.9 kg), 0.31 MPa | 1 only |
| solid wall | today | one hook at the seam, the wall's four outer screws | wall-seam-hook-outer-screws | 113 N, 11.6 kg (l) | 120 N, 12.2 kg (l) | 73 N, 7.5 kg (l) | across the layers: 5.8 mm from countersink (150, 110), front; at a held face's band, 2 mm off it 0.67 against 1.50 MPa | 349 / 322 / 288 N (35.6 / 32.8 / 29.3 kg) | 334 / 308 / 275 N (34.0 / 31.4 / 28.0 kg), 1.53 MPa | 1 only |
| lightened wall | today | one hook at the seam, each panel on its screws | wall-seam-hook | 199 N, 20.3 kg (y) | 183 N, 18.7 kg (y) | 147 N, 15.0 kg (l) | yield: 12.9 mm from slot (80, 80), front | 199 / 183 / 164 N (20.3 / 18.7 / 16.7 kg) | 211 / 195 / 174 N (21.6 / 19.9 / 17.8 kg), 2.41 MPa | 1 only |
| lightened wall | today | spread, each panel on its screws | wall-spread | 398 N, 40.6 kg (y) | 367 N, 37.4 kg (y) | 308 N, 31.4 kg (l) | yield: 6.7 mm from countersink (150, 110), back | 398 / 367 / 328 N (40.6 / 37.4 / 33.4 kg) | 902 / 832 / 743 N (92.0 / 84.8 / 75.7 kg), 0.57 MPa | 1 only |
| lightened wall | today | one hook at the seam, the wall's four outer screws | wall-seam-hook-outer-screws | 164 N, 16.7 kg (y) | 151 N, 15.4 kg (y) | 123 N, 12.6 kg (l) | yield: 12.4 mm from slot (80, 80), front | 164 / 151 / 135 N (16.7 / 15.4 / 13.8 kg) | 184 / 170 / 152 N (18.8 / 17.3 / 15.5 kg), 2.77 MPa | 1 only |
| skeleton wall | today | one hook at the seam, each panel on its screws | not run | | | | | | | |
| skeleton wall | today | spread, each panel on its screws | not run | | | | | | | |
| skeleton wall | today | one hook at the seam, the wall's four outer screws | not run | | | | | | | |

### One hook, 10 N, on the 160 mm board held off the wall on its corner screws

| Part | Version | Case | Peak in the part (MPa) | Where | At the contact (MPa) | Across the layers (MPa) | Deflection, PLA / PETG / ASA (mm) | Holds in the part, PLA / PETG / ASA (kg) | Holds at the contact, PLA / PETG / ASA (kg) | Mesh change: part / layers / contact / deflection |
|---|---|---|---|---|---|---|---|---|---|---|
| solid | v0.2.1 | hook-mid | 0.91 | 8.6 mm from slot below (80, 40), back | 1.71 | 0.33 | 0.041 / 0.062 / 0.058 | 52.3 l / 52.4 y / 33.8 l | 30.4 / 28.0 / 25.0 | 0 % / 28 % / 6 % / 0 % (not converged) |
| solid | v0.2.1 | hook-edge | 0.76 | 5.2 mm from countersink (10, 150), mid | 1.78 | 0.32 | 0.036 / 0.055 / 0.051 | 54.5 l / 57.7 l / 35.3 l | 29.2 / 27.0 / 24.1 | 0 % / 3 % / 6 % / 1 % |
| solid | today | hook-mid | 0.93 | 8.6 mm from slot below (80, 40), back | 1.75 | 0.36 | 0.041 / 0.062 / 0.059 | 47.8 l / 50.6 l / 30.9 l | 29.7 / 27.4 / 24.5 | 0 % / 16 % / 7 % / 0 % (not converged) |
| solid | today | hook-edge | 0.76 | 8.6 mm from slot below (20, 60), back | 1.79 | 0.32 | 0.037 / 0.056 / 0.053 | 54.6 l / 57.8 l / 35.3 l | 29.0 / 26.8 / 23.9 | 0 % / 16 % / 3 % / 0 % (not converged) |
| lightened | v0.2.1 | hook-mid | 6.00 | 10.4 mm from slot (80, 80), mid | 5.27 | 2.09 | 0.286 / 0.438 / 0.411 | 8.3 l / 8.0 y / 5.4 l | 9.9 / 9.1 / 8.1 | 1 % / 12 % / 3 % / 0 % (not converged) |
| lightened | v0.2.1 | hook-edge | 5.96 | 8.4 mm from slot (20, 100), back | 4.77 | 2.36 | 0.191 / 0.292 / 0.274 | 7.4 l / 7.8 l / 4.8 l | 10.9 / 10.1 / 9.0 | 5 % / 24 % / 2 % / 0 % (not converged) |
| lightened | today | hook-mid | 3.98 | 10.3 mm from slot (80, 80), back | 5.09 | 0.60 | 0.259 / 0.397 / 0.373 | 13.0 y / 12.0 y / 10.7 y | 10.2 / 9.4 / 8.4 | 1 % / 84 % / 2 % / 0 % (not converged) |
| lightened | today | hook-edge | 4.27 | 25.7 mm from slot (20, 100), mid | 4.76 | 1.07 | 0.182 / 0.279 / 0.261 | 12.2 y / 11.2 y / 10.0 y | 10.9 / 10.1 / 9.0 | 5 % / 2 % / 1 % / 1 % |
| skeleton | v0.2.1 | hook-mid | 38.76 | 9.9 mm from slot (80, 80), mid | 15.53 | 23.94 | 0.469 / 0.719 / 0.674 | 0.7 l / 0.8 l / 0.5 l | 3.3 / 3.1 / 2.8 | 7 % / 5 % / 9 % / 0 % |
| skeleton | v0.2.1 | hook-edge | 63.50 | 9.9 mm from slot (20, 100), mid | 14.15 | 38.84 | 0.307 / 0.470 / 0.441 | 0.4 l / 0.5 l / 0.3 l | 3.7 / 3.4 / 3.0 | 14 % / 33 % / 5 % / 1 % (not converged) |
| skeleton | v0.4.2 | hook-mid | 7.64 | 9.2 mm from slot (80, 80), mid | 10.02 | 1.82 | 0.380 / 0.583 / 0.546 | 6.8 y / 6.3 y / 5.6 y | 5.2 / 4.8 / 4.3 | 5 % / 3 % / 10 % / 0 % |
| skeleton | v0.4.2 | hook-edge | 6.81 | 9.2 mm from slot (20, 100), mid | 9.28 | 2.16 | 0.257 / 0.394 / 0.369 | 7.6 y / 7.0 y / 5.2 l | 5.6 / 5.2 / 4.6 | 31 % / 12 % / 0 % / 0 % (the part's peak level 2 to 3; the contact and the deflection the larger of 1 to 2 and 2 to 3) (not converged) |
| skeleton | today | hook-mid | 9.93 | 9.8 mm from slot (80, 80), front | 19.30 | 3.88 | 0.493 / 0.755 / 0.708 | 4.5 l / 4.7 l / 2.9 l | 2.7 / 2.5 / 2.2 | 1 % / 4 % / 12 % / 0 % |
| skeleton | today | hook-edge | 9.28 | 9.8 mm from slot (20, 100), front | 19.32 | 5.89 | 0.327 / 0.502 / 0.471 | 2.9 l / 3.1 l / 1.9 l | 2.7 / 2.5 / 2.2 | 6 % / 3 % / 6 % / 0 % |

### The same hooks in windows of the board, their cut faces held: the local stress alone (C334)

| Part | Version | Case | Peak in the part (MPa) | Where | At the contact (MPa) | Across the layers (MPa) | Deflection, PLA / PETG / ASA (mm) | Holds in the part, PLA / PETG / ASA (kg) | Holds at the contact, PLA / PETG / ASA (kg) | Mesh change: part / layers / contact / deflection |
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

| Part | Version | Case | Peak in the part (MPa) | Where | At the contact (MPa) | Across the layers (MPa) | Deflection, PLA / PETG / ASA (mm) | Holds in the part, PLA / PETG / ASA (kg) | Holds at the contact, PLA / PETG / ASA (kg) | Mesh change: part / layers / contact / deflection |
|---|---|---|---|---|---|---|---|---|---|---|
| solid | v0.2.1 | spread-screws | 0.34 | 4.9 mm from countersink (70, 70), mid | 0.84 | 0.21 | 0.006 / 0.010 / 0.009 | 81.3 l / 86.1 l / 52.6 l | 62.3 / 57.4 / 51.3 | 29 % / 4 % / 4 % / 1 % (not converged) |
| solid | v0.2.1 | spread-standoffs | 1.81 | 9.6 mm from slot (20, 60), back | 0.88 | 1.85 | 0.008 / 0.012 / 0.011 | 9.4 l / 9.9 l / 6.1 l | 58.8 / 54.2 / 48.4 | 23 % / 33 % / 6 % / 0 % (not converged) |
| solid | v0.2.1 | spread-keyholes | 11.12 | 5.3 mm from keyhole lip (10, 70), mid | 1.71 | 11.28 | 0.649 / 0.995 / 0.933 | 1.5 l / 1.6 l / 1.0 l | 30.3 / 28.0 / 25.0 | 9 % / 36 % / 6 % / 1 % (not converged) |
| solid | v0.2.1 | spread-keyholes-standing | 1.57 | 5.0 mm from keyhole lip (70, 70), back | 0.98 | 1.52 | 0.009 / 0.014 / 0.013 | 11.4 l / 12.1 l / 7.4 l | 52.9 / 48.8 / 43.6 | 5 % / 2 % / 2 % / 0 % |
| solid | today | spread-screws | 0.35 | 5.4 mm from countersink (70, 70), mid | 0.83 | 0.22 | 0.006 / 0.010 / 0.009 | 77.6 l / 82.2 l / 50.2 l | 62.6 / 57.7 / 51.6 | 32 % / 6 % / 0 % / 1 % (not converged) |
| solid | today | spread-standoffs | 1.73 | 10.5 mm from slot (60, 60), back | 0.98 | 2.04 | 0.008 / 0.012 / 0.011 | 8.5 l / 9.0 l / 5.5 l | 53.0 / 48.8 / 43.6 | 1 % / 7 % / 15 % / 1 % |
| solid | today | spread-keyholes | 6.22 | 4.8 mm from keyhole lip (60, 64.5), z -12.7 | 7.06 | 6.90 | 0.343 / 0.526 / 0.493 | 2.5 l / 2.7 l / 1.6 l | 7.4 / 6.8 / 6.1 | 19 % / 3 % / 5 % / 11 % (not converged) |
| solid | today | spread-keyholes-standing | 0.83 | 11.5 mm from slot below (20, 20), back | 1.00 | 0.39 | 0.002 / 0.003 / 0.003 | 44.5 l / 47.1 l / 28.8 l | 52.2 / 48.1 / 43.0 | 8 % / 41 % / 12 % / 2 % (not converged) |
| lightened | v0.2.1 | spread-screws | 3.75 | 7.1 mm from countersink (10, 70), back | 1.75 | 0.89 | 0.039 / 0.060 / 0.057 | 13.8 y / 12.8 y / 11.4 y | 29.8 / 27.4 / 24.5 | 2 % / 7 % / 0 % / 0 % |
| lightened | v0.2.1 | spread-standoffs | 4.40 | 9.2 mm from slot (60, 60), back | 1.69 | 4.26 | 0.041 / 0.063 / 0.059 | 4.1 l / 4.3 l / 2.6 l | 30.7 / 28.3 / 25.3 | 7 % / 11 % / 3 % / 0 % (not converged) |
| lightened | v0.2.1 | spread-keyholes | 11.95 | 5.0 mm from keyhole lip (70, 70), back | 2.88 | 7.55 | 1.613 / 2.474 / 2.319 | 2.3 l / 2.4 l / 1.5 l | 18.1 / 16.7 / 14.9 | 5 % / 15 % / 4 % / 0 % (not converged) |
| lightened | v0.2.1 | spread-keyholes-standing | 4.45 | 5.0 mm from keyhole lip (10, 70), back | 1.74 | 4.34 | 0.047 / 0.073 / 0.068 | 4.0 l / 4.2 l / 2.6 l | 29.9 / 27.5 / 24.6 | 5 % / 0 % / 0 % / 1 % |
| lightened | today | spread-screws | 2.14 | 7.4 mm from slot (20, 60), back | 1.68 | 0.36 | 0.036 / 0.055 / 0.052 | 24.3 y / 22.4 y / 20.0 y | 30.9 / 28.5 / 25.5 | 1 % / 69 % / 0 % / 0 % (not converged) |
| lightened | today | spread-standoffs | 4.00 | 9.4 mm from slot (60, 60), back | 1.63 | 3.59 | 0.038 / 0.058 / 0.054 | 4.8 l / 5.1 l / 3.1 l | 31.9 / 29.4 / 26.3 | level 1 only |
| lightened | today | spread-keyholes | 10.67 | 4.4 mm from slot (20, 60), z -15.0 | 5.53 | 7.73 | 1.290 / 1.978 / 1.855 | 2.2 l / 2.4 l / 1.4 l | 9.4 / 8.7 / 7.7 | 7 % / 13 % / 6 % / 1 % (not converged) |
| lightened | today | spread-keyholes-standing | 2.16 | 10.8 mm from slot below (20, 20), back | 3.83 | 0.85 | 0.006 / 0.009 / 0.009 | 20.3 l / 21.5 l / 13.2 l | 13.6 / 12.5 / 11.2 | 11 % / 17 % / 1 % / 3 % (not converged) |
| skeleton | v0.2.1 | spread-screws | 18.46 | 6.5 mm from countersink (70, 70), mid | 4.66 | 8.14 | 0.069 / 0.105 / 0.099 | 2.1 l / 2.3 l / 1.4 l | 11.1 / 10.3 / 9.2 | 3 % / 6 % / 28 % / 1 % |
| skeleton | v0.2.1 | spread-standoffs | 17.55 | 7.9 mm from slot (60, 60), mid | 4.63 | 9.81 | 0.072 / 0.111 / 0.104 | 1.8 l / 1.9 l / 1.1 l | 11.2 / 10.3 / 9.2 | 5 % / 17 % / 6 % / 0 % (not converged) |
| skeleton | v0.2.1 | spread-keyholes | 33.62 | 8.2 mm from slot (20, 60), mid | 9.79 | 17.06 | 2.225 / 3.411 / 3.198 | 1.0 l / 1.1 l / 0.7 l | 5.3 / 4.9 / 4.4 | 39 % / 50 % / 42 % / 0 % (peak moved) |
| skeleton | v0.2.1 | spread-keyholes-standing | 13.15 | 9.9 mm from slot (60, 60), mid | 4.93 | 9.70 | 0.084 / 0.129 / 0.121 | 1.8 l / 1.9 l / 1.2 l | 10.6 / 9.7 / 8.7 | 37 % / 7 % / 19 % / 1 % (peak moved) |
| skeleton | v0.4.2 | spread-screws | 3.23 | 7.0 mm from slot (60, 60), mid | 3.12 | 1.37 | 0.053 / 0.081 / 0.076 | 12.7 l / 13.4 l / 8.2 l | 16.7 / 15.4 / 13.7 | 3 % / 2 % / 8 % / 1 % |
| skeleton | v0.4.2 | spread-standoffs | 5.78 | 9.2 mm from slot (20, 60), back | 3.42 | 7.22 | 0.056 / 0.085 / 0.080 | 2.4 l / 2.5 l / 1.6 l | 15.2 / 14.0 / 12.5 | 14 % / 16 % / 6 % / 0 % (not converged) |
| skeleton | v0.4.2 | spread-keyholes | 16.30 | 26.1 mm from slot below (60, 20), mid | 5.77 | 7.91 | 1.725 / 2.645 / 2.479 | 2.2 l / 2.3 l / 1.4 l | 9.0 / 8.3 / 7.4 | 20 % / 64 % / 22 % / 1 % (not converged) |
| skeleton | v0.4.2 | spread-keyholes-standing | 2.37 | 10.8 mm from slot below (60, 20), back | 4.31 | 0.90 | 0.010 / 0.016 / 0.015 | 19.2 l / 20.2 y / 12.4 l | 12.1 / 11.1 / 9.9 | 9 % / 7 % / 8 % / 1 % |
| skeleton | today | spread-screws | 4.40 | 6.9 mm from slot (60, 60), front | 8.55 | 2.35 | 0.070 / 0.107 / 0.101 | 7.4 l / 7.8 l / 4.8 l | 6.1 / 5.6 / 5.0 | 5 % / 28 % / 5 % / 7 % (not converged) |
| skeleton | today | spread-standoffs | 8.78 | 9.6 mm from slot (20, 60), back | 8.81 | 9.24 | 0.070 / 0.107 / 0.101 | 1.9 l / 2.0 l / 1.2 l | 5.9 / 5.4 / 4.9 | 11 % / 45 % / 10 % / 2 % (the part's peak level 2 to 3; the contact and the deflection the larger of 1 to 2 and 2 to 3) (not converged) |
| skeleton | today | spread-keyholes | 22.25 | 25.9 mm from slot below (60, 20), front | 9.49 | 8.60 | 2.150 / 3.297 / 3.091 | 2.0 l / 2.1 l / 1.3 l | 5.5 / 5.0 / 4.5 | 1 % / 0 % / 8 % / 0 % |
| skeleton | today | spread-keyholes-standing | 1.82 | 10.9 mm from slot below (60, 20), front | 10.10 | 1.05 | 0.058 / 0.088 / 0.083 | 16.5 l / 17.4 l / 10.6 l | 5.1 / 4.7 / 4.2 | 26 % / 3 % / 6 % / 1 % (not converged) |

### The connectors, 10 N

| Part | Version | Case | Peak in the part (MPa) | Where | At the contact (MPa) | Across the layers (MPa) | Deflection, PLA / PETG / ASA (mm) | Holds in the part, PLA / PETG / ASA (kg) | Holds at the contact, PLA / PETG / ASA (kg) | Mesh change: part / layers / contact / deflection |
|---|---|---|---|---|---|---|---|---|---|---|
| standoff, 1 board | today | shear | 2.10 | 1.0 mm from the wall face, at (1.2, 3.9, 1.0) | 0.98 | 2.11 | 0.020 / 0.031 / 0.029 | 8.2 l / 8.7 l / 5.3 l | 53.1 / 48.9 / 43.7 | 9 % / 12 % / 3 % / 0 % (not converged) |
| standoff, 4 boards | today | shear | 0.77 | 7.0 mm from the wall face, at (-9.5, -5.0, 7.0) | 0.25 | 0.97 | 0.002 / 0.003 / 0.003 | 17.8 l / 18.9 l / 11.5 l | 204.7 / 188.6 / 168.6 | 2 % / 4 % / 0 % / 0 % |
| slot clip, 2 boards | today | shear | 4.58 | 27.5 mm from the peg in its slot, at (10.3, -2.3, 7.0) | 1.04 | 3.19 | 0.229 / 0.351 / 0.329 | 5.4 l / 5.8 l / 3.5 l | 50.1 / 46.2 / 41.3 | 8 % / 20 % / 6 % / 0 % (not converged) |

### Two-panel walls joined by a slot clip, 10 N

| Part | Version | Case | Peak in the part (MPa) | Where | At the contact (MPa) | Across the layers (MPa) | Deflection, PLA / PETG / ASA (mm) | Holds in the part, PLA / PETG / ASA (kg) | Holds at the contact, PLA / PETG / ASA (kg) | Mesh change: part / layers / contact / deflection |
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

### Poisson's ratio (C331): v0.4.2's skeleton-hook-edge, hook-edge, level 1

| Poisson's ratio | Peak in the part (MPa) | At the contact (MPa) | Across the layers (MPa) | Deflection (mm) |
|---|---|---|---|---|
| 0.30 | 6.58 (+1 %) | 8.54 (+2 %) | 1.95 (-19 %) | 0.2910 (-0.8 %) |
| 0.35 (the runs) | 6.49 | 8.39 | 2.40 | 0.2934 |
| 0.40 | 6.41 (-1 %) | 8.22 (-2 %) | 3.12 (+30 %) | 0.2954 (+0.7 %) |

110 runs; mesh volume against Manifold's: largest difference 0.98 %; reactions against loads: largest imbalance 3.1e-10

<!-- tables:end -->

## The figures (C343)

Each part's skin coloured by its von Mises stress per 10 N, on one viridis scale from 0 to the part's own peak, the
tables' value; past it, at the load's contact or a held face's edge, the colour stays at the top. The colour at a point
is the stress averaged over the elements meeting there, so the brightest place reads a little under the marked peak,
the largest at any element's corner. Held faces, and 1 mm round them where no peak is read, are grey. The whole part
is seen from the side its weak spot is on and the spot close up at the right; the rings mark the part's peak (red), its
stress across the layers where that is elsewhere (orange) and the contact's peak (dashed), and a label says when its
spot is out of sight from that view or inside the part. Each figure is the case that governs the part in PLA, and
prints what the part holds in PLA, PETG and ASA (Q329). `scripts/physics/figures.py` writes this list.

<!-- figures:begin -->

- [Solid board, today: one hook in the middle slot, 10 N (hook-mid)](../figures/physics/solid-today.png): mesh level 2, not converged: 0 % / 16 % / 7 % / 0 %; holds per hook, to the yield in the part or the layers' adhesion: PLA 469 N, 47.8 kg (layers) · PETG 497 N, 50.6 kg (layers) · ASA 304 N, 30.9 kg (layers)
- [Solid board, v0.2.1: one hook in the middle slot, 10 N (hook-mid)](../figures/physics/solid-v0.2.1.png): mesh level 2, not converged: 0 % / 28 % / 6 % / 0 %; holds per hook, to the yield in the part or the layers' adhesion: PLA 513 N, 52.3 kg (layers) · PETG 514 N, 52.4 kg (yield) · ASA 332 N, 33.8 kg (layers)
- [Lightened board, today: one hook in a slot by the left edge, 10 N (hook-edge)](../figures/physics/lightened-today.png): mesh level 2, converged: 5 % / 2 % / 1 % / 1 %; holds per hook, to the yield in the part or the layers' adhesion: PLA 119 N, 12.2 kg (yield) · PETG 110 N, 11.2 kg (yield) · ASA 98 N, 10.0 kg (yield)
- [Lightened board, v0.2.1: one hook in a slot by the left edge, 10 N (hook-edge)](../figures/physics/lightened-v0.2.1.png): mesh level 2, not converged: 5 % / 24 % / 2 % / 0 %; holds per hook, to the yield in the part or the layers' adhesion: PLA 72 N, 7.4 kg (layers) · PETG 76 N, 7.8 kg (layers) · ASA 47 N, 4.8 kg (layers)
- [Skeleton board, today: one hook in a slot by the left edge, 10 N (hook-edge)](../figures/physics/skeleton-today.png): mesh level 2, converged: 6 % / 3 % / 6 % / 0 %; holds per hook, to the yield in the part or the layers' adhesion: PLA 29 N, 2.9 kg (layers) · PETG 31 N, 3.1 kg (layers) · ASA 19 N, 1.9 kg (layers)
- [Skeleton board, v0.4.2: one hook in the middle slot, 10 N (hook-mid)](../figures/physics/skeleton-v0.4.2.png): mesh level 2, converged: 5 % / 3 % / 10 % / 0 %; holds per hook, to the yield in the part or the layers' adhesion: PLA 67 N, 6.8 kg (yield) · PETG 62 N, 6.3 kg (yield) · ASA 55 N, 5.6 kg (yield)
- [Skeleton board, v0.2.1: one hook in a slot by the left edge, 10 N (hook-edge)](../figures/physics/skeleton-v0.2.1.png): mesh level 2, not converged: 14 % / 33 % / 5 % / 1 %; holds per hook, to the yield in the part or the layers' adhesion: PLA 4 N, 0.4 kg (layers) · PETG 5 N, 0.5 kg (layers) · ASA 3 N, 0.3 kg (layers)
- [Standoff for one board, 15 mm, today: 10 N down the wall (shear)](../figures/physics/standoff-1.png): mesh level 2, not converged: 9 % / 12 % / 3 % / 0 %; holds per connector, to the yield in the part or the layers' adhesion: PLA 80 N, 8.2 kg (layers) · PETG 85 N, 8.7 kg (layers) · ASA 52 N, 5.3 kg (layers)
- [Slot clip for two boards, today: 10 N down the wall (shear)](../figures/physics/slot-clip-2.png): mesh level 2, not converged: 8 % / 20 % / 6 % / 0 %; holds per connector, to the yield in the part or the layers' adhesion: PLA 53 N, 5.4 kg (layers) · PETG 56 N, 5.8 kg (layers) · ASA 34 N, 3.5 kg (layers)
- [Two lightened panels joined by a slot clip, today: one hook in the seam's slot, 10 N, on the wall's four outer screws (wall-seam-hook-outer-screws)](../figures/physics/lightened-wall.png): mesh level 1 only; holds per hook, to the yield in the part or the layers' adhesion: PLA 164 N, 16.7 kg (yield) · PETG 151 N, 15.4 kg (yield) · ASA 123 N, 12.6 kg (layers)
- [Two solid panels joined by a slot clip, today: one hook in the seam's slot, 10 N, on the wall's four outer screws (wall-seam-hook-outer-screws)](../figures/physics/solid-wall.png): mesh level 1 only; holds per hook, to the yield in the part or the layers' adhesion: PLA 113 N, 11.6 kg (layers) · PETG 120 N, 12.2 kg (layers) · ASA 73 N, 7.5 kg (layers)

<!-- figures:end -->

## Not done, and why

- **Today's lightened board on standoffs at level 2**: no mesh try finished within a window (one sat 13 minutes in a
  surface before the tries were capped, C338; capped, they outlasted the window). Reported at level 1.
- **The lightened wall at level 2**: about 4.2 million unknowns, past what PARDISO factors here, and conjugate gradients
  outlasted a 28-minute window. Reported at level 1, as are the walls' other cases, run at level 2 only for the
  governing one.
- **The solid wall at level 2**: its governing case, past PARDISO's limit for a solid board here (2.2 million
  unknowns), outlasted its window on conjugate gradients (1085 s left). Reported at level 1.
- **The skeleton's wall**: tried once more at level 1 for its governing case (C346). It meshed, and PARDISO found its
  stiffness singular (error -4, a zero pivot): the part is one body, so some region of its mesh is held by no more than
  an edge or a point, most likely where the 0.2 mm seam slit (C337) meets the skeleton's 0.4 mm flanges. Not run;
  finding that region is the next step, if the skeleton's wall is wanted.
- **Level 3 for the other cases not converged**: run for the two that decide a before and after (v0.4.2's skeleton
  under the edge hook, today's skeleton on standoffs); the others stand at level 2 with their changes shown. Those whose
  stress rose at its place are at sharp inner edges, upper bounds by nature, which more levels would only confirm.
- **v0.2.1's skeleton window under the edge hook**: no try meshed it (gmsh's parametrisation failed in every try); the
  windows are the local stress alone (C334), and the whole board's row stands.
- **The hook's contact as a contact**: the hook's real shape is not measured, so its loads are even pressures on
  patches (C332), a question for the owner below.

## Questions for the owner

Unnumbered here; the session that relays them gives them their IDs.

- **The hook's real shape, measured** (a measurement): where a SKÅDIS hook's rod bears in its slot and how wide it
  is, how far in front of the board's face its load hangs, and where on the board its body presses below. C332 assumed
  a 4.5 mm rod on the slot's bottom end, the load 25 mm out (the small hook's depth on IKEA's page, an upper bound) and
  the body round the slot 40 mm below; the contact's values, and the prying that sets the skeleton's stress across its
  layers, scale with them.
- **Today's skeleton against v0.4.2's** (a decision; recommended: keep D314 until the hook-load test print, T320, says
  where it breaks): in the model D314's stepped profile halves what the skeleton holds under a hook, its weak spots the
  step where a web meets a rim, across the layers, and the 0.4 mm front flange under the hook's body. If the print
  breaks there, the options this points at are a radius where the flange steps to the core, or a thicker flange; each
  would give back some of the filament D314 saved (built, 55.8 g against the lightened board's 67.7 g at 200 x 200 mm).
- **A radius at the standoffs' roots and the slot clip's bar root** (a decision; recommended: yes, if the design allows
  it): in the model each is a sharp inner edge whose stress rose with each mesh, and a standoff's root on the board's
  back is the weakest place on every board on standoffs (18 to 92 N per board in PLA, upper bounds). What a print holds
  there depends on the root's real radius; a drawn radius would make it the design's, not the nozzle's.
- **The filament of the test prints** (a fact only the owner has): the hook-load prints are read against the column of
  the filament they are printed in, PLA, PETG or ASA.

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

A figure whose run was reported before runs saved their surface (commit 0339c8c) is named by `figures.py` with the
`run.py --resave` command that saves it, refused unless the run's peaks are the reported ones.
