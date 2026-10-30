// The page's entry point: the board-type list and the form, both built from the board types, and the
// board rebuilt whenever a setting changes. Every build runs in a web worker (build-worker.ts; D166), so the
// page answers while a large board is made; the worker also starts the engine and makes its check part, so the
// browser test still sees the WebAssembly file found, fetched and started from the built page (C32).
import {
  BOARD_TYPES,
  boardFileName,
  boardType,
  DEFAULT_BED,
  fitsBed,
  groupOf,
  readValues,
  type AnyBoardType,
} from 'skadis-air';
import { allPanelsText, panelText, type PanelLine, type Reply, type Request } from './build-messages.js';
import { carriedAcrossGroups, loadChoices, saveChoices, startingValues } from './choices.js';
import { choiceGroup, chosenIn, labelledChoice, renderForm, type Form } from './form.js';
import { saveFile } from './download.js';
import { gramsLine } from './grams.js';
import { mountPreview } from './preview.js';
import { mountPrinter } from './printer.js';
import { mountTheme } from './theme.js';

mountTheme(document.querySelector<HTMLButtonElement>('[data-testid="theme-toggle"]'));

// The choices made, kept in this browser (D250 g), and the values of the form shown now, which the next type
// starts from where it has the same settings.
const choices = loadChoices();
let shownValues: Record<string, unknown> = {};
let shownGroup = '';
// What to make (D590): a board, a wall of a board's panels, or a connector; a wall's boards are the boards' list
let making = 'board';
// Whether a wall's files are listed one by one, or folded away under "Download all" (D250 d).
let filesShown = false;
/** The types of a group, boards or connectors, in the list's order. */
const typesOf = (group: string) => BOARD_TYPES.filter((t) => groupOf(t) === group);
/** A group's test prints, offered under Advanced in each of its forms rather than in its list (D357). */
const testPrintsOf = (group: string) => typesOf(group).filter((t) => t.testPrint === true);

const engineStatus = document.querySelector<HTMLElement>('[data-testid="engine-status"]');
const boardStatus = document.querySelector<HTMLElement>('[data-testid="board-status"]');
const makeField = document.querySelector<HTMLElement>('[data-testid="what-to-make"]');
const typeList = document.querySelector<HTMLElement>('[data-testid="board-type"]');
const formBox = document.querySelector<HTMLElement>('[data-testid="board-form"]');
const previewBox = document.querySelector<HTMLElement>('[data-testid="preview"]');
const resetButton = document.querySelector<HTMLButtonElement>('[data-testid="preview-reset"]');
const preview = previewBox ? mountPreview(previewBox, resetButton) : null;
const sizeLine = document.querySelector<HTMLElement>('[data-testid="board-size"]'); // in the status bar
const downloadButton = document.querySelector<HTMLButtonElement>('[data-testid="download-stl"]');
const printerBox = document.querySelector<HTMLElement>('[data-testid="printer"]');
const machineBox = document.querySelector<HTMLElement>('[data-testid="printer-machine"]'); // its printers (D257)
const gramsNote = document.querySelector<HTMLElement>('[data-testid="board-grams"]'); // the sample's grams (D313)
const bedWarning = document.querySelector<HTMLElement>('[data-testid="bed-warning"]');
const printList = document.querySelector<HTMLElement>('[data-testid="print-list"]'); // a wall's panels (D178)
const formatChoice = document.querySelector<HTMLElement>('[data-testid="file-format"]'); // STL or 3MF (D181)
// the format, the words the button drops from view on a phone (the design system's v0.6.0; D259)
const downloadFormat = document.querySelector<HTMLElement>('[data-testid="download-format"]');
const format = (): 'stl' | '3mf' => (formatChoice && chosenIn(formatChoice) === '3mf' ? '3mf' : 'stl');
const withFormat = (name: string) => name.replace(/\.(stl|3mf)$/, `.${format()}`);
/** The one part shown ready, which the status line names as it will download: in the format chosen (Q10). */
let readyPart: { what: 'Board' | 'Connector'; fileName: string } | undefined;
const readyText = (part: NonNullable<typeof readyPart>) => `${part.what} ready: ${withFormat(part.fileName)}`;
formatChoice?.addEventListener('change', () => {
  if (downloadFormat !== null) downloadFormat.textContent = `\u00a0${format().toUpperCase()}`;
  if (readyPart !== undefined && boardStatus !== null) boardStatus.textContent = readyText(readyPart);
});

