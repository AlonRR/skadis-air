# Physics tests of the boards and connectors

Research date: 23 Oct 2026. The owner's decisions: D323 (hand calculations and a simulation, a bar's bending its
control), D324 (the boards from before the design passes beside today's), Q325 (IKEA's ratings as the loads), Q326
(PLA, PETG and ASA from a maker's sheets) and Q327 (the three boards, the standoff, the slot clip and walls), all in
[`status.md`](../status.md). The choices made on the way are C330 to C340 in [`choices.md`](../choices.md).

## Status

| Step | State |
|---|---|
| 1. Tooling and controls | done: `scripts/physics/`, `tests/test-physics.sh` |
| 2. Loads, hook and materials cited | done: IKEA publishes no rating, so the runs use a reference load and give each part's capacity ([below](#the-loads)) |
| 3. Today's parts | level 1 done, but the skeleton's wall; level 2 (the convergence check) next |
| 4. The old versions | level 1 mostly done; level 2 after today's |
| 5. Walls | solid and lightened at level 1; the skeleton's would not mesh at first, running |
| 6. The report | this file; its tables are `scripts/physics/tables.py`'s output, as of the last run |

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

Per 10 N. *Holds* is the load at which the model's peak stress reaches the material's strength, in kg: in the part,
the lesser of its peak against the yield along the layers (y) and its stress across the layers against their
adhesion (l); at the contact, the hook's own bearing against the yield, where the model's even pressure makes the
value the model's as much as the hook's (C339). Deflection is the hook's slot's movement in a hook's case, the part's
largest otherwise.

<!-- tables:begin -->

### One hook, 10 N, on the 160 mm board held off the wall on its corner screws

| Part | Version | Case | Peak in the part (MPa) | Where | At the contact (MPa) | Across the layers (MPa) | Deflection, PLA / PETG / ASA (mm) | Holds in the part, PLA / PETG / ASA (kg) | Holds at the contact, PLA / PETG / ASA (kg) | Mesh change, stress / deflection |
|---|---|---|---|---|---|---|---|---|---|---|
| solid | v0.2.1 | hook-mid | 0.91 | 8.6 mm from slot below (80, 40), back | 1.61 | 0.37 | 0.041 / 0.062 / 0.059 | 46.5 l / 49.2 l / 30.1 l | 32.3 / 29.8 / 26.6 | level 1 only |
| solid | v0.2.1 | hook-edge | 0.75 | 8.5 mm from slot below (20, 60), back | 1.88 | 0.31 | 0.036 / 0.055 / 0.052 | 56.2 l / 59.5 l / 36.4 l | 27.7 / 25.5 / 22.8 | level 1 only |
| solid | today | hook-mid | 0.93 | 8.6 mm from slot below (80, 40), back | 1.87 | 0.37 | 0.041 / 0.062 / 0.058 | 46.9 l / 49.7 l / 30.4 l | 27.7 / 25.6 / 22.8 | level 1 only |
| solid | today | hook-edge | 0.76 | 8.4 mm from slot below (20, 60), back | 1.74 | 0.37 | 0.037 / 0.056 / 0.053 | 47.0 l / 49.7 l / 30.4 l | 29.8 / 27.5 / 24.6 | level 1 only |
| lightened | v0.2.1 | hook-mid | 5.79 | 10.5 mm from slot (80, 80), mid | 5.08 | 1.84 | 0.285 / 0.437 / 0.410 | 9.0 y / 8.3 y / 6.1 l | 10.2 / 9.4 / 8.4 | level 1 only |
| lightened | v0.2.1 | hook-edge | 5.66 | 8.4 mm from slot (20, 100), back | 4.86 | 1.79 | 0.190 / 0.291 / 0.273 | 9.2 y / 8.5 y / 6.3 l | 10.7 / 9.9 / 8.8 | level 1 only |
| lightened | today | hook-mid | 3.84 | 10.5 mm from slot (80, 80), back | 5.00 | 1.11 | 0.258 / 0.396 / 0.372 | 13.5 y / 12.5 y / 10.1 l | 10.4 / 9.6 / 8.6 | level 1 only |
| lightened | today | hook-edge | 4.05 | 25.7 mm from slot (20, 100), mid | 4.70 | 0.98 | 0.183 / 0.280 / 0.263 | 12.8 y / 11.8 y / 10.6 y | 11.1 / 10.2 / 9.1 | level 1 only |
| skeleton | v0.2.1 | hook-mid | 35.91 | 9.9 mm from slot (80, 80), mid | 14.07 | 19.83 | 0.468 / 0.718 / 0.673 | 0.9 l / 0.9 l / 0.6 l | 3.7 / 3.4 / 3.0 | level 1 only |
| skeleton | v0.2.1 | hook-edge | 54.45 | 10.0 mm from slot (20, 100), mid | 14.81 | 25.85 | 0.304 / 0.466 / 0.437 | 0.7 l / 0.7 l / 0.4 l | 3.5 / 3.2 / 2.9 | level 1 only |
| skeleton | v0.4.2 | hook-mid | not run | | | | | | | |
| skeleton | v0.4.2 | hook-edge | not run | | | | | | | |
| skeleton | today | hook-mid | 9.76 | 9.8 mm from slot (80, 80), front | 17.05 | 3.70 | 0.490 / 0.752 / 0.705 | 4.7 l / 4.9 y / 3.0 l | 3.0 / 2.8 / 2.5 | level 1 only |
| skeleton | today | hook-edge | 9.66 | 9.8 mm from slot (20, 100), front | 18.14 | 6.09 | 0.326 / 0.500 / 0.469 | 2.8 l / 3.0 l / 1.8 l | 2.9 / 2.6 / 2.4 | level 1 only |

### The same hooks in windows of the board, their cut faces held: the local stress alone (C334)

| Part | Version | Case | Peak in the part (MPa) | Where | At the contact (MPa) | Across the layers (MPa) | Deflection, PLA / PETG / ASA (mm) | Holds in the part, PLA / PETG / ASA (kg) | Holds at the contact, PLA / PETG / ASA (kg) | Mesh change, stress / deflection |
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
| skeleton | v0.4.2 | hook-mid | not run | | | | | | | |
| skeleton | v0.4.2 | hook-edge | not run | | | | | | | |
| skeleton | today | hook-mid | 8.83 | 9.8 mm from slot (80, 80), front | 18.02 | 4.22 | 0.125 / 0.192 / 0.180 | 4.1 l / 4.3 l / 2.7 l | 2.9 / 2.7 / 2.4 | level 1 only |
| skeleton | today | hook-edge | 9.04 | 9.8 mm from slot (20, 100), front | 18.08 | 4.61 | 0.164 / 0.252 / 0.236 | 3.8 l / 4.0 l / 2.4 l | 2.9 / 2.7 / 2.4 | level 1 only |

### 10 N spread over an 80 mm board's hooks, on each mounting

| Part | Version | Case | Peak in the part (MPa) | Where | At the contact (MPa) | Across the layers (MPa) | Deflection, PLA / PETG / ASA (mm) | Holds in the part, PLA / PETG / ASA (kg) | Holds at the contact, PLA / PETG / ASA (kg) | Mesh change, stress / deflection |
|---|---|---|---|---|---|---|---|---|---|---|
| solid | v0.2.1 | spread-screws | 0.42 | 5.2 mm from countersink (10, 70), mid | 0.87 | 0.21 | 0.006 / 0.010 / 0.009 | 84.4 l / 89.3 l / 54.6 l | 60.0 / 55.3 / 49.4 | level 1 only |
| solid | v0.2.1 | spread-standoffs | not run | | | | | | | |
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
| skeleton | v0.2.1 | spread-standoffs | not run | | | | | | | |
| skeleton | v0.2.1 | spread-keyholes | not run | | | | | | | |
| skeleton | v0.2.1 | spread-keyholes-standing | not run | | | | | | | |
| skeleton | v0.4.2 | spread-screws | not run | | | | | | | |
| skeleton | v0.4.2 | spread-standoffs | not run | | | | | | | |
| skeleton | v0.4.2 | spread-keyholes | not run | | | | | | | |
| skeleton | v0.4.2 | spread-keyholes-standing | not run | | | | | | | |
| skeleton | today | spread-screws | 4.62 | 6.9 mm from slot (60, 60), front | 8.10 | 3.00 | 0.065 / 0.100 / 0.094 | 5.8 l / 6.1 l / 3.7 l | 6.4 / 5.9 / 5.3 | level 1 only |
| skeleton | today | spread-standoffs | 5.81 | 9.6 mm from slot (20, 60), back | 9.89 | 5.90 | 0.069 / 0.106 / 0.099 | 2.9 l / 3.1 l / 1.9 l | 5.3 / 4.8 / 4.3 | level 1 only |
| skeleton | today | spread-keyholes | 22.01 | 25.9 mm from slot below (60, 20), front | 8.78 | 8.61 | 2.140 / 3.282 / 3.077 | 2.0 l / 2.1 l / 1.3 l | 5.9 / 5.5 / 4.9 | level 1 only |
| skeleton | today | spread-keyholes-standing | 2.21 | 10.9 mm from slot below (60, 20), front | 9.44 | 1.02 | 0.057 / 0.087 / 0.082 | 16.9 l / 17.9 l / 10.9 l | 5.5 / 5.1 / 4.5 | level 1 only |

### The connectors, 10 N

| Part | Version | Case | Peak in the part (MPa) | Where | At the contact (MPa) | Across the layers (MPa) | Deflection, PLA / PETG / ASA (mm) | Holds in the part, PLA / PETG / ASA (kg) | Holds at the contact, PLA / PETG / ASA (kg) | Mesh change, stress / deflection |
|---|---|---|---|---|---|---|---|---|---|---|
| standoff, 1 board | today | shear | 2.28 | (-1.3, 3.8, 1.1) | 1.01 | 2.34 | 0.020 / 0.031 / 0.029 | 7.4 l / 7.8 l / 4.8 l | 51.4 / 47.3 / 42.3 | level 1 only |
| standoff, 4 boards | today | shear | 0.70 | (9.4, -5.0, 7.0) | 0.26 | 0.83 | 0.002 / 0.003 / 0.003 | 20.9 l / 22.1 l / 13.5 l | 203.8 / 187.8 / 167.8 | level 1 only |
| slot clip, 2 boards | today | shear | 4.21 | (10.4, -2.7, 7.0) | 0.97 | 2.54 | 0.229 / 0.351 / 0.329 | 6.8 l / 7.2 l / 4.4 l | 53.4 / 49.2 / 44.0 | level 1 only |

### Two-panel walls joined by a slot clip, 10 N

| Part | Version | Case | Peak in the part (MPa) | Where | At the contact (MPa) | Across the layers (MPa) | Deflection, PLA / PETG / ASA (mm) | Holds in the part, PLA / PETG / ASA (kg) | Holds at the contact, PLA / PETG / ASA (kg) | Mesh change, stress / deflection |
|---|---|---|---|---|---|---|---|---|---|---|
| solid wall | today | wall-seam-hook | 1.29 | 20.2 mm from slot (80, 80), back | 1.58 | 1.55 | 0.018 / 0.028 / 0.026 | 11.2 l / 11.8 l / 7.2 l | 32.9 / 30.3 / 27.1 | level 1 only |
| solid wall | today | wall-spread | 0.35 | 5.9 mm from countersink (150, 110), front | 0.31 | 0.42 | 0.005 / 0.007 / 0.007 | 41.2 l / 43.6 l / 26.6 l | 166.2 / 153.2 / 136.9 | level 1 only |
| solid wall | today | wall-seam-hook-outer-screws | 2.18 | 19.3 mm from slot below (80, 40), back | 1.53 | 2.60 | 0.032 / 0.050 / 0.047 | 6.7 l / 7.1 l / 4.3 l | 34.0 / 31.4 / 28.0 | level 1 only |
| lightened wall | today | wall-seam-hook | 17.95 | 19.5 mm from slot (80, 80), back | 2.41 | 8.44 | 0.066 / 0.101 / 0.095 | 2.1 l / 2.2 l / 1.3 l | 21.6 / 19.9 / 17.8 | level 1 only |
| lightened wall | today | wall-spread | 4.31 | 19.5 mm from slot (80, 80), back | 0.57 | 0.73 | 0.022 / 0.034 / 0.031 | 12.1 y / 11.1 y / 9.9 y | 92.0 / 84.8 / 75.7 | level 1 only |
| lightened wall | today | wall-seam-hook-outer-screws | 36.85 | 19.5 mm from slot (80, 80), back | 2.77 | 17.63 | 0.139 / 0.213 / 0.200 | 1.0 l / 1.0 l / 0.6 l | 18.8 / 17.3 / 15.5 | level 1 only |
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

52 runs; mesh volume against Manifold's: largest difference 0.65 %; reactions against loads: largest imbalance 1.2e-10

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
cd ../.. && bash tests/test-physics.sh              # the controls
```
