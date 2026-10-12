// What a board type is (backlog item registry; D11): an id, a name, the settings it takes, how it
// builds from their values, and the part of its file name its values decide. A new type is one file
// that calls defineBoardType and one line in the list in index.ts; the page, the value checks and the
// file names are derived from that (the extension-registry practice).
import type { Manifold } from 'manifold-3d';
import type { Engine } from '../engine.js';
import type { Setting, Values } from '../settings.js';

export interface BoardType<S extends readonly Setting[]> {
  id: string; // lower-case words joined by hyphens; part of every file name
  name: string; // as the page lists it
  description?: string;
  settings: S;
  // Methods, not function properties, so that a type with its own settings is still a board type.
  build(engine: Engine, values: Values<S>): Manifold;
  label(values: Values<S>): string; // the file name after "skadis-<id>-"
}

export type AnyBoardType = BoardType<readonly Setting[]>;

/** Keeps a type's literal setting keys, so its build and label are typed from its own declaration. */
export function defineBoardType<const S extends readonly Setting[]>(type: BoardType<S>): BoardType<S> {
  return type;
}

export type Built = { ok: true; solid: Manifold } | { ok: false; problem: string };

/** Builds any board type; a combination of values it cannot make comes back as a problem, not a throw. */
export function buildBoard<S extends readonly Setting[]>(engine: Engine, type: BoardType<S>, values: Values<S>): Built {
  try {
    return { ok: true, solid: type.build(engine, values) };
  } catch (error) {
    if (error instanceof RangeError) return { ok: false, problem: error.message };
    throw error;
  }
}

export function boardFileName<S extends readonly Setting[]>(
  type: BoardType<S>,
  values: Values<S>,
  extension: 'stl' | '3mf',
): string {
  return `skadis-${type.id}-${type.label(values)}.${extension}`;
}