/** Asks the worker for a file of the build it showed, and saves it under its name (D181 to D183). */
function download(id: number, name: string, panel?: number | 'all'): void {
  answers.set('file', (file) => {
    if (file.kind === 'file' && file.ok && file.id === id) saveFile(name, file.bytes, file.type);
  });
  ask({ kind: 'file', id, format: format(), name, ...(panel === undefined ? {} : { panel }) });
}
let current: (() => void) | undefined; // rebuilds the board on show, for a change of printer
const printer = printerBox && machineBox ? mountPrinter(printerBox, machineBox, () => current?.()) : null;

const worker = new Worker(new URL('./build-worker.ts', import.meta.url), { type: 'module' });
// oxlint-disable-next-line unicorn/require-post-message-target-origin -- a Worker's postMessage has no target origin
const ask = (request: Request) => worker.postMessage(request);
let latest = 0; // the newest build asked for; an answer to an older one is dropped
let shown = 0; // the build the preview shows and the download writes, 0 for none
const answers = new Map<Reply['kind'], (reply: Reply) => void>();
worker.addEventListener('message', (event: MessageEvent<Reply>) => answers.get(event.data.kind)?.(event.data));

function setStatus(state: 'building' | 'ready' | 'invalid' | 'problem', text: string, fileName = '', size = ''): void {
  readyPart = undefined; // named again by the caller when it is one part, ready
  if (downloadButton !== null) downloadButton.disabled = state !== 'ready'; // only a board that exists
  if (sizeLine !== null) sizeLine.textContent = size === '' ? '' : `${size} mm`;
  if (boardStatus === null) return;
  boardStatus.dataset['state'] = state;
  boardStatus.dataset['fileName'] = fileName;
  boardStatus.textContent = text;
}

/** What each screw passes (D264), or nothing for values the part cannot be made from, which the build then says. */
function screwsOf(type: AnyBoardType, values: Parameters<AnyBoardType['build']>[1]): string | undefined {
  try {
    return type.screws?.(values);
  } catch {
    return undefined;
  }
}

/** What the part's tape holds (D609 a), or nothing for values the part cannot be made from. */
function tapeOf(type: AnyBoardType, values: Parameters<AnyBoardType['build']>[1]): string | undefined {
  try {
    return type.tape?.(values);
  } catch {
    return undefined;
  }
}

/** The sample board's printed grams under the form (D313), for a board the file has a figure for; nothing otherwise. */
function showGrams(type: AnyBoardType, values: { look?: unknown }): void {
  if (gramsNote === null) return;
  const line = gramsLine(type.id, values);
  gramsNote.textContent = line;
  gramsNote.hidden = line === '';
}

