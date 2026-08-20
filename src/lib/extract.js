/**
 * 色彩提取核心算法库：纯函数、无 DOM 依赖，可在 Node / 浏览器共用。
 * - extractPaletteFromImageData：中位切分（median cut）主色提取
 * - recommendForPlotting：绘图建议（对比度 / 强调 / 色盲 / 档案映射）
 */
import { GROUPS, ALL_COLORS, hexToRgb, hexToHsl, luminance, contrastRatio } from '../data/colors.js';

// ─── 基础色空间工具 ────────────────────────────────────────────────────

export function rgbToHex([r, g, b]) {
  return (
    '#' +
    [r, g, b]
      .map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase()
  );
}

/** 欧氏距离（RGB 空间） */
function rgbDist(a, b) {
  return Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2);
}

/** 色相距离（0-180） */
function hueDist(h1, h2) {
  const d = Math.abs(h1 - h2);
  return Math.min(d, 360 - d);
}

/** 感知近似色差（RGB 加权，接近 deltaE 直觉） */
export function colorDist(a, b) {
  const rmean = (a[0] + b[0]) / 2;
  const dr = a[0] - b[0];
  const dg = a[1] - b[1];
  const db = a[2] - b[2];
  return Math.sqrt(
    ((2 + rmean / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rmean) / 256) * db * db)
  );
}

// ─── 主色提取（中位切分 Median Cut）────────────────────────────────────

/**
 * 从 ImageData 提取主色。
 * @param {ImageData} imageData
 * @param {number} targetCount 期望主色数量
 * @param {object} opts { ignoreWhite: 是否忽略接近白的背景, ignoreNearWhite: 阈值 0-255 }
 * @returns {Array<{hex, rgb, weight, hsl}>} 按占比降序
 */
export function extractPaletteFromImageData(imageData, targetCount = 8, opts = {}) {
  const { ignoreNearWhite = 235, ignoreNearBlack = 12 } = opts;
  const { data, width, height } = imageData;

  // 1. 采样像素（跳过透明/近白/近黑，可选）
  const pixels = [];
  const skip = Math.max(1, Math.floor(Math.sqrt((width * height) / 20000)));
  for (let y = 0; y < height; y += skip) {
    for (let x = 0; x < width; x += skip) {
      const i = (y * width + x) * 4;
      const a = data[i + 3];
      if (a < 128) continue; // 透明跳过
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      // 背景抑制：接近纯白/纯黑的像素参与计数但权重低（用于背景识别）
      const nearWhite = r > ignoreNearWhite && g > ignoreNearWhite && b > ignoreNearWhite;
      const nearBlack = r < ignoreNearBlack && g < ignoreNearBlack && b < ignoreNearBlack;
      pixels.push({ rgb: [r, g, b], weight: nearWhite || nearBlack ? 0.35 : 1 });
    }
  }
  if (pixels.length < 4) return [];

  // 2. 中位切分
  const boxes = medianCut(pixels, targetCount);

  // 3. 合并相近色（感知距离 < 40 视为同色）
  const merged = mergeSimilar(boxes, 40);

  // 4. 组装结果
  const totalWeight = merged.reduce((s, b) => s + b.weight, 0);
  return merged
    .map((b) => {
      const rgb = [b.r, b.g, b.b].map((v) => Math.round(v));
      const hex = rgbToHex(rgb);
      return {
        hex,
        rgb,
        weight: b.weight / totalWeight,
        hsl: hexToHsl(hex),
      };
    })
    .sort((a, b) => b.weight - a.weight);
}

/** 中位切分：把像素集递归切成 targetCount 个盒子，返回盒子均值 */
function medianCut(pixels, targetCount) {
  // 每个像素展开成 [r,g,b,w]
  let boxes = [pixels];
  while (boxes.length < targetCount) {
    // 选像素最多（或通道跨度最大）的盒子切
    let bestIdx = 0;
    let bestScore = -1;
    boxes.forEach((box, i) => {
      const score = box.length * channelRange(box);
      if (score > bestScore) {
        bestScore = score;
        bestIdx = i;
      }
    });
    const box = boxes[bestIdx];
    if (box.length < 2) break;
    const ch = widestChannel(box);
    const sorted = [...box].sort((a, b) => a.rgb[ch] - b.rgb[ch]);
    const mid = Math.floor(sorted.length / 2);
    // 权重向中位靠拢，避免空盒
    boxes[bestIdx] = sorted.slice(0, mid);
    boxes.push(sorted.slice(mid));
  }
  return boxes.map(averageBox);
}

