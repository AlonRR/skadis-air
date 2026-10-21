// What the page and the build worker say to each other (backlog item build-worker; D166). The page asks for
// the engine's check, for a build, and for the STL of the build it shows; the worker answers each, and keeps
// the last part it built so the download is the part the preview showed.
import type { Slot } from './wall-detail.js';

export type Request =
  | { kind: 'check' }
  | {
      kind: 'build';
      id: number;
      typeId: string;
      values: Readonly<Record<string, unknown>>;
      bed: { xMm: number; yMm: number }; // the bed a wall's panels must fit (D176)
    }
  | {
      kind: 'file';
      id: number;
      format: 'stl' | '3mf'; // D181
      name: string; // the file's name, which also names what is in it
      panel?: number | 'all'; // a wall's panel kind, by its place in the list, or every kind in one file (D183)
    };

/**
 * A mesh and where its copies' lower left corners go, mm: a board at the origin, or one kind of panel at each of
 * its columns' places across and its rows' places up, every pair of them (C200).
 */
export interface Placed {
  positions: Float32Array;
  triangles: Uint32Array;
  xs: number[];
  ys: number[];
}

/** One kind of a wall's panels, as the print list shows it (D178). */
/** What a wall's reply adds to a board's: its print list's lines, and its slots as cut, which the preview's
 * stand-ins are painted and edged with (the review, 16 Oct 2026). */
export interface WallReply {
  panels: PanelLine[];
  slot: Slot;
  shiftMm?: number; // how far the panels' open sides lie off their grid lines: 10 between the slots (D288 a)
}

export interface PanelLine {
  fileName: string;
  count: number;
  widthMm: number;
  heightMm: number;
  closed: string[]; // the sides closed, the wall's outer edge
}

export type Reply =
  | { kind: 'check'; ok: true; volumeMm3: number }
  | { kind: 'check'; ok: false; error: string }
  | {
      kind: 'built';
      id: number;
      ok: true;
      parts: Placed[]; // the part as it hangs, for the preview: one, or each kind of a wall's panels
      min: [number, number, number]; // its box, mm, a wall's panels and all
      max: [number, number, number];
      wall?: WallReply; // a wall's panels, one line for each kind, and the slots they cut
    }
  | { kind: 'built'; id: number; ok: false; problem: string }
  | { kind: 'file'; id: number; ok: true; bytes: Uint8Array; type: string }
  | { kind: 'file'; id: number; ok: false; error: string };

const closedText = (line: PanelLine) =>
  line.closed.length > 0 ? `, closed ${line.closed.join(' and ')}` : ', open all round';

/** A line of the print list, as the page and print-list.txt show it: "1 × 160 × 160 mm, closed left and bottom". */
export const panelText = (line: PanelLine) =>
  `${line.count} × ${line.widthMm} × ${line.heightMm} mm${closedText(line)}`;

/** A kind's object in a wall's 3MF, named with how many to print (D182): "160 × 160 mm, closed left, × 4". */
export const panelObjectName = (line: PanelLine) =>
  `${line.widthMm} × ${line.heightMm} mm${closedText(line)}, × ${line.count}`;
