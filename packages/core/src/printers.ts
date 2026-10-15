// The printers the page offers (backlog item printer-presets; D4, D170 to D172): docs/printer-beds.md, row for
// row, each bed read from its maker's own website (C25); printers.test.ts holds the two together. The page
// groups them by maker (D170), in the order below.
import type { Bed } from './printer.js';

export interface Printer extends Bed {
  id: string; // lower-case words joined by hyphens, stored in the browser (D171)
  maker: string;
  model: string; // as its maker names it
  group: 'mini' | 'full-size'; // the default bed fits every full-size printer (D61)
}

export const PRINTERS: readonly Printer[] = [
  { id: 'original-prusa-mk4s', maker: 'Prusa', model: 'Original Prusa MK4S', xMm: 250, yMm: 210, group: 'full-size' },
  {
    id: 'original-prusa-i3-mk3s-plus',
    maker: 'Prusa',
    model: 'Original Prusa i3 MK3S+',
    xMm: 250,
    yMm: 210,
    group: 'full-size',
  },
  { id: 'original-prusa-mini-plus', maker: 'Prusa', model: 'Original Prusa MINI+', xMm: 180, yMm: 180, group: 'mini' },
  {
    id: 'prusa-core-one-plus-gen-2',
    maker: 'Prusa',
    model: 'Prusa CORE One+ (Gen 2)',
    xMm: 250,
    yMm: 220,
    group: 'full-size',
  },
  { id: 'prusa-core-one-l', maker: 'Prusa', model: 'Prusa CORE One L', xMm: 300, yMm: 300, group: 'full-size' },
  {
    id: 'prusa-xl-plus-single-tool',
    maker: 'Prusa',
    model: 'Prusa XL+ Single-Tool',
    xMm: 360,
    yMm: 360,
    group: 'full-size',
  },
  { id: 'bambu-lab-a1', maker: 'Bambu Lab', model: 'Bambu Lab A1', xMm: 256, yMm: 256, group: 'full-size' },
  { id: 'bambu-lab-a1-mini', maker: 'Bambu Lab', model: 'Bambu Lab A1 mini', xMm: 180, yMm: 180, group: 'mini' },
  { id: 'bambu-lab-a2l', maker: 'Bambu Lab', model: 'Bambu Lab A2L', xMm: 330, yMm: 320, group: 'full-size' },
  { id: 'bambu-lab-p1s', maker: 'Bambu Lab', model: 'Bambu Lab P1S', xMm: 256, yMm: 256, group: 'full-size' },
  { id: 'bambu-lab-p2s', maker: 'Bambu Lab', model: 'Bambu Lab P2S', xMm: 256, yMm: 256, group: 'full-size' },
  { id: 'bambu-lab-x1c', maker: 'Bambu Lab', model: 'Bambu Lab X1C', xMm: 256, yMm: 256, group: 'full-size' },
  {
    id: 'bambu-lab-x2d-main-nozzle',
    maker: 'Bambu Lab',
    model: 'Bambu Lab X2D (main nozzle)',
    xMm: 256,
    yMm: 256,
    group: 'full-size',
  },
  {
    id: 'bambu-lab-h2d-single-nozzle',
    maker: 'Bambu Lab',
    model: 'Bambu Lab H2D (single nozzle)',
    xMm: 325,
    yMm: 320,
    group: 'full-size',
  },
  { id: 'bambu-lab-h2s', maker: 'Bambu Lab', model: 'Bambu Lab H2S', xMm: 340, yMm: 320, group: 'full-size' },
  {
    id: 'creality-ender-3-v3',
    maker: 'Creality',
    model: 'Creality Ender-3 V3',
    xMm: 220,
    yMm: 220,
    group: 'full-size',
  },
  {
    id: 'creality-ender-3-v3-se',
    maker: 'Creality',
    model: 'Creality Ender-3 V3 SE',
    xMm: 220,
    yMm: 220,
    group: 'full-size',
  },
  {
    id: 'creality-ender-3-v3-ke',
    maker: 'Creality',
    model: 'Creality Ender-3 V3 KE',
    xMm: 220,
    yMm: 220,
    group: 'full-size',
  },
  { id: 'creality-k1c', maker: 'Creality', model: 'Creality K1C', xMm: 220, yMm: 220, group: 'full-size' },
  { id: 'creality-k1-max', maker: 'Creality', model: 'Creality K1 Max', xMm: 300, yMm: 300, group: 'full-size' },
  { id: 'creality-k2-plus', maker: 'Creality', model: 'Creality K2 Plus', xMm: 350, yMm: 350, group: 'full-size' },
  {
    id: 'anycubic-kobra-3-combo',
    maker: 'Anycubic',
    model: 'Anycubic Kobra 3 (Combo)',
    xMm: 250,
    yMm: 250,
    group: 'full-size',
  },
  {
    id: 'anycubic-kobra-3-v2-combo',
    maker: 'Anycubic',
    model: 'Anycubic Kobra 3 V2 Combo',
    xMm: 255,
    yMm: 255,
    group: 'full-size',
  },
  { id: 'anycubic-kobra-s1', maker: 'Anycubic', model: 'Anycubic Kobra S1', xMm: 250, yMm: 250, group: 'full-size' },
  { id: 'elegoo-neptune-4', maker: 'Elegoo', model: 'Elegoo Neptune 4', xMm: 225, yMm: 225, group: 'full-size' },
  {
    id: 'elegoo-neptune-4-pro',
    maker: 'Elegoo',
    model: 'Elegoo Neptune 4 Pro',
    xMm: 225,
    yMm: 225,
    group: 'full-size',
  },
  {
    id: 'elegoo-centauri-carbon',
    maker: 'Elegoo',
    model: 'Elegoo Centauri Carbon',
    xMm: 256,
    yMm: 256,
    group: 'full-size',
  },
  { id: 'sovol-sv06', maker: 'Sovol', model: 'Sovol SV06', xMm: 220, yMm: 220, group: 'full-size' },
  { id: 'sovol-sv06-ace', maker: 'Sovol', model: 'Sovol SV06 ACE', xMm: 220, yMm: 220, group: 'full-size' },
  {
    id: 'flashforge-adventurer-5m',
    maker: 'Flashforge',
    model: 'Flashforge Adventurer 5M',
    xMm: 220,
    yMm: 220,
    group: 'full-size',
  },
];

/** The makers in the order the page lists them (D170), each with its printers in the list's order. */
export const MAKERS: readonly { id: string; name: string; printers: readonly Printer[] }[] = [
  'Prusa',
  'Bambu Lab',
  'Creality',
  'Anycubic',
  'Elegoo',
  'Sovol',
  'Flashforge',
].map((name) => ({
  id: name.toLowerCase().replace(/ /g, '-'),
  name,
  printers: PRINTERS.filter((p) => p.maker === name),
}));

/** A model as its button shows it, under its maker: without the maker's name, or "Original" before it. */
export function modelLabel(p: Printer): string {
  return p.model
    .replace(/^Original /, '')
    .replace(new RegExp(`^${p.maker} `), '')
    .trim();
}
