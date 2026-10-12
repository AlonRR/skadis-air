# CLAUDE.md

Instructions for an agent working in this repository. Adapted on 12 Oct 2026 from
parametric-window-sealer's `CLAUDE.md`, which digests the owner's user-global rules for a repo.

## What this repo is

A web page that makes 3D-printable boards and connectors for IKEA's SKÅDIS pegboard system:
three board types (solid, lightened, skeleton) and five connector types, built in TypeScript
on Manifold and run in the browser.

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
  shared with the `C` choices. End every reply with the open items.
- **Every SKÅDIS number comes from a cited source** and stays `<<CONFIRM>>` until the owner has
  measured it (Q3). Never a number from memory.

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

- **Gitea first (D7).** The remote is `gitea`, the owner's self-hosted forge.
  A branch per backlog item, named `<type>/<backlog-key>`, fast-forwarded into `main` once its
  checks pass locally, then pushed. GitHub, its CI and Pages come only when the owner decides;
  **never push to a public remote** and never change visibility.
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

The repo is private today and built as if public from commit 1.

- **Never in the repo:** real hostnames, internal DNS names or private IPs (use `192.0.2.0/24`
  and `example.com`); WiFi names or passwords; MAC addresses; machine paths such as a Windows
  user-profile path; procurement (prices, orders, suppliers, serials); other people's names or
  emails, beyond the designer credited for a published model the docs cite.
- **Third-party designs and documents**: dimensions are facts and free to use; a published
  design's geometry is not. Cite it by its page, rebuild the idea, never copy its files in.
  Never commit a vendor PDF; extract the facts into Markdown and link the source.
- **Split docs by audience**: reader documentation and working notes are different files.

## Licensing

REUSE layout: texts in `LICENSES/`, assignments in `REUSE.toml`; `reuse lint` must pass.
CERN-OHL-S-2.0 for the documentation and figures, MPL-2.0 for code (D8), including the code
that defines the shapes. **Files the tool generates are the user's**: STL files and anything
printed from them may be used, changed, shared or sold for any purpose, with no conditions.

## Checks to run

```bash
bash tests/test-hooks.sh          # the kit's controls for both hooks, end to end through git
bash tests/test-yamllint.sh       # .yamllint.yaml passes this repo's YAML, refuses broken YAML
pre-commit run --all-files        # the hooks; run by hand before EVERY commit (see below)
uvx --from "reuse[charset-normalizer]" reuse lint   # every file has a licence and a copyright notice
```

**`pre-commit install` and the kit hooks.** `pre-commit install` renames the kit hooks the git template put in
`.git/hooks` to `*.legacy` and runs them itself. Until 12 Oct 2026 the kit's commit-msg hook began `#!/bin/sh`,
which pre-commit cannot start on Windows, so every commit was refused; the kit fixed it that day (its commit
226de1d, `#!/usr/bin/env sh`), and `.githooks/commit-msg` here is that copy. Either way works now: the shim,
or the kit hooks alone with `pre-commit run --all-files` by hand before every commit.

The library (`packages/core`, the npm package `skadis-ultralight-generator`) and the page (`web/`) are one
npm workspace. After `npm ci` at the repo root:

```bash
npm run typecheck --workspaces    # tsc over both: sources, tests and configs
npm run lint                      # oxlint, with type-checked rules (.oxlintrc.jsonc)
npm run format:check              # Prettier over the TypeScript; `npm run format` fixes it
npm test --workspaces             # unit tests (Vitest), in Node
npm run build -w skadis-ultralight-generator-web         # the static site, into web/out/site
npm run test:browser -w skadis-ultralight-generator-web  # the built page in Chromium (Playwright)
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
