import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brush, Check, ClipboardPaste, Download, Eraser, FileText, ImagePlus,
  Loader2, Maximize2, Minus, MousePointerClick, Plus, RefreshCw, Scan,
  Sparkles, Square, UploadCloud, Slash, X,
} from 'lucide-react';
import {
  extractPaletteFromImageData, fileToImageData, recommendForPlotting,
  simulateColorblind, samplePoint, dominantColorInRegion, sampleLineColors,
} from '../lib/extract.js';
import { buildExtractMarkdown } from '../lib/report.js';
import { contrastRatio, hexToRgb, textOn } from '../data/colors.js';

const COLORBLIND_LABEL = {
  protanopia: '红色盲',
  deuteranopia: '绿色盲',
  tritanopia: '蓝黄色盲',
};

const TOOLS = [
  { id: 'rect', label: '框选', icon: Square, hint: '拖拽框选一个区域，提取区域主色（适合分类图色块）' },
  { id: 'brush', label: '涂抹', icon: Brush, hint: '按住涂抹覆盖目标区域，提取涂抹范围的主色' },
  { id: 'dropper', label: '吸管', icon: MousePointerClick, hint: '点击取色，自动取 5×5 邻域平均色' },
  { id: 'line', label: '色带', icon: Slash, hint: '沿色带拖一条线，等距采样整条渐变色（适合色带图）' },
];

/** 提取结果主色条 */
function PaletteBar({ palette }) {
  return (
    <div className="extract__bar" role="img" aria-label="提取的主色条">
      {palette.map((c, i) => (
        <motion.div
          key={c.hex + i}
          className="extract__bar-seg"
          style={{ background: c.hex, flex: c.weight * 1000 }}
          initial={{ flex: 0 }}
          animate={{ flex: c.weight * 1000 }}
          transition={{ duration: 0.7, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] }}
          title={`${c.hex} ${(c.weight * 100).toFixed(1)}%`}
        />
      ))}
    </div>
  );
}

/** 单色结果卡：色块 + HEX + 占比 + 复制 */
function ResultSwatch({ color, index, onCompare, tag }) {
  const [copied, setCopied] = useState(false);
  const copy = async (e) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(color.hex);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch { /* ignore */ }
  };
  return (
    <motion.div
      className="result-swatch"
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      <div
        className="result-swatch__field"
        style={{ background: color.hex, '--swatch-text': textOn(color.hex) }}
        onClick={() => onCompare(color.hex)}
        title="点击进入全屏比较"
      >
        <span className="hex-chip">{color.hex}</span>
        {tag && <span className="result-swatch__tag">{tag}</span>}
        <button className="result-swatch__copy" onClick={copy} title="复制色值">
          {copied ? '✓' : '⧉'}
        </button>
      </div>
      <div className="result-swatch__meta">
        <span className="result-swatch__pct">
          {color.weight ? `${(color.weight * 100).toFixed(1)}%` : '手动'}
        </span>
        <span className="result-swatch__hsl">
          H{color.hsl.h}° S{color.hsl.s}% L{color.hsl.l}%
        </span>
      </div>
    </motion.div>
  );
}

