# The design system's files

Copied unchanged from the owner's shared design system,
[`AlonRR/printable-parts-design-system`](https://github.com/AlonRR/printable-parts-design-system),
at its tag `v0.8.1`, commit `fbf285e` (24 Oct 2026, A413; first copied at `v0.1.0`, D111, then `v0.2.0`,
`v0.3.0`, `v0.5.0` with v0.4.0's steps, D202, `v0.5.1`, D250 e, `v0.6.0`, D259, `v0.7.0`, D287, and `v0.8.0`, D301). The design system's history was rewritten
on 19 Oct 2026 to remove a hostname: the tags before `v0.6.0` that this page copied, `v0.5.0` and `v0.5.1`, are
no longer on GitHub, only on the owner's own forge.

- `tokens.css`: the colours of both themes, the spacing, the type, how much of the stage the part
  fills (D123) and the `@font-face` rules. It loads `fonts/` by a relative address, so `fonts/` stays
  beside it.
- `components/bundle.css`: the components' styles. They read only the tokens and declare no font.
- `theme-init.js`: the theme setter, which the page loads first in its head, before the stylesheets, with
  `data-key="skadis-air-theme"`, the key the header's toggle keeps its choice under (since `v0.6.0`).
- `fonts/`: two subsets of FiraCode Nerd Font, Regular and Bold, with the licence texts and credits
  of the five projects whose glyphs they hold in `fonts/licenses/`. Its README names `FONTS.md` in the
  design system's repository, which says how the subsets are made.

The page loads `tokens.css` and then `components/bundle.css`, and its body carries `ws-page`. Since
`v0.3.0` the design system holds the rules the page had added in `web/index.html`, which keeps only its own
(D153); a rule the page needs that the design system lacks goes to the design system, not into local CSS. These files sit in `web/public/`,
which the build copies as it is (C116), so the published page serves the fonts' licence texts beside
the fonts: the subsets carry no licence inside them.

**Never edit them here.** Change the design system, tag a new version there, and copy that
version's files over these with `scripts/design-system/copy-design-system.sh`, which takes the
design system's clone address and the tag; then name the new tag and commit above.

**Before and after a new version**, so nothing changes on the page unseen (D153): build and serve the page
as it is (`npm run build -w skadis-air-web`, then `npm run preview -w skadis-air-web -- --port 4199`), shoot
it twice with `node scripts/design-system/screenshots.mjs http://localhost:4199/ .check/screenshots/before`
(and `before2`), and check the two with `uv run scripts/design-system/compare-screenshots.py`: they must be
identical. Then copy the new version, rebuild, shoot `after`, and compare it with `before`; every state
that changed should be one the release says it changes. For `v0.3.0`, 5 of 10 states changed: the warnings'
outlines, the buttons under the 3D view on a phone, and the 320 px screen, which no longer scrolls sideways.
For `v0.5.0`, all 10 changed, as its fonts, the look of what is chosen (tint and ring) and the phone stage did;
with the page's own markup unchanged, the phone and 320 px screens scrolled sideways (541 px wide), as the plan
bar is one row on a phone, which moving the file's format into the form fixed (D207).
For `v0.5.1`, a patch, the same page shot twice came out identical (10 of 10), and after the copy all 10 changed,
where its release says: the wide header, and the space under each legend and above each note.
For `v0.6.0`, the same page shot twice came out identical (10 of 10), and after the copy and its steps all 10
changed: every field 36 px tall with a mouse, 1.3 px less; the number fields' arrows the design system's Stepper;
the board types a field's own Choice, as close under its legend as "What to make", their box gone now `hidden`
hides a Choice (C179); and on a phone the download button reads "Download", its sentence given the room.
For `v0.7.0`, with three states added for it (a phone held sideways, 750 x 342; a short wide screen, 1280 x 360;
and 844 x 390), the same page shot twice came out identical (13 of 13), and after the copy 10 of 13 changed, where
its release says: beside the sidebar, in every wide state and the short one, the download button reads "Download",
its format kept for a screen reader; and 844 x 390 went side by side where it was stacked, its hints cut short.
The phone upright, the phone sideways at 750 px, still stacked, and the 320 px screen did not change.
For `v0.8.0`, the same page shot twice came out identical (13 of 13), and after the copy all 13 changed, each
only round its icons, raised onto their labels' capitals (the theme toggle, the view's buttons and the download
button). The dark board in "Sides", which no state shows, was checked by itself: `#0c1217` on its fieldset's
`#17212a`, darker than the panel where it was the lightest surface.
For `v0.8.1`, which adds the Help (D94) and the busy ring (D95), the page's own rules for both went and its
markup took the system's classes (`.ws-label-row`, `.ws-help-toggle`, `.ws-busy`; the page keeps its own click
handler, as the system's script as well would flip every press twice). Of 18 shots (the help folded, unfolded
and the ring showing, wide in both themes and at 375 px, each with the first toggle alone), the same page shot
twice came out identical in 17, the ring on a phone differing in its 3D view alone; after the copy and the
markup 17 of 18 were identical to the first shots and 18 of 18 to the second. Nothing moved.

Licensing is
in `REUSE.toml`: the stylesheets are MPL-2.0 like the rest of the page, the fonts
`OFL-1.1 AND CC-BY-4.0 AND MIT`.
