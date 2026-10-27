import test from 'node:test';
import assert from 'node:assert/strict';
import { ALL_COLORS, LEGACY_COLORS } from '../data/colors.js';
import { COMPOSITION_PRESETS, SEMANTIC_COLORS } from '../data/compositions.js';
import { normaliseTypography, specimenPixels, typographyCSS } from './typography.js';
import { getSystemTheme, subscribeSystemTheme } from './system-theme.js';

test('archive contains every reusable color exactly once and keeps classic identities', () => {
  const expected = new Set([...LEGACY_COLORS.map((c) => c.hex), ...COMPOSITION_PRESETS.flatMap((p) => Object.values(p.colors)), ...Object.values(SEMANTIC_COLORS)].map((h) => h.toUpperCase()));
  assert.deepEqual(new Set(ALL_COLORS.map((c) => c.hex)), expected);
  assert.equal(ALL_COLORS.length, expected.size);
  for (const c of LEGACY_COLORS) assert.equal(ALL_COLORS.find((x) => x.hex === c.hex).group, c.group);
  assert.ok(ALL_COLORS.find((c) => c.hex === '#9E1D1C').families.includes('interface'));
});

test('typography only accepts the font allowlist and bounded finite sizes', () => {
  const state = normaliseTypography('research', { fontId: 'unlicensed-upload', sizes: { body: Infinity, caption: -4 } });
  assert.equal(state.fontId, 'system');
  assert.equal(state.sizes.body, 11);
  assert.equal(state.sizes.caption, 6);
});

test('specimen zoom does not change exported type sizes or units', () => {
  assert.equal(specimenPixels(12, 'pt', 1.5), 24);
  assert.equal(specimenPixels(18, 'px', 1), 18);
  const css = typographyCSS('research', { zoom: 2, sizes: { body: 12 }, fontId: 'noto-sans' });
  assert.match(css, /--font-body: 12pt;/);
  assert.match(css, /Noto Sans SC/);
});

test('system theme responds in both directions and unsubscribes', () => {
  const listeners = new Set();
  const media = { matches: false, addEventListener: (_, f) => listeners.add(f), removeEventListener: (_, f) => listeners.delete(f) };
  const seen = [getSystemTheme(media)];
  const cleanup = subscribeSystemTheme(() => seen.push(getSystemTheme(media)), media);
  for (const matches of [true, false]) { media.matches = matches; for (const f of listeners) f(); }
  assert.deepEqual(seen, ['light', 'dark', 'light']);
  cleanup(); assert.equal(listeners.size, 0);
});
