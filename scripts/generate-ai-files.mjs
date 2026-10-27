/** Generate public color/type guidance from the same data as the website. */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { GROUPS, LEGACY_COLORS, ALL_COLORS, hexToRgb, hexToHsl, contrastRatio } from '../src/data/colors.js';
import { COMPOSITION_PRESETS, SEMANTIC_COLORS } from '../src/data/compositions.js';
import { USE_CASES } from '../src/data/use-cases.js';
import { FONT_OPTIONS, TYPE_PROFILES } from '../src/data/typography.js';

const root = new URL('../', import.meta.url);
const site = 'https://mappedinfo.github.io/palette-lab/';
const roleCount = new Set(COMPOSITION_PRESETS.flatMap((p) => Object.values(p.colors))).size;
const summary = `全色档案共 **${ALL_COLORS.length} 个去重色值**：经典搭配 ${LEGACY_COLORS.length} 色、界面角色 ${roleCount} 色、语义状态 ${Object.keys(SEMANTIC_COLORS).length} 色。来源之间有重复，同一 HEX 可以承担多个角色。数量直接由数据源生成。`;
const features = [
  '使用场合（#usage）：科研、汇报、艺术三种情境，共用配比与字号样张的场景选择。',
  '配比实验（#composition）：调整基底／辅助面／强调色，合计100%；自定义五种角色色，工作台／阅读页预览，检查实际文字组合，复制CSS／下载JSON。面积条是精确比例，页面预览不代表实际像素面积。',
  '字号字体（#typography）：按场景比较标题、正文、图注与数字，区分原始 pt／px 和屏幕显示缩放；导出保留原始字号。系统默认与三款OFL字体可选，外部字体只在选择后加载。',
  `全色档案（#palette）：${ALL_COLORS.length} 个去重色值，保留来源与角色，支持搜索和来源筛选，查看HEX／RGB／HSL／黑白底对比度与复制。`,
  `经典搭配（#groups）：保留${GROUPS.length}组灵感搭配；任意两色可全屏比较，拖动分割线；方向键换色，S交换，R随机，Esc关闭。搭配不自动成为定量色图。`,
  '全屏剧场：遍历完整档案，点击复制色值。',
  '图片提色（#extract）：拖入、粘贴或选择图片，本地Canvas解析主色；框选、涂抹、吸管、色带四种工具可多次保存独立结果和逐项删除。',
  '提色报告：复制Markdown或下载报告，保留自动／手动主色、各条色带、使用建议与最近档案色映射。最近色和模拟色觉警告不代表完整可读性认证。',
  '全屏提取：以鼠标为中心缩放、空格／中键平移、双击／适应复位，手动提取按缩放坐标映射。图片不上传。',
  '网站UI主题由prefers-color-scheme决定并实时监听系统变化；旧手动主题缓存不参与。自选配色画布保持独立。',
];
const colors = ALL_COLORS.map((c) => {
  const hsl = hexToHsl(c.hex);
  return `| ${c.hex} | ${c.name} | ${hexToRgb(c.hex).join(', ')} | ${hsl.h}° ${hsl.s}% ${hsl.l}% | ${c.roles.join('、')} | ${contrastRatio(c.hex, '#FFFFFF').toFixed(2)}:1 | ${contrastRatio(c.hex, '#000000').toFixed(2)}:1 | ${c.origins.join(' / ')} |`;
}).join('\n');
const contexts = USE_CASES.map((c) => `### ${c.name}\n${c.summary}\n${c.goals.map((g) => `- ${g}`).join('\n')}\n- ${c.avoid}\n${c.references.map((ref) => `参考：${ref.name} ${ref.url}`).join('\n')}`).join('\n\n');
const types = Object.entries(TYPE_PROFILES).map(([id, p]) => `- ${USE_CASES.find((c) => c.id === id).name}：${p.name}；${Object.entries(p.sizes).map(([key, n]) => `${key} ${n}${p.unit}`).join(' / ')}；样张缩放${p.zoom * 100}%。${p.note}`).join('\n');
const fonts = FONT_OPTIONS.map((f) => `- ${f.name}：${f.license}。${f.note}${f.licenseUrl ? ` 许可：${f.licenseUrl}` : ''}`).join('\n');
const entry = `# Palette Lab · 色卡实验室\n\n${summary}\n\n- 网站：${site}\n- 完整档案：${site}llms-full.txt\n- 源码：https://github.com/Mappedinfo/palette-lab\n\n## 站点能力\n${features.map((f, i) => `${i + 1}. ${f}`).join('\n')}\n\n## 使用边界\n颜色按用途和实际角色判断。正文对比度4.5:1只评价相应组合，不证明色盲可区分、投影可读或定量映射有效。字体文件保留各自许可，网站不分发商业字体。\n`;
const full = `${entry}\n## 颜色总表\n\n| HEX | 名称 | RGB | HSL | 角色 | 白底对比度 | 黑底对比度 | 来源 |\n|---|---|---|---|---|---|---|---|\n${colors}\n\n## 经典搭配\n${GROUPS.map((g) => `- ${g.name}：${g.colors.map((c) => c.hex).join(' + ')}。${g.note}`).join('\n')}\n\n## 配比起点\n${COMPOSITION_PRESETS.map((p) => `- ${p.name}：${Object.entries(p.colors).map(([key, hex]) => `${key} ${hex}`).join(' / ')}；面积${p.ratios.background}/${p.ratios.surface}/${p.ratios.accent}。`).join('\n')}\n\n## 按用途选择\n${contexts}\n\n## 字号样张\n${types}\n\npt按1pt=4/3 CSS px作屏幕展示；显示缩放不改变导出数值。上述尺寸是起点，不代替期刊、投影或媒介规范。\n\n## 字体与许可\n${fonts}\n\n默认不加载外部字体；选择开源字体后从Google Fonts按需加载。连接失败使用系统回退并显示状态。分发字体文件需遵守其相应许可。\n`;
writeFileSync(new URL('public/llms.txt', root), entry);
writeFileSync(new URL('public/llms-full.txt', root), full);
const readme = new URL('README.md', root);
const source = readFileSync(readme, 'utf8');
const marker = /<!-- archive-summary:start -->[\s\S]*?<!-- archive-summary:end -->/;
if (!marker.test(source)) throw new Error('README archive summary marker is missing');
writeFileSync(readme, source.replace(marker, `<!-- archive-summary:start -->\n${summary}\n<!-- archive-summary:end -->`));
console.log(`Generated color/type guidance from ${ALL_COLORS.length} unique colors and ${FONT_OPTIONS.length} font choices in ${fileURLToPath(root)}`);
