import { motion } from 'framer-motion';
import { ArrowDown } from 'lucide-react';
import { ALL_COLORS } from '../data/colors';

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.15 } },
};

const item = {
  hidden: { y: 42, opacity: 0 },
  show: {
    y: 0,
    opacity: 1,
    transition: { duration: 0.75, ease: [0.22, 1, 0.36, 1] },
  },
};

/** 右侧装饰拼贴：15 色随机浮动方块 + 旋转色轮 */
function Collage() {
  const tiles = ALL_COLORS.slice(0, 12);
  return (
    <motion.div
      className="hero__collage"
      aria-hidden="true"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.5, duration: 1, ease: [0.22, 1, 0.36, 1] }}
    >
      <motion.div
        className="hero__wheel"
        style={{
          background: `conic-gradient(${ALL_COLORS.map((c) => c.hex).join(', ')})`,
        }}
        animate={{ rotate: 360 }}
        transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
      />
      {tiles.map((c, i) => {
        const angle = (i / tiles.length) * Math.PI * 2;
        const dist = 130 + (i % 3) * 34;
        return (
          <motion.span
            key={c.hex}
            className="hero__tile"
            style={{
              background: c.hex,
              width: 34 + (i % 4) * 9,
              height: 34 + ((i + 2) % 4) * 9,
              borderRadius: i % 2 ? '50%' : '22%',
              x: Math.cos(angle) * dist,
              y: Math.sin(angle) * dist,
              boxShadow: `0 14px 34px -12px ${c.hex}88`,
            }}
            animate={{ y: [Math.sin(angle) * dist, Math.sin(angle) * dist - 16, Math.sin(angle) * dist] }}
            transition={{
              duration: 4 + (i % 5),
              repeat: Infinity,
              ease: 'easeInOut',
              delay: i * 0.22,
            }}
          />
        );
      })}
      <div className="hero__collage-center">15</div>
    </motion.div>
  );
}

export default function Hero({ onExplore }) {
  return (
    <section id="top" className="hero">
      <div className="hero__halo" aria-hidden="true" />
      <div className="container hero__inner">
        <motion.div variants={container} initial="hidden" animate="show" className="hero__text">
          <motion.div variants={item}>
            <span className="eyebrow hero__eyebrow">
              <span className="hero__eyebrow-live" />
              Mappedinfo · 色彩与界面
            </span>
          </motion.div>

          <motion.h1 variants={item}>
            颜色选对，
            <br />
            比例也对
            <span className="accent">。</span>
          </motion.h1>

          <motion.p variants={item} className="hero__sub">
            从颜色的面积与角色出发，在清亮页面中试配、对照与导出。
            15 色档案、8 组搭配和图片提色，继续为图表与界面提供灵感。
          </motion.p>

          <motion.div variants={item} className="hero__stats">
            <div className="hero__stat">
              <b>15</b>
              <span>Colors</span>
            </div>
            <div className="hero__stat">
              <b>8</b>
              <span>Pairs</span>
            </div>
            <div className="hero__stat">
              <b>4</b>
              <span>Starting palettes</span>
            </div>
            <div className="hero__stat">
              <b>∞</b>
              <span>Combos</span>
            </div>
          </motion.div>

          <motion.div variants={item} style={{ marginTop: 36 }}>
            <button className="pill-btn" onClick={onExplore} style={{ padding: '13px 22px', fontSize: 14.5 }}>
              <ArrowDown size={16} />
              开始配比实验
            </button>
          </motion.div>
        </motion.div>

        <Collage />
      </div>

      <motion.div
        className="hero__ribbon"
        aria-hidden="true"
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.7, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      >
        {ALL_COLORS.map((c, i) => (
          <span key={c.hex} style={{ background: c.hex, animationDelay: `${i * 0.15}s` }} />
        ))}
      </motion.div>
    </section>
  );
}
