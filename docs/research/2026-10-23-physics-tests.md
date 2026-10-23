# Physics tests of the boards and connectors

Research date: 23 Oct 2026. The owner's decisions: D323 (hand calculations and a simulation, a bar's bending its
control), D324 (the boards from before the design passes beside today's), Q325 (IKEA's ratings as the loads), Q326
(PLA, PETG and ASA from a maker's sheets) and Q327 (the three boards, the standoff, the slot clip and walls), all in
[`status.md`](../status.md). The choices made on the way are C330 to C339 in [`choices.md`](../choices.md).

## Status

| Step | State |
|---|---|
| 1. Tooling and controls | done: `scripts/physics/`, `tests/test-physics.sh` (6 cases, 6 passed) |
| 2. Loads, hook and materials cited | done: IKEA publishes no rating, so the runs use a reference load ([below](#the-loads)); the hook's geometry and the materials cited |
| 3. Today's parts | running |
| 4. The old versions | queued |
| 5. Walls | queued |
| 6. The report | this file, filled in as the runs land |

**What these results are, and are not.** The simulation models each part as solid, isotropic plastic with a data
sheet's stiffness. A printed part is perimeters and sparse infill in layers, weaker across the layers than along
them, and the model overstates it. So the results **rank the designs and find their weak spots**; they do not
predict a breaking load. Printed tests (T320) stay the check of what breaks.

## The loads

**IKEA publishes no load rating** for the SKÅDIS board, its hooks or its shelf: none on the product pages read in
three markets, in the assembly instructions' text, or in searches in English and German (sources in
[`skadis-standard.md`](../skadis-standard.md#loads), read 23 Oct 2026). Q325 asked for IKEA's ratings, and a
number from elsewhere would be invented, so **every case is run at a reference load of 10 N (about 1 kg)**: one
hook's, the whole spread load's, or one connector's. A linear static result scales with its load, so each table
gives the stress and deflection for 10 N and the load at which the model's peak stress reaches each material's
strength. The rating to judge them against is the owner's to give.

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
  front toward +z. The hooks on the page's 160 mm board, closed all round, on its four corner screws, one hook in the
  middle slot (80, 80) and one at the left edge (20, 100) (C334); the spread load on an 80 mm board for each
  mounting (C335); the standoff and the slot clip alone (C336); a two-panel wall joined by a clip (C337).
- **Mountings** as held surfaces, every degree of freedom: a corner screw's countersink, a standoff's wall face, a
  keyhole's lip under the screw's head; the wall itself left out (C333).
- **Mesh and solver** (`scripts/physics/run.py`, `fe.py`): gmsh's tetrahedra from the STL, quadratic (P2), the
  stiffness assembled here and solved by PARDISO; two mesh levels for every reported result (C338).
- **Peaks** read more than 1 mm from a held face (a clamp's edge is singular), and split between the load's contact
  and the part itself (C339).

## The controls

`bash tests/test-physics.sh` runs `scripts/physics/controls.py` unchanged and with a fault seeded in each control:

| Control | Unchanged | Seeded fault, which must fail it |
|---|---|---|
| Assembly: this repo's P2 stiffness against scikit-fem's, entry by entry | largest difference 1.2e-15 of the largest entry | modulus 10 % off: difference 0.10, fails |
| Patch test: a uniform strain's energy, exact on any mesh | relative error 1e-14 | exact energy 5 % off: fails |
| A bar 30 x 3 x 0.9 mm, the skeleton's core, clamped and loaded at its tip, against the beam formulas (limit 3 %) | P2, 2 elements across: tip -1.1 %, mid-span stress +1.1 % | modulus 10 % high: tip -10.1 %, fails; load 10 % high: +8.8 % and +11.2 %, fails |
| The same bar, reported | P2, 1 element across: -1.3 % and +3.4 %; **P1: -44 %**, which is why the runs use P2 | |
| A mesh's volume against Manifold's (limit 1 %): the solid 80 mm board, chamfered at 45 degrees round every slot and edge | +0.04 % | the reference 2 % off: fails |

6 cases, 6 passed (verified: `bash tests/test-physics.sh`, 23 Oct 2026). Every run also checks its own mesh's
volume against the part's and that its supports' reactions balance what it applied.

## Hand calculations

`scripts/physics/hand.py`, from the sections cut from the built boards by `scripts/physics/sections.mjs`. Per 10 N.

Pending: the table lands with step 3.

## Results

Pending: steps 3 to 5.

## Questions for the owner

Pending.

## Reproducing

```bash
npm run build -w skadis-air                         # today's library
node scripts/physics/write-parts.mjs                # today's parts and their cases, into .check/physics/parts/today/
node scripts/physics/write-parts.mjs --lib <v0.2.1 worktree>/packages/core/dist/index.js --version v0.2.1 --boards-only
node scripts/physics/write-parts.mjs --lib <v0.4.2 worktree>/packages/core/dist/index.js --version v0.4.2 --boards-only --types skeleton
cd scripts/physics && uv run python run.py          # every run not yet in .check/physics/results.jsonl
bash tests/test-physics.sh                          # the controls
```
