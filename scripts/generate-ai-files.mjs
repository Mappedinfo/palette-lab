/**
 * 生成 AI 可读的站点文件（llms.txt / llms-full.txt）
 * 数据全部来自 src/data/colors.js，指标实时计算，与网站保持一致。
 * 用法：node scripts/generate-ai-files.mjs
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { GROUPS, ALL_COLORS, hexToRgb, hexToHsl, luminance, contrastRatio, isLight } from '../src/data/colors.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, '..', 'public');
mkdirSync(publicDir, { recursive: true });

const SITE = 'https://mappedinfo.github.io/palette-lab/';

// ─── 颜色明细行 ─────────────────────────────────────────────────────────
function colorLines() {
  return ALL_COLORS.map((c) => {
    const [r, g, b] = hexToRgb(c.hex);
    const hsl = hexToHsl(c.hex);
    const lum = luminance(c.hex).toFixed(3);
    const onWhite = contrastRatio(c.hex, '#ffffff').toFixed(2);
    const onBlack = contrastRatio(c.hex, '#000000').toFixed(2);
    // 角色分类：亮度主导；浅色基底 > 深色（文字/强调）> 高饱和强调 > 中性数据色
    let role;
    if (lum > 0.75) role = '浅色基底（适合大面积背景/填充）';
    else if (lum < 0.35) role = '深色（适合文字/强调）';
    else if (hsl.s > 70) role = '高饱和强调色（适合数据点/标注，勿作正文）';
    else role = '中性数据色（适合图表序列）';
    return `- ${c.name}（${c.en}）| HEX ${c.hex.toUpperCase()} | RGB ${r},${g},${b} | HSL ${hsl.h}°,${hsl.s}%,${hsl.l}% | 亮度 ${lum} | 白底对比度 ${onWhite}:1 | 黑底对比度 ${onBlack}:1 | ${role} | 所属组 ${c.group}`;
  }).join('\n');
}

// ─── 搭配语义行 ─────────────────────────────────────────────────────────
function groupLines() {
  return GROUPS.map((g) => {
    const hexes = g.colors.map((c) => c.hex.toUpperCase()).join(' + ');
    let ratio = '';
    if (g.colors.length === 2) {
      ratio = ` | 组内对比度 ${contrastRatio(g.colors[0].hex, g.colors[1].hex).toFixed(2)}:1`;
    }
    return `- 组${g.id} ${g.name}（${g.en}）：${hexes}${ratio} — ${g.note}`;
  }).join('\n');
}

// ─── 使用建议 ───────────────────────────────────────────────────────────
const ADVICE = `## AI 配色建议（供生成图表/文档时参考）

### 文字与背景
- 深色文字可用：#9E1D1C（白底对比度 7.94:1，符合 WCAG AAA）、#008E6B（4.13:1，AA）、#EE1969（4.22:1，AA）、#6583E0（3.57:1，大字号可作 AA 大字）。
- 纯白文字（#FFFFFF）在这 15 色上：朱砂 #9E1D1C（7.94:1）、翡翠 #008E6B（4.13:1）、品红 #EE1969（4.22:1）上可读性最好。
- 浅色基底（适合大面积背景/填充）：#FBFFF2、#F1F6FF、#F5E6D0、#F2E1FF、#FFE59D。
- 中性灰（#5C5749 类）不在这 15 色内，如需要辅助灰可自行补充，勿用高饱和色做正文。

### 强调色（少而准）
- 单组强调：琥珀 #FFD15D 或 品红 #EE1969 作为唯一强调色，其他全用灰阶。
- 双色强调：珊瑚 #E97A46 + 翡翠 #008E6B（互补，适合正/负对比）；品红 #EE1969 + 天蓝 #64BBCF（暖冷对照）。
- 避免将 #FFE59D、#90E0D6、#CCA4E3 等高亮浅色用作文字，它们适合填充和渐变。

### 图表序列色（按类别区分）
- 推荐序列：朱砂 #9E1D1C → 靛蓝 #6583E0 → 翡翠 #008E6B → 琥珀 #FFD15D → 品红 #EE1969 → 天蓝 #64BBCF → 珊瑚 #E97A46 → 青草 #61AC4C。
- 若需区分 8 组数据，可用每组强调色：#64BBCF、#FFD15D、#9E1D1C、#EE1969、#E97A46、#61AC4C、#6583E0、#008E6B。

### 深浅主题适配
- 深色背景（#101114）推荐：#90E0D6、#64BBCF、#FFD15D、#E97A46、#90E0D6 等中高亮色做主系列，避免深色 #008E6B、#9E1D1C 直接作数据点。
- 浅色背景（#FBF7F0 类）推荐：#9E1D1C、#008E6B、#6583E0、#EE1969 做主系列，浅色仅作基底。
- 网站本身已实现浅/深双主题切换，可参考其对比度自动计算逻辑。

### 无障碍（WCAG）
- 正文对比度须 ≥ 4.5:1（AA），大字 ≥ 3:1。
- 组 3（#F5E6D0 配 #9E1D1C）与 组 8（#FBFFF2 配 #008E6B）是推荐的正文级搭配。
- 组 1（#FFE59D 配 #64BBCF，1.77:1）仅适合装饰性渐变或大色块，不适合承载文字。`;

// ─── llms.txt（入口索引）───────────────────────────────────────────────
const LLMS_TXT = `# Palette Lab · 色卡实验室

> Mappedinfo 开源的学术配色档案网站：15 个颜色、8 组搭配、逐色解析、全屏比较。
> 本文件是给 AI/爬虫的站点入口；完整数据见 llms-full.txt，或直接访问网页。

- 网站地址：${SITE}
- 完整 AI 数据（推荐读取）：${SITE}llms-full.txt
- 网页版（交互比较/剧场/复制色值）：${SITE}
- 源码仓库：https://github.com/Mappedinfo/palette-lab

## 站点能力
1. 15 色全色档案：每色含 HEX/RGB/HSL、亮度、黑白底对比度、中文名/英文名、所属组。
2. 8 组搭配语义：每组为「基底 + 强调」结构，含组内对比度与使用场景说明。
3. 全屏比较：任意两色同屏对照 + 实时对比度（拖拽分割线，键盘 ←→↑↓ 换色）。
4. 全屏剧场：15 色铺满全屏，hover 显色值、点击复制。
5. 浅色/深色双主题切换，记忆用户偏好。

## 色彩数据速览（15 色）
${colorLines()}

## 搭配分组速览（8 组）
${groupLines()}

## 给 AI 的建议
- 需要逐色指标（对比度、亮度、角色）或搭配建议时，读取 llms-full.txt。
- 生成图表时优先遵循 WCAG 对比度规则：正文 ≥4.5:1，强调色少而准，深/浅主题分别选色。
`;

// ─── llms-full.txt（完整档案）──────────────────────────────────────────
const LLMS_FULL = `# Palette Lab · 完整 AI 色彩档案

站点：${SITE}（Mappedinfo · 开源学术配色档案）
生成时间：自动生成于构建前，数据与网页完全一致。

## 1. 颜色总表（15 色）

${colorLines()}

## 2. 搭配分组（8 组）

${groupLines()}

## 3. 关键对比度矩阵

| 颜色 | 白底对比度 | 黑底对比度 | 亮度 |
|---|---|---|---|
${ALL_COLORS.map((c) => {
  return `| ${c.hex.toUpperCase()} ${c.name} | ${contrastRatio(c.hex, '#ffffff').toFixed(2)}:1 | ${contrastRatio(c.hex, '#000000').toFixed(2)}:1 | ${luminance(c.hex).toFixed(3)} |`;
}).join('\n')}

> 对比度依据 WCAG 2.1 相对亮度公式计算。

## 4. 组内搭配对比度

${GROUPS.filter((g) => g.colors.length === 2).map((g) => {
  return `- 组${g.id} ${g.name}：${g.colors[0].hex.toUpperCase()} ↔ ${g.colors[1].hex.toUpperCase()} = ${contrastRatio(g.colors[0].hex, g.colors[1].hex).toFixed(2)}:1`;
}).join('\n')}

## 5. 使用建议

${ADVICE}

## 6. 站点使用说明（给 AI 访问者）

- 页面结构：Hero（简介）→ 全色档案（#palette）→ 搭配方案（#groups）→ 页脚。
- 交互：点击色卡打开详情；hover 色卡右上角按钮复制色值；分组卡片内「全屏比较」「剧场」按钮进入全屏模式。
- 主题：右上角太阳/月亮按钮切换浅深色，偏好存 localStorage（key: palette-lab-theme）。
- 技术：React 19 + Vite 8 + framer-motion，单页应用，路由为锚点。
`;

writeFileSync(join(publicDir, 'llms.txt'), LLMS_TXT);
writeFileSync(join(publicDir, 'llms-full.txt'), LLMS_FULL);
console.log('✓ public/llms.txt      ', LLMS_TXT.length, 'bytes');
console.log('✓ public/llms-full.txt ', LLMS_FULL.length, 'bytes');
