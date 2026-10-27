// 色值按界面角色组织；面积比例是构图起点，不是无障碍标准。
export const COMPOSITION_PRESETS = [
  {
    id: 'clear-blue', name: '清亮工作台', note: '纯白铺底，暖白分区，蓝色承担主要操作。',
    colors: { background: '#FFFFFF', surface: '#FFFDF5', ink: '#171A20', muted: '#475467', accent: '#0043CE' },
    ratios: { background: 80, surface: 15, accent: 5 },
  },
  {
    id: 'warm-vermillion', name: '暖白与朱砂', note: '干净暖白与深朱红，适合阅读与重点批注。',
    colors: { background: '#FFFDF5', surface: '#FFF3DA', ink: '#211B18', muted: '#584A40', accent: '#9E1D1C' },
    ratios: { background: 85, surface: 10, accent: 5 },
  },
  {
    id: 'jade-ivory', name: '翡翠与象牙', note: '白色留白、象牙辅助面，让翡翠小面积出场。',
    colors: { background: '#FFFFFF', surface: '#FBFFF2', ink: '#14251E', muted: '#435B50', accent: '#008E6B' },
    ratios: { background: 75, surface: 20, accent: 5 },
  },
  {
    id: 'ice-magenta', name: '冰蓝与品红', note: '冰蓝组织信息，品红标出需要注意的操作。',
    colors: { background: '#FFFFFF', surface: '#F1F6FF', ink: '#1B2130', muted: '#495773', accent: '#EE1969' },
    ratios: { background: 70, surface: 20, accent: 10 },
  },
];

export const COLOR_ROLES = [
  { key: 'background', label: '页面基底' },
  { key: 'surface', label: '辅助面' },
  { key: 'accent', label: '强调色' },
  { key: 'ink', label: '正文' },
  { key: 'muted', label: '辅助文字' },
];

export const RATIO_PRESETS = [
  { name: '留白阅读', ratios: { background: 85, surface: 10, accent: 5 } },
  { name: '均衡信息', ratios: { background: 70, surface: 20, accent: 10 } },
  { name: '鲜明强调', ratios: { background: 60, surface: 25, accent: 15 } },
];

export const SEMANTIC_COLORS = { success: '#067647', warning: '#8A4B00', danger: '#B42318' };
