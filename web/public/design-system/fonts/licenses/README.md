# Third-party licences

The fonts in `fonts/` are subsets of **FiraCode Nerd Font** (`Version 6.002;Nerd Fonts 3.4.0`),
Regular and Bold. They hold glyphs from five upstream projects, and their licences ask for the
texts and credits below to travel with the fonts. **This folder sits inside `fonts/`, so copying
`fonts/` carries it.**

| In the fonts | From | Licence | Text here |
| --- | --- | --- | --- |
| Letters, figures, punctuation, arrows and ligatures | [Fira Code](https://github.com/tonsky/FiraCode), © 2014 The Fira Code Project Authors | SIL OFL 1.1 | [`FiraCode-OFL.txt`](FiraCode-OFL.txt) |
| The patched family, FiraCode Nerd Font | [Nerd Fonts](https://github.com/ryanoasis/nerd-fonts) | SIL OFL 1.1 for the fonts, MIT for its scripts | [`NerdFonts-LICENSE.txt`](NerdFonts-LICENSE.txt) |
| Codicons, U+EA60 to U+EBFF (408 code points) | [Codicons](https://github.com/microsoft/vscode-codicons), © Microsoft Corporation | CC BY 4.0 | [`Codicons-CC-BY-4.0.txt`](Codicons-CC-BY-4.0.txt) |
| Font Awesome Free, U+F000 to U+F2FF (768) | [Font Awesome](https://github.com/FortAwesome/Font-Awesome), © Fonticons, Inc. | Icons CC BY 4.0; in font files SIL OFL 1.1, Reserved Font Name "Font Awesome" | [`FontAwesome-LICENSE.txt`](FontAwesome-LICENSE.txt) |
| Powerline symbols, U+E0A0 to U+E0D7 (40) | [Powerline](https://github.com/powerline/powerline) and [Powerline Extra Symbols](https://github.com/ryanoasis/powerline-extra-symbols) | MIT | [`Powerline-MIT.txt`](Powerline-MIT.txt), [`PowerlineExtra-MIT.txt`](PowerlineExtra-MIT.txt) |

The copyright lines and names inside each text are the upstream authors' own; the licences ask
for them to be kept.

## What was changed

The fonts were subset with fontTools' `pyftsubset` to the ranges above plus Basic Latin, Latin-1,
general punctuation and arrows, keeping every OpenType layout feature so the ligatures work, and
saved as WOFF2. The subsets keep no licence fields of their own in the name table, so this folder
carries the licences instead. No glyph was redrawn. How to rebuild them is in `FONTS.md` in the
design system's repository, AlonRR/printable-parts-design-system.

## Where each text came from

Each file is the upstream licence file, unchanged, from the commit linked here (read on
14 Oct 2026):

- `FiraCode-OFL.txt`: [tonsky/FiraCode `LICENSE`](https://github.com/tonsky/FiraCode/blob/ecd367b040ad92a28b64fa93135775f7e2417b37/LICENSE). Nerd Fonts ships the same file beside its patched FiraCode.
- `NerdFonts-LICENSE.txt`: [ryanoasis/nerd-fonts `LICENSE`](https://github.com/ryanoasis/nerd-fonts/blob/e41135833dd63f1994096d3c61b04bdc52333cc3/LICENSE)
- `Codicons-CC-BY-4.0.txt`: [microsoft/vscode-codicons `LICENSE`](https://github.com/microsoft/vscode-codicons/blob/6b53088f5c55bce7107fb579765364f59cd4ad5d/LICENSE)
- `FontAwesome-LICENSE.txt`: [FortAwesome/Font-Awesome `LICENSE.txt`, 6.x](https://github.com/FortAwesome/Font-Awesome/blob/840c215f894f429b26b8c1402a65da835dc5a450/LICENSE.txt)
- `Powerline-MIT.txt`: [powerline/powerline `LICENSE`](https://github.com/powerline/powerline/blob/11808cbe5c16e4621edcaefa916b5add81eab799/LICENSE)
- `PowerlineExtra-MIT.txt`: [ryanoasis/powerline-extra-symbols `LICENSE`](https://github.com/ryanoasis/powerline-extra-symbols/blob/ae05de7c51f6609479f4f1a4a0f6f65631731c1b/LICENSE)

These texts cover the fonts and icons only. The rest of this repository is MPL-2.0 (code) and
CERN-OHL-S-2.0 (documentation), as `REUSE.toml` assigns.
