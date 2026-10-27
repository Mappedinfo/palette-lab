import { COMPOSITION_PRESETS, COLOR_ROLES, SEMANTIC_COLORS } from './compositions.js';

// ─── Palette Lab 数据层 ────────────────────────────────────────────────
// 经典搭配保留稳定组 ID；全色档案同时纳入界面角色色和语义色，按 HEX 去重。

export const GROUPS = [
  {
    id: 1,
    name: '晨光',
    en: 'Morning Glow',
    note: '奶油黄与天蓝的暖冷对话，适合柔和渐变与图例底色。',
    colors: [
      { hex: '#FFE59D', name: '奶油黄', en: 'Cream' },
      { hex: '#64BBCF', name: '天蓝', en: 'Sky' },
    ],
  },
  {
    id: 2,
    name: '琥珀',
    en: 'Amber',
    note: '高饱和琥珀强调色，单独出场即焦点，适合标注关键数值。',
    colors: [{ hex: '#FFD15D', name: '琥珀', en: 'Amber' }],
  },
  {
    id: 3,
    name: '宣纸与朱砂',
    en: 'Rice Paper & Vermilion',
    note: '米白底配深朱红，对比度 6.47:1，学术严谨感的首选。',
    colors: [
      { hex: '#F5E6D0', name: '宣纸', en: 'Rice Paper' },
      { hex: '#9E1D1C', name: '朱砂', en: 'Vermilion' },
    ],
  },
  {
    id: 4,
    name: '冰蓝与品红',
    en: 'Ice & Magenta',
    note: '冷色底与鲜明强调，适合汇报重点或艺术对照；不预设阴性／阳性含义。',
    colors: [
      { hex: '#F1F6FF', name: '冰蓝', en: 'Ice' },
      { hex: '#EE1969', name: '品红', en: 'Magenta' },
    ],
  },
  {
    id: 5,
    name: '薄荷与珊瑚',
    en: 'Mint & Coral',
    note: '青绿与橙红的暖冷对照，适合表现力强的版面；文字需另查对比度。',
    colors: [
      { hex: '#90E0D6', name: '薄荷', en: 'Mint' },
      { hex: '#E97A46', name: '珊瑚', en: 'Coral' },
    ],
  },
  {
    id: 6,
    name: '香芋与青草',
    en: 'Lilac & Grass',
    note: '淡紫铺底、草绿点睛，自然的亲和配色，适合生态主题。',
    colors: [
      { hex: '#F2E1FF', name: '香芋', en: 'Lilac' },
      { hex: '#61AC4C', name: '青草', en: 'Grass' },
    ],
  },
  {
    id: 7,
    name: '紫罗兰与靛蓝',
    en: 'Violet & Indigo',
    note: '同族冷色深浅呼应，稳重优雅，适合层级化数据。',
    colors: [
      { hex: '#CCA4E3', name: '紫罗兰', en: 'Violet' },
      { hex: '#6583E0', name: '靛蓝', en: 'Indigo' },
    ],
  },
  {
    id: 8,
    name: '翡翠与象牙',
    en: 'Jade & Ivory',
    note: '深翡翠与象牙白的克制组合，高端、清爽、留白感强。',
    colors: [
      { hex: '#008E6B', name: '翡翠', en: 'Jade' },
      { hex: '#FBFFF2', name: '象牙', en: 'Ivory' },
    ],
  },
];

export const LEGACY_COLORS = GROUPS.flatMap((g) =>
  g.colors.map((c) => ({ ...c, group: g.id, groupName: g.name }))
);

const COLOR_NAMES = {
  '#FFFFFF': ['纯白', 'White'], '#FFFDF5': ['清暖白', 'Warm White'], '#171A20': ['近黑', 'Ink'],
  '#475467': ['石板文字', 'Slate'], '#0043CE': ['操作蓝', 'Action Blue'], '#FFF3DA': ['暖米黄', 'Cream Surface'],
  '#211B18': ['暖墨', 'Warm Ink'], '#584A40': ['棕灰文字', 'Warm Gray'], '#14251E': ['深绿墨', 'Green Ink'],
  '#435B50': ['绿灰文字', 'Green Gray'], '#1B2130': ['靛墨', 'Indigo Ink'], '#495773': ['蓝灰文字', 'Blue Gray'],
  '#067647': ['成功绿', 'Success'], '#8A4B00': ['警示赭', 'Warning'], '#B42318': ['错误红', 'Danger'],
};

const registry = new Map();
function addColor(color, family, origin, role) {
  const hex = color.hex.toUpperCase();
  if (!registry.has(hex)) registry.set(hex, { ...color, hex, families: [], origins: [], roles: [] });
  const entry = registry.get(hex);
  if (!entry.families.includes(family)) entry.families.push(family);
  if (!entry.origins.includes(origin)) entry.origins.push(origin);
  if (role && !entry.roles.includes(role)) entry.roles.push(role);
}
for (const color of LEGACY_COLORS) addColor(color, 'classic', `经典 · ${color.groupName}`, '搭配色');
for (const preset of COMPOSITION_PRESETS) {
  for (const { key, label } of COLOR_ROLES) {
    const hex = preset.colors[key].toUpperCase();
    const [name, en] = COLOR_NAMES[hex] || [label, key];
    addColor({ hex, name, en, group: null, groupName: '界面角色' }, 'interface', preset.name, label);
  }
}
for (const hex of Object.values(SEMANTIC_COLORS)) {
  const [name, en] = COLOR_NAMES[hex];
  addColor({ hex, name, en, group: null, groupName: '语义状态' }, 'semantic', '界面语义', name);
}
export const ALL_COLORS = [...registry.values()];

// ─── 色彩解析工具 ──────────────────────────────────────────────────────

export function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
}

export function hexToHsl(hex) {
  const [r, g, b] = hexToRgb(hex).map((v) => v / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      default: h = (r - g) / d + 4;
    }
    h *= 60;
  }
  return {
    h: Math.round(h),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

export function luminance(hex) {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a, b) {
  const la = luminance(a);
  const lb = luminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

export function isLight(hex) {
  return luminance(hex) > 0.5;
}

export function textOn(hex) {
  return contrastRatio(hex, '#000000') >= contrastRatio(hex, '#FFFFFF') ? '#000000' : '#FFFFFF';
}
