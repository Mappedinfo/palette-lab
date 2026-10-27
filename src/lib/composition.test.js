import test from 'node:test';
import assert from 'node:assert/strict';
import { normaliseRatios, normaliseComposition, contrastChecks, exportComposition, compositionCSS } from './composition.js';
import { COMPOSITION_PRESETS } from '../data/compositions.js';
import { ALL_COLORS, contrastRatio, textOn } from '../data/colors.js';

test('area controls retain a 100 percent total, including out-of-range input', () => {
  for (let surface = -10; surface <= 110; surface += 10) {
    for (let accent = -10; accent <= 110; accent += 10) {
      const r = normaliseRatios({ surface, accent });
      assert.equal(r.background + r.surface + r.accent, 100);
      assert.ok(r.background >= 10 && r.surface >= 0 && r.accent >= 0);
    }
  }
});

test('damaged saved settings recover valid colors and finite ratios', () => {
  const state = normaliseComposition({ presetId: 'missing', colors: { ink: 'bad' }, ratios: { surface: 'bad', accent: Infinity } });
  assert.deepEqual(state, normaliseComposition(null));
});

test('preset choice and user colors survive export without changing the ratios', () => {
  const state = normaliseComposition({ presetId: 'jade-ivory', colors: { accent: '#123abc' }, ratios: { surface: 30, accent: 10 } });
  const exported = exportComposition(state);
  assert.equal(exported.colors.accent, '#123ABC');
  assert.deepEqual(exported.areaRatios, { background: 60, surface: 30, accent: 10 });
  assert.match(compositionCSS(state), /--color-accent: #123ABC;/);
  assert.match(compositionCSS(state), /--area-background: 60%;/);
});

test('all starter palettes support normal text on their actual reading surfaces', () => {
  for (const p of COMPOSITION_PRESETS) {
    assert.ok(contrastChecks({ presetId: p.id }).every((c) => c.passed), p.name);
  }
});

test('unreadable custom text is reported rather than certified', () => {
  const checks = contrastChecks({ colors: { ink: '#FFFFFF', background: '#FFFFFF' } });
  assert.equal(checks[0].ratio, 1);
  assert.equal(checks[0].passed, false);
});

test('archive swatch labels choose the more legible black or white foreground', () => {
  for (const c of ALL_COLORS) {
    const chosen = contrastRatio(c.hex, textOn(c.hex));
    assert.equal(chosen, Math.max(contrastRatio(c.hex, '#000000'), contrastRatio(c.hex, '#FFFFFF')));
    assert.ok(chosen >= 4.5, c.hex);
  }
});