function rebuild(type: AnyBoardType, form: Form): void {
  const read = readValues(type.settings, form.read());
  form.show(read.ok ? [] : read.errors, read.warnings);
  if (read.ok) form.screws(screwsOf(type, read.values));
  form.tape(read.ok ? tapeOf(type, read.values) : undefined);
  showGrams(type, read.ok ? read.values : {});
  const what = groupOf(type) === 'connector' ? 'connector' : 'board';
  // the bed is a field of the form like any other: one it cannot use refuses the build, its message on its field (Q4),
  // where the part had been made, and a wall cut, for the default bed
  const bed = printer?.bed() ?? { ok: true, bed: { ...DEFAULT_BED } };
  if (!read.ok || !bed.ok) {
    // any build still running is for values the form no longer holds: its answer is dropped as a replaced one is
    latest += 1;
    shown = 0;
    // and a wall's print list goes with it, as the single download is turned off: nothing to download (Q2)
    showPanels(latest, [], '');
    bedWarning?.replaceChildren(); // nor a warning about a part not made
    setStatus('invalid', `Correct the settings marked above to make the ${what}.`);
    preview?.show(null, '');
    return;
  }
  const id = ++latest;
  shown = 0;
  showPanels(id, [], '');
  setStatus('building', `Making the ${what}…`);
  preview?.busy(); // the part on show is the old one until the answer is drawn (C316)
  const fileName = boardFileName(type, read.values, 'stl');
  answers.set('built', (built) => {
    if (built.kind !== 'built' || built.id !== latest) return; // a newer build replaced it
    if (!built.ok) {
      // the fields it belongs to marked, as the form marks a value it refuses, the message kept on the status line (Q13)
      form.show(
        built.keys.map((key) => ({ key, message: built.problem })),
        read.warnings,
      );
      setStatus('problem', `This ${what} cannot be made: ${built.problem}`);
      preview?.show(null, '');
      return;
    }
    shown = id;
    const { min, max } = built;
    // with the decimals each has, up to two: a thickness of 5.25 mm had shown as 5.3 (Q12)
    const size = [0, 1, 2].map((k) => Math.round(((max[k] ?? 0) - (min[k] ?? 0)) * 100) / 100).join(' × ');
    if (built.wall) {
      const count = built.wall.panels.reduce((n, line) => n + line.count, 0);
      warnAboutBed(0, 0); // every panel fits the bed it was cut for
      const panels = `${count} ${count === 1 ? 'panel' : 'panels'}`;
      setStatus('ready', `Wall ready: ${panels}, ${built.wall.panels.length} to download below.`, fileName, size);
      const [wide, high] = [Math.round(max[0] - min[0]), Math.round(max[1] - min[1])];
      const wallName = `skadis-${type.id}-${wide}x${high}-wall`; // D183
      showPanels(id, built.wall.panels, wallName);
    } else {
      warnAboutBed(max[0], max[1]);
      const part = { what: what === 'board' ? 'Board' : 'Connector', fileName } as const;
      setStatus('ready', readyText(part), fileName, size);
      readyPart = part;
      showPanels(id, [], '');
    }
    preview?.show(built.parts, `${type.id} ${size}`, built.wall); // framed again only when type or size changes
    preview?.name(`The ${built.wall ? 'wall' : what} in 3D`);
  });
  ask({ kind: 'build', id, typeId: type.id, values: read.values, bed: bed.bed });
}

/** A line of the print list: its words and its button. */
const printRow = (text: string, label: string, act: () => void, testid: string): HTMLElement => {
  const line = document.createElement('div');
  line.className = 'ws-plan';
  line.dataset['testid'] = testid;
  const words = document.createElement('span');
  words.className = 'ws-plan__line';
  words.textContent = text;
  const actions = document.createElement('span');
  actions.className = 'ws-plan__actions';
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'ws-btn';
  button.textContent = label;
  button.addEventListener('click', act);
  actions.append(button);
  line.append(words, actions);
  return line;
};

/** A wall's print list: a line for each kind of panel, its count, its size, its closed sides and its download
 * (D178); the single download goes while it shows. Empty, for one board. */
function showPanels(id: number, lines: readonly PanelLine[], wallName: string): void {
  if (downloadButton !== null) downloadButton.hidden = lines.length > 0;
  if (printList === null) return;
  printList.hidden = lines.length === 0;
  // Every kind in one file: a zip of STLs with the print list, or one 3MF (D181 to D183).
  const all = printRow(
    allPanelsText(lines),
    'Download all',
    () => download(id, `${wallName}.${format() === '3mf' ? '3mf' : 'zip'}`, 'all'),
    'print-all',
  );
  // Each kind's own file, folded away unless asked for, so a wall's many lines leave the stage its room (D250 d).
  const files = document.createElement('div');
  files.id = 'print-files';
  files.dataset['testid'] = 'print-files';
  files.append(
    ...lines.map((line, panel) =>
      printRow(panelText(line), 'Download', () => download(id, withFormat(line.fileName), panel), 'print-row'),
    ),
  );
  const fold = document.createElement('button');
  fold.type = 'button';
  fold.className = 'ws-btn';
  fold.setAttribute('aria-controls', files.id);
  const showFiles = () => {
    files.hidden = !filesShown;
    fold.setAttribute('aria-expanded', String(filesShown));
    fold.textContent = filesShown ? 'Hide files' : 'Show files';
  };
  fold.addEventListener('click', () => {
    filesShown = !filesShown;
    showFiles();
  });
  showFiles();
  all.querySelector('.ws-plan__actions')?.append(fold);
  printList.replaceChildren(...(lines.length > 0 ? [all, files] : []));
}

