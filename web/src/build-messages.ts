// What the page and the build worker say to each other (backlog item build-worker; D166). The page asks for
// the engine's check, for a build, and for the STL of the build it shows; the worker answers each, and keeps
// the last part it built so the download is the part the preview showed.

export type Request =
  | { kind: 'check' }
  | { kind: 'build'; id: number; typeId: string; values: Readonly<Record<string, unknown>> }
  | { kind: 'stl'; id: number; name: string };

export type Reply =
  | { kind: 'check'; ok: true; volumeMm3: number }
  | { kind: 'check'; ok: false; error: string }
  | {
      kind: 'built';
      id: number;
      ok: true;
      positions: Float32Array; // the part as it hangs, for the preview
      triangles: Uint32Array;
      min: [number, number, number]; // its box, mm
      max: [number, number, number];
    }
  | { kind: 'built'; id: number; ok: false; problem: string }
  | { kind: 'stl'; id: number; ok: true; bytes: Uint8Array }
  | { kind: 'stl'; id: number; ok: false; error: string };
