import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronsLeftRight, Grid3x3, Maximize2, Shuffle, X } from 'lucide-react';
import { contrastRatio, textOn } from '../data/colors';

/**
 * 全屏比较：左右分屏 + 可拖拽分割线。
 * initial: {a: hex, b: hex|null} — b 为空时自动取组内第二个颜色。
 */
export default function CompareOverlay({ colors, initial, onClose, onTheater }) {
  const [aHex, setAHex] = useState(initial.a);
  const [bHex, setBHex] = useState(
    initial.b ?? colors.find((c) => c.hex !== initial.a)?.hex
  );
  const [split, setSplit] = useState(50); // 分割线位置 %
  const [dragging, setDragging] = useState(false);
  const stageRef = useRef(null);

  const colorA = colors.find((c) => c.hex === aHex);
  const colorB = colors.find((c) => c.hex === bHex);
  const ratio = contrastRatio(aHex, bHex).toFixed(2);

  const pickA = (hex) => {
    if (hex === bHex) setBHex(aHex);
    setAHex(hex);
  };
  const pickB = (hex) => {
    if (hex === aHex) setAHex(bHex);
    setBHex(hex);
  };
  const swap = () => {
    setAHex(bHex);
    setBHex(aHex);
  };
  const randomPair = () => {
    const i = Math.floor(Math.random() * colors.length);
    const j = (i + 1 + Math.floor(Math.random() * (colors.length - 1))) % colors.length;
    setAHex(colors[i].hex);
    setBHex(colors[j].hex);
  };

  // 指针拖拽分割线
  const updateFromPointer = useCallback((clientX) => {
    const el = stageRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const pct = ((clientX - rect.left) / rect.width) * 100;
    setSplit(Math.min(96, Math.max(4, pct)));
  }, []);

  const onPointerDown = (e) => {
    e.preventDefault();
    setDragging(true);
    updateFromPointer(e.clientX);
  };

  useEffect(() => {
    if (!dragging) return;
    const move = (e) => updateFromPointer(e.clientX);
    const up = () => setDragging(false);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
  }, [dragging, updateFromPointer]);

  // 键盘：←/→ 切换 B 颜色，↑/↓ 切换 A，S 交换
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') return onClose();
      const list = colors;
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        const idx = list.findIndex((c) => c.hex === bHex);
        const delta = e.key === 'ArrowRight' ? 1 : -1;
        const next = list[(idx + delta + list.length) % list.length];
        setBHex(next.hex);
      }
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        const idx = list.findIndex((c) => c.hex === aHex);
        const delta = e.key === 'ArrowDown' ? 1 : -1;
        const next = list[(idx + delta + list.length) % list.length];
        setAHex(next.hex);
      }
      if (e.key.toLowerCase() === 's') swap();
      if (e.key.toLowerCase() === 'r') randomPair();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aHex, bHex, colors, onClose]);

  return (
    <motion.div
      className="compare"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      role="dialog"
      aria-modal="true"
      aria-label="全屏颜色比较"
    >
      {/* 顶栏 */}
      <div className="compare__topbar">
        <div className="compare__title">
          <span className="dot" style={{ background: aHex }} />
          <span className="dot" style={{ background: bHex }} />
          全屏比较
        </div>
        <div className="compare__tools">
          <button className="pill-btn" onClick={swap} title="交换 A/B（S）">
            <Shuffle size={14} /> 交换
          </button>
          <button className="pill-btn" onClick={randomPair} title="随机一组（R）">
            <Maximize2 size={14} /> 随机
          </button>
          <button className="pill-btn pill-btn--ghost" onClick={onTheater} title="进入剧场模式">
            <Grid3x3 size={14} /> 剧场
          </button>
          <button className="icon-btn" onClick={onClose} aria-label="关闭比较" title="关闭（Esc）">
            <X size={17} />
          </button>
        </div>
      </div>

      {/* 分屏舞台 */}
      <div
        className="compare__stage"
        ref={stageRef}
        style={{ cursor: dragging ? 'ew-resize' : undefined }}
      >
        <motion.div
          key={aHex}
          className="compare__panel"
          style={{ background: aHex, color: textOn(aHex) }}
          initial={{ opacity: 0, scale: 1.03 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        >
          <span className="big-hex">{aHex.toUpperCase()}</span>
          <span className="big-name">{colorA?.name} · {colorA?.en}</span>
        </motion.div>

        <motion.div
          key={bHex}
          className="compare__panel compare__panel--b"
          style={{ background: bHex, color: textOn(bHex), ['--split']: `${split}%` }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        >
          <span className="big-hex">{bHex.toUpperCase()}</span>
          <span className="big-name">{colorB?.name} · {colorB?.en}</span>
        </motion.div>

        <div
          className="compare__handle"
          style={{ ['--split']: `${split}%` }}
          onPointerDown={onPointerDown}
          role="slider"
          aria-label="分割线位置"
          aria-valuenow={Math.round(split)}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div className="compare__knob">
            <ChevronsLeftRight size={20} />
          </div>
        </div>

        <div className="compare__metrics">
          <span className="metric-chip">对比度 <b>{ratio}:1</b></span>
          <span className="metric-chip">A <b>{aHex.toUpperCase()}</b></span>
          <span className="metric-chip">B <b>{bHex.toUpperCase()}</b></span>
          <span className="metric-chip">拖拽分割线 · ←→ 换色 · S 交换</span>
        </div>
      </div>

      {/* 底部选择器 */}
      <div className="compare__picker">
        <div className="compare__picker-slot">
          <span className="label">A</span>
          {colors.map((c) => (
            <button
              key={c.hex}
              className={`swatch-mini ${c.hex === aHex ? 'swatch-mini--active' : ''}`}
              style={{ background: c.hex }}
              onClick={() => pickA(c.hex)}
              title={`A = ${c.hex}`}
              aria-label={`将 A 设为 ${c.hex}`}
            />
          ))}
        </div>
        <span className="vs">VS</span>
        <div className="compare__picker-slot">
          <span className="label">B</span>
          {colors.map((c) => (
            <button
              key={c.hex}
              className={`swatch-mini ${c.hex === bHex ? 'swatch-mini--active' : ''}`}
              style={{ background: c.hex }}
              onClick={() => pickB(c.hex)}
              title={`B = ${c.hex}`}
              aria-label={`将 B 设为 ${c.hex}`}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
}
