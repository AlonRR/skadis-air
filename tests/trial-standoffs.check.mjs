// SPDX-FileCopyrightText: 2026 Alon A. Rabinowitz
// SPDX-License-Identifier: MPL-2.0
//
// The checks of tests/test-trial-standoffs.sh, on the trial plate's three standoffs (T274, C463 to C465): the dots are
// pockets in the face that is up as the standoff prints, the board face, and none are in the bed face, which
// keeps all the contact the standoff has. Run by that script, from the repository root, after
// `npm run build -w skadis-air`.
import { loadEngine, makeStandoff, standoffParams } from '../packages/core/dist/index.js';
import {
  DOT_ACROSS_MM,
  DOT_DEEP_MM,
  dotted,
  NUT_TRIAL_MM,
  nutDotPoints,
  nutTrialParams,
  PILOTS,
  standoffDotPoints,
  trialNuts,
  trialStandoffs,
} from '../scripts/test-print/trial-standoffs.mjs';

const engine = await loadEngine();
const H = 15;
const MIN_CONTACT_MM2 = 45;
const DISC_MM2 = (24 / 2) * (DOT_ACROSS_MM / 2) ** 2 * Math.sin((2 * Math.PI) / 24); // a 24-sided disc

const area = (m, z) => m.slice(z).area();
const rings = (m, z) => m.slice(z).toPolygons().length;

/** What is wrong with a trial standoff `solid` of pilot `pilotMm` carrying `count` dots; nothing if it is right. */
function problems(solid, pilotMm, count) {
  return against(solid, makeStandoff(engine, standoffParams({ boards: '1', pilotMm })), count, H);
}

/** The same, against the plain part it was cut from, `h` tall. */
function against(solid, plain, count, h) {
  const out = [];
  // the bed face and the layers above it are the plain standoff's, so the dots took none of its contact
  for (const z of [0.01, 0.1, 0.3, 0.5, 1.5]) {
    if (Math.abs(area(solid, z) - area(plain, z)) > 1e-6)
      out.push(`the section at z ${z} differs from the plain standoff's`);
  }
  if (area(solid, 0.1) < MIN_CONTACT_MM2) out.push(`its bed contact is ${area(solid, 0.1).toFixed(1)} mm2`);
  // under the pockets' floors the standoff is the plain one's too: nothing is printed over a hole
  if (Math.abs(area(solid, h - DOT_DEEP_MM - 0.05) - area(plain, h - DOT_DEEP_MM - 0.05)) > 1e-6) {
    out.push('the dots are deeper than their depth');
  }
  // at the board face each dot is its own closed pocket, in the flat of the ring: whole, clear of the pilot and edge
  const top = h - 0.01;
  if (rings(solid, top) !== rings(plain, top) + count)
    out.push(`${rings(solid, top) - rings(plain, top)} dots, not ${count}`);
  const taken = area(plain, top) - area(solid, top);
  if (Math.abs(taken - count * DISC_MM2) > 0.03 * count * DISC_MM2)
    out.push(`the dots take ${taken.toFixed(2)} mm2 of the top`);
  plain.delete();
  return out;
}

const trial = trialStandoffs(engine);
let checked = 0;
let failed = 0;
const report = (name, found, wantFound) => {
  checked += 1;
  const ok = wantFound ? found.length > 0 : found.length === 0;
  if (!ok) failed += 1;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${found.length ? ': ' + found.join('; ') : ''}`);
};

// the real ones: nothing wrong with any
trial.forEach(({ name, solid }, k) => report(name, problems(solid, PILOTS[k], k + 1), false));
// the control: the same dots cut into the bed face, as before, must be found wrong
PILOTS.forEach((pilotMm, k) => {
  const plain = makeStandoff(engine, standoffParams({ boards: '1', pilotMm }));
  const old = dotted(engine, plain, standoffDotPoints(), k + 1, DOT_ACROSS_MM);
  report(`control: ${k + 1} dot(s) in the bed face`, problems(old, pilotMm, k + 1), true);
});
// the control for the count: one dot short must be found wrong
{
  const plain = makeStandoff(engine, standoffParams({ boards: '1', pilotMm: PILOTS[1] }));
  const short = dotted(engine, plain, standoffDotPoints(), 1, DOT_ACROSS_MM, H);
  report('control: 1 dot where 2 are expected', problems(short, PILOTS[1], 2), true);
}
// the nut test print (D607 a): each at its seat, its dots in the board face only
const nutPlain = (p) => makeStandoff(engine, nutTrialParams(p.screwMm, p.nutFitMm));
trialNuts(engine).forEach((p) =>
  report(p.name, against(p.solid, nutPlain(p), Math.round(p.nutFitMm * 10), NUT_TRIAL_MM), false),
);
// its control: an M4 one with one dot where its 0.2 mm seat has two
{
  const p = { screwMm: 4, nutFitMm: 0.2 };
  const short = dotted(engine, nutPlain(p), nutDotPoints(4), 1, DOT_ACROSS_MM, NUT_TRIAL_MM);
  report('control: a nut standoff with 1 dot where 2 are expected', against(short, nutPlain(p), 2, NUT_TRIAL_MM), true);
}
console.log(`${checked} checks run, ${checked - failed} passed`);
process.exit(failed === 0 ? 0 : 1);
