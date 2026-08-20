/**
 * 把提取结果格式化为 Markdown（纯文本，可直接存为 .md / .txt）。
 * 纯函数、无 DOM 依赖，可在 Node / 浏览器共用。
 */
import { contrastRatio } from '../data/colors.js';

const COLORBLIND_LABEL = {
  protanopia: '红色盲',
  deuteranopia: '绿色盲',
  tritanopia: '蓝黄色盲',
};

function esc(text) {
  return String(text ?? '')
    .replace(/\|/g, '\\|')
    .replace(/\n/g, ' ')
    .trim();
}

function rgbStr(c) {
  return c.rgb ? `rgb(${c.rgb[0]}, ${c.rgb[1]}, ${c.rgb[2]})` : '';
}

function hslStr(c) {
  return c.hsl ? `hsl(${c.hsl.h}°, ${c.hsl.s}%, ${c.hsl.l}%)` : '';
}

function swatchRow(c, extra = '') {
  const cols = [
    `\`${c.hex.toUpperCase()}\``,
    esc(c.name || ''),
    rgbStr(c),
    hslStr(c),
    extra,
  ];
  return `| ${cols.join(' | ')} |`;
}

/**
 * 生成提取报告 Markdown。
 * @param {object} opts
 * @param {string} opts.fileName 原图文件名
 * @param {Array} opts.palette 自动提取主色 [{hex, rgb, hsl, weight}]
 * @param {object|null} opts.advice recommendForPlotting 输出
 * @param {Array} opts.manualColors 手动单色 [{hex, rgb, hsl, tag}]
 * @param {Array} opts.manualLine 色带序列 [{hex, rgb, hsl}]
 */
export function buildExtractMarkdown({ fileName, palette, advice, manualColors, manualLine }) {
  const lines = [];
  const now = new Date();
  const ts = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  lines.push('# Palette Lab · 图片色彩提取报告');
  lines.push('');
  lines.push(`- 来源图片：\`${esc(fileName || '(粘贴/未命名)')}\``);
  lines.push(`- 提取时间：${ts}`);
  lines.push(`- 提取方式：自动解析（中位切分）+ 手动精提（框选/涂抹/吸管/色带）`);
  lines.push(`- 站点：https://mappedinfo.github.io/palette-lab/`);
  lines.push('');

  // 1. 自动提取主色
  if (palette?.length) {
    lines.push('## 1. 自动提取主色');
    lines.push('');
    lines.push('| HEX | 名称 | RGB | HSL | 占比 |');
    lines.push('|---|---|---|---|---|');
    palette.forEach((c) => lines.push(swatchRow(c, c.weight ? `${(c.weight * 100).toFixed(1)}%` : '')));
    lines.push('');
  }

  // 2. 手动提取
  if (manualColors?.length) {
    lines.push('## 2. 手动提取');
    lines.push('');
    lines.push('| HEX | 名称 | RGB | HSL | 工具 |');
    lines.push('|---|---|---|---|---|');
    manualColors.forEach((c) => lines.push(swatchRow(c, esc(c.tag || ''))));
    lines.push('');
  }

  // 3. 色带序列
  if (manualLine?.length >= 2) {
    lines.push('## 3. 色带序列');
    lines.push('');
    lines.push(manualLine.map((c) => `\`${c.hex.toUpperCase()}\``).join(' → '));
    lines.push('');
    lines.push('| # | HEX | RGB | HSL |');
    lines.push('|---|---|---|---|');
    manualLine.forEach((c, i) => {
      lines.push(`| ${i + 1} | \`${c.hex.toUpperCase()}\` | ${rgbStr(c)} | ${hslStr(c)} |`);
    });
    lines.push('');
  }

  // 4. 绘图建议
  if (advice) {
    lines.push('## 4. 绘图建议');
    lines.push('');

    // 文字色
    if (advice.textColors?.length) {
      lines.push('### 可读文字色（对比度 ≥ 4.5:1）');
      lines.push('');
      lines.push('| 文字色 | 背景 | 对比度 |');
      lines.push('|---|---|---|');
      advice.textColors.forEach((c) => {
        lines.push(`| \`${c.hex.toUpperCase()}\` | \`${c.on.toUpperCase()}\` | ${c.contrast.toFixed(2)}:1 |`);
      });
      lines.push('');
    } else {
      lines.push('### 可读文字色（对比度 ≥ 4.5:1）');
      lines.push('');
      lines.push('> 主色中未找到对比度足够的文字色，建议搭配中性深灰/浅灰。');
      lines.push('');
    }

    // 强调色
    if (advice.accent) {
      lines.push('### 建议强调色');
      lines.push('');
      lines.push(
        `- \`${advice.accent.hex.toUpperCase()}\` —— 饱和度最高的主色（S=${advice.accent.hsl.s}%），适合标注关键数据点`
      );
      lines.push('');
    }

    // 色盲提醒
    if (advice.colorblindWarnings?.length) {
      lines.push('### 色盲可区分性提醒');
      lines.push('');
      advice.colorblindWarnings.forEach((w) => {
        const types = (w.types || [w.type]).map((t) => COLORBLIND_LABEL[t] || t).join('、');
        lines.push(`- \`${w.a.hex.toUpperCase()}\` 与 \`${w.b.hex.toUpperCase()}\` 在 ${types}视角下难以区分，建议错开色相。`);
      });
      lines.push('');
    }

    // 档案映射
    if (advice.archiveMatches?.length) {
      lines.push('### 匹配本档案色');
      lines.push('');
      lines.push('| 提取色 | → | 档案色 | 名称 | 色差 |');
      lines.push('|---|---|---|---|---|');
      advice.archiveMatches.forEach((m) => {
        lines.push(
          `| \`${m.hex.toUpperCase()}\` | → | \`${m.match.hex.toUpperCase()}\` | ${esc(m.match.name)} | ${m.dist} |`
        );
      });
      lines.push('');
    }
  }

  // 5. 全部颜色总表（合并去重）
  const all = [];
  const seen = new Set();
  [...(palette || []), ...(manualColors || []), ...(manualLine || [])].forEach((c) => {
    if (c?.hex && !seen.has(c.hex)) {
      seen.add(c.hex);
      all.push(c);
    }
  });
  if (all.length) {
    lines.push('## 5. 全部颜色清单');
    lines.push('');
    lines.push('| HEX | RGB | HSL |');
    lines.push('|---|---|---|');
    all.forEach((c) => {
      lines.push(`| \`${c.hex.toUpperCase()}\` | ${rgbStr(c)} | ${hslStr(c)} |`);
    });
    lines.push('');
  }

  lines.push('---');
  lines.push('*由 Palette Lab 自动生成 · 对比度按 WCAG 2.1 相对亮度公式计算*');
  lines.push('');

  return lines.join('\n');
}
