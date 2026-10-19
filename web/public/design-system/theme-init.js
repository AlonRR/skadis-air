// The theme, set before the page is first drawn, so a dark screen never flashes light (D58).
// A tool copies this file beside tokens.css and loads it first in its head, before the stylesheets,
// as a file, so a content security policy without 'unsafe-inline' still runs it:
//
//   <script src="theme-init.js" data-key="skadis-air-theme"></script>
//
// It sets data-theme on <html> to the theme the tool's toggle stored, "light" or "dark", under the
// key the tag names in data-key (printable-parts-theme without one); with nothing stored, any other
// value, or storage missing or refused (a private window, blocked site data), to the system
// setting's, as tokens.css themes the page through data-theme alone; so whatever follows the theme
// watches it. The tool's script keeps it in step while the page is open and stores the toggle's
// choice under the same key (DESIGN.md, "Light or dark").
(() => {
  const key = (document.currentScript && document.currentScript.dataset.key) || 'printable-parts-theme';
  let chosen = null;
  try {
    chosen = localStorage.getItem(key);
  } catch {
    // storage missing or refused: the system setting, below
  }
  const system = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  document.documentElement.dataset.theme = chosen === 'light' || chosen === 'dark' ? chosen : system;
})();
