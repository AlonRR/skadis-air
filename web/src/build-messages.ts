// What the page and the build worker say to each other (backlog item build-worker; D166). The page asks for
// the engine's check, for a build, and for the STL of the build it shows; the worker answers each, and keeps
// the last part it built so the download is the part the preview showed.

export type Request =
  | { kind: 'check' }
  | {
      kind: 'build';
      id: number;
      typeId: string;
      values: Readonly<Record<string, unknown>>;
      bed: { xMm: number; yMm: number }; // the bed a wall's panels must fit (D176)
    }
  | { kind: 'stl'; id: number; name: string; panel?: number }; // a wall's panel kind, by its place in the list

/** A mesh and where its copies go, mm: a board at the origin, or one kind of panel at each of its places. */
export interface Placed {
  positions: Float32Array;
  triangles: Uint32Array;
  places: [number, number][];
}

/** One kind of a wall's panels, as the print list shows it (D178). */
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
      panels?: PanelLine[]; // a wall's panels, one line for each kind
    }
  | { kind: 'built'; id: number; ok: false; problem: string }
  | { kind: 'stl'; id: number; ok: true; bytes: Uint8Array }
  | { kind: 'stl'; id: number; ok: false; error: string };
