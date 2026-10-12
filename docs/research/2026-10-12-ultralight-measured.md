# The ultralight board, measured

Azat's [Ultra light SKÅDIS (Skadis) Board](https://www.printables.com/model/1049033) (CC BY-NC-SA)
is the design the skeleton type follows (Q12). Its 120 × 120 mm STL
(`SKADIS ULTRA LIGHT 120x120.stl`, 1 401 484 bytes, A30) and its 40 × 40 mm STL
(`SKADIS ULTRA LIGHT 40x40.stl`, 245 084 bytes, at the owner's request with D15) were downloaded on
12 Oct 2026 to measure them: **measured only, nothing copied**. The file is not in this
repository. Every figure below was read from the mesh with scad-tools' `stl-inspect.py`
(`bounds`, and `sections --axis z` at 19 heights), unless it says otherwise.

## What it is

| Value | Measured |
|---|---|
| Size | 120.0 × 120.0 × 10.0 mm; the board from z = −2.5 to 2.5 (5 mm thick), four corner standoffs above it to z = 7.5 |
| Corner standoffs | four, about 10 mm across with a hole of about 4 mm, 5 mm tall (from their cross-section: 313.6 mm² for the four, 50.2 mm² of it hole); the 40 × 40 tile has two, at (9, 20) and (31, 20) |
| Edges | **cut through slot centres**: half a slot every 40 mm down each side and along the top and bottom, and a quarter slot at each corner (cuts 1 mm inside the left and bottom edges find the openings centred at 0, 40, 80 and 120 mm). The 40 × 40 tile is one whole slot in its centre and a quarter slot at each corner. Tiles of the same pattern side by side make whole slots, with no slot missing |
| Edge beams | hollow: a closed channel inside each, about 1.7 mm high (z −0.66 to 1.06) |
| Volume | 16 551 mm³ (standoffs included) |
| Mesh | 28 028 facets; the STL's header says OpenSCAD wrote it |

## How the material is spread through the thickness

The share of the 120 × 120 mm square that is plastic, at each height through the board:

| z (mm) | −2.45 | −2.00 | −1.75 | −1.50 | −1.25 | −1.00 | −0.50 to 1.00 | 1.50 | 2.00 | 2.25 | 2.45 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Plastic | 30 % | 33 % | 35 % | 29 % | 25 % | 20 % | 11–12 % | 22 % | 30 % | 31 % | 29 % |

So the board **is an I-section**, as its page says: about 30–35 % of the area in a layer about
1.25 mm deep at each face, joined by webs that fill 11–12 % of the area in the middle. Material sits
where bending stress is highest, at the faces.

## The slots

| z (mm) | −2.45 | −2.00 | −1.75 | −1.50 to 1.50 | 2.00 | 2.25 | 2.45 |
|---|---|---|---|---|---|---|---|
| Slot, width × height (mm) | 6.9 × 16.9 | 6.0 × 16.0 | 5.5 × 15.5 | **5.0 × 15.0** | 5.3 × 15.2 | 5.7 × 15.7 | 6.4 × 16.4 |

**Exactly the nominal 5 × 15 mm through the core, with no clearance added**, and chamfered at both
faces: about 1 mm at one face and about 0.75 mm at the other.

## What follows from it (inferred)

- **Plastic**: a solid 5 mm board of the same size and slots is about 65 700 mm³ (worked out from
  the slot grid: 13 whole slots, 8 half and 4 quarter, 18 slots' worth), so this board uses **about a
  quarter of the plastic** of a solid one. At full density, PLA at 1.24 g/cm³, that is about 20.5 g
  against about 81 g; real prints of both weigh less, by their walls and infill.
- **Tight slots and connectors**: an FDM hole prints smaller than drawn, so a slot drawn at exactly
  5 × 15 mm comes out under the IKEA size (real boards measure about 5.2 × 15.2 mm,
  [`skadis-standard.md`](../skadis-standard.md)). That fits the users' reports of tight connectors
  and of accessories that go in and do not come out. The generator's slots need a clearance
  setting, settled by the fit coupon.
- **Sag at 10 % infill**: the flanges are about 1.25 mm deep and the webs thin, so most of the board
  prints as walls; how stiff it is depends on the wall count as much as on the shape. Beam depth,
  web width and wall count are the settings to expose.
- **Room behind the board**: the corner standoffs are 5 mm tall, so the board stands 5 mm off the
  wall against IKEA's 20 mm. That fits the report of an accessory that could only be fitted after
  loosening the board from the wall. The standoff height must be a setting, defaulting to 20 mm.
