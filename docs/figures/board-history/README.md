<!--
SPDX-FileCopyrightText: 2026 Alon A. Rabinowitz
SPDX-License-Identifier: CERN-OHL-S-2.0
-->

# Earlier lightened and skeleton boards (24 Oct 2026)

Pictures of every earlier design of the two lattice board types, so the owner can say which to bring back as
additional board types. Each state is drawn from its own commit's library build, at the type's starting values,
160 x 160 mm, from the same camera: its front (three-quarter), where members meet (a corner slot and the middle), and a
cut across one diagonal member (orange). Made by `node scripts/figures/shoot.mjs board-history` and
`node scripts/figures/board-history-sheets.mjs`; the numbers by `board-history-stls.mjs` and
`scripts/checks/stl-check.sh` with `FILAMENT="PETG Basic NPETG087-ZX"`.

Contact sheets: [`lightened.png`](lightened.png) (L1 to L3), [`skeleton.png`](skeleton.png) (S1 to S5). Single pictures:
`<label>-front.png`, `<label>-close.png`, `<label>-cut.png`.

The numbers are for a 200 x 200 mm board at starting values (all sides open, mounting as it starts), from that commit's
own library: model volume, and grams sliced in PETG Basic on the MK3S profile. The solid board of the same commit is
179.3 cm3 and 115.9 g for L1 and S1 (v0.2.1), and 179.0 cm3 and 115.7 g for every later state.

| Label | Type | Commit | Release | Date | What it is | Volume | Grams |
| ----- | ---- | ------ | ------- | ---- | ---------- | ------ | ----- |
| L1 | lightened | `6dbdd41` | v0.2.1 | 15 Oct 2026 | As first built: pockets with 1 mm round corners, square edges, no V groove. | 70.8 cm3 | 67.0 g |
| L2 | lightened | `f32fb47`, `67a4a85` | v0.3.0 | 21 Oct 2026 | After the design pass: pocket corners on long eased curves (D278), 1 mm edge chamfers (D276). | 72.9 cm3 | 67.6 g |
| L3 | lightened | `a134f59` | v0.8.0 | 24 Oct 2026 | Today's: the same lattice as L2 (its volume is identical); what changed since is in the mounting. | 72.9 cm3 | 67.6 g |
| S1 | skeleton | `f0d815a` | v0.2.1 | 15 Oct 2026 | As first built: every member an I-beam, 1.2 mm core, sharp pocket corners. | 54.8 cm3 | 68.4 g |
| S2 | skeleton | `f32fb47`, `af8b6d1` | v0.3.0 | 21 Oct 2026 | After the design pass: eased pocket corners, edge chamfers, a simpler mesh. | 58.5 cm3 | 69.5 g |
| S3 | skeleton | `a134f59` | v0.8.0 | 24 Oct 2026 | Today's: v0.4.2's profile, on main again since the revert `8983c3a`; same volume as S2. | 58.5 cm3 | 69.5 g |
| S4 | skeleton | `72aabde` | never released | 23 Oct 2026 | The slimmer stepped skeleton (D314): steps to a 0.9 mm core behind the front flange. | 50.4 cm3 | 56.9 g |
| S5 | skeleton | `c500966` | never released | 24 Oct 2026 | The reworked profile (D408), on branch `feat/skeleton-rework-r2b`. | 50.7 cm3 | 56.9 g |

- L2 and L3, and S2 and S3, have the same volume at starting values (to the cubic micrometre): at these settings they
  are the same board. They differ only where the mounting (keyholes, standoffs, lock screws) or a seam setting is
  used. v0.4.0 carries the same lattice as v0.3.0.
- Grams are the slicer's estimate: it counts perimeters and solid layers over thin members, so grams fall less than
  the volume does.
- Volumes and grams are in `numbers.json` and `grams.json`.
