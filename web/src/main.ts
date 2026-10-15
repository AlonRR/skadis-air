// The page's entry point: the board-type list and the form, both built from the board types, and the
// board rebuilt whenever a setting changes. Every build runs in a web worker (build-worker.ts; D166), so the
// page answers while a large board is made; the worker also starts the engine and makes its check part, so the
// browser test still sees the WebAssembly file found, fetched and started from the built page (C32).
import { BOARD_TYPES, boardFileName, boardType, fitsBed, groupOf, readValues, type AnyBoardType } from 'skadis-air';
import type { Reply, Request } from './build-messages.js';
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
    warnAboutBed(max[0], max[1]);
    setStatus('ready', `${what === 'board' ? 'Board' : 'Connector'} ready: ${fileName}`, fileName, size);
    preview?.show(built, `${type.id} ${size}`); // framed again only when the type or size changes
  });
  ask({ kind: 'build', id, typeId: type.id, values: read.values });
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
      `${chosen.bed.xMm} × ${chosen.bed.yMm} mm bed. It can still be downloaded; splitting a board into ` +
      'tiles that fit comes later.',
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
  rebuild(type, form);
}

// The worker writes the STL of the part it built last, as it prints (D66, C101); the page saves it.
downloadButton?.addEventListener('click', () => {
  const fileName = boardStatus?.dataset['fileName'] ?? '';
  if (shown === 0 || fileName === '') return;
  answers.set('stl', (file) => {
    if (file.kind === 'stl' && file.ok && file.id === shown) saveFile(fileName, file.bytes, 'model/stl');
  });
  ask({ kind: 'stl', id: shown, name: fileName });
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
