import { useState } from 'react';
import { motion } from 'framer-motion';
import { Copy, Check, Expand } from 'lucide-react';
import { hexToHsl, isLight, textOn } from '../data/colors';

const gridVar = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05, delayChildren: 0.1 } },
};

const cardVar = {
  hidden: { y: 34, opacity: 0, scale: 0.97 },
  show: {
    y: 0,
    opacity: 1,
    scale: 1,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
  },
};

function SwatchCard({ color, index, onOpen, onCompare }) {
  const [copied, setCopied] = useState(false);
  const hsl = hexToHsl(color.hex);
  const text = textOn(color.hex);

  const copy = async (e) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(color.hex.toUpperCase());
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      /* clipboard 不可用时静默 */
    }
  };

  return (
    <motion.div variants={cardVar} className="swatch" onClick={() => onOpen(color)}>
      <div
        className="swatch__field"
        style={{ background: color.hex, ['--swatch-text']: text }}
      >
        <span className="swatch__group-tag">G{color.group}</span>
        <span className="swatch__hex">{color.hex.toUpperCase()}</span>
        <button
          className="swatch__copy"
          onClick={copy}
          title="复制色值"
          aria-label={`复制 ${color.hex}`}
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
        </button>
      </div>
      <div className="swatch__meta">
        <div className="swatch__name">
          {color.name}
          <small>{color.en}</small>
        </div>
        <div className="swatch__spec">
          <span>H{hsl.h}° S{hsl.s}% L{hsl.l}%</span>
          <button
            onClick={(e) => { e.stopPropagation(); onCompare(color.hex); }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--ink-soft)', fontSize: 11, fontFamily: 'var(--mono)' }}
            title="全屏比较"
          >
            <Expand size={12} /> 比较
          </button>
        </div>
      </div>
    </motion.div>
  );
}

export default function PaletteGrid({ colors, onOpen, onCompare }) {
  return (
    <motion.div
      className="palette-grid"
      variants={gridVar}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '-60px' }}
    >
      {colors.map((c, i) => (
        <SwatchCard key={c.hex} color={c} index={i} onOpen={onOpen} onCompare={onCompare} />
      ))}
    </motion.div>
  );
}
