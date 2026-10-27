import { useEffect, useState, useSyncExternalStore } from 'react';
import { AnimatePresence } from 'framer-motion';

import { ALL_COLORS, GROUPS } from './data/colors';
import Header from './components/Header';
import Hero from './components/Hero';
import ColorArchive from './components/ColorArchive';
import UsageGuide from './components/UsageGuide';
import TypographyLab from './components/TypographyLab';
import { getSystemTheme, subscribeSystemTheme } from './lib/system-theme';
import GroupShowcase from './components/GroupShowcase';
import ColorModal from './components/ColorModal';
import CompareOverlay from './components/CompareOverlay';
import TheaterMode from './components/TheaterMode';
import Extractor from './components/Extractor';
import Footer from './components/Footer';
import CompositionLab from './components/CompositionLab';

const serverTheme = () => 'light';

/* 在格物插件宿主中，主题作用于宿主容器而非整个文档（避免与宿主主题互相覆盖） */
const getThemeRoot = () =>
  (typeof window !== 'undefined' && window.GEWU_PLUGIN?.api?.themeRoot) ||
  (typeof document !== 'undefined' ? document.documentElement : null);

/* 元素查找：shadow DOM 内的元素对 document 不可见，走宿主 API */
const findEl = (sel) =>
  (typeof window !== 'undefined' && window.GEWU_PLUGIN?.api?.find?.(sel)) ||
  (typeof document !== 'undefined' ? document.querySelector(sel) : null);

export default function App() {
  const theme = useSyncExternalStore(subscribeSystemTheme, getSystemTheme, serverTheme);
  const [useCase, setUseCase] = useState('research');
  const [selected, setSelected] = useState(null); // 详情弹窗
  const [compare, setCompare] = useState(null); // {a: hex, b: hex}
  const [theater, setTheater] = useState(false);

  useEffect(() => {
    getThemeRoot()?.setAttribute('data-theme', theme);
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
      <Header theme={theme} onTheater={() => setTheater(true)} />

      <main>
        <Hero onExplore={() => findEl('#composition')?.scrollIntoView({ behavior: 'smooth' })} />

        <UsageGuide active={useCase} onChange={setUseCase} />
        <CompositionLab useCase={useCase} />
        <TypographyLab useCase={useCase} />

        <ColorArchive onOpen={setSelected} onCompare={(hex) => setCompare({ a: hex, b: null })} />

        <section id="groups" className="section" style={{ background: 'var(--bg-soft)' }}>
          <div className="container">
            <div className="section__head">
              <div>
                <div className="eyebrow" style={{ marginBottom: 10 }}>02 · 搭配方案</div>
                <h2>{GROUPS.length} 组 · 经典搭配</h2>
              </div>
              <p className="section__desc">
                保留原有灵感搭配；具体用于科研、汇报或创作时，再按用途和实际组合判断。
              </p>
            </div>
            <GroupShowcase groups={GROUPS} onCompare={(pair) => setCompare({ a: pair[0], b: pair[1] })} onTheater={setTheater} />
          </div>
        </section>

        <Extractor onCompare={(hex) => setCompare({ a: hex, b: null })} />
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

    </>
  );
}
