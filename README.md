# Skådis Air

**Every SKÅDIS board: light to print, quick in your browser.**

A web page that makes 3D-printable boards and connectors that fit IKEA's SKÅDIS pegboard system:
you choose the kind of board, its size and how it mounts, and download files your printer can
make. The aim is one place for every kind of SKÅDIS board that people print today, each easy to
adjust and to print.

**Use it in your browser: <https://alonrr.github.io/skadis-air/>**

## Status

**Version 0.3.0: three kinds of board, walls of any size up to 1 km, and two connectors, on the page.** The page
in `web/` makes a solid board of 40 mm tiles: you set its size, its thickness and which sides are open
(half slots, to join a neighbour) or closed, give it screw holes in its corners (countersunk or for a
round head, or keyholes at the top so it lifts off its screws) and standoffs on the back, see it in 3D, and download it as an STL that lies as it
prints. A lightened board is the same with open pockets cut between the slots: a rim round each slot,
joined to its neighbours by diagonal webs, in about 40 % of the plastic; a skeleton board makes every rim and web
of that lattice an I-beam, thin through the middle, in about 32 %. It warns when the board is larger than your printer's bed. It also makes a small coupon to
test the slots' fit first, a pair of tiles to test how two tiles meet, and a standoff, the first connector, to hold one board off the wall at a
corner screw, or two side by side or one above the other, or four where their corners meet, and a slot clip, which joins boards behind a seam by pegs in their slots. The SKÅDIS dimensions it uses come from published sources, checked against a real board
with calipers, and a printed coupon set the slots' clearance ([`docs/skadis-standard.md`](docs/skadis-standard.md)).

What it will make:

- **Boards** of three kinds, each with its outline, its tiling into printable pieces and its
  mounting as options:
  - **solid**: a plain plate with the SKÅDIS slots;
  - **lightened**: pockets cut between the slots, with a rim kept round each slot;
  - **skeleton** (ultralight): rims round the slots tied by thin beams, mostly open.
- **Connectors** of four kinds ([figure](docs/figures/connector-types.png)): a standoff, a slot clip
  ([figure](docs/figures/slot-clip.png)), an angle joiner and a desk clamp, for 1, 2 or 4 boards where that
  applies. The seam plate in the first figure was dropped for the slot clip, which needs no screw holes.

Every decision is in [`docs/status.md`](docs/status.md), the work in order in
[`docs/backlog.md`](docs/backlog.md), and the SKÅDIS dimensions, each with its source, in
[`docs/skadis-standard.md`](docs/skadis-standard.md). The slot, the grid, the thickness and IKEA's
spacer are measured on a real board; the rest are marked as still to be confirmed.

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
hooks check the commit's identity and message form; [`CLAUDE.md`](CLAUDE.md) lists the rules. The
same checks, with the tests below, run on every push to GitHub (`.github/workflows/checks.yml`).

The geometry is a library in `packages/core`, and the page lives in `web/`. They are one npm workspace
and need Node.js 22.12 or later:

```bash
npm ci                                                  # at the repo root
npm run lint && npm run format:check                    # oxlint and Prettier
npm test --workspaces                                   # unit tests
npm run dev -w skadis-air-web          # the page, reloading as you edit
npm run build -w skadis-air-web        # the static site, into web/out/site
npm run test:browser -w skadis-air-web # the built page in Chromium
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
- The page's fonts, subsets of FiraCode Nerd Font from the shared design system the page is styled
  with: [OFL-1.1](LICENSES/OFL-1.1.txt), with glyphs under [CC-BY-4.0](LICENSES/CC-BY-4.0.txt) and
  [MIT](LICENSES/MIT.txt); their authors and upstream licence texts are in
  [`web/public/design-system/fonts/licenses/`](web/public/design-system/fonts/licenses/README.md),
  which the published page serves beside the fonts.

Which licence covers which file is recorded in [`REUSE.toml`](REUSE.toml)
([REUSE](https://reuse.software) layout).

SKÅDIS is IKEA's name for its pegboard system. This project is not made, endorsed or supported by
IKEA; the name says what the boards fit.

_Parts of this repository were drafted with the help of an LLM agent; reviewed and verified locally._
