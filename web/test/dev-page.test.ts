// The development page (D328): the page built from main, published under dev/ beside the release, says so in a
// banner at its top, names and links its commit, links the released page, and asks search engines not to list it.
// Built without a commit, the page is left exactly as it is, which is what the release's build must be.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { devPage } from '../dev-page.js';

const PAGE = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const COMMIT = '0123456789abcdef0123456789abcdef01234567';

describe('the development page (D328)', () => {
  it('leaves the page exactly as it is when no development commit is given', () => {
    expect(devPage(undefined)(PAGE)).toBe(PAGE);
    expect(devPage('')(PAGE)).toBe(PAGE);
  });

  it('asks search engines not to list it, once, in the head', () => {
    const html = devPage(COMMIT)(PAGE);
    const head = html.slice(0, html.indexOf('</head>'));
    expect(head).toContain('<meta name="robots" content="noindex" />');
    expect(html.match(/name="robots"/g)).toHaveLength(1);
  });

  it('says in its title that it is the development build', () => {
    const html = devPage(COMMIT)(PAGE);
    expect(html).toMatch(/<title>[^<]*\(development build\)<\/title>/);
  });

  it('opens the body with a banner naming and linking its commit and linking the released page', () => {
    const html = devPage(COMMIT)(PAGE);
    const body = html.slice(html.indexOf('<body'));
    const banner = /<body[^>]*>\s*(<p [^>]*data-testid="dev-banner"[^>]*>[\s\S]*?<\/p>)/.exec(body)?.[1] ?? '';
    expect(banner).toContain('Development build');
    expect(banner).toContain('not released');
    expect(banner).toContain('>0123456<'); // the short commit
    expect(banner).toContain(`href="https://github.com/AlonRR/skadis-air/commit/${COMMIT}"`);
    expect(banner).toContain('href="../"'); // the released page, one folder up
    // the banner is the body's first child, before the workbench
    expect(body.indexOf('data-testid="dev-banner"')).toBeLessThan(body.indexOf('ws-workbench'));
  });

  it('refuses a commit that is not a full commit id, so a wrong value fails the build', () => {
    for (const wrong of ['0123456', 'main', `${COMMIT}0`, COMMIT.toUpperCase(), '<script>']) {
      expect(() => devPage(wrong), wrong).toThrow(/commit/);
    }
  });
});
