import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ClipboardPaste, ImagePlus, Loader2, RefreshCw, Sparkles, UploadCloud } from 'lucide-react';
import { extractPaletteFromImageData, fileToImageData, recommendForPlotting, simulateColorblind } from '../lib/extract.js';
import { contrastRatio, hexToRgb, textOn } from '../data/colors.js';

const COLORBLIND_LABEL = {
  protanopia: '红色盲',
  deuteranopia: '绿色盲',
  tritanopia: '蓝黄色盲',
};

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
function ResultSwatch({ color, index, onCompare }) {
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
        <button className="result-swatch__copy" onClick={copy} title="复制色值">
          {copied ? '✓' : '⧉'}
        </button>
      </div>
      <div className="result-swatch__meta">
        <span className="result-swatch__pct">{(color.weight * 100).toFixed(1)}%</span>
        <span className="result-swatch__hsl">
          H{color.hsl.h}° S{color.hsl.s}% L{color.hsl.l}%
        </span>
      </div>
    </motion.div>
  );
}

export default function Extractor({ onCompare }) {
  const [dragOver, setDragOver] = useState(false);
  const [imageUrl, setImageUrl] = useState(null);
  const [fileName, setFileName] = useState(null);
  const [status, setStatus] = useState('idle'); // idle | working | done | error
  const [error, setError] = useState(null);
  const [palette, setPalette] = useState([]);
  const [advice, setAdvice] = useState(null);
  const fileInputRef = useRef(null);
  const dropRef = useRef(null);

  const processFile = useCallback(async (file) => {
    if (!file || !file.type.startsWith('image/')) {
      setStatus('error');
      setError('请选择图片文件（PNG / JPG / WebP / GIF 等）');
      return;
    }
    setStatus('working');
    setError(null);
    setFileName(file.name);
    setImageUrl(URL.createObjectURL(file));
    try {
      // 给渲染留一拍，让 loading 状态可见
      await new Promise((r) => setTimeout(r, 60));
      const imageData = await fileToImageData(file, 800);
      const extracted = extractPaletteFromImageData(imageData, 8, {});
      if (!extracted.length) throw new Error('未能从图片中解析出颜色');
      setPalette(extracted);
      setAdvice(recommendForPlotting(extracted));
      setStatus('done');
    } catch (e) {
      setStatus('error');
      setError(e.message || '解析失败，请换一张图片试试');
    }
  }, []);

  // 拖拽
  useEffect(() => {
    const el = dropRef.current;
    if (!el) return;
    const onDragOver = (e) => {
      e.preventDefault();
      setDragOver(true);
    };
    const onDragLeave = (e) => {
      if (!el.contains(e.relatedTarget)) setDragOver(false);
    };
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

  // 全局粘贴（Ctrl+V / Cmd+V）
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
    setImageUrl(null);
    setFileName(null);
  };

  return (
    <section id="extract" className="section">
      <div className="container">
        <div className="section__head">
          <div>
            <div className="eyebrow" style={{ marginBottom: 10 }}>03 · 色彩提取</div>
            <h2>从图片提取配色</h2>
          </div>
          <p className="section__desc">
            拖入、粘贴（Ctrl/Cmd+V）或选择图片，自动解析主色并给出适合绘图的推荐方案。
            所有解析都在本地完成，图片不会上传。
          </p>
        </div>

        {/* 拖拽区 / 结果区 */}
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
                <h3>
                  {dragOver ? '松开鼠标，放进来！' : '拖拽图片到这里'}
                </h3>
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
                  <motion.p
                    className="extract__error"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
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
                {/* 左侧：原图 + 主色条 + 色卡 */}
                <div className="extract__result-main">
                  <div className="extract__preview-wrap">
                    {imageUrl && <img className="extract__preview" src={imageUrl} alt={fileName} />}
                    <button className="extract__reload" onClick={reset} title="换一张图片">
                      <RefreshCw size={15} /> 换图
                    </button>
                  </div>
                  <PaletteBar palette={palette} />
                  <div className="extract__swatches">
                    {palette.map((c, i) => (
                      <ResultSwatch key={c.hex + i} color={c} index={i} onCompare={onCompare} />
                    ))}
                  </div>
                </div>

                {/* 右侧：绘图建议 */}
                <div className="extract__advice">
                  {advice && (
                    <>
                      {/* 文字色推荐 */}
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

                      {/* 强调色 */}
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
                            <small>
                              饱和度最高的主色（S={advice.accent.hsl.s}%），适合标注关键数据点
                            </small>
                          </div>
                        </div>
                      </div>

                      {/* 色盲检查 */}
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

                      {/* 档案映射 */}
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
