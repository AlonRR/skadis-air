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
import { panelText, type PanelLine, type Reply, type Request } from './build-messages.js';
import { loadChoices, saveChoices, startingValues } from './choices.js';
import { choiceGroup, chosenIn, renderForm, type Form } from './form.js';
import { saveFile } from './download.js';
import { mountPreview } from './preview.js';
import { mountPrinter } from './printer.js';
import { mountTheme } from './theme.js';

mountTheme(document.querySelector<HTMLButtonElement>('[data-testid="theme-toggle"]'));

// The choices made, kept in this browser (D250 g), and the values of the form shown now, which the next type
// starts from where it has the same settings.
const choices = loadChoices();
let shownValues: Record<string, unknown> = {};
let shownGroup = '';
// Whether a wall's files are listed one by one, or folded away under "Download all" (D250 d).
let filesShown = false;
/** The types of a group, boards or connectors, in the list's order. */
const typesOf = (group: string) => BOARD_TYPES.filter((t) => groupOf(t) === group);

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
const bedWarning = document.querySelector<HTMLElement>('[data-testid="bed-warning"]');
const printList = document.querySelector<HTMLElement>('[data-testid="print-list"]'); // a wall's panels (D178)
const formatChoice = document.querySelector<HTMLElement>('[data-testid="file-format"]'); // STL or 3MF (D181)
// the format, the words the button drops from view on a phone (the design system's v0.6.0; D259)
const downloadFormat = document.querySelector<HTMLElement>('[data-testid="download-format"]');
const format = (): 'stl' | '3mf' => (formatChoice && chosenIn(formatChoice) === '3mf' ? '3mf' : 'stl');
const withFormat = (name: string) => name.replace(/\.(stl|3mf)$/, `.${format()}`);
formatChoice?.addEventListener('change', () => {
  if (downloadFormat !== null) downloadFormat.textContent = `\u00a0${format().toUpperCase()}`;
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

function rebuild(type: AnyBoardType, form: Form): void {
  const read = readValues(type.settings, form.read());
  form.show(read.ok ? [] : read.errors, read.warnings);
  if (read.ok) form.screws(screwsOf(type, read.values));
  if (!read.ok) {
    setStatus('invalid', 'Correct the settings marked above to make the board.');
    preview?.show(null, '');
    return;
  }
  const what = groupOf(type) === 'connector' ? 'connector' : 'board';
  const id = ++latest;
  shown = 0;
  showPanels(id, [], '');
  setStatus('building', `Making the ${what}…`);
  const fileName = boardFileName(type, read.values, 'stl');
  answers.set('built', (built) => {
    if (built.kind !== 'built' || built.id !== latest) return; // a newer build replaced it
    if (!built.ok) {
      setStatus('problem', `This ${what} cannot be made: ${built.problem}`);
      preview?.show(null, '');
      return;
    }
    shown = id;
    const { min, max } = built;
    const size = [0, 1, 2].map((k) => Math.round(((max[k] ?? 0) - (min[k] ?? 0)) * 10) / 10).join(' × ');
    if (built.wall) {
      const count = built.wall.panels.reduce((n, line) => n + line.count, 0);
      warnAboutBed(0, 0); // every panel fits the bed it was cut for
      setStatus('ready', `Wall ready: ${count} panels, ${built.wall.panels.length} to download below.`, fileName, size);
      const [wide, high] = [Math.round(max[0] - min[0]), Math.round(max[1] - min[1])];
      const wallName = `skadis-${type.id}-${wide}x${high}-wall`; // D183
      showPanels(id, built.wall.panels, wallName);
    } else {
      warnAboutBed(max[0], max[1]);
      setStatus('ready', `${what === 'board' ? 'Board' : 'Connector'} ready: ${fileName}`, fileName, size);
      showPanels(id, [], '');
    }
    preview?.show(built.parts, `${type.id} ${size}`, built.wall); // framed again only when type or size changes
    preview?.name(`The ${built.wall ? 'wall' : what} in 3D`);
  });
  const bed = printer?.bed();
  ask({ kind: 'build', id, typeId: type.id, values: read.values, bed: bed?.ok ? bed.bed : { ...DEFAULT_BED } });
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
  const count = lines.reduce((n, line) => n + line.count, 0);
  // Every kind in one file: a zip of STLs with the print list, or one 3MF (D181 to D183).
  const all = printRow(
    `All ${count} panels in one file`,
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
      `${chosen.bed.xMm} × ${chosen.bed.yMm} mm bed. It can still be downloaded, or "Split into panels" ` +
      'cuts it into panels that fit.',
  );
}

function show(type: AnyBoardType): void {
  if (formBox === null) return;
  let timer: ReturnType<typeof setTimeout> | undefined;
  // every edit is kept at once, and builds after a burst of typing
  const keep = () => {
    shownValues = form.read();
    choices.values[type.id] = shownValues;
    saveChoices(choices);
  };
  const changed = () => {
    keep();
    clearTimeout(timer);
    timer = setTimeout(() => rebuild(type, form), 150);
  };
  // a type starts from the one shown before only within its group: boards from boards, connectors from connectors
  const before = groupOf(type) === shownGroup ? shownValues : {};
  shownGroup = groupOf(type);
  const form = renderForm(formBox, type, changed, startingValues(type, choices.values[type.id], before));
  keep();
  current = changed;
  // A wall is closed round its outer edge (D37): split, the sides still open close, and can be opened again.
  formBox.querySelector('[role="radiogroup"][aria-label="Panels"]')?.addEventListener('change', () => {
    if (chosenIn(formBox.querySelector('[aria-label="Panels"]') ?? formBox) !== 'split') return;
    for (const side of formBox.querySelectorAll<HTMLButtonElement>('[data-side][aria-pressed="false"]')) side.click();
  });
  // A board on keyholes stands on standoffs, so a hook has room behind it (D190): keyholes turn them on.
  formBox.querySelector('[role="radiogroup"][aria-label="Screw holes"]')?.addEventListener('change', () => {
    if (chosenIn(formBox.querySelector('[aria-label="Screw holes"]') ?? formBox) !== 'keyhole') return;
    formBox.querySelector<HTMLInputElement>('[aria-label="Standoffs"] input[value="back"]:not(:checked)')?.click();
  });
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
  // list keeps the type last chosen in it.
  const groups = [
    { group: 'board', heading: 'Boards', title: 'Board' },
    { group: 'connector', heading: 'Connectors', title: 'Connector' },
  ] as const;
  const typeTitle = typeList.querySelector('legend');
  const startGroup = groups.some((g) => g.group === choices.group) ? (choices.group ?? 'board') : 'board';
  const chosenOf = (group: string) => {
    const kept = choices.types[group];
    return typesOf(group).find((t) => t.id === kept) ?? typesOf(group)[0];
  };
  const toggle = choiceGroup(
    'typeGroup',
    'What to make',
    groups.map((g) => ({ value: g.group, label: g.heading })),
    startGroup,
  );
  makeField.append(toggle);
  const lists = new Map<string, HTMLElement>();
  for (const { group, heading } of groups) {
    const options = typesOf(group).map((t) => ({ value: t.id, label: t.name }));
    const list = choiceGroup('boardType', heading, options, group === startGroup ? (chosenOf(group)?.id ?? '') : '');
    for (const input of list.querySelectorAll<HTMLInputElement>('input')) input.dataset['group'] = group;
    list.hidden = group !== startGroup; // hidden as it is, since the design system's v0.6.0 (D259; C179)
    lists.set(group, list);
    typeList.append(list);
  }
  // the group shown: its list, and the type last chosen in it, shown
  const showGroup = (group: string) => {
    for (const [g, list] of lists) list.hidden = g !== group;
    if (typeTitle !== null) typeTitle.textContent = groups.find((g) => g.group === group)?.title ?? 'Board';
    for (const input of toggle.querySelectorAll<HTMLInputElement>('input')) input.checked = input.value === group;
    choices.group = group;
  };
  makeField.addEventListener('change', (event) => {
    const input = event.target instanceof HTMLInputElement ? event.target : null;
    if (input?.name !== 'typeGroup') return;
    const type = chosenOf(input.value);
    showGroup(input.value);
    const option = lists.get(input.value)?.querySelector<HTMLInputElement>(`input[value="${type?.id ?? ''}"]`);
    if (option) option.checked = true;
    if (type !== undefined) show(type);
  });
  typeList.addEventListener('change', (event) => {
    const input = event.target instanceof HTMLInputElement ? event.target : null;
    if (input?.name !== 'boardType') return;
    const group = input.dataset['group'] ?? 'board';
    showGroup(group); // a type chosen in the other group, as a script may, shows that group
    choices.types[group] = input.value;
    show(boardType(input.value));
  });
  showGroup(startGroup);
  const first = chosenOf(startGroup);
  if (first !== undefined) show(first);
}

void start();
