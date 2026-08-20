import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { textOn } from '../data/colors';

/** 全屏剧场：15 色铺满整个屏幕，hover 显示色值，点击复制。 */
export default function TheaterMode({ colors, onClose }) {
  const copy = async (hex) => {
    try {
      await navigator.clipboard.writeText(hex.toUpperCase());
    } catch {
      /* 忽略 */
    }
  };

  return (
    <motion.div
      className="theater"
      initial={{ opacity: 0, scale: 1.04 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.04 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      role="dialog"
      aria-modal="true"
      aria-label="全屏剧场"
    >
      {colors.map((c, i) => (
        <motion.button
          key={c.hex}
          className="theater__cell"
          style={{ background: c.hex, color: textOn(c.hex) }}
          onClick={() => copy(c.hex)}
          title={`复制 ${c.hex}`}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 + i * 0.035, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          <span>
            {c.hex.toUpperCase()} · {c.name}
          </span>
        </motion.button>
      ))}
      <button className="theater__close" onClick={onClose} aria-label="退出剧场" title="退出（Esc）">
        <X size={20} />
      </button>
    </motion.div>
  );
}
