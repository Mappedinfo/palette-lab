import { FONT_OPTIONS, TYPE_PROFILES, TYPE_ROLES } from '../data/typography.js';

export function normaliseTypography(context, input = {}) {
  const profile = TYPE_PROFILES[context] || TYPE_PROFILES.research;
  const sizes = Object.fromEntries(TYPE_ROLES.map(({ key }) => {
    const n = Number(input.sizes?.[key] ?? profile.sizes[key]);
    return [key, Number.isFinite(n) ? Math.min(96, Math.max(6, Math.round(n))) : profile.sizes[key]];
  }));
  const font = FONT_OPTIONS.find((f) => f.id === input.fontId) || FONT_OPTIONS[0];
  const zoom = Number(input.zoom ?? profile.zoom);
  return { unit: profile.unit, sizes, fontId: font.id, zoom: Number.isFinite(zoom) ? Math.min(2, Math.max(0.5, zoom)) : profile.zoom, lineHeight: profile.lineHeight };
}
export function specimenPixels(size, unit, zoom) { return size * (unit === 'pt' ? 4 / 3 : 1) * zoom; }
export function typographyCSS(context, input) {
  const state = normaliseTypography(context, input);
  const font = FONT_OPTIONS.find((f) => f.id === state.fontId);
  return `/* Palette Lab: original sizes; specimen zoom is not exported. */
:root {
  --font-family: ${font.family};
${TYPE_ROLES.map(({ key }) => `  --font-${key}: ${state.sizes[key]}${state.unit};`).join('\n')}
  --line-height: ${state.lineHeight};
}
`;
}

const fontRequests = new Map();
export function loadSampleFont(font) {
  if (!font.cssUrl) return Promise.resolve();
  if (fontRequests.has(font.id)) return fontRequests.get(font.id);
  const request = new Promise((resolve, reject) => {
    const link = document.createElement('link');
    link.rel = 'stylesheet'; link.href = font.cssUrl;
    link.onload = async () => {
      try {
        const faces = await document.fonts.load(`16px "${font.loadFamily}"`, '城市观察 ABC123');
        if (!faces.length) throw new Error('Font unavailable');
        resolve();
      } catch (error) { reject(error); }
    };
    link.onerror = () => reject(new Error('Font stylesheet unavailable'));
    document.head.appendChild(link);
  });
  fontRequests.set(font.id, request);
  request.catch(() => fontRequests.delete(font.id));
  return request;
}
