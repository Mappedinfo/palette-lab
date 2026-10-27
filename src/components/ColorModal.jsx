import { motion } from 'framer-motion';
import { X, Expand } from 'lucide-react';
import { hexToRgb, hexToHsl, contrastRatio, textOn } from '../data/colors';

export default function ColorModal({ color, onClose, onCompare }) {
  const [r, g, b] = hexToRgb(color.hex);
  const hsl = hexToHsl(color.hex);
  const text = textOn(color.hex);
  const onWhite = contrastRatio(color.hex, '#ffffff').toFixed(2);
  const onBlack = contrastRatio(color.hex, '#000000').toFixed(2);

  return (
    <motion.div
      className="modal-backdrop"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.28 }}
      onClick={onClose}
    >
      <motion.div
        className="modal"
        onClick={(e) => e.stopPropagation()}
        initial={{ y: 46, scale: 0.94, opacity: 0 }}
        animate={{ y: 0, scale: 1, opacity: 1 }}
        exit={{ y: 30, scale: 0.95, opacity: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        role="dialog"
        aria-modal="true"
        aria-label={`${color.name} 色值详情`}
      >
        <div
          className="modal__hero"
          style={{ background: color.hex, ['--swatch-text']: text }}
        >
          <span className="big-hex">{color.hex.toUpperCase()}</span>
          <button className="modal__close" onClick={onClose} aria-label="关闭">
            <X size={18} />
          </button>
        </div>

        <div className="modal__body">
          <div className="modal__title">
            <h3>{color.name}</h3>
            <span>{color.en} · {color.group ? `经典组 ${color.group}` : color.groupName}</span>
          </div>

          <p className="color-role-detail">角色：{color.roles.join(' · ')}<br />来源：{color.origins.join(' / ')}</p>

          <div className="spec-grid">
            <div className="spec-cell">
              <span>HEX</span>
              <b>{color.hex.toUpperCase()}</b>
            </div>
            <div className="spec-cell">
              <span>RGB</span>
              <b>{r}, {g}, {b}</b>
            </div>
            <div className="spec-cell">
              <span>HSL</span>
              <b>{hsl.h}° {hsl.s}% {hsl.l}%</b>
            </div>
          </div>

          <div className="contrast-row">
            <div className="contrast-cell contrast-cell--onwhite">
              <div>
                <div style={{ fontSize: 14, opacity: 0.85, fontWeight: 600 }}>白底对比度</div>
                <div className="ratio">{onWhite}<small> : 1</small></div>
              </div>
              <span className="sample" style={{ background: color.hex }} />
            </div>
            <div className="contrast-cell contrast-cell--onblack">
              <div>
                <div style={{ fontSize: 14, opacity: 0.85, fontWeight: 600 }}>黑底对比度</div>
                <div className="ratio">{onBlack}<small> : 1</small></div>
              </div>
              <span className="sample" style={{ background: color.hex }} />
            </div>
          </div>

          <div className="modal__actions">
            <button className="pill-btn" onClick={() => onCompare(color.hex)}>
              <Expand size={15} /> 全屏比较
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
