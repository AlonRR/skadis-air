// The page's theme (D113): light or dark as the system setting says, unless the header's toggle has
// chosen one, which this browser then remembers (C124). index.html sets it before the page is drawn;
// this keeps it in step while the page is open. Whatever follows the theme watches `data-theme` on the
// page, never the system setting itself (C117).
type Theme = 'light' | 'dark';
const KEY = 'skadis-air-theme'; // the same key as the line in index.html

// Browser storage can be missing or refused (a private window, blocked site data): the page then
// follows the system setting and forgets the toggle's choice when it closes.
function remembered(): Theme | null {
  try {
    const value = localStorage.getItem(KEY);
    return value === 'light' || value === 'dark' ? value : null;
  } catch {
    return null;
  }
}

function remember(theme: Theme): void {
  try {
    localStorage.setItem(KEY, theme);
  } catch {
    // not remembered; the choice still holds while the page is open
  }
}

export function mountTheme(toggle: HTMLButtonElement | null): void {
  const dark = matchMedia('(prefers-color-scheme: dark)');
  const system = (): Theme => (dark.matches ? 'dark' : 'light');
  const apply = (theme: Theme) => {
    document.documentElement.dataset['theme'] = theme;
    toggle?.setAttribute('aria-pressed', String(theme === 'dark'));
  };
  let chosen = remembered();
  apply(chosen ?? system());
  dark.addEventListener('change', () => {
    if (chosen === null) apply(system());
  });
  toggle?.addEventListener('click', () => {
    chosen = document.documentElement.dataset['theme'] === 'dark' ? 'light' : 'dark';
    remember(chosen);
    apply(chosen);
  });
}
