import { FileText } from 'lucide-react';
import GithubIcon from './GithubIcon';

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="container site-footer__inner">
        <p>
          © {new Date().getFullYear()} Palette Lab · Mappedinfo 开源配色档案 · 基于 15 色学术配色
        </p>
        <div className="site-footer__links">
          <a href="llms-full.txt" target="_blank" rel="noreferrer" title="AI 可读的完整色彩档案">
            <FileText size={15} /> AI 数据
          </a>
          <a href="https://github.com/Mappedinfo/palette-lab" target="_blank" rel="noreferrer">
            <GithubIcon size={15} /> Mappedinfo / palette-lab
          </a>
        </div>
      </div>
    </footer>
  );
}
