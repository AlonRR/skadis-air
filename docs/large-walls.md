# Drawing a large wall

For contributors: how the 3D preview keeps a wall of any size quick to draw (backlog items `wall-grid` and
`wall-detail`; D196, D197, C200, C203, C204). A wall can be up to 1 km each way (D223), so the preview cannot draw
every panel in full: a 1.6 m wall of 56 panels already draws 2.6 to 4.9 million triangles, and a 4 x 2.5 m one
would draw 10 to 20 million (measured on 16 Oct 2026 for the solid, lightened and skeleton boards on a 250 x 210 mm
bed).

## How games do it, and what this takes from them

Large scenes in games are drawn with a few standard techniques:

- **Level of detail, chosen by size on screen.** A distant object is drawn with less detail than a near one, and
  the choice is made from how large it appears, not only how far away it is.
- **Stand-ins for distant geometry.** Far away, geometry is replaced by a picture of it.
- **Groups merged far away** (hierarchical level of detail): many distant objects become one simplified stand-in.
- **Culling.** What is outside the view is not drawn at all.

Sources: the [UNC Walkthrough project on hierarchical levels of detail](https://www.cs.unc.edu/Research/ProjectSummaries/hlods),
[Simplygon's notes on Unreal Engine's HLOD](https://documentation.simplygon.com/SimplygonSDK_10.4.132.0/ue5/concepts/hlod.html), <!-- secret-gate: allow: a version number in the link, not an address -->
and [a survey of methods for complex scenes (GraphiCon 2021)](https://ceur-ws.org/Vol-3027/paper10.pdf).

A wall makes them cheap: the SKÅDIS pattern repeats every 40 mm, and a wall's seams are open, so the pattern runs on
across them (D15). One picture of one tile, repeated, stands in for any part of the wall.

## What the preview does

1. **The plan holds columns and rows** (`packages/core/src/tiling.ts`, C200). A kind of panel holds the places of its
   columns and of its rows; its copies are every pair. A wall 100 m wide plans in under 100 ms.
2. **The choice is made apart from the drawing** (`web/src/wall-detail.ts`, C203, tested in `web/test/`). From the
   camera's position, it draws a panel in full once its slots, 5.2 mm wide at the starting clearance, are 2.5 px wide
   on the screen, and keeps it until they are under 2 px. It draws only panels in the view, nearest first, up to
   5 million triangles. It looks only at the columns and rows within reach of the camera, so a wall a kilometre wide
   is chosen in milliseconds.
3. **The rest of the face is one mesh of rectangles** (`web/src/wall-scene.ts`, C204). The rows with nothing in full
   merge into bands, and in a row with some, the runs between them each take a rectangle. Each rectangle shows the
   tile's picture, with the wall's own slots cut out (C228), so the background shows through as through a real slot.
   The picture is made smaller step by step for the distance (mipmaps), so a far wall looks a fine grey rather than
   shimmering. The strips along closed outer edges, which have no slots, take the plain plate. The whole stand-in is
   one draw.
4. **It is chosen again whenever the camera moves**, and the camera's near and far planes follow its distance, so a
   wall a kilometre long and a slot seen close up both draw. The rectangles are built again only when the panels in
   full change (C227): a turn that keeps them draws the same mesh.

The stand-ins leave out what does not repeat: the screw holes and keyholes in each panel's corners, and the seams'
outlines. Zooming in draws those panels in full.

## Checks

- `web/test/wall-detail.test.ts`: the choice, worked out by hand. It covers full detail and stand-ins, the budget,
  the 2.5 px and 2 px thresholds, culling, and a kilometre-wide wall. The face is covered exactly once.
- `web/e2e/tiling.spec.ts`: a 20 m wall drawn in under 5 million triangles, every panel stood in when seen whole,
  some drawn in full when zoomed in, and no errors; a 1.6 m wall keeps most of the stage for the view (C205).

The preview's element carries `data-panels`, `data-detailed` and `data-triangles` for these tests.
