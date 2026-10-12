# SKÅDIS board generator

A web page that makes 3D-printable boards and connectors that fit IKEA's SKÅDIS pegboard system:
you choose the kind of board, its size and how it mounts, and download files your printer can
make. The aim is one place for every kind of SKÅDIS board that people print today, each easy to
adjust and to print.

## Status

**Version 0.1.0: the solid board, on the page; not yet test printed.** The page in `web/` makes a
solid board of 40 mm tiles: you set its size, its thickness and which sides are open (half slots, to
join a neighbour) or closed, see it in 3D, and download it as an STL that lies as it prints. It warns
when the board is larger than your printer's bed. The SKÅDIS dimensions it uses come from published
sources and are still to be checked against a real board.

What it will make:

- **Boards** of three kinds, each with its outline, its tiling into printable pieces and its
  mounting as options:
  - **solid**: a plain plate with the SKÅDIS slots;
  - **lightened**: pockets cut between the slots, with a rim kept round each slot;
  - **skeleton** (ultralight): rims round the slots tied by thin beams, mostly open.
- **Connectors** of five kinds ([figure](docs/figures/connector-types.png)): a standoff, a seam
  plate, a slot clip, an angle joiner and a desk clamp, for 1, 2 or 4 boards where that applies.

Every decision is in [`docs/status.md`](docs/status.md), the work in order in
[`docs/backlog.md`](docs/backlog.md), and the SKÅDIS dimensions, each with its source, in
[`docs/skadis-standard.md`](docs/skadis-standard.md). None of those dimensions has been checked
against a real board yet; until it has, each is marked as such.

The geometry is built in TypeScript on the [Manifold](https://github.com/elalish/manifold)
library and runs in your browser; nothing is sent to a server.

## Developing

```bash
git clone --recursive <this repository>
git config user.useConfigOnly true
uv tool install pre-commit
pre-commit install
bash tests/test-hooks.sh
pre-commit run --all-files
```

`--recursive` fetches `scad-tools`, whose STL checks judge every part the page makes. The commit
hooks check the commit's identity and message form; [`CLAUDE.md`](CLAUDE.md) lists the rules.

The geometry is a library in `packages/core`, and the page lives in `web/`. They are one npm workspace
and need Node.js 22.12 or later:

```bash
npm ci                                                  # at the repo root
npm run lint && npm run format:check                    # oxlint and Prettier
npm test --workspaces                                   # unit tests
npm run dev -w skadis-ultralight-generator-web          # the page, reloading as you edit
npm run build -w skadis-ultralight-generator-web        # the static site, into web/out/site
npm run test:browser -w skadis-ultralight-generator-web # the built page in Chromium
npm run check:stl                                       # sample boards through scad-tools' STL checks and PrusaSlicer
```

## Licence

**Your generated files are yours.** The STL and other files this tool generates, and anything
you print from them, are yours to use, change, share or sell for any purpose, with no
conditions from this project.

The repository itself:

- Code, including the code that defines the boards' and connectors' shapes, and the scripts,
  hooks, tests and tool configuration: [MPL-2.0](LICENSES/MPL-2.0.txt)
- The documentation and figures: [CERN-OHL-S-2.0](LICENSES/CERN-OHL-S-2.0.txt)

Which licence covers which file is recorded in [`REUSE.toml`](REUSE.toml)
([REUSE](https://reuse.software) layout).

SKÅDIS is IKEA's name for its pegboard system. This project is not made, endorsed or supported by
IKEA; the name says what the boards fit.

_Parts of this repository were drafted with the help of an LLM agent; reviewed and verified locally._
