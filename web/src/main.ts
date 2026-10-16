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
import { choiceGroup, chosenIn, renderForm, type Form } from './form.js';
import { saveFile } from './download.js';
import { mountPreview } from './preview.js';
import { mountPrinter } from './printer.js';
import { mountTheme } from './theme.js';

mountTheme(document.querySelector<HTMLButtonElement>('[data-testid="theme-toggle"]'));

const engineStatus = document.querySelector<HTMLElement>('[data-testid="engine-status"]');
const boardStatus = document.querySelector<HTMLElement>('[data-testid="board-status"]');
const typeList = document.querySelector<HTMLElement>('[data-testid="board-type"]');
const formBox = document.querySelector<HTMLElement>('[data-testid="board-form"]');
const previewBox = document.querySelector<HTMLElement>('[data-testid="preview"]');
const resetButton = document.querySelector<HTMLButtonElement>('[data-testid="preview-reset"]');
const preview = previewBox ? mountPreview(previewBox, resetButton) : null;
const sizeLine = document.querySelector<HTMLElement>('[data-testid="board-size"]'); // in the status bar
const downloadButton = document.querySelector<HTMLButtonElement>('[data-testid="download-stl"]');
const printerBox = document.querySelector<HTMLElement>('[data-testid="printer"]');
const bedWarning = document.querySelector<HTMLElement>('[data-testid="bed-warning"]');
const printList = document.querySelector<HTMLElement>('[data-testid="print-list"]'); // a wall's panels (D178)
const formatChoice = document.querySelector<HTMLElement>('[data-testid="file-format"]'); // STL or 3MF (D181)
const downloadLabel = document.querySelector<HTMLElement>('[data-testid="download-label"]');
const format = (): 'stl' | '3mf' => (formatChoice && chosenIn(formatChoice) === '3mf' ? '3mf' : 'stl');
const withFormat = (name: string) => name.replace(/\.(stl|3mf)$/, `.${format()}`);
formatChoice?.addEventListener('change', () => {
  if (downloadLabel !== null) downloadLabel.textContent = `Download ${format().toUpperCase()}`;
});

/** Asks the worker for a file of the build it showed, and saves it under its name (D181 to D183). */
function download(id: number, name: string, panel?: number | 'all'): void {
  answers.set('file', (file) => {
    if (file.kind === 'file' && file.ok && file.id === id) saveFile(name, file.bytes, file.type);
  });
  ask({ kind: 'file', id, format: format(), name, ...(panel === undefined ? {} : { panel }) });
}
let current: (() => void) | undefined; // rebuilds the board on show, for a change of printer
const printer = printerBox ? mountPrinter(printerBox, () => current?.()) : null;

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

function rebuild(type: AnyBoardType, form: Form): void {
  const read = readValues(type.settings, form.read());
  form.show(read.ok ? [] : read.errors, read.warnings);
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
    if (built.panels) {
      const count = built.panels.reduce((n, line) => n + line.count, 0);
      warnAboutBed(0, 0); // every panel fits the bed it was cut for
      setStatus('ready', `Wall ready: ${count} panels, ${built.panels.length} to download below.`, fileName, size);
      const [wide, high] = [Math.round(max[0] - min[0]), Math.round(max[1] - min[1])];
      const wallName = `skadis-${type.id}-${wide}x${high}-wall`; // D183
      showPanels(id, built.panels, wallName);
    } else {
      warnAboutBed(max[0], max[1]);
      setStatus('ready', `${what === 'board' ? 'Board' : 'Connector'} ready: ${fileName}`, fileName, size);
      showPanels(id, [], '');
    }
    preview?.show(built.parts, `${type.id} ${size}`); // framed again only when the type or size changes
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
  // the design system's buttons set their display, which a hidden attribute does not overrule (C179)
  if (downloadButton !== null) downloadButton.style.display = lines.length > 0 ? 'none' : '';
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
  printList.replaceChildren(
    ...(lines.length > 0 ? [all] : []),
    ...lines.map((line, panel) =>
      printRow(panelText(line), 'Download', () => download(id, withFormat(line.fileName), panel), 'print-row'),
    ),
  );
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
  const changed = () => {
    clearTimeout(timer);
    timer = setTimeout(() => rebuild(type, form), 150); // one build after a burst of typing
  };
  const form = renderForm(formBox, type, changed);
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
  if (typeList === null) return;
  // Buttons under a heading wherever the group changes (D91, D112); the list keeps each group together,
  // boards first. Every button is one choice: the same name in both groups.
  const headings = { board: 'Boards', connector: 'Connectors' } as const;
  const first = BOARD_TYPES[0];
  const runs: { heading: string; types: AnyBoardType[] }[] = [];
  for (const t of BOARD_TYPES) {
    const heading = headings[groupOf(t)];
    if (runs.at(-1)?.heading !== heading) runs.push({ heading, types: [] });
    runs.at(-1)?.types.push(t);
  }
  for (const { heading, types } of runs) {
    const caption = document.createElement('div');
    caption.className = 'ws-caps';
    caption.textContent = heading;
    const options = types.map((t) => ({ value: t.id, label: t.name }));
    typeList.append(caption, choiceGroup('boardType', heading, options, first?.id ?? ''));
  }
  typeList.addEventListener('change', () => show(boardType(chosenIn(typeList))));
  if (first !== undefined) show(first);
}

void start();
