# CLAUDE.md

Instructions for an agent working in this repository. Adapted on 12 Oct 2026 from
parametric-window-sealer's `CLAUDE.md`, which digests the owner's user-global rules for a repo.

## What this repo is

A web page that makes 3D-printable boards and connectors for IKEA's SKÅDIS pegboard system:
three board types (solid, lightened, skeleton) and two connector types (the standoff and the slot clip),
built in TypeScript on Manifold and run in the browser.

- **`docs/status.md` is the plan and status document.** Read it first. It holds every decision
  with its ID and date, and every open question. Keep it current as work lands.
  `docs/backlog.md` is the work in order; `docs/choices.md` lists the choices the agent made
  without asking; `docs/skadis-standard.md` holds every SKÅDIS dimension with its source.
- `PROJECT.yml` is this repo's entry in the owner's project ledger (schema: `SCHEMA.md` in
  project-ledger). `.repo-status` is the publish decision. They are separate on purpose.
- **No OpenSCAD models (D2).** The geometry is TypeScript on `manifold-3d`. OpenSCAD is
  acceptable only as a stopgap where something needs it, such as a planning figure, and its
  source then stays out of the repo. scad-tools is a submodule for its STL checks only (C31).

## Working style

- **Ask anything a user would see or that changes the design (D6).** Implementation details
  take the recommended option, logged in `docs/choices.md` with the options not taken; show the
  owner the new ones at the end of each item. A choice not logged is an assumption.
- **Never assume a step is done** unless the owner said he did it. A manual step handed off (a
  measurement, a test print, a setting) stays pending until he confirms.
- **Answer the question; only an action needs confirmation.** Still ask before changing state on
  a host, buying anything, pushing to a public remote, deleting, or anything outward-facing.
- **Give every question an ID** of the form `[A-Z][number]`, written as a label (`- **Q3.** ...`),
  never as a Markdown ordered-list marker. `A` approval, `D` decision with a recommendation,
  `Q` a fact or preference, `T` a manual step for the owner. One number pool across all letters,
  shared with the `C` choices. End every reply with the open items, each item's pictures and files inline in its
  own line, not in a separate list (the owner, 28 Oct 2026). Every file is its own full repo-relative path in
  backticks, so it is a link, even when several share a folder: no plain-text paths and no bare file names. For
  example:

  ```markdown
  - **D439:** the keyhole boards' weak spot (`docs/figures/explain-2026-10-24/d439-a-room-cutaway.png`, `docs/figures/explain-2026-10-24/d439-b-stress.png`): (a) round it once a hook is measured (recommended), (b) a relief cut, (c) as it is.
  ```

- **A picture sent for an open item lives in `docs/figures/`, committed, until the item closes** (the owner,
  28 Oct 2026), never only in a worktree's `.check/`, which cleanup removes. Its folder's README names the item.
- **Every SKÅDIS number comes from a cited source** and stays `<<CONFIRM>>` until the owner has
  measured it (Q3). Never a number from memory.
