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
  loadEngine,
  readValues,
  type AnyBoardType,
} from 'skadis-ultralight-generator';
import { renderForm, type Form } from './form.js';

const engineStatus = document.querySelector<HTMLElement>('[data-testid="engine-status"]');
const boardStatus = document.querySelector<HTMLElement>('[data-testid="board-status"]');
const typeList = document.querySelector<HTMLSelectElement>('[data-testid="board-type"]');
const formBox = document.querySelector<HTMLElement>('[data-testid="board-form"]');

const engine = () => loadEngine(wasmUrl);
let board: Manifold | undefined; // the board as last built; freed when the next one replaces it

function setStatus(state: 'building' | 'ready' | 'invalid' | 'problem', text: string, fileName = ''): void {
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
    return;
  }
  setStatus('building', 'Making the board…');
  const built = buildBoard(await engine(), type, read.values);
  board?.delete();
  board = undefined;
  if (!built.ok) {
    setStatus('problem', `This board cannot be made: ${built.problem}`);
    return;
  }
  board = built.solid;
  const box = board.boundingBox();
  const size = [0, 1, 2].map((k) => Math.round(((box.max[k] ?? 0) - (box.min[k] ?? 0)) * 10) / 10).join(' × ');
  const fileName = boardFileName(type, read.values, 'stl');
  setStatus('ready', `Board ready: ${size} mm, ${fileName}`, fileName);
}

function show(type: AnyBoardType): void {
  if (formBox === null) return;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const changed = () => {
    clearTimeout(timer);
    timer = setTimeout(() => void rebuild(type, form), 150); // one build after a burst of typing
  };
  const form = renderForm(formBox, type, changed);
  void rebuild(type, form);
}

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
    return;
  }
  if (typeList === null) return;
  typeList.replaceChildren(
    ...BOARD_TYPES.map((t) => {
      const option = document.createElement('option');
      option.value = t.id;
      option.textContent = t.name;
      return option;
    }),
  );
  typeList.addEventListener('change', () => show(boardType(typeList.value)));
  const first = BOARD_TYPES[0];
  if (first !== undefined) show(first);
}

void start();
