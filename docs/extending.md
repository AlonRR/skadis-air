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
     (a board's size), `count` to show it as a count beside the box, the step's name in both forms
     (`{ one: 'tile', other: 'tiles' }`, for `= 1 tile` and `= 6 tiles`), `warnOutside` for
     a range it allows but warns about, `startsAt(values)` for a starting value that hangs on the other values (the
     standoffs' 18 mm with tape, D603; the page's field follows it until set by hand), `advanced` to fold it under
     "Advanced" (D48), and `help`, which the
     page folds behind an "i" button beside the label (C317). A
     choice has its `options`, each a value and a label, and its starting value, one of them (C82). Any setting
     that applies only with another choice says so in `appliesWhen(values)`, given the values read, true where it
     applies (D372): while it does not, the page greys it out, its controls disabled, the reader neither checks nor
     warns about it and hands the build its starting value, and its `help` says when it applies, as the lock screw
     size's does in `mounting.ts`;
   - `build(engine, values)`: the solid, from values typed by the settings above. A combination it
     cannot make throws a `RangeError`, which the page shows as a problem instead of a board; a
     `SettingsProblem`, a `RangeError` with the keys of the settings it belongs to, also marks those fields;
   - `label(values)`: the rest of the file name;
   - `screws(values)`, for a part that takes screws: what each passes, as a sentence the page shows under the
     screw size (D264), or nothing when it has none;
   - `tape(values)`, for a part that can stand on tape: what its pieces hold, as a sentence the page shows under the
     tape's settings (D609, `tapeHolds` in `tape.ts`), or nothing when it is not on tape.
2. **The line**: add it to `BOARD_TYPES` in `packages/core/src/board-types/index.ts`, in the order
   the page should list it. The page opens on the first.

**A connector is a board type with `group: 'connector'`** (D91, C95), added the same way, after the
boards in the list: the page lists it under "Connectors". The standoff (`standoff.ts`) was the first, the slot clip (`slot-clip.ts`) the second.
A part a screw goes through takes the shared `SCREW_SIZE_SETTING` from `screw-places.ts` rather than its
own, so the hole and the screw cannot drift apart from the board's; it is on the main form, the screw for every hole
(D479). A kind of place a screw goes that may take a screw of another size is a screw place (below). A type is turned over to print,
face down (D66), unless it says `prints: 'as-built'` (C101), as the standoff does; the contract test
checks that every type's printed part sits on the bed. A type whose file holds more than one
separate part, as the seam-test pair's two tiles do, says `parts: 2` (C107); the contract test
holds every type to its count, and the STL check reads it from a file beside the sample. A type that tests the printer
before a board is made, as the fit coupon and the seam-test pair do, says `testPrint: true` (D357): the page then offers
it under "Test prints" at the top of the Advanced fold of every form of its group, not in the group's list. A test print
is a board, which the contract test checks, and a test beside it names the test prints there are, so a new one is added
there too. Whatever stands behind a board is tested
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
lightened board joins its pockets to the mounting's holes (`lightened.ts`). A lattice board hands the mounting
its board through `framedBoard(board, lattice)`, with the frame round each slot (`frameMm`), which a standoff
behind a slot stands flush with (D306), and its pockets at the back face (`pocketsOf`), which every standoff's
root keeps off (D375); a lattice whose back face is not the lightened board's pockets gives its own `pocketsOf`,
and `packages/core/test/root.test.ts` holds both lattice types to it.

**A board that takes all of the solid board's settings** lists them with `boardSettings(before, own)` from
`board-types/solid.ts`, which puts the solid board's and the mounting's in the form's order (Q588: the size right above
the screw size) and its own among the fine ones, the lattice boards their `LOOK_SETTING` as `before` (Q510), a look being a choice a builder reads (the lattice's `corners`), not a type of its own, and builds from `boardParamsOf(values)`
and names its file from `boardLabel(values)`, as the lightened board (`board-types/lightened.ts`) does;
so a setting added to the solid board reaches it too, and its test checks it has every one of them.

**Mounting** (screw holes and standoffs, D73 to D75) is three edits in such a type, as the solid board
has it (C87): its settings, which `boardSettings` gives, or `...MOUNTING_SETTINGS` at the end of its
`defineSettings([...])` for a board that does not take the solid board's, and
`mountingCuts(mountingOf(values), params)` as the third argument to `makeSolidBoard`, with
`mountingLabel(values)` at the end of its `label`. The contract test then holds the new settings to
the same rules, and `packages/core/test/mounting.test.ts` covers the shapes.

What fails if a step is missed:

| Missed or wrong | Fails |
| --- | --- |
| A starting value outside its range, a key used twice, a build that makes nothing | `packages/core/test/board-types.test.ts`: the contract every listed type is held to |
| The id not in lower-case words, two types with one id | the same contract |
| A connector listed among the boards, or a group other than board or connector | the same contract, and the list's order test beside it |
| A test print (`testPrint: true`) among the connectors, or one marked that the test beside the contract does not name | the same contract, and that test (D357) |
| A choice whose starting value is not one of its options, or an option listed twice | the same contract |
| An `appliesWhen` that does not answer true or false at the type's starting values | the same contract (D372) |
| A screw place not listed by any type, its settings apart or on the main form, or a type with one and no screw size | `packages/core/test/screw-places.test.ts` (D479) |
| A screw place whose part does not take the screw size unless "Own" is chosen | the same |
| The line in `BOARD_TYPES` | the type is simply not on the page; `web/e2e/form.spec.ts` lists what is |
| A build or label written against settings it does not declare | the type check |

`board-types.test.ts` also holds a type declared in the test file alone and puts it through the
same calls, which shows the generic code names no board.

## A new setting on an existing board type

1. Add it to the type's `defineSettings([...])` list. The page shows a control for it, the reader
   checks it, and `build` receives it, typed. If it applies only with another choice, give it an
   `appliesWhen(values)` and say in its `help` when it applies (D372): the form greys it out and the reader
   leaves it unchecked by itself, with no page code; `settingsNotApplying` in `settings.ts` names those that do not
   apply to a form's values, and `settings.test.ts` declares its own such settings.
2. Use it in the type's `build`, and in `label` if two values must give different file names.
3. A test in `packages/core/test` for what it changes in the shape, measured on the solid; a
   browser test in `web/e2e` if the page does more than show it.

## A new kind of screw place

One screw size, `SCREW_SIZE_SETTING`, serves every hole a part has; a kind of place a screw goes may also have a size
of its own, under Advanced, the screw size's unless set (D479): the keyholes, the lock screws and the slot clip's screw
so far. The corner holes, and the standoff connector's holes, which the corner screws go through, are the screw size
itself. A new kind of place is one entry and two edits, all in `packages/core/src/screw-places.ts` and its type:

1. **The entry**: a `ScrewPlace` in `SCREW_PLACES`, with its `key`, its `label` (its settings are labelled
   "`<label>` size" and "`<label>`'s own size"), `when` it applies, which its settings' help begins with (D372), the
   `help` for its own size, its own size's `min` and `max`, its `appliesWhen(values)`, true where a part has such a
   place, and `inPlay`, values that give a part one.
2. **Its settings**: `...screwPlaceSettings(PLACE)` in its type's `defineSettings([...])`, which lists
   `SCREW_SIZE_SETTING` too. They are two existing kinds of setting, so the page needs nothing new: a choice,
   `<key>Size`, of "Same as the screw size" or "Own", and a number, `<key>Mm`, which applies only with "Own" and is
   hidden until then (D620 a).
3. **Its size**: the type's `build`, `label` and `screws` read it with `screwAt(values, PLACE)`, the screw size unless
   "Own" is chosen.

`packages/core/test/screw-places.test.ts` holds every entry to the contract: listed by some type, its two settings
together under Advanced with the screw size, the choice and its labels, its own size starting at the screw size's
start, hidden as said, and the part built with the screw size the same as the part given that size as its own,
with a control at another size. A choice of the screw size or its own that is not a listed entry fails it.

## A new kind of setting

A setting that is none of a number, the four sides or a choice needs three places: its interface
beside `NumberSetting` in `packages/core/src/settings.ts` (and its value's type in `ValueOf` there),
its reading in `readEach` there, which `readValues` calls, and its control in `fieldFor` in `web/src/form.ts`, with
an `enable(on)` that turns its controls on and off for `appliesWhen` (D372).
`packages/core/test/settings.test.ts` declares its own settings and is where its reading is tested.
**The choice kind was added this way on 14 Oct 2026** (C82): those three places, a rule for it in the
contract test (its starting value is one of its options), and a browser test of its control.