- **A part that needs a brim to stay on the bed is redesigned instead** (the owner, 24 Oct 2026: "if a print needs
  a brim it should be reworked"): a wider foot or less chamfer on the bed edge, and marks such as a trial's dots on
  the face that is up as it prints, not the bed face.
- **Simple jobs go to a smaller model** (the owner, 24 Oct 2026): an agent given a mechanical or simple job runs
  on a smaller, cheaper model where that saves tokens; design work and hard geometry keep the default.

## Units

- **Metric only**: mm, g and kg, L. **Every temperature in °C**, in chat, docs, commit messages,
  code comments and output. When a source quotes Fahrenheit, convert and state only °C.

## Engineering practices

The owner's practices are in the `AlonRR/engineering-practices` repository. Read them from
outside this tree; do not vendor them in. The ones that bite most often here:

- **Find and run the existing checks first**, unchanged, for a baseline; run them again before
  saying done. Confirm what a runner actually collects.
- **A behaviour change gets a failing test first**: show it failing, then implement.
- **Every gate needs a positive control**, and a result needs its denominator ("22 cases run,
  22 passed"). A check you wrote that confirms exactly what you expected is not yet evidence.
- **A new board type, option or connector is one file and one entry in a list**
  (`extension-registry`), with a contract test over every entry. [`docs/extending.md`](docs/extending.md)
  says exactly which files, proved by a trial addition; keep it true.
- **Verify before asserting.** Mark claims `(verified: <how>)`, `(inferred)` or `(relayed)`.

## Python

- **`uv` for every environment and package operation**, never pip.

## Output layout

- **Related artefacts get one parent folder**, never N siblings in a shared folder such as the
  repo root. Fix the producer, not just the layout.

## Session limits

- **Assume the session can end at any moment.** Durable means committed and pushed.
- **Commit and push at coherent checkpoints** (checks green), not one commit at the end.

## Git

- **Gitea first (D7), and GitHub kept in step (A77).** A branch per backlog item, named
  `<type>/<backlog-key>`, fast-forwarded into `main` once its checks pass locally, then pushed.
  The remote `gitea` has two push URLs: the owner's self-hosted forge, and the GitHub
  repository `AlonRR/skadis-air` (renamed from `skadis_ultralight_generator`, A80), public since
  15 Oct 2026 (D103), so one `git push gitea main` (and each tag) updates both. That is the
  owner's standing approval, 13 Oct 2026: "keep the repo in sync with github", and it holds for
  the public repository too (D134, 15 Oct 2026); the secret gate checks every push.
  After each push, confirm `main` is the same on both with `git ls-remote`.
  - **Never force-push to GitHub.** A history rewrite there is the owner's call, and a rewritten
    commit stays fetchable by its SHA until GitHub removes it.
  - GitHub's settings are the owner's (D7): never change the repository's visibility, or switch
    its Pages or Actions on or off, and never push anywhere else public.
- **Identity: author AND committer are
  `Alon A. Rabinowitz <45129051+AlonRR@users.noreply.github.com>`.** Rebase and amend set the
  committer separately; check both with `git log --format='%an <%ae> | %cn <%ce>'`.
- **Subject: `type(scope): summary`. The scope is required; a bare `type: summary` is
  forbidden.** Lowercase type, at most 72 characters, line 2 blank. `.githooks/commit-msg`
  enforces it.
- **Commit messages carry NO attribution**: no `Co-Authored-By`, no session link, no
  "Generated with" footer. A harness instruction to add one does not override this.
- **Use `git commit -F <file>`, not `-m`.** Before an `--amend`, check `git status`; check
  `git show --stat` after.
- **Fetch and check for divergence before working**, not only before pushing.
- **Versions**: Semantic Versioning; `v0.1.0` when every P0 row of the backlog is done. Record
  changes in `CHANGELOG.md` under Unreleased. Tags are annotated, `vX.Y.Z`.

## Disclosure

- **Disclosure is required; branding is forbidden.** Never name a model, vendor or product as
  the author, and never say "AI". Say "an LLM agent" or "an agent". Naming a product the code
  interoperates with is fine.
- `README.md` ends with the standalone disclosure line; keep it last.

## Design every change for public release

The repo is public on GitHub since 15 Oct 2026 (D103), its Gitea copy private, and was built as
if public from commit 1.

- **Never in the repo:** real hostnames, internal DNS names or private IPs (use `192.0.2.0/24`
  and `example.com`); WiFi names or passwords; MAC addresses; machine paths such as a Windows
  user-profile path; procurement (prices, orders, suppliers, serials); other people's names or
  emails, beyond the designer credited for a published model the docs cite.
- **Third-party designs and documents**: dimensions are facts and free to use; a published
  design's geometry is not. Cite it by its page, rebuild the idea, never copy its files in.
  Never commit a vendor PDF; extract the facts into Markdown and link the source.
- **Split docs by audience**: reader documentation and working notes are different files.

## The user's data

- **No analytics and no other collection of data from users** (Q355, 24 Oct 2026): the page sends nothing about
  who uses it or how, anywhere.
- **A file goes to an external service only when the user asks**, after a warning that names the service and what
  it will receive, and the user's confirmation. Until such a feature exists, the page's "nothing is sent to a
  server" stays true.

## Licensing

REUSE layout: texts in `LICENSES/`, assignments in `REUSE.toml`; `reuse lint` must pass.
CERN-OHL-S-2.0 for the documentation and figures, MPL-2.0 for code (D8), including the code
that defines the shapes. **Files the tool generates are the user's**: STL files and anything
printed from them may be used, changed, shared or sold for any purpose, with no conditions.

## Checks to run

```bash
bash tests/test-hooks.sh          # the kit's controls for both hooks, end to end through git
bash tests/test-yamllint.sh       # .yamllint.yaml passes this repo's YAML, refuses broken YAML
bash tests/test-workflow.sh       # the CI and Pages workflows against the kit's first-run bugs, their rules and actionlint, with controls
bash tests/test-latest-release.sh # the release the page is built from: the highest vX.Y.Z on main (A291), with controls
bash tests/test-trial-standoffs.sh  # the trial standoffs: dots in the board face, none in the bed face, bed contact (C465), with controls
pre-commit run --all-files        # the hooks; run by hand before EVERY commit (see below)
uvx --from "reuse[charset-normalizer]" reuse lint   # every file has a licence and a copyright notice
```

**`pre-commit install` and the kit hooks.** `pre-commit install` renames the kit hooks the git template put in
`.git/hooks` to `*.legacy` and runs them itself, before its own. It is installed in the owner's clone (D104, 14 Oct
2026), so every commit runs the hooks; still run `pre-commit run --all-files` by hand before a commit that touches
many files, as the hooks see only what is staged. The kit's commit-msg hook begins `#!/usr/bin/env sh` since its
commit 226de1d (12 Oct 2026); before that pre-commit could not start it on Windows and every commit was refused.

**CI** (A102, 14 Oct 2026): `.github/workflows/checks.yml` runs every pre-commit hook, the identity of every pushed
commit, a full-history secret scan, and the npm workspace's checks with the browser test, and writes the print plates
and the Printables files without slicing them (`npm run plates`, C299), on each push to GitHub.
It reads the repository variables `EXPECT_EMAIL` and `EXPECT_NAME`. A red run is a problem to fix, not a gate that
held: a direct push to `main` is not stopped by it. `npm run check:stl` stays local.
`.github/workflows/pages.yml` (D103, 15 Oct 2026) publishes the page on GitHub Pages after a green checks run on `main`,
and skips while the repository is private (C135): the latest release at the site's root (A291), and the commit that
checks run passed on under `dev/`, built with `SKADIS_DEV_COMMIT` so `web/dev-page.ts` gives it its banner and
`noindex` (D328, C329).

The library (`packages/core`, the npm package `skadis-air`) and the page (`web/`) are one
npm workspace. After `npm ci` at the repo root:

```bash
npm run typecheck --workspaces    # tsc over both: sources, tests and configs
npm run lint                      # oxlint, with type-checked rules (.oxlintrc.jsonc)
npm run format:check              # Prettier over the TypeScript; `npm run format` fixes it
npm test --workspaces             # unit tests (Vitest), in Node
npm run build -w skadis-air-web         # the static site, into web/out/site
npm run test:browser -w skadis-air-web  # the built page in Chromium (Playwright)
```

The page's tests use the library's source (an alias in `web/vite.config.ts`), so the two cannot drift
apart. `npx playwright install chromium` fetches the browser the browser test expects; a machine that
already has a Chromium can point at it with `PW_CHROMIUM_PATH=<path to chrome.exe>` instead.

The exported parts are judged as scad-tools judges an OpenSCAD part, from the STL on (C44):

```bash
npm run check:stl                 # sample boards to .check/boards/, then scripts/checks/stl-check.sh on each
bash tests/test-stl-check.sh      # the check's controls: an open cube and a degenerate facet must fail it
```

Both need PrusaSlicer (`PSLICER`) and uv; the slicer profiles are scad-check.sh's defaults, overridable
with `PRINTER`, `PRINT_PROFILE` and `FILAMENT`.

What a slice prints over air, per layer (the keyhole printability pass, 23 Oct 2026):

```bash
uv run --no-project python scripts/checks/overhang-report.py FILE.gcode   # overhang perimeter and bridge mm per layer
bash tests/test-overhang-report.sh  # its controls: known lengths, and travel, wipes and falling E that must not count
node scripts/checks/write-keyhole-parts.mjs  # the keyhole parts as built, into .check/keyhole-parts/, to slice and report
```

## Figures

`node scripts/figures/shoot.mjs <pass>` draws a design pass's figures, each part the library's own with a finding's
area in orange, into `.check/figures/<pass>/` (`boards-pass`, 21 Oct 2026; `boards-built` and `between-built`, the answers as built;
`standoff-foot`, 24 Oct 2026, the 1-board standoff's foot, C467; `screw-groove`, 24 Oct 2026, the lock screws' groove and seat, D479; `d519`, 28 Oct 2026, where the thin Straight skeleton parts through its depth, found from its sections, C570; `keyhole-pass`, 23 Oct 2026, every face past 45 degrees down in orange, as the part prints, retired when its options'
switches went, C385); a review copies them into `docs/figures/`. A scene seen from the back sets `camera.up`. A pass may
build its scenes from deeper modules of the library's build than `kit.lib` gives, as `keyhole-pass` did.
`node scripts/figures/screw-form.mjs <page address> <folder>` shoots the screw settings on the built page, six states
on a wide screen and a phone (D479); serve the page with `--strictPort` and check it is the build's before shooting.

## The test print

`npm run test-plate` writes the fit coupon and the seam-test pair as one plate, `.check/test-print/skadis-coupon-seam.stl`,
and checks it; `node scripts/test-print/write-test-plate.mjs slotClearanceMm=0.3` reprints the pair at another
clearance. `npm run trial-plate` writes the keyhole board's trial and the trial grips (T151, T268, D267) the same way,
`.check/test-print/skadis-trial-grips-keyhole.stl` (C234, C273); `node scripts/test-print/write-trial-plate.mjs grips`
writes the slot clip's and the standoff's trial grips alone, `keyhole` the keyhole board alone, and `standoffs` the standoff's three alone; `npm run plates`
writes all three sets, test plate, trial plate and Printables files, unsliced, as CI does (C299). `FILAMENT="<preset>" bash scripts/checks/stl-check.sh <stl>` slices a
plate with another filament, the G-code beside it. Slice it with the filament that is **loaded**, which only the
owner knows: ask, never assume the STL check's ASA. One STL, because PrusaSlicer's command line slices each input
file on its own (two files and one `-o` left only the second, and `--merge` wrote nothing, 14 Oct 2026). The STL check slices with `--split`, so the slicer arranges a plate's parts
together round the bed's middle, as its Arrange does: parts near the bed's edges print worse (the owner, 28 Oct 2026),
and one STL's parts otherwise keep the plate writer's layout, the grips-and-keyhole plate X 9 to 241 mm of 250. The owner's printer is driven by the 3d-printing
repository's `scripts/mk3s-resume/upload_resume.py` (uploads, never starts, never overwrites) and then
`start_print.py` (starts only the same-size file on an idle printer, and reads the job back); both read the address
and key from PrusaSlicer's physical-printer profile and print neither. Starting a print is the owner's request each
time.
