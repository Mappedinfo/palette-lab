import { motion } from 'framer-motion';
import { LayoutGrid, Moon, Sun } from 'lucide-react';
import GithubIcon from './GithubIcon';

export default function Header({ theme, onToggle, onTheater }) {
  return (
    <motion.header
      className="site-header"
      initial={{ y: -60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="container site-header__inner">
        <a className="brand" href="#top">
          <span className="brand__dot" aria-hidden="true" />
          Palette<span style={{ fontWeight: 400 }}>Lab</span>
        </a>
        <nav className="site-nav" aria-label="实验室导航"><a href="#composition">配比实验</a><a href="#palette">全色档案</a><a href="#groups">搭配方案</a><a href="#extract">图片提色</a></nav>
        <div className="header-actions">
          <button className="icon-btn" onClick={onTheater} title="全屏剧场" aria-label="全屏剧场">
            <LayoutGrid size={17} />
          </button>
          <button
            className="icon-btn"
            onClick={onToggle}
            title={theme === 'light' ? '切换到深色' : '切换到浅色'}
            aria-label="切换主题"
          >
            <motion.span
              key={theme}
              initial={{ rotate: -120, opacity: 0, scale: 0.6 }}
              animate={{ rotate: 0, opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
              style={{ display: 'grid', placeItems: 'center' }}
            >
              {theme === 'light' ? <Moon size={17} /> : <Sun size={17} />}
            </motion.span>
          </button>
          <a
            className="icon-btn"
            href="https://github.com/Mappedinfo/palette-lab"
            target="_blank"
            rel="noreferrer"
            title="GitHub 仓库"
            aria-label="GitHub 仓库"
          >
            <GithubIcon size={17} />
          </a>
        </div>
      </div>
    </motion.header>
  );
}
