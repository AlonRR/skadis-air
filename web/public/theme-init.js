// SPDX-FileCopyrightText: 2026 Alon A. Rabinowitz
// SPDX-License-Identifier: MPL-2.0
//
// The theme (D113): the one chosen with the header's toggle, remembered in this browser, or else the
// system setting. Set here, before anything is drawn, so a dark screen never flashes light;
// src/theme.ts keeps it in step while the page is open (C117, C124).
(() => {
  let chosen = null;
  try {
    chosen = localStorage.getItem('skadis-air-theme');
  } catch {}
  const system = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  document.documentElement.dataset.theme = chosen === 'light' || chosen === 'dark' ? chosen : system;
})();
