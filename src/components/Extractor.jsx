import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brush, Check, ClipboardPaste, Download, Eraser, FileText, ImagePlus,
  Loader2, MousePointerClick, RefreshCw, Scan, Sparkles, Square, UploadCloud, Slash,
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
  const imgDataRef = useRef(null); // 原始 ImageData（图片坐标）

  // ── 交互画布状态（ref 避免闭包） ──
  const gesture = useRef(null); // {mode, start, current, points, minX,minY,maxX,maxY}

  // ── 图片坐标换算：canvas CSS 坐标 → ImageData 像素坐标 ──
  const cssToImg = useCallback((cx, cy) => {
    const canvas = canvasRef.current;
    const img = imgDataRef.current;
    if (!canvas || !img) return null;
    const cw = canvas.clientWidth;
    const ch = canvas.clientHeight;
    const scale = Math.min(cw / img.width, ch / img.height);
    const offX = (cw - img.width * scale) / 2;
    const offY = (ch - img.height * scale) / 2;
    return [
      Math.round((cx - offX) / scale),
      Math.round((cy - offY) / scale),
    ];
  }, []);

  // ── 重绘画布：图片 + 当前手势覆盖层 ──
  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgDataRef.current;
    const g = gesture.current;
    if (!canvas || !img) return;
    const dpr = window.devicePixelRatio || 1;
    const cw = canvas.clientWidth;
    const ch = canvas.clientHeight;
    if (!cw || !ch) return;
    // 无条件同步画布位图尺寸（每次重绘都会重画，无需比较）
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

    // 绘制图片（contain）
    const scale = Math.min(cw / img.width, ch / img.height);
    const dw = img.width * scale;
    const dh = img.height * scale;
    const dx = (cw - dw) / 2;
    const dy = (ch - dh) / 2;
    const tmp = document.createElement('canvas');
    tmp.width = img.width;
    tmp.height = img.height;
    tmp.getContext('2d').putImageData(img, 0, 0);
    ctx.drawImage(tmp, dx, dy, dw, dh);

    // 手势覆盖层
    if (!g) return;
    if (g.mode === 'rect' && g.start && g.current) {
      const x = Math.min(g.start.x, g.current.x);
      const y = Math.min(g.start.y, g.current.y);
      const w = Math.abs(g.current.x - g.start.x);
      const h = Math.abs(g.current.y - g.start.y);
      ctx.fillStyle = 'rgba(238,25,105,0.18)';
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = '#ee1969';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.strokeRect(x, y, w, h);
      ctx.setLineDash([]);
    } else if (g.mode === 'brush' && g.points.length) {
      ctx.strokeStyle = 'rgba(238,25,105,0.85)';
      ctx.lineWidth = 14;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      g.points.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
      ctx.stroke();
    } else if (g.mode === 'line' && g.points.length > 1) {
      ctx.strokeStyle = 'rgba(255,255,255,0.95)';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.beginPath();
      g.points.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
      ctx.stroke();
      ctx.strokeStyle = '#ee1969';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 5]);
      ctx.stroke();
      ctx.setLineDash([]);
      // 端点
      const sp = g.points[0];
      const ep = g.points[g.points.length - 1];
      for (const [px, py] of [[sp.x, sp.y], [ep.x, ep.y]]) {
        ctx.beginPath();
        ctx.arc(px, py, 6, 0, Math.PI * 2);
        ctx.fillStyle = '#ee1969';
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    } else if (g.mode === 'dropper' && g.start) {
      ctx.beginPath();
      ctx.arc(g.start.x, g.start.y, 10, 0, Math.PI * 2);
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(g.start.x, g.start.y, 10, 0, Math.PI * 2);
      ctx.strokeStyle = '#ee1969';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }, []);

  // ── 手势开始 ──
  const onPointerDown = (e) => {
    if (status !== 'done') return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const imgPt = cssToImg(x, y);
    if (!imgPt) return;
    canvas.setPointerCapture(e.pointerId);
    if (tool === 'dropper') {
      // 吸管：点击即取
      const c = samplePoint(imgDataRef.current, imgPt[0], imgPt[1], 4);
      if (c) {
        setManualColors((prev) => [...prev, { ...c, weight: null, tag: '吸管', id: Date.now() + Math.random() }]);
        gesture.current = { mode: 'dropper', start: { x, y } };
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
      start: { x, y },
      current: { x, y },
      points: [{ x, y }],
      imgPoints: [imgPt],
      minX: imgPt[0], maxX: imgPt[0], minY: imgPt[1], maxY: imgPt[1],
    };
    redraw();
  };

  const onPointerMove = (e) => {
    const g = gesture.current;
    if (!g || g.mode === 'dropper') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const imgPt = cssToImg(x, y);
    if (!imgPt) return;
    g.current = { x, y };
    if (g.mode === 'rect') {
      // 框选：直接按当前点更新边界（imgPoints 只存起点终点即可，边界实时算）
      const [ix, iy] = imgPt;
      g.minX = Math.min(g.minX, ix);
      g.maxX = Math.max(g.maxX, ix);
      g.minY = Math.min(g.minY, iy);
      g.maxY = Math.max(g.maxY, iy);
    } else if (g.mode === 'brush' || g.mode === 'line') {
      const last = g.points[g.points.length - 1];
      const dist = Math.hypot(x - last.x, y - last.y);
      if (dist > 4) {
        g.points.push({ x, y });
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
      // 等 DOM 渲染后初始化画布
      setTimeout(redraw, 80);
    } catch (e) {
      setStatus('error');
      setError(e.message || '解析失败，请换一张图片试试');
    }
  }, [redraw]);

  // ── 画布尺寸自适应 ──
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const ro = new ResizeObserver(() => redraw());
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [redraw, status]);

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
                  </div>

                  <div className="extract__preview-wrap" ref={wrapRef}>
                    <canvas
                      ref={canvasRef}
                      className={`extract__canvas extract__canvas--${tool}`}
                      onPointerDown={onPointerDown}
                      onPointerMove={onPointerMove}
                      onPointerUp={onPointerUp}
                    />
                  </div>

                  <p className="extract__tool-hint">
                    <Scan size={13} /> {activeTool.hint}
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
                          提取色与 15 色档案中最接近的颜色匹配，方便沿用本站已验证的搭配语义。
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
    </section>
  );
}
