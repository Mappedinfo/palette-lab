import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import './App.css';
import { ALL_COLORS, GROUPS } from './data/colors';
import Header from './components/Header';
import Hero from './components/Hero';
import PaletteGrid from './components/PaletteGrid';
import GroupShowcase from './components/GroupShowcase';
import ColorModal from './components/ColorModal';
import CompareOverlay from './components/CompareOverlay';
import TheaterMode from './components/TheaterMode';
import Footer from './components/Footer';

const THEME_KEY = 'palette-lab-theme';

export default function App() {
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved) return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });
  const [selected, setSelected] = useState(null); // 详情弹窗
  const [compare, setCompare] = useState(null); // {a: hex, b: hex}
  const [theater, setTheater] = useState(false);
  const [wipe, setWipe] = useState(null); // 主题切换圆形展开 {color}

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    const next = theme === 'light' ? 'dark' : 'light';
    // 从按钮位置圆形展开的动效
    setWipe(next === 'dark' ? '#101114' : '#fbfaf7');
    setTimeout(() => setTheme(next), 60);
    setTimeout(() => setWipe(null), 650);
  }, [theme]);

  // 键盘：Esc 关闭全屏层
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setCompare(null);
        setTheater(false);
        setSelected(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <>
      <Header theme={theme} onToggle={toggleTheme} onTheater={() => setTheater(true)} />

      <main>
        <Hero onExplore={() => document.getElementById('palette')?.scrollIntoView({ behavior: 'smooth' })} />

        <section id="palette" className="section">
          <div className="container">
            <div className="section__head">
              <div>
                <div className="eyebrow" style={{ marginBottom: 10 }}>01 · 全色档案</div>
                <h2>15 色 · 逐色解析</h2>
              </div>
              <p className="section__desc">
                点击任意色卡查看 RGB / HSL / 对比度详情；hover 右上角可复制色值。
              </p>
            </div>
            <PaletteGrid colors={ALL_COLORS} onOpen={setSelected} onCompare={(hex) => setCompare({ a: hex, b: null })} />
          </div>
        </section>

        <section id="groups" className="section" style={{ background: 'var(--bg-soft)' }}>
          <div className="container">
            <div className="section__head">
              <div>
                <div className="eyebrow" style={{ marginBottom: 10 }}>02 · 搭配方案</div>
                <h2>8 组 · 配色语义</h2>
              </div>
              <p className="section__desc">
                每组由「基底 + 强调」构成：点击「全屏比较」同屏对照，或「剧场」整组全屏浏览。
              </p>
            </div>
            <GroupShowcase groups={GROUPS} onCompare={(pair) => setCompare({ a: pair[0], b: pair[1] })} onTheater={setTheater} />
          </div>
        </section>
      </main>

      <Footer />

      <AnimatePresence>
        {selected && (
          <ColorModal
            key={selected.hex}
            color={selected}
            onClose={() => setSelected(null)}
            onCompare={(hex) => { setSelected(null); setCompare({ a: hex, b: null }); }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {compare && (
          <CompareOverlay
            key="compare"
            colors={ALL_COLORS}
            initial={compare}
            onClose={() => setCompare(null)}
            onTheater={() => { setCompare(null); setTheater(true); }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {theater && <TheaterMode key="theater" colors={ALL_COLORS} onClose={() => setTheater(false)} />}
      </AnimatePresence>

      <AnimatePresence>
        {wipe && (
          <motion.div
            key="wipe"
            className="theme-wipe"
            style={{ '--wipe-bg': wipe }}
            initial={{ scale: 0, opacity: 1 }}
            animate={{ scale: 4.5, opacity: [1, 1, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: [0.76, 0, 0.24, 1] }}
          />
        )}
      </AnimatePresence>
    </>
  );
}
