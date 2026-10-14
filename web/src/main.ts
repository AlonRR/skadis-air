// The page's entry point: the board-type list and the form, both built from the board types, and the
// board rebuilt whenever a setting changes. The engine's start and its check part are as before, so the
// browser test still sees the WebAssembly file found, fetched and started from the built page (C32).
import wasmUrl from 'manifold-3d/manifold.wasm?url';
import type { Manifold } from 'manifold-3d';
import {
  BOARD_TYPES,
  boardFileName,
  boardType,
  buildBoard,
  buildCheckPart,
  fitsBed,
  groupOf,
  loadEngine,
  readValues,
  type AnyBoardType,
} from 'skadis-air';
import { renderForm, type Form } from './form.js';
import { downloadStl } from './download.js';
import { mountPreview } from './preview.js';
import { mountPrinter } from './printer.js';

const engineStatus = document.querySelector<HTMLElement>('[data-testid="engine-status"]');
const boardStatus = document.querySelector<HTMLElement>('[data-testid="board-status"]');
const typeList = document.querySelector<HTMLSelectElement>('[data-testid="board-type"]');
const formBox = document.querySelector<HTMLElement>('[data-testid="board-form"]');
const previewBox = document.querySelector<HTMLElement>('[data-testid="preview"]');
const preview = previewBox ? mountPreview(previewBox) : null;
const downloadButton = document.querySelector<HTMLButtonElement>('[data-testid="download-stl"]');
const printerBox = document.querySelector<HTMLElement>('[data-testid="printer"]');
const bedWarning = document.querySelector<HTMLElement>('[data-testid="bed-warning"]');
let current: (() => void) | undefined; // rebuilds the board on show, for a change of printer
const printer = printerBox ? mountPrinter(printerBox, () => current?.()) : null;

const engine = () => loadEngine(wasmUrl);
let board: Manifold | undefined; // the board as last built; freed when the next one replaces it

function setStatus(state: 'building' | 'ready' | 'invalid' | 'problem', text: string, fileName = ''): void {
  if (downloadButton !== null) downloadButton.disabled = state !== 'ready'; // only a board that exists
  if (boardStatus === null) return;
  boardStatus.dataset['state'] = state;
  boardStatus.dataset['fileName'] = fileName;
  boardStatus.textContent = text;
}

async function rebuild(type: AnyBoardType, form: Form): Promise<void> {
  const read = readValues(type.settings, form.read());
  form.show(read.ok ? [] : read.errors, read.warnings);
  if (!read.ok) {
    setStatus('invalid', 'Correct the settings marked above to make the board.');
    preview?.show(null, '');
    return;
  }
  const what = groupOf(type) === 'connector' ? 'connector' : 'board';
  setStatus('building', `Making the ${what}…`);
  const built = buildBoard(await engine(), type, read.values);
  board?.delete();
  board = undefined;
  if (!built.ok) {
    setStatus('problem', `This ${what} cannot be made: ${built.problem}`);
    preview?.show(null, '');
    return;
  }
  board = built.solid;
  const box = board.boundingBox();
  const size = [0, 1, 2].map((k) => Math.round(((box.max[k] ?? 0) - (box.min[k] ?? 0)) * 10) / 10).join(' × ');
  const fileName = boardFileName(type, read.values, 'stl');
  warnAboutBed(box.max[0] ?? 0, box.max[1] ?? 0);
  setStatus('ready', `${what === 'board' ? 'Board' : 'Connector'} ready: ${size} mm, ${fileName}`, fileName);
  preview?.show(board, `${type.id} ${size}`); // framed again only when the type or size changes
}

/** A board larger than the bed is warned about, not refused (D62). */
function warnAboutBed(widthMm: number, heightMm: number): void {
  if (bedWarning === null || printer === null) return;
  const chosen = printer.bed();
  const fits = !chosen.ok || fitsBed(widthMm, heightMm, chosen.bed);
  bedWarning.textContent =
    fits || !chosen.ok
      ? ''
      : `This board is ${Math.round(widthMm)} × ${Math.round(heightMm)} mm; it does not fit the ` +
        `${chosen.bed.xMm} × ${chosen.bed.yMm} mm bed. It can still be downloaded; splitting a board into ` +
        'tiles that fit comes later.';
}

function show(type: AnyBoardType): void {
  if (formBox === null) return;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const changed = () => {
    clearTimeout(timer);
    timer = setTimeout(() => void rebuild(type, form), 150); // one build after a burst of typing
  };
  const form = renderForm(formBox, type, changed);
  current = changed;
  void rebuild(type, form);
}

downloadButton?.addEventListener('click', () => {
  const fileName = boardStatus?.dataset['fileName'] ?? '';
  if (board !== undefined && fileName !== '') downloadStl(board, fileName);
});

async function start(): Promise<void> {
  if (engineStatus === null) return;
  try {
    const part = buildCheckPart(await engine());
    engineStatus.dataset['volumeMm3'] = String(Math.round(part.volumeMm3));
    engineStatus.dataset['state'] = 'ready';
    engineStatus.textContent = 'Geometry engine ready.';
  } catch (error) {
    engineStatus.dataset['state'] = 'error';
    engineStatus.textContent = `The geometry engine could not start: ${String(error)}`;
    setStatus('problem', 'No board can be made without the geometry engine.');
    preview?.show(null, '');
    return;
  }
  if (typeList === null) return;
  // A heading wherever the group changes (D91); the list keeps each group together, boards first.
  const headings = { board: 'Boards', connector: 'Connectors' } as const;
  const groups: HTMLOptGroupElement[] = [];
  for (const t of BOARD_TYPES) {
    let group = groups.at(-1);
    if (group?.label !== headings[groupOf(t)]) {
      group = document.createElement('optgroup');
      group.label = headings[groupOf(t)];
      groups.push(group);
    }
    const option = document.createElement('option');
    option.value = t.id;
    option.textContent = t.name;
    group.append(option);
  }
  typeList.replaceChildren(...groups);
  typeList.addEventListener('change', () => show(boardType(typeList.value)));
  const first = BOARD_TYPES[0];
  if (first !== undefined) show(first);
}

void start();