/** A board larger than the bed is warned about, not refused (D62). */
function warnAboutBed(widthMm: number, heightMm: number): void {
  if (bedWarning === null || printer === null) return;
  const chosen = printer.bed();
  const fits = !chosen.ok || fitsBed(widthMm, heightMm, chosen.bed);
  if (fits || !chosen.ok) {
    bedWarning.replaceChildren();
    return;
  }
  const headline = document.createElement('strong'); // the design system's Notice (C120)
  headline.textContent = 'Larger than the bed';
  bedWarning.replaceChildren(
    headline,
    `This board is ${Math.round(widthMm)} × ${Math.round(heightMm)} mm; it does not fit the ` +
      `${chosen.bed.xMm} × ${chosen.bed.yMm} mm bed. It can still be downloaded, or "Wall" in What to make ` +
      'cuts it into panels that fit.',
  );
}

/** The test prints of a type's group, as a choice of type at the top of its form's Advanced fold (D357): the same
 * choice as the list's, so one ticked here leaves nothing ticked there, the type shown ticked when it is one. */
function testPrintField(type: AnyBoardType, tests: readonly AnyBoardType[]): HTMLElement {
  const options = tests.map((t) => ({ value: t.id, label: t.name }));
  const group = choiceGroup('boardType', 'Test prints', options, type.testPrint === true ? type.id : '');
  for (const input of group.querySelectorAll<HTMLInputElement>('input')) input.dataset['group'] = groupOf(type);
  return labelledChoice('Test prints', group);
}

/** The build a burst of typing waits to make: one for the page, not one a form, so a form replaced takes its build
 * with it (Q1). The old form's, left waiting, had fired after the new type was shown and built the old type last. */
let typing: ReturnType<typeof setTimeout> | undefined;

function show(type: AnyBoardType): void {
  if (formBox === null) return;
  clearTimeout(typing); // the form shown before, and any build its typing still waited to make, are replaced
  // every edit is kept at once, and builds after a burst of typing
  const keep = () => {
    shownValues = form.read();
    choices.values[type.id] = shownValues;
    saveChoices(choices);
  };
  const changed = () => {
    keep();
    clearTimeout(typing);
    typing = setTimeout(() => rebuild(type, form), 150);
  };
  // a type starts from the one shown before within its group, boards from boards and connectors from connectors,
  // and from the other group's screw size alone (Q511)
  const before = groupOf(type) === shownGroup ? shownValues : carriedAcrossGroups(shownValues);
  shownGroup = groupOf(type);
  // a test print's own form opens its Advanced fold, to show it chosen there (D357)
  const tests = testPrintsOf(groupOf(type));
  const extras =
    tests.length === 0 ? {} : { advancedFirst: testPrintField(type, tests), advancedOpen: type.testPrint === true };
  // one board or a wall's panels, as What to make says (D590), not a field of the form
  const fixed = { panels: making === 'wall' ? 'split' : 'one' };
  const form = renderForm(formBox, type, changed, startingValues(type, choices.values[type.id], before), {
    ...extras,
    fixed,
  });
  keep();
  current = changed;
  rebuild(type, form);
}

// The worker writes the file of the part it built last, as it prints (D66, C101), in the format chosen; the page
// saves it.
downloadButton?.addEventListener('click', () => {
  const fileName = boardStatus?.dataset['fileName'] ?? '';
  if (shown !== 0 && fileName !== '') download(shown, withFormat(fileName));
});

/** The engine's check, made in the worker: its volume, or why the engine could not start. */
const checked = new Promise<Extract<Reply, { kind: 'check' }>>((done) => {
  answers.set('check', (reply) => {
    if (reply.kind === 'check') done(reply);
  });
  ask({ kind: 'check' });
});

