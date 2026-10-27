import { COMPOSITION_PRESETS, COLOR_ROLES, SEMANTIC_COLORS } from '../data/compositions.js';
import { contrastRatio, textOn } from '../data/colors.js';

export const COMPOSITION_KEY = 'palette-lab-composition-v1';
export const isHex = (value) => typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value);

export function normaliseRatios(value = {}) {
  const number = (v, fallback, max) => Number.isFinite(Number(v))
    ? Math.max(0, Math.min(max, Math.round(Number(v)))) : fallback;
  const surface = number(value.surface ?? 15, 15, 60);
  const accent = number(value.accent ?? 5, 5, 30);
  return { background: 100 - surface - accent, surface, accent };
}

export function normaliseComposition(value) {
  const preset = COMPOSITION_PRESETS.find((p) => p.id === value?.presetId) || COMPOSITION_PRESETS[0];
  const colors = Object.fromEntries(COLOR_ROLES.map(({ key }) => [
    key, isHex(value?.colors?.[key]) ? value.colors[key].toUpperCase() : preset.colors[key],
  ]));
  return { presetId: preset.id, colors, ratios: normaliseRatios(value?.ratios || preset.ratios) };
}

export function contrastChecks(composition) {
  const { colors: c } = normaliseComposition(composition);
  return [
    ['正文 / 页面基底', c.ink, c.background],
    ['正文 / 辅助面', c.ink, c.surface],
    ['辅助文字 / 页面基底', c.muted, c.background],
    ['按钮文字 / 强调色', textOn(c.accent), c.accent],
  ].map(([label, foreground, background]) => {
    const ratio = contrastRatio(foreground, background);
    return { label, foreground, background, ratio, passed: ratio >= 4.5 };
  });
}

export function exportComposition(composition) {
  const state = normaliseComposition(composition);
  return {
    schemaVersion: 1,
    name: COMPOSITION_PRESETS.find((p) => p.id === state.presetId).name,
    colors: { ...state.colors, onAccent: textOn(state.colors.accent), ...SEMANTIC_COLORS },
    areaRatios: state.ratios,
    contrastChecks: contrastChecks(state),
  };
}

export function compositionCSS(composition) {
  const data = exportComposition(composition);
  const declarations = Object.entries(data.colors).map(([key, value]) => {
    const name = key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
    return `  --color-${name}: ${value};`;
  });
  const areas = Object.entries(data.areaRatios).map(([key, value]) => `  --area-${key}: ${value}%;`);
  return `/* Palette Lab — area ratios are composition references, not layout measurements. */
:root {
${[...declarations, ...areas].join('\n')}
}
`;
}
