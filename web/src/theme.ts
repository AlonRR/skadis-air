// The page's theme (D113): light or dark, as the system setting says. index.html sets it before the
// page is drawn; this keeps it in step when the setting changes while the page is open. The header's
// toggle (backlog item workbench) will set the same attribute, so whatever follows the theme watches
// `data-theme` on the page, never the system setting itself (C117).
export function followSystemTheme(): void {
  const dark = matchMedia('(prefers-color-scheme: dark)');
  const apply = () => {
    document.documentElement.dataset['theme'] = dark.matches ? 'dark' : 'light';
  };
  apply();
  dark.addEventListener('change', apply);
}