function channelRange(box) {
  let min = [255, 255, 255];
  let max = [0, 0, 0];
  for (const p of box) {
    for (let c = 0; c < 3; c++) {
      if (p.rgb[c] < min[c]) min[c] = p.rgb[c];
      if (p.rgb[c] > max[c]) max[c] = p.rgb[c];
    }
  }
  return Math.max(max[0] - min[0], max[1] - min[1], max[2] - min[2]);
}

function widestChannel(box) {
  let min = [255, 255, 255];
  let max = [0, 0, 0];
  for (const p of box) {
    for (let c = 0; c < 3; c++) {
      if (p.rgb[c] < min[c]) min[c] = p.rgb[c];
      if (p.rgb[c] > max[c]) max[c] = p.rgb[c];
    }
  }
  const ranges = [max[0] - min[0], max[1] - min[1], max[2] - min[2]];
  return ranges.indexOf(Math.max(...ranges));
}

function averageBox(box) {
  let r = 0;
  let g = 0;
  let b = 0;
  let w = 0;
  for (const p of box) {
    r += p.rgb[0] * p.weight;
    g += p.rgb[1] * p.weight;
    b += p.rgb[2] * p.weight;
    w += p.weight;
  }
  return { r: r / w, g: g / w, b: b / w, weight: w };
}

/** 合并感知距离过近的盒子（加权平均） */
function mergeSimilar(boxes, threshold) {
  const result = [];
  for (const box of boxes) {
    let merged = false;
    for (const existing of result) {
      if (colorDist([box.r, box.g, box.b], [existing.r, existing.g, existing.b]) < threshold) {
        const total = existing.weight + box.weight;
        existing.r = (existing.r * existing.weight + box.r * box.weight) / total;
        existing.g = (existing.g * existing.weight + box.g * box.weight) / total;
        existing.b = (existing.b * existing.weight + box.b * box.weight) / total;
        existing.weight = total;
        merged = true;
        break;
      }
    }
    if (!merged) result.push({ ...box });
  }
  return result;
}

// ─── 绘图建议 ──────────────────────────────────────────────────────────

const COLORBLIND_MATRICES = {
  protanopia: [
    [0.567, 0.433, 0],
    [0.558, 0.442, 0],
    [0, 0, 1],
  ],
  deuteranopia: [
    [0.625, 0.375, 0],
    [0.7, 0.3, 0],
    [0, 0, 1],
  ],
  tritanopia: [
    [1, 0, 0],
    [0, 0.95, 0.05],
    [0, -0.108, 1.108],
  ],
};

/** 模拟色盲视角的 RGB */
export function simulateColorblind(rgb, type) {
  const m = COLORBLIND_MATRICES[type];
  if (!m) return rgb;
  const [r, g, b] = rgb;
  return m.map((row) => Math.max(0, Math.min(255, row[0] * r + row[1] * g + row[2] * b)));
}

/**
 * 绘图建议：
 * @param {Array} palette extractPaletteFromImageData 的输出
 * @returns {{fillColors, textColors, accent, colorblindWarnings, archiveMatches}}
 */
