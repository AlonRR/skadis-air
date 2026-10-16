# Extending the generator

For contributors: where a new board type or a new setting goes, and which check fails if a step is
missed. The library (`packages/core`) holds every shape and every rule; the page (`web/`) builds its
controls from the library's list of board types, so most additions need no page code at all.

Run the checks in [`CLAUDE.md`](../CLAUDE.md) before and after: type check, lint, formatting, the unit
tests, the browser test, and `npm run check:stl` for anything that changes a shape.

## A new board type

A board type is one file and one line in a list (D11, the extension-registry practice).

1. **The file**, `packages/core/src/board-types/<id>.ts`, calls `defineBoardType` with:
   - `id`: lower-case words joined by hyphens; it starts every file name, `skadis-<id>-…`;
   - `name`: as the page lists it;
   - `settings`: from `defineSettings([...])`, each a `number`, a `sides` or a `choice` setting. A
     number has its unit, starting value, range and step; `onStep` when the value must be on the steps
     (a board's size), `count` to show it as a count beside the box (`= 6 tiles`), `warnOutside` for
     a range it allows but warns about, `advanced` to fold it under "Advanced" (D48), and `help`. A
     choice has its `options`, each a value and a label, and its starting value, one of them (C82);
   - `build(engine, values)`: the solid, from values typed by the settings above. A combination it
     cannot make throws a `RangeError`, which the page shows as a problem instead of a board;
   - `label(values)`: the rest of the file name.
2. **The line**: add it to `BOARD_TYPES` in `packages/core/src/board-types/index.ts`, in the order
   the page should list it. The page opens on the first.

**A connector is a board type with `group: 'connector'`** (D91, C95), added the same way, after the
boards in the list: the page lists it under "Connectors". The standoff (`standoff.ts`) was the first, the slot clip (`slot-clip.ts`) the second.
A part a screw goes through takes the shared `SCREW_SIZE_SETTING` from `mounting.ts` rather than its
own, so the hole and the screw cannot drift apart from the board's. A type is turned over to print,
face down (D66), unless it says `prints: 'as-built'` (C101), as the standoff does; the contract test
checks that every type's printed part sits on the bed. A type whose file holds more than one
separate part, as the seam-test pair's two tiles do, says `parts: 2` (C107); the contract test
holds every type to its count, and the STL check reads it from a file beside the sample. Whatever stands behind a board is tested
against `test/slot-zone.ts`: the room round each slot, and the room a hook takes below it; a part with pegs in the boards' own slots, as the slot clip has, names those slots in the zones' `except`, so only they are left out.

Nothing else. The page lists the type, builds its form, checks its values, rebuilds it on every
change and names its file, and `npm run check:stl` checks it at its starting values. **Proved
12 Oct 2026** by a trial type added and removed again: the type check, the contract test (which
picked the type up by itself) and the browser test passed with only those two changes. The one other
edit the trial needed was a test that had named the listed types, now reading them from the list.
The fit coupon (`fit-coupon.ts`) was then the first real type added this way.

A type built on the solid board passes `makeSolidBoard` a third argument instead of copying it: a
clearance per slot (`clearanceOf`), more to cut away (`extraCutters`), as the fit coupon does, and
more to add before anything is cut (`extraSolids`), and a solid the plate is kept inside (`within`), as the
skeleton board keeps only its members (`skeleton.ts`). Two parts' cuts go together with `bothCuts`, as the
lightened board joins its pockets to the mounting's holes (`lightened.ts`).

**A board that takes all of the solid board's settings** lists `BOARD_SETTINGS` from
`board-types/solid.ts`, then its own, then `MOUNTING_SETTINGS`, and builds from `boardParamsOf(values)`
and names its file from `boardLabel(values)`, as the lightened board (`board-types/lightened.ts`) does;
so a setting added to the solid board reaches it too, and its test checks it has every one of them.

**Mounting** (screw holes and standoffs, D73 to D75) is three edits in such a type, as the solid board
has it (C87): `...MOUNTING_SETTINGS` at the end of its `defineSettings([...])`, and
`mountingCuts(mountingOf(values), params)` as the third argument to `makeSolidBoard`, with
`mountingLabel(values)` at the end of its `label`. The contract test then holds the new settings to
the same rules, and `packages/core/test/mounting.test.ts` covers the shapes.

What fails if a step is missed:

| Missed or wrong | Fails |
| --- | --- |
| A starting value outside its range, a key used twice, a build that makes nothing | `packages/core/test/board-types.test.ts`: the contract every listed type is held to |
| The id not in lower-case words, two types with one id | the same contract |
| A connector listed among the boards, or a group other than board or connector | the same contract, and the list's order test beside it |
| A choice whose starting value is not one of its options, or an option listed twice | the same contract |
| The line in `BOARD_TYPES` | the type is simply not on the page; `web/e2e/form.spec.ts` lists what is |
| A build or label written against settings it does not declare | the type check |

`board-types.test.ts` also holds a type declared in the test file alone and puts it through the
same calls, which shows the generic code names no board.

## A new setting on an existing board type

1. Add it to the type's `defineSettings([...])` list. The page shows a control for it, the reader
   checks it, and `build` receives it, typed.
2. Use it in the type's `build`, and in `label` if two values must give different file names.
3. A test in `packages/core/test` for what it changes in the shape, measured on the solid; a
   browser test in `web/e2e` if the page does more than show it.

## A new kind of setting

A setting that is none of a number, the four sides or a choice needs three places: its interface
beside `NumberSetting` in `packages/core/src/settings.ts` (and its value's type in `ValueOf` there),
its reading in `readValues` there, and its control in `fieldFor` in `web/src/form.ts`.
`packages/core/test/settings.test.ts` declares its own settings and is where its reading is tested.
**The choice kind was added this way on 14 Oct 2026** (C82): those three places, a rule for it in the
contract test (its starting value is one of its options), and a browser test of its control.
