// D8, as the reference project: the files the tool generates, and what is printed from them, are
// the user's to do with as they wish. The statement must stay in the README and on the page; this
// test fails if either loses it or the two drift apart.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

export const OUTPUT_STATEMENT =
  'The STL and other files this tool generates, and anything you print from them, are yours ' +
  'to use, change, share or sell for any purpose, with no conditions from this project.';

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8').replace(/\s+/g, ' ');

describe("the statement that generated files are the user's (D8)", () => {
  it('is in the README', () => {
    expect(read('../../README.md')).toContain(OUTPUT_STATEMENT);
  });

  it('is on the page', () => {
    expect(read('../index.html')).toContain(OUTPUT_STATEMENT);
  });
});
