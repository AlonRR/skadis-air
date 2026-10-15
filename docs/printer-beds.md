# Printer beds

The printers the page offers (`printer-presets`; D4, D170 to D172). Every number was read from the maker's own
website, quoted with its address; none is from memory, a retailer or a review.

Copied on 15 Oct 2026 from the reference project's `docs/printer-beds.md` (parametric-window-sealer, its
commit 313c443), read there on 5 Oct 2026 (C25), with a **Maker** column added, by which the page groups them
(D170), and one row added here: the Original Prusa i3 MK3S+ (D172), read on 15 Oct 2026 from Prusa's page for
its 10th Anniversary Edition, as the MK3S+ page itself now leads to the MK4S.

**Group** is `mini` for the two small-bed printers and `full-size` for the rest. The default of
**200 × 200 mm** (D61) fits every `full-size` printer here with at least 10 mm to spare on each side of the
bed's smallest dimension; the minis need their entry in the list, or "Custom".
`packages/core/test/printers.test.ts` checks that claim, and that the page's list is this table, row for row,
so a change to either one shows up in the tests.

## Build volumes

| Maker | Model | X mm | Y mm | Z mm | Group | Source |
|---|---|---|---|---|---|---|
| Prusa | Original Prusa MK4S | 250 | 210 | 220 | full-size | <https://www.prusa3d.com/product/original-prusa-mk4s-3d-printer-5/> |
| Prusa | Original Prusa i3 MK3S+ | 250 | 210 | 210 | full-size | <https://www.prusa3d.com/en/product/original-prusa-i3-mk3s-10th-anniversary-edition-3d-printer> (its 10th Anniversary Edition: "25×21×21 cm") |
| Prusa | Original Prusa MINI+ | 180 | 180 | 180 | mini | <https://www.prusa3d.com/product/original-prusa-mini-semi-assembled-3d-printer-enclosure-bundle-5/> |
| Prusa | Prusa CORE One+ (Gen 2) | 250 | 220 | 270 | full-size | <https://www.prusa3d.com/product/prusa-core-one/> |
| Prusa | Prusa CORE One L | 300 | 300 | 330 | full-size | <https://www.prusa3d.com/product/prusa-core-one/> (comparison table) |
| Prusa | Prusa XL+ Single-Tool | 360 | 360 | 360 | full-size | <https://www.prusa3d.com/product/original-prusa-xl-semi-assembled-single-toolhead-3d-printer/> |
| Bambu Lab | Bambu Lab A1 | 256 | 256 | 256 | full-size | <https://us.store.bambulab.com/products/a1> |
| Bambu Lab | Bambu Lab A1 mini | 180 | 180 | 180 | mini | <https://us.store.bambulab.com/products/a1-mini> |
| Bambu Lab | Bambu Lab A2L | 330 | 320 | 325 | full-size | <https://us.store.bambulab.com/products/a2l> |
| Bambu Lab | Bambu Lab P1S | 256 | 256 | 256 | full-size | <https://us.store.bambulab.com/products/p1s> |
| Bambu Lab | Bambu Lab P2S | 256 | 256 | 256 | full-size | <https://us.store.bambulab.com/products/p2s> |
| Bambu Lab | Bambu Lab X1C | 256 | 256 | 256 | full-size | <https://us.store.bambulab.com/products/refurbished-x1c> |
| Bambu Lab | Bambu Lab X2D (main nozzle) | 256 | 256 | 260 | full-size | <https://us.store.bambulab.com/products/x2d> |
| Bambu Lab | Bambu Lab H2D (single nozzle) | 325 | 320 | 325 | full-size | <https://us.store.bambulab.com/products/h2d> |
| Bambu Lab | Bambu Lab H2S | 340 | 320 | 340 | full-size | <https://us.store.bambulab.com/products/h2s> |
| Creality | Creality Ender-3 V3 | 220 | 220 | 250 | full-size | <https://www.creality.com/compare/compare-ender-3-v3-series> |
| Creality | Creality Ender-3 V3 SE | 220 | 220 | 250 | full-size | <https://www.creality.com/compare/compare-ender-3-v3-series> |
| Creality | Creality Ender-3 V3 KE | 220 | 220 | 240 | full-size | <https://www.creality.com/compare/compare-ender-3-v3-series> |
| Creality | Creality K1C | 220 | 220 | 250 | full-size | <https://store.creality.com/products/k1c-3d-printer> |
| Creality | Creality K1 Max | 300 | 300 | 300 | full-size | <https://www.creality.com/products/creality-k1-max-3d-printer> |
| Creality | Creality K2 Plus | 350 | 350 | 350 | full-size | <https://www.creality.com/products/creality-k2-plus-cfs-combo> |
| Anycubic | Anycubic Kobra 3 (Combo) | 250 | 250 | 260 | full-size | <https://store.anycubic.com/products/kobra-3-combo> |
| Anycubic | Anycubic Kobra 3 V2 Combo | 255 | 255 | 260 | full-size | <https://store.anycubic.com/products/kobra-3-v2-combo> |
| Anycubic | Anycubic Kobra S1 | 250 | 250 | 250 | full-size | <https://store.anycubic.com/products/kobra-s1> |
| Elegoo | Elegoo Neptune 4 | 225 | 225 | 265 | full-size | <https://www.elegoo.com/products/elegoo-neptune-4-fdm-3d-printer> |
| Elegoo | Elegoo Neptune 4 Pro | 225 | 225 | 265 | full-size | <https://www.elegoo.com/products/elegoo-neptune-4-pro-fdm-3d-printer> |
| Elegoo | Elegoo Centauri Carbon | 256 | 256 | 256 | full-size | <https://www.elegoo.com/products/centauri-carbon> |
| Sovol | Sovol SV06 | 220 | 220 | 250 | full-size | <https://www.sovol3d.com/blogs/featured-blog-posts/sovol-sv06-review> |
| Sovol | Sovol SV06 ACE | 220 | 220 | 250 | full-size | <https://www.sovol3d.com/products/sovol-sv06-ace> |
| Flashforge | Flashforge Adventurer 5M | 220 | 220 | 220 | full-size | <https://www.flashforge.com/products/adventurer-5m-3d-printer> |

## Notes on the sources

- **Bambu Lab**: bambulab.com refused automated reads (HTTP 403), so every Bambu Lab number is
  from Bambu Lab's own store. A new X1 Carbon is no longer listed there; the number is from its
  refurbished-unit page.
- **Bambu Lab P1S and X1C**: the maker notes that the popped-out filament-cutter stopper takes
  part of the print area, and that the slicer's default height is 250 mm. The 10 mm margin of
  the default is for cases like this.
- **Bambu Lab H2D**: 325 × 320 × 325 mm with a single nozzle; 300 × 320 × 325 mm printing with
  both nozzles.
- **Creality K1C**: read from the data embedded in the maker's store page, which shows no
  visible specification table. Creality's own KE FAQ gives the KE's volume under the SE's name;
  the comparison page above is unambiguous.
- **Sovol SV06**: its product page now redirects to the maker's home page, so the number is
  from the maker's own blog. The SV06 ACE is its current successor.
- **Renamed models**: Prusa's CORE One page now shows the CORE One+ (Gen 2), and its XL page
  the XL+; the numbers above are for the models those pages now show.
- **Prusa MK3S+**: no longer sold; the 10th Anniversary Edition page gives its build volume in centimetres.