export default function Extractor({ onCompare }) {
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState(null);
  const [status, setStatus] = useState('idle'); // idle | working | done | error
  const [error, setError] = useState(null);
  const [palette, setPalette] = useState([]);
  const [advice, setAdvice] = useState(null);
  const [tool, setTool] = useState('rect');
  const [lineCount, setLineCount] = useState(8);
  const [manualColors, setManualColors] = useState([]); // 手动提取的单色（多次追加）
  const [manualLines, setManualLines] = useState([]); // 手动提取的色带序列（多条独立保存）
  const fileInputRef = useRef(null);
  const dropRef = useRef(null);
  const canvasRef = useRef(null);
  const wrapRef = useRef(null);
  const fsCanvasRef = useRef(null); // 全屏画布
  const fsWrapRef = useRef(null);
  const imgDataRef = useRef(null); // 原始 ImageData（图片坐标）

  // ── 交互画布状态（ref 避免闭包） ──
  const gesture = useRef(null); // {mode, start, current, points, imgPoints, minX,minY,maxX,maxY}（点均为图片坐标）
  const panning = useRef(null); // {startX, startY, panX, panY}
  const spaceRef = useRef(false); // 空格键按下（平移模式）
  const lastDownRef = useRef({ t: 0, x: 0, y: 0 }); // 双击检测

  // ── 视图状态：缩放 + 平移 ──
  const [view, setView] = useState({ zoom: 1, pan: { x: 0, y: 0 } });
  const [fullscreen, setFullscreen] = useState(false);

  const resetView = useCallback(() => {
    setView({ zoom: 1, pan: { x: 0, y: 0 } });
  }, []);

  /** 图片 contain 基准矩形（zoom=1, pan=0） */
  const baseRect = useCallback((canvas, img) => {
    const cw = canvas.clientWidth;
    const ch = canvas.clientHeight;
    const scale = Math.min(cw / img.width, ch / img.height);
    const dw = img.width * scale;
    const dh = img.height * scale;
    return {
      scale,
      dx: (cw - dw) / 2,
      dy: (ch - dh) / 2,
      cx: cw / 2,
      cy: ch / 2,
    };
  }, []);

  /** canvas CSS 坐标 → ImageData 像素坐标（含 zoom/pan） */
  const cssToImg = useCallback((canvas, cx, cy) => {
    const img = imgDataRef.current;
    if (!canvas || !img) return null;
    const base = baseRect(canvas, img);
    const scale = base.scale * view.zoom;
    const dx = base.cx + (base.dx - base.cx) * view.zoom + view.pan.x;
    const dy = base.cy + (base.dy - base.cy) * view.zoom + view.pan.y;
    return [
      Math.round((cx - dx) / scale),
      Math.round((cy - dy) / scale),
    ];
  }, [baseRect, view]);

  /** ImageData 像素坐标 → canvas CSS 坐标（含 zoom/pan） */
  const imgToCss = useCallback((canvas, ix, iy) => {
    const img = imgDataRef.current;
    if (!canvas || !img) return [0, 0];
    const base = baseRect(canvas, img);
    const scale = base.scale * view.zoom;
    const dx = base.cx + (base.dx - base.cx) * view.zoom + view.pan.x;
    const dy = base.cy + (base.dy - base.cy) * view.zoom + view.pan.y;
    return [ix * scale + dx, iy * scale + dy];
  }, [baseRect, view]);

  // ── 绘制单个画布：图片 + 当前手势覆盖层 ──
  const drawCanvas = useCallback((canvas) => {
    const img = imgDataRef.current;
    const g = gesture.current;
    if (!canvas || !img) return;
    const dpr = window.devicePixelRatio || 1;
    const cw = canvas.clientWidth;
    const ch = canvas.clientHeight;
    if (!cw || !ch) return;
    canvas.width = Math.round(cw * dpr);
    canvas.height = Math.round(ch * dpr);
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cw, ch);

    // 背景棋盘格（透明图）
    ctx.fillStyle = 'rgba(128,128,128,0.15)';
    const cell = 10;
    for (let y = 0; y < ch; y += cell) {
      for (let x = 0; x < cw; x += cell) {
        if ((x / cell + y / cell) % 2 === 0) ctx.fillRect(x, y, cell, cell);
      }
    }

    // 绘制图片（contain + zoom/pan）
    const base = baseRect(canvas, img);
    const scale = base.scale * view.zoom;
    const dw = img.width * scale;
    const dh = img.height * scale;
    const dx = base.cx + (base.dx - base.cx) * view.zoom + view.pan.x;
    const dy = base.cy + (base.dy - base.cy) * view.zoom + view.pan.y;
    const tmp = document.createElement('canvas');
    tmp.width = img.width;
    tmp.height = img.height;
    tmp.getContext('2d').putImageData(img, 0, 0);
    ctx.drawImage(tmp, dx, dy, dw, dh);
    // 图片边界
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 1;
    ctx.strokeRect(dx, dy, dw, dh);

    // 手势覆盖层（点以图片坐标存储，转回 canvas 坐标绘制，随缩放正确）
    if (!g) return;
    if (g.mode === 'rect' && g.start) {
      const [x1, y1] = imgToCss(canvas, g.minX, g.minY);
      const [x2, y2] = imgToCss(canvas, g.maxX, g.maxY);
      const x = Math.min(x1, x2);
      const y = Math.min(y1, y2);
      const w = Math.abs(x2 - x1);
      const h = Math.abs(y2 - y1);
      ctx.fillStyle = 'rgba(238,25,105,0.18)';
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = '#ee1969';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.strokeRect(x, y, w, h);
      ctx.setLineDash([]);
    } else if (g.mode === 'brush' && g.imgPoints.length) {
      ctx.strokeStyle = 'rgba(238,25,105,0.85)';
      ctx.lineWidth = 14 * view.zoom;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      g.imgPoints.forEach(([ix, iy], i) => {
        const [px, py] = imgToCss(canvas, ix, iy);
        i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
      });
      ctx.stroke();
    } else if (g.mode === 'line' && g.imgPoints.length > 1) {
      ctx.strokeStyle = 'rgba(255,255,255,0.95)';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.beginPath();
      g.imgPoints.forEach(([ix, iy], i) => {
        const [px, py] = imgToCss(canvas, ix, iy);
        i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
      });
      ctx.stroke();
      ctx.strokeStyle = '#ee1969';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 5]);
      ctx.stroke();
      ctx.setLineDash([]);
      // 端点
      const sp = g.imgPoints[0];
      const ep = g.imgPoints[g.imgPoints.length - 1];
      for (const [ix, iy] of [sp, ep]) {
        const [px, py] = imgToCss(canvas, ix, iy);
        ctx.beginPath();
        ctx.arc(px, py, 6, 0, Math.PI * 2);
        ctx.fillStyle = '#ee1969';
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    } else if (g.mode === 'dropper' && g.start) {
      const [px, py] = imgToCss(canvas, g.start[0], g.start[1]);
      ctx.beginPath();
      ctx.arc(px, py, 10, 0, Math.PI * 2);
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(px, py, 10, 0, Math.PI * 2);
      ctx.strokeStyle = '#ee1969';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }, [baseRect, imgToCss, view]);

  // ── 重绘两个画布 ──
  const redraw = useCallback(() => {
    if (canvasRef.current) drawCanvas(canvasRef.current);
    if (fsCanvasRef.current) drawCanvas(fsCanvasRef.current);
  }, [drawCanvas]);

  // ── 手势开始（支持普通/全屏两个 canvas，点以图片坐标存储） ──
  const activeCanvas = () => (fullscreen ? fsCanvasRef.current : canvasRef.current);

  const onPointerDown = (e) => {
    if (status !== 'done') return;
    const canvas = activeCanvas();
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const imgPt = cssToImg(canvas, x, y);
    if (!imgPt) return;

    // 双击检测：300ms 内同一点两次按下 → 重置视图，不触发工具
    const now = Date.now();
    const last = lastDownRef.current;
    if (now - last.t < 300 && Math.hypot(x - last.x, y - last.y) < 10) {
      lastDownRef.current = { t: 0, x: 0, y: 0 };
      resetView();
      return;
    }
    lastDownRef.current = { t: now, x, y };

    canvas.setPointerCapture(e.pointerId);

    // 平移模式：空格键按住 或 中键
    if (spaceRef.current || e.button === 1) {
      panning.current = { startX: x, startY: y, panX: view.pan.x, panY: view.pan.y };
      return;
    }

    if (tool === 'dropper') {
      // 吸管：点击即取
      const c = samplePoint(imgDataRef.current, imgPt[0], imgPt[1], 4);
      if (c) {
        setManualColors((prev) => [...prev, { ...c, weight: null, tag: '吸管', id: Date.now() + Math.random() }]);
        gesture.current = { mode: 'dropper', start: imgPt };
        redraw();
        setTimeout(() => {
          gesture.current = null;
          redraw();
        }, 500);
      }
      return;
    }
    gesture.current = {
      mode: tool,
      start: imgPt,
      imgPoints: [imgPt],
      minX: imgPt[0], maxX: imgPt[0], minY: imgPt[1], maxY: imgPt[1],
    };
    redraw();
  };

  const onPointerMove = (e) => {
    const canvas = activeCanvas();
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // 平移
    if (panning.current) {
      const p = panning.current;
      setView((v) => ({
        ...v,
        pan: { x: p.panX + (x - p.startX), y: p.panY + (y - p.startY) },
      }));
      return;
    }

    const g = gesture.current;
    if (!g || g.mode === 'dropper') return;
    const imgPt = cssToImg(canvas, x, y);
    if (!imgPt) return;
    if (g.mode === 'rect') {
      g.minX = Math.min(g.minX, imgPt[0]);
      g.maxX = Math.max(g.maxX, imgPt[0]);
      g.minY = Math.min(g.minY, imgPt[1]);
      g.maxY = Math.max(g.maxY, imgPt[1]);
    } else if (g.mode === 'brush' || g.mode === 'line') {
      const last = g.imgPoints[g.imgPoints.length - 1];
      const dist = Math.hypot(imgPt[0] - last[0], imgPt[1] - last[1]);
      if (dist > 1.5) {
        g.imgPoints.push(imgPt);
        g.minX = Math.min(g.minX, imgPt[0]);
        g.maxX = Math.max(g.maxX, imgPt[0]);
        g.minY = Math.min(g.minY, imgPt[1]);
        g.maxY = Math.max(g.maxY, imgPt[1]);
      }
    }
    redraw();
  };

  const onPointerUp = () => {
    if (panning.current) {
      panning.current = null;
      return;
    }
    const g = gesture.current;
    gesture.current = null;
    if (!g || g.mode === 'dropper') return;
    redraw();
    const img = imgDataRef.current;
    if (!img) return;

    if (g.mode === 'rect') {
      const x0 = Math.max(0, Math.min(g.minX, g.maxX));
      const y0 = Math.max(0, Math.min(g.minY, g.maxY));
      const x1 = Math.min(img.width - 1, Math.max(g.minX, g.maxX));
      const y1 = Math.min(img.height - 1, Math.max(g.minY, g.maxY));
      const points = [];
      for (let y = y0; y <= y1; y++) {
        for (let x = x0; x <= x1; x++) points.push([x, y]);
      }
      if (points.length < 8) return;
      const dom = dominantColorInRegion(img, points, 1);
      if (dom.length) {
        setManualColors((prev) => [...prev, { ...dom[0], weight: null, tag: '框选', id: Date.now() + Math.random() }]);
      }
    } else if (g.mode === 'brush') {
      if (g.imgPoints.length < 4) return;
      const dom = dominantColorInRegion(img, g.imgPoints, 1, { minDistance: 50 });
      if (dom.length) {
        setManualColors((prev) => [...prev, { ...dom[0], weight: null, tag: '涂抹', id: Date.now() + Math.random() }]);
      }
    } else if (g.mode === 'line') {
      if (g.imgPoints.length < 2) return;
      const seq = sampleLineColors(img, g.imgPoints, lineCount, { radius: 5 });
      if (seq.length >= 2) {
        // 每次划线都保存为一条独立色带
        setManualLines((prev) => [...prev, { id: Date.now(), colors: seq }]);
      }
    }
  };

  // ── 滚轮缩放（以鼠标为中心，普通/全屏共用） ──
  const onWheel = useCallback((e) => {
    if (status !== 'done') return;
    const canvas = fullscreen ? fsCanvasRef.current : canvasRef.current;
    if (!canvas || !imgDataRef.current) return;
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const factor = e.deltaY < 0 ? 1.18 : 1 / 1.18;
    setView((v) => {
      const zoom = Math.min(16, Math.max(0.5, v.zoom * factor));
      if (Math.abs(zoom - v.zoom) < 0.001) return v;
      const img = imgDataRef.current;
      const base = baseRect(canvas, img);
      const oldScale = base.scale * v.zoom;
      const oldDx = base.cx + (base.dx - base.cx) * v.zoom + v.pan.x;
      const oldDy = base.cy + (base.dy - base.cy) * v.zoom + v.pan.y;
      const ix = (mx - oldDx) / oldScale;
      const iy = (my - oldDy) / oldScale;
      const newScale = base.scale * zoom;
      const newDx = mx - ix * newScale;
      const newDy = my - iy * newScale;
      return {
        zoom,
        pan: {
          x: newDx - base.cx - (base.dx - base.cx) * zoom,
          y: newDy - base.cy - (base.dy - base.cy) * zoom,
        },
      };
    });
  }, [baseRect, fullscreen, status]);

  // ── 图片处理 ──
  const processFile = useCallback(async (file) => {
    if (!file || !file.type.startsWith('image/')) {
      setStatus('error');
      setError('请选择图片文件（PNG / JPG / WebP / GIF 等）');
      return;
    }
    setStatus('working');
    setError(null);
    setFileName(file.name);
    try {
      await new Promise((r) => setTimeout(r, 60));
      const imageData = await fileToImageData(file, 800);
      imgDataRef.current = imageData;
      const extracted = extractPaletteFromImageData(imageData, 8, {});
      if (!extracted.length) throw new Error('未能从图片中解析出颜色');
      setPalette(extracted);
      setAdvice(recommendForPlotting(extracted));
      setManualColors([]);
      setManualLines([]);
      setStatus('done');
      // 画布绘制由「就绪轮询」effect 负责（AnimatePresence 延迟挂载）
    } catch (e) {
      setStatus('error');
      setError(e.message || '解析失败，请换一张图片试试');
    }
  }, [redraw]);

  // ── 画布尺寸自适应 ──
  useEffect(() => {
    const ro = new ResizeObserver(() => redraw());
    const wraps = [wrapRef.current, fsWrapRef.current].filter(Boolean);
    wraps.forEach((w) => ro.observe(w));
    return () => ro.disconnect();
  }, [redraw, status, fullscreen]);

  // ── 修复：done 视图经 AnimatePresence 延迟挂载，轮询等 canvas 就绪后绘制 ──
  useEffect(() => {
    if (status !== 'done') return;
    let tries = 0;
    const t = setInterval(() => {
      const c = activeCanvas();
      if (c && c.clientWidth > 0 && c.clientHeight > 0) {
        clearInterval(t);
        redraw();
      } else if (++tries > 50) {
        clearInterval(t);
      }
    }, 60);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, redraw, fullscreen]);

  // ── 空格键（平移模式）+ Esc（退出全屏） ──
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.code === 'Space' && status === 'done') {
        spaceRef.current = true;
        e.preventDefault();
      }
      if (e.key === 'Escape') setFullscreen(false);
    };
    const onKeyUp = (e) => {
      if (e.code === 'Space') spaceRef.current = false;
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [status]);

  // ── 滚轮缩放：原生非 passive 监听（React onWheel 无法 preventDefault） ──
  useEffect(() => {
    const bind = (canvas) => {
      if (!canvas) return;
      canvas.addEventListener('wheel', onWheel, { passive: false });
      return canvas;
    };
    const c1 = bind(canvasRef.current);
    const c2 = bind(fsCanvasRef.current);
    return () => {
      c1?.removeEventListener('wheel', onWheel);
      c2?.removeEventListener('wheel', onWheel);
    };
  }, [onWheel, status, fullscreen]);

  // ── 拖拽 ──
  useEffect(() => {
    const el = dropRef.current;
    if (!el) return;
    const onDragOver = (e) => { e.preventDefault(); setDragOver(true); };
    const onDragLeave = (e) => { if (!el.contains(e.relatedTarget)) setDragOver(false); };
    const onDrop = (e) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer?.files?.[0];
      if (file) processFile(file);
    };
    el.addEventListener('dragover', onDragOver);
    el.addEventListener('dragleave', onDragLeave);
    el.addEventListener('drop', onDrop);
    return () => {
      el.removeEventListener('dragover', onDragOver);
      el.removeEventListener('dragleave', onDragLeave);
      el.removeEventListener('drop', onDrop);
    };
  }, [processFile]);

  // ── 全局粘贴 ──
  useEffect(() => {
    const onPaste = (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) {
            e.preventDefault();
            processFile(file);
            return;
          }
        }
      }
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [processFile]);

  const reset = () => {
    setStatus('idle');
    setPalette([]);
    setAdvice(null);
    setError(null);
    setFileName(null);
    setManualColors([]);
    setManualLines([]);
    imgDataRef.current = null;
    gesture.current = null;
  };

  // ── 导出报告（Markdown / 纯文本） ──
  const [copiedReport, setCopiedReport] = useState(false);

  const buildReport = useCallback(() =>
    buildExtractMarkdown({ fileName, palette, advice, manualColors, manualLines }),
  [fileName, palette, advice, manualColors, manualLines]);

  const copyReport = async () => {
    try {
      await navigator.clipboard.writeText(buildReport());
      setCopiedReport(true);
      setTimeout(() => setCopiedReport(false), 1600);
    } catch {
      // 剪贴板不可用时降级：选中文本提示
      const ta = document.createElement('textarea');
      ta.value = buildReport();
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopiedReport(true);
      setTimeout(() => setCopiedReport(false), 1600);
    }
  };

  const downloadReport = () => {
    const base = (fileName || 'palette').replace(/\.[^.]+$/, '');
    const blob = new Blob([buildReport()], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${base}-palette-report.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  };

  const activeTool = TOOLS.find((t) => t.id === tool);

  return (
    <section id="extract" className="section">
      <div className="container">
        <div className="section__head">
          <div>
            <div className="eyebrow" style={{ marginBottom: 10 }}>03 · 色彩提取</div>
            <h2>从图片提取配色</h2>
          </div>
          <p className="section__desc">
            拖入、粘贴（Ctrl/Cmd+V）或选择图片：自动解析主色，再用
            <strong> 框选 / 涂抹 / 吸管 / 色带 </strong>
            四种工具手动精提分类色块与色带渐变色。所有解析都在本地完成，图片不会上传。
          </p>
        </div>

        <div
          ref={dropRef}
          className={`extract__dropzone ${dragOver ? 'extract__dropzone--over' : ''} ${status === 'done' ? 'extract__dropzone--done' : ''}`}
        >
          <AnimatePresence mode="wait">
            {status === 'idle' || status === 'error' ? (
              <motion.div
                key="idle"
                className="extract__empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ duration: 0.3 }}
              >
                <motion.div
                  className="extract__icon"
                  animate={{ y: [0, -8, 0] }}
                  transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <ImagePlus size={34} />
                </motion.div>
                <h3>{dragOver ? '松开鼠标，放进来！' : '拖拽图片到这里'}</h3>
                <p>
                  或 <strong>粘贴（Ctrl/Cmd + V）</strong> 截图，也可以
                  <button className="extract__link" onClick={() => fileInputRef.current?.click()}>
                    选择文件
                  </button>
                </p>
                <div className="extract__hints">
                  <span><ClipboardPaste size={13} /> 支持截图粘贴</span>
                  <span><UploadCloud size={13} /> PNG / JPG / WebP / GIF</span>
                  <span><Sparkles size={13} /> 本地解析 · 不上传</span>
                </div>
                {status === 'error' && (
                  <motion.p className="extract__error" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
                    {error}
                  </motion.p>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) processFile(f);
                    e.target.value = '';
                  }}
                />
              </motion.div>
            ) : status === 'working' ? (
              <motion.div
                key="working"
                className="extract__working"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <Loader2 size={30} className="extract__spin" />
                <p>正在解析「{fileName}」的颜色…</p>
              </motion.div>
            ) : (
              <motion.div
                key="done"
                className="extract__result"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              >
                {/* 左侧：交互画布 + 自动色卡 + 手动结果 */}
                <div className="extract__result-main">
                  {/* 工具条（画布外部，避免遮挡交互区域） */}
                  <div className="extract__toolbar">
                    {TOOLS.map((t) => {
                      const Icon = t.icon;
                      return (
                        <button
                          key={t.id}
                          className={`extract__tool ${tool === t.id ? 'extract__tool--active' : ''}`}
                          onClick={() => setTool(t.id)}
                          title={t.hint}
                        >
                          <Icon size={14} /> {t.label}
                        </button>
                      );
                    })}
                    {tool === 'line' && (
                      <label className="extract__line-count">
                        采样
                        <select
                          value={lineCount}
                          onChange={(e) => setLineCount(Number(e.target.value))}
                        >
                          {[4, 6, 8, 12, 16].map((n) => (
                            <option key={n} value={n}>{n}</option>
                          ))}
                        </select>
                      </label>
                    )}
                    <button
                      className="extract__tool extract__tool--clear"
                      onClick={() => { setManualColors([]); setManualLines([]); }}
                      disabled={!manualColors.length && !manualLines.length}
                      title="清空手动提取"
                    >
                      <Eraser size={14} /> 清空
                    </button>
                    <button
                      className={`extract__tool extract__tool--export ${copiedReport ? 'extract__tool--exported' : ''}`}
                      onClick={copyReport}
                      disabled={!palette.length}
                      title="复制提取信息（Markdown 格式）"
                    >
                      {copiedReport ? <Check size={14} /> : <FileText size={14} />}
                      {copiedReport ? '已复制' : '复制信息'}
                    </button>
                    <button
                      className="extract__tool extract__tool--export"
                      onClick={downloadReport}
                      disabled={!palette.length}
                      title="下载为 .md 文件"
                    >
                      <Download size={14} /> 下载
                    </button>
                    <button className="extract__tool extract__tool--reload" onClick={reset} title="换一张图片">
                      <RefreshCw size={14} /> 换图
                    </button>
                    <button
                      className="extract__tool extract__tool--fs"
                      onClick={() => setFullscreen(true)}
                      disabled={!palette.length}
                      title="全屏提取（大画布 + 缩放）"
                    >
                      <Maximize2 size={14} /> 全屏
                    </button>
                  </div>

                  <div className="extract__preview-wrap" ref={wrapRef}>
                    <canvas
                      ref={canvasRef}
                      className={`extract__canvas extract__canvas--${tool} ${view.zoom !== 1 ? 'extract__canvas--zoomed' : ''}`}
                      onPointerDown={onPointerDown}
                      onPointerMove={onPointerMove}
                      onPointerUp={onPointerUp}
                      onDoubleClick={() => resetView()}
                    />
                    {view.zoom !== 1 && (
                      <span className="extract__zoom-badge">
                        {Math.round(view.zoom * 100)}% · 双击重置
                      </span>
                    )}
                  </div>

                  <p className="extract__tool-hint">
                    <Scan size={13} /> {activeTool.hint} · 滚轮缩放 · 空格/中键拖拽平移
                  </p>

                  <PaletteBar palette={palette} />

                  {/* 自动提取 */}
                  <div className="extract__block-label">自动提取 · {palette.length} 色</div>
                  <div className="extract__swatches">
                    {palette.map((c, i) => (
                      <ResultSwatch key={c.hex + i} color={c} index={i} onCompare={onCompare} />
                    ))}
                  </div>

                  {/* 手动提取：单色（多次框选/涂抹/吸管，可单独删除） */}
                  {manualColors.length > 0 && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
                      <div className="extract__block-label">手动提取 · {manualColors.length} 色</div>
                      <div className="extract__swatches">
                        {manualColors.map((c, i) => (
                          <div key={c.id ?? `m${i}-${c.hex}`} className="result-swatch-wrap">
                            <ResultSwatch
                              color={c}
                              index={i}
                              onCompare={onCompare}
                              tag={c.tag}
                            />
                            <button
                              className="result-swatch-del"
                              onClick={() => setManualColors((prev) => prev.filter((x) => x !== c))}
                              title={`删除 ${c.hex}`}
                              aria-label={`删除 ${c.hex}`}
                            >
                              <Eraser size={11} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {/* 手动提取：色带（多条独立保存，可单独删除） */}
                  {manualLines.length > 0 && (
                    <motion.div
                      className="extract__lines-result"
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                    >
                      <div className="extract__block-label">色带提取 · {manualLines.length} 条</div>
                      {manualLines.map((line, li) => (
                        <motion.div
                          key={line.id}
                          className="extract__line-result"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.45, delay: li * 0.08, ease: [0.22, 1, 0.36, 1] }}
                        >
                          <div className="extract__line-head">
                            <span className="extract__line-title">色带 {li + 1} · {line.colors.length} 段</span>
                            <button
                              className="result-swatch-del"
                              onClick={() => setManualLines((prev) => prev.filter((x) => x.id !== line.id))}
                              title={`删除色带 ${li + 1}`}
                              aria-label={`删除色带 ${li + 1}`}
                            >
                              <Eraser size={11} /> 删除
                            </button>
                          </div>
                          <div className="extract__line-bar">
                            {line.colors.map((c, i) => (
                              <motion.div
                                key={i}
                                className="extract__line-seg"
                                style={{ background: c.hex }}
                                initial={{ flex: 0 }}
                                animate={{ flex: 1 }}
                                transition={{ duration: 0.5, delay: i * 0.05, ease: [0.22, 1, 0.36, 1] }}
                                title={`${c.hex}`}
                                onClick={() => onCompare(c.hex)}
                              />
                            ))}
                          </div>
                          <div className="extract__line-swatches">
                            {line.colors.map((c, i) => (
                              <ResultSwatch key={i} color={{ ...c, weight: null }} index={i} onCompare={onCompare} />
                            ))}
                          </div>
                        </motion.div>
                      ))}
                    </motion.div>
                  )}
                </div>

                {/* 右侧：绘图建议 */}
                <div className="extract__advice">
                  {advice && (
                    <>
                      <div className="advice-block">
                        <h4><span className="advice-tag advice-tag--text">TEXT</span> 可读文字色（对比度 ≥ 4.5:1）</h4>
                        {advice.textColors.length ? (
                          <div className="advice-text-list">
                            {advice.textColors.map((c, i) => (
                              <div key={i} className="advice-text-item">
                                <span
                                  className="advice-text-swatch"
                                  style={{ background: c.hex, color: c.on, border: '1px solid rgba(128,128,128,0.35)' }}
                                >
                                  Aa
                                </span>
                                <div className="advice-text-info">
                                  <code>{c.hex}</code>
                                  <small>用于 {c.onName} · 对比度 {c.contrast.toFixed(1)}:1</small>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="advice-none">主色中未找到对比度足够的文字色，建议搭配中性深灰/浅灰。</p>
                        )}
                      </div>

                      <div className="advice-block">
                        <h4><span className="advice-tag advice-tag--accent">ACCENT</span> 建议强调色</h4>
                        <div className="advice-accent">
                          <span
                            className="advice-accent-swatch"
                            style={{ background: advice.accent.hex }}
                            onClick={() => onCompare(advice.accent.hex)}
                            title="点击全屏比较"
                          />
                          <div>
                            <code>{advice.accent.hex}</code>
                            <small>饱和度最高的主色（S={advice.accent.hsl.s}%），适合标注关键数据点</small>
                          </div>
                        </div>
                      </div>

                      {advice.colorblindWarnings.length > 0 && (
                        <div className="advice-block">
                          <h4><span className="advice-tag advice-tag--warn">CB</span> 色盲可区分性提醒</h4>
                          {advice.colorblindWarnings.map((w, i) => (
                            <p key={i} className="advice-warn">
                              {w.a.hex} 与 {w.b.hex} 在
                              {w.types.map((t) => COLORBLIND_LABEL[t]).join('、')}
                              视角下难以区分，建议错开色相。
                            </p>
                          ))}
                        </div>
                      )}

                      <div className="advice-block">
                        <h4><span className="advice-tag advice-tag--archive">LIB</span> 匹配本档案色</h4>
                        <div className="advice-archive">
                          {advice.archiveMatches.map((m, i) => (
                            <div key={i} className="advice-archive-row">
                              <span className="advice-archive-src" style={{ background: m.hex }} title={m.hex} />
                              <span className="advice-archive-arrow">→</span>
                              <span
                                className="advice-archive-dst"
                                style={{ background: m.match.hex }}
                                title={`${m.match.hex} ${m.match.name}`}
                              />
                              <span className="advice-archive-name">{m.match.name}</span>
                              <span className="advice-archive-hex">{m.match.hex}</span>
                            </div>
                          ))}
                        </div>
                        <p className="advice-note">
                          提取色与完整档案中的最近色匹配；接近色值不代表该搭配已适合当前用途。
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── 全屏提取模式：大画布 + 自由缩放平移 ── */}
      <AnimatePresence>
        {fullscreen && status === 'done' && (
          <motion.div
            className="extract-fs"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            role="dialog"
            aria-modal="true"
            aria-label="全屏提取"
          >
            {/* 顶栏：工具 + 缩放控件 + 关闭 */}
            <div className="extract-fs__topbar">
              <div className="extract-fs__tools">
                {TOOLS.map((t) => {
                  const Icon = t.icon;
                  return (
                    <button
                      key={t.id}
                      className={`extract__tool ${tool === t.id ? 'extract__tool--active' : ''}`}
                      onClick={() => setTool(t.id)}
                      title={t.hint}
                    >
                      <Icon size={14} /> {t.label}
                    </button>
                  );
                })}
                {tool === 'line' && (
                  <label className="extract__line-count">
                    采样
                    <select value={lineCount} onChange={(e) => setLineCount(Number(e.target.value))}>
                      {[4, 6, 8, 12, 16].map((n) => (
                        <option key={n} value={n}>{n}</option>
                      ))}
                    </select>
                  </label>
                )}
              </div>

              <div className="extract-fs__zoom">
                <button className="pill-btn" onClick={() => setView((v) => ({ ...v, zoom: Math.max(0.5, v.zoom / 1.25) }))} title="缩小">
                  <Minus size={14} />
                </button>
                <span className="extract-fs__zoom-pct">{Math.round(view.zoom * 100)}%</span>
                <button className="pill-btn" onClick={() => setView((v) => ({ ...v, zoom: Math.min(16, v.zoom * 1.25) }))} title="放大">
                  <Plus size={14} />
                </button>
                <button className="pill-btn" onClick={resetView} title="适应窗口 / 双击重置">
                  适应
                </button>
              </div>

              <div className="extract-fs__actions">
                <span className="extract-fs__hint">滚轮缩放 · 空格/中键拖拽平移 · 双击重置</span>
                <button className="pill-btn pill-btn--ghost" onClick={() => setFullscreen(false)} title="退出全屏（Esc）">
                  <X size={15} /> 退出
                </button>
              </div>
            </div>

            {/* 大画布 */}
            <div className="extract-fs__stage" ref={fsWrapRef}>
              <canvas
                ref={fsCanvasRef}
                className={`extract__canvas extract__canvas--${tool} ${view.zoom !== 1 ? 'extract__canvas--zoomed' : ''}`}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onDoubleClick={() => resetView()}
              />
            </div>

            {/* 底部结果条（横向滚动） */}
            <div className="extract-fs__results">
              {palette.map((c, i) => (
                <ResultSwatch key={c.hex + i} color={c} index={i} onCompare={onCompare} />
              ))}
              {manualColors.map((c, i) => (
                <ResultSwatch key={`m${c.id}-${c.hex}`} color={c} index={i} onCompare={onCompare} tag={c.tag} />
              ))}
              {manualLines.map((line, li) => (
                <div key={line.id} className="extract-fs__line">
                  <span className="extract-fs__line-title">色带 {li + 1}</span>
                  <div className="extract__line-bar">
                    {line.colors.map((c, i) => (
                      <div
                        key={i}
                        className="extract__line-seg"
                        style={{ background: c.hex }}
                        title={c.hex}
                        onClick={() => onCompare(c.hex)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
