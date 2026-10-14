# The design system's files

Copied unchanged from the owner's shared design system,
[`AlonRR/printable-parts-design-system`](https://github.com/AlonRR/printable-parts-design-system),
at its tag `v0.1.0`, commit `aa3188e` (14 Oct 2026, D111):

- `tokens.css`: the colours of both themes, the spacing, the type and the `@font-face` rules. It
  loads `fonts/` by a relative address, so `fonts/` stays beside it.
- `components/bundle.css`: the components' styles. They read only the tokens and declare no font.
- `fonts/`: two subsets of FiraCode Nerd Font, Regular and Bold, with the licence texts and credits
  of the five projects whose glyphs they hold in `fonts/licenses/`. Its README's link to `FONTS.md`
  points into the design system's repository, which says how the subsets are made.

The page loads `tokens.css` and then `components/bundle.css`. These files sit in `web/public/`,
which the build copies as it is (C116), so the published page serves the fonts' licence texts beside
the fonts: the subsets carry no licence inside them.

**Never edit them here.** Change the design system, tag a new version there, copy that version's
files over these, and name the new tag and commit above. Licensing is in `REUSE.toml`: the
stylesheets are MPL-2.0 like the rest of the page, the fonts `OFL-1.1 AND CC-BY-4.0 AND MIT`.
