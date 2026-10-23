// The development page (D328): the Pages workflow builds main beside the release, under dev/, with
// SKADIS_DEV_COMMIT set to the commit it builds. That build says so in a banner at the top of the page, naming and
// linking its commit and linking the released page one folder up, adds "(development build)" to its title, and
// asks search engines not to list it. Built without the variable, as the release and every local build are, the
// page is left exactly as it is.
import type { Plugin } from 'vite';

const REPOSITORY = 'https://github.com/AlonRR/skadis-air';

// the banner's own rules: a strip across the page's top, the notice's colours with its corners and margins taken off
const STYLE = `<style>
      .dev-banner {
        margin: 0;
        border-width: 0 0 var(--line);
        border-radius: 0;
        padding: var(--space-2) var(--space-4);
        font: var(--text-note);
      }
    </style>`;

/** What the build does to `index.html` for the given development commit: nothing without one. */
export function devPage(commit: string | undefined): (html: string) => string {
  if (commit === undefined || commit === '') return (html) => html;
  // a full commit id, or the build fails: anything else in the variable is a mistake, and goes into the page
  if (!/^[0-9a-f]{40}$/.test(commit)) throw new Error(`SKADIS_DEV_COMMIT is not a full commit id: ${commit}`);
  const banner =
    `<p class="ws-notice ws-notice--warning dev-banner" data-testid="dev-banner">` +
    `<strong>Development build</strong> from main, commit ` +
    `<a href="${REPOSITORY}/commit/${commit}"><code>${commit.slice(0, 7)}</code></a>, not released. ` +
    `<a href="../">The released page</a></p>`;
  return (html) =>
    html
      .replace('</title>', ' (development build)</title>')
      .replace('</head>', `  <meta name="robots" content="noindex" />\n    ${STYLE}\n  </head>`)
      .replace(/<body([^>]*)>/, `<body$1>\n    ${banner}`);
}

/** The Vite plugin that applies it, reading the commit from SKADIS_DEV_COMMIT. */
export function devPagePlugin(): Plugin {
  const transform = devPage(process.env['SKADIS_DEV_COMMIT']);
  return { name: 'dev-page', transformIndexHtml: (html) => transform(html) };
}