export function recommendForPlotting(palette) {
  const fillColors = palette.slice(0, 6).map((c) => ({ ...c, role: '填充' }));

  // 文字色：找与背景（最亮/最暗主色）对比度 ≥ 4.5 的候选
  const bgCandidates = palette.slice(0, 4);
  const textColors = [];
  for (const bg of bgCandidates) {
    const bgRgb = hexToRgb(bg.hex);
    const darkBg = luminance(bg.hex) < 0.4;
    // 文字候选：若背景深，找浅色文字；反之找深色文字
    const candidates = palette
      .filter((c) => {
        const lum = luminance(c.hex);
        return darkBg ? lum > 0.55 : lum < 0.45;
      })
      .map((c) => ({
        ...c,
        contrast: contrastRatio(c.hex, bg.hex),
        on: bg.hex,
        onName: `背景 ${bg.hex}`,
      }))
      .filter((c) => c.contrast >= 4.5)
      .sort((a, b) => b.contrast - a.contrast);
    if (candidates.length) textColors.push(candidates[0]);
  }
  // 去重
  const seen = new Set();
  const uniqueText = textColors.filter((c) => {
    const key = `${c.hex}-${c.on}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // 强调色：饱和度最高的主色（排除近灰）
  const accent =
    [...palette]
      .filter((c) => c.hsl.s > 30)
      .sort((a, b) => b.hsl.s - a.hsl.s)[0] ?? palette[0];

  // 色盲警告：两两主色在模拟视角下距离过近
  const colorblindWarnings = [];
  for (const type of Object.keys(COLORBLIND_MATRICES)) {
    const simulated = palette.map((c) => ({
      ...c,
      sim: simulateColorblind(c.rgb, type),
    }));
    for (let i = 0; i < simulated.length; i++) {
      for (let j = i + 1; j < simulated.length; j++) {
        const d = colorDist(simulated[i].sim, simulated[j].sim);
        if (d < 30) {
          colorblindWarnings.push({
            type,
            a: simulated[i],
            b: simulated[j],
            dist: Math.round(d),
          });
        }
      }
    }
  }
  // 去重：同对多类型只留一个
  const uniqueWarnings = [];
  const seenPairs = new Set();
  for (const w of colorblindWarnings) {
    const key = [w.a.hex, w.b.hex].sort().join('-');
    if (!seenPairs.has(key)) {
      seenPairs.add(key);
      uniqueWarnings.push({ ...w, types: [w.type] });
    } else {
      const existing = uniqueWarnings.find((u) => [u.a.hex, u.b.hex].sort().join('-') === key);
      existing.types.push(w.type);
    }
  }

  // 档案映射：每个主色找 15 色档案里最接近的颜色
  const archiveMatches = palette.slice(0, 6).map((c) => {
    let best = null;
    let bestDist = Infinity;
    for (const a of ALL_COLORS) {
      const d = colorDist(hexToRgb(c.hex), hexToRgb(a.hex));
      if (d < bestDist) {
        bestDist = d;
        best = a;
      }
    }
    return {
      ...c,
      match: best,
      dist: Math.round(bestDist),
    };
  });

  return {
    fillColors,
    textColors: uniqueText.slice(0, 3),
    accent,
    colorblindWarnings: uniqueWarnings.slice(0, 4),
    archiveMatches,
    groups: GROUPS,
  };
}

/** 把图片文件解码为 ImageData（内部用，浏览器环境） */
export async function fileToImageData(file, maxDim = 800) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = url;
    });
    const scale = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.max(1, Math.round(img.naturalWidth * scale));
    const h = Math.max(1, Math.round(img.naturalHeight * scale));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, w, h);
    return ctx.getImageData(0, 0, w, h);
  } finally {
    URL.revokeObjectURL(url);
  }
}

// ─── 手动精提：区域主色 / 点采样 / 沿线采样 ───────────────────────────

/** 取像素（含边界保护） */
function pixelAt(imageData, x, y) {
  const { data, width, height } = imageData;
  if (x < 0 || y < 0 || x >= width || y >= height) return null;
  const i = (y * width + x) * 4;
  return [data[i], data[i + 1], data[i + 2]];
}

/**
 * 点采样：取 (x,y) 周围 radius 半径邻域的平均色（吸管工具）。
 */
export function samplePoint(imageData, x, y, radius = 4) {
  const { width, height } = imageData;
  let r = 0;
  let g = 0;
  let b = 0;
  let n = 0;
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      const p = pixelAt(imageData, x + dx, y + dy);
      if (p) {
        r += p[0];
        g += p[1];
        b += p[2];
        n++;
      }
    }
  }
  if (!n) return null;
  const rgb = [r / n, g / n, b / n].map((v) => Math.round(v));
  const hex = rgbToHex(rgb);
  return { hex, rgb, hsl: hexToHsl(hex) };
}

/**
 * 区域主色：对给定像素集合做中位切分，返回占比最高的 1~n 个代表色。
 * @param {ImageData} imageData
 * @param {Array<[x,y]>} points 区域内像素坐标
 * @param {number} count 返回代表色数量
 * @param {object} opts { minDistance: 合并阈值 }
 */
export function dominantColorInRegion(imageData, points, count = 1, opts = {}) {
  const { minDistance = 40 } = opts;
  if (!points.length) return [];
  // 去重像素 + 采样上限（避免超大数据）
  const seen = new Set();
  const sampled = [];
  const step = Math.max(1, Math.floor(points.length / 6000));
  for (let i = 0; i < points.length; i += step) {
    const [x, y] = points[i];
    const key = `${x},${y}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const p = pixelAt(imageData, x, y);
    if (p) sampled.push({ rgb: p, weight: 1 });
  }
  if (!sampled.length) return [];
  const boxes = medianCut(sampled, count);
  const merged = mergeSimilar(boxes, minDistance);
  const total = merged.reduce((s, b) => s + b.weight, 0);
  return merged
    .sort((a, b) => b.weight - a.weight)
    .slice(0, count)
    .map((b) => {
      const rgb = [b.r, b.g, b.b].map((v) => Math.round(v));
      const hex = rgbToHex(rgb);
      return { hex, rgb, hsl: hexToHsl(hex), weight: b.weight / total };
    });
}

/**
 * 沿线采样：沿折线路径等距取 n 个采样点，每点邻域平均（色带工具）。
 * 返回按路径顺序排列的颜色，并剔除与前一色过于接近的重复项。
 * @param {ImageData} imageData
 * @param {Array<[x,y]>} path 折线顶点（图片坐标）
 * @param {number} count 期望采样点数
 * @param {object} opts { radius: 邻域半径, minDelta: 去重阈值, includePos: 是否附带路径位置 }
 */
export function sampleLineColors(imageData, path, count = 8, opts = {}) {
  const { radius = 5, minDelta = 12, includePos = false } = opts;
  if (path.length < 2 || count < 2) return [];

  // 1. 计算折线累积长度
  const segLens = [];
  let total = 0;
  for (let i = 1; i < path.length; i++) {
    const dx = path[i][0] - path[i - 1][0];
    const dy = path[i][1] - path[i - 1][1];
    const l = Math.sqrt(dx * dx + dy * dy);
    segLens.push(l);
    total += l;
  }
  if (total < 1) return [];

  // 2. 等距取采样点
  const samples = [];
  for (let k = 0; k < count; k++) {
    const target = (k / (count - 1)) * total;
    let acc = 0;
    let pos = [path[0][0], path[0][1]];
    for (let i = 0; i < segLens.length; i++) {
      if (acc + segLens[i] >= target || i === segLens.length - 1) {
        const t = segLens[i] ? (target - acc) / segLens[i] : 0;
        pos = [
          path[i][0] + (path[i + 1][0] - path[i][0]) * t,
          path[i][1] + (path[i + 1][1] - path[i][1]) * t,
        ];
        break;
      }
      acc += segLens[i];
    }
    const c = samplePoint(imageData, Math.round(pos[0]), Math.round(pos[1]), radius);
    if (c) samples.push({ ...c, pos: k / (count - 1) });
  }

  // 3. 剔除相邻过近的颜色（保留首尾）
  const result = [];
  for (const s of samples) {
    const last = result[result.length - 1];
    if (last && colorDist(last.rgb, s.rgb) < minDelta && result.length > 1 && s.pos < 0.98) {
      continue;
    }
    result.push(s);
  }
  if (!result.length) return samples;
  return includePos ? result : result.map(({ pos, ...rest }) => rest);
}