async function start(): Promise<void> {
  if (engineStatus === null) return;
  const check = await checked;
  if (check.ok) {
    engineStatus.dataset['volumeMm3'] = String(Math.round(check.volumeMm3));
    engineStatus.dataset['state'] = 'ready';
    engineStatus.textContent = 'Geometry engine ready.';
  } else {
    engineStatus.dataset['state'] = 'error';
    engineStatus.textContent = `The geometry engine could not start: ${check.error}`;
    setStatus('problem', 'No board can be made without the geometry engine.');
    preview?.show(null, '');
    return;
  }
  if (makeField === null || typeList === null) return;
  // Boards or connectors, a field of its own at the top (D256), and under it the types of the group chosen, their
  // field titled for it (D250 h; D91, D112). Every type is one choice, the same name in both groups; each group's
  // list keeps the type last chosen in it. A test print is not in its group's list but at the top of the Advanced
  // fold of each of the group's forms, still the same choice, since the list and the form are in one form (D357).
  // What to make, each in the singular (D590, 30 Oct 2026): a wall is made of the boards' types, so it shows their list
  const groups = [
    { group: 'board', label: 'Board', list: 'board', title: 'Board' },
    { group: 'wall', label: 'Wall', list: 'board', title: 'Board' },
    { group: 'connector', label: 'Connector', list: 'connector', title: 'Connector' },
  ] as const;
  const lists = [
    { group: 'board', heading: 'Boards' },
    { group: 'connector', heading: 'Connectors' },
  ] as const;
  const listOf = (group: string) => groups.find((g) => g.group === group)?.list ?? 'board';
  // a wall chosen before What to make had one, as "Split into panels" on the board last shown
  if (choices.group === 'board' && choices.values[choices.types['board'] ?? '']?.['panels'] === 'split')
    choices.group = 'wall';
  const typeTitle = typeList.querySelector('legend');
  const startGroup = groups.some((g) => g.group === choices.group) ? (choices.group ?? 'board') : 'board';
  const chosenOf = (group: string) => {
    const kept = choices.types[listOf(group)];
    return typesOf(listOf(group)).find((t) => t.id === kept) ?? typesOf(listOf(group))[0];
  };
  const toggle = choiceGroup(
    'typeGroup',
    'What to make',
    groups.map((g) => ({ value: g.group, label: g.label })),
    startGroup,
  );
  makeField.append(toggle);
  const shownLists = new Map<string, HTMLElement>();
  for (const { group, heading } of lists) {
    const options = typesOf(group)
      .filter((t) => t.testPrint !== true)
      .map((t) => ({ value: t.id, label: t.name }));
    const open = group === listOf(startGroup);
    const list = choiceGroup('boardType', heading, options, open ? (chosenOf(startGroup)?.id ?? '') : '');
    for (const input of list.querySelectorAll<HTMLInputElement>('input')) input.dataset['group'] = group;
    list.hidden = !open; // hidden as it is, since the design system's v0.6.0 (D259; C179)
    shownLists.set(group, list);
    typeList.append(list);
  }
  // the group shown: its list, and the type last chosen in it, shown
  const showGroup = (group: string) => {
    making = group;
    for (const [g, list] of shownLists) list.hidden = g !== listOf(group);
    if (typeTitle !== null) typeTitle.textContent = groups.find((g) => g.group === group)?.title ?? 'Board';
    for (const input of toggle.querySelectorAll<HTMLInputElement>('input')) input.checked = input.value === group;
    choices.group = group;
  };
  makeField.addEventListener('change', (event) => {
    const input = event.target instanceof HTMLInputElement ? event.target : null;
    if (input?.name !== 'typeGroup') return;
    const type = chosenOf(input.value);
    showGroup(input.value);
    const option = shownLists
      .get(listOf(input.value))
      ?.querySelector<HTMLInputElement>(`input[value="${type?.id ?? ''}"]`);
    if (option) option.checked = true;
    if (type === undefined) return;
    show(type);
    // A wall is closed round its outer edge (D37): made a wall, the sides still open close, and can be opened again.
    if (input.value === 'wall')
      for (const side of formBox?.querySelectorAll<HTMLButtonElement>('[data-side][aria-pressed="false"]') ?? [])
        side.click();
  });
  // a type chosen in its group's list, or among the test prints in its form's Advanced fold (D357)
  const chooseType = (event: Event) => {
    const input = event.target instanceof HTMLInputElement ? event.target : null;
    if (input?.name !== 'boardType') return;
    const group = input.dataset['group'] ?? 'board';
    const focused = document.activeElement === input;
    // a type chosen in another list, as a script may, shows its group; a wall stays a wall among the boards
    showGroup(listOf(making) === group ? making : group);
    choices.types[group] = input.value;
    show(boardType(input.value));
    // a test print's choice is made again with its form: the focus goes on to the new one, where the keys move it
    if (focused && !input.isConnected)
      formBox?.querySelector<HTMLInputElement>('input[name="boardType"]:checked')?.focus();
  };
  typeList.addEventListener('change', chooseType);
  formBox?.addEventListener('change', chooseType);
  showGroup(startGroup);
  const first = chosenOf(startGroup);
  if (first !== undefined) show(first);
}

void start();
