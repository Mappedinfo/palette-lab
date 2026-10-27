import { motion } from 'framer-motion';
import { LayoutGrid, Moon, Sun } from 'lucide-react';
import GithubIcon from './GithubIcon';

export default function Header({ theme, onTheater }) {
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
        <nav className="site-nav" aria-label="实验室导航"><a href="#usage">使用场合</a><a href="#composition">配比实验</a><a href="#typography">字号字体</a><a href="#palette">全色档案</a><a href="#groups">搭配方案</a><a href="#extract">图片提色</a></nav>
        <div className="header-actions">
          <button className="icon-btn" onClick={onTheater} title="全屏剧场" aria-label="全屏剧场">
            <LayoutGrid size={17} />
          </button>
          <span className="system-theme-status" aria-live="polite" title="跟随设备系统，系统变化时自动切换">
            {theme === 'dark' ? <Moon size={17} /> : <Sun size={17} />}
            随系统 · {theme === 'dark' ? '深色' : '浅色'}
          </span>
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
